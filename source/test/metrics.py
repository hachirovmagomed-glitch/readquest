#!/usr/bin/env python3
"""ReadQuest test metrics from export JSONs (backup envelope schemaVersion 1).

Usage: python3 metrics.py --start 2026-10-12 exports/*.json
Each file = one tester's export (sessions[] rows may carry an `id` — ignored here). Sessions under ~10 s with 0 pages are never logged
by app.html, so "fake" = sat in a book without turning pages. Purchases: game.rewardPurchases[]. Only exports with ns="rq" (main build) count; ns="rqt" (test build) and exports without ns are skipped with a warning. --start must be a Monday. Skins: theme_changed events (from, to = data-skin values; day/night toggles must NOT emit it); "kept" = last `to` differs from first `from`. Week 1 = start..start+6, week 2 = start+7..start+13.
"""
import argparse, json, statistics, sys
from collections import defaultdict
from datetime import date, timedelta

MIN_MINUTES = 10
FAKE_MIN_MINUTES = 1  # sessions shorter than 1 min (peek, quick flip-through) are not "fake reading"

def d(s): return date.fromisoformat(s[:10])

def tester(path, start):
    data = json.load(open(path, encoding="utf-8"))
    ns = data.get("ns")
    if ns != "rq":
        why = "test build (ns=rqt)" if ns == "rqt" else f"no/unknown ns ({ns!r}), export predates ns/build fields"
        print(f"! skipped {path}: {why}", file=sys.stderr)
        return None
    if data.get("schemaVersion") != 1:
        print(f"! {path}: schemaVersion={data.get('schemaVersion')}", file=sys.stderr)
    per_day = defaultdict(float)
    sessions = data.get("sessions", [])
    fake = 0
    for s in sessions:
        per_day[d(s["date"])] += s.get("minutes", 0) or 0
        if (s.get("minutes", 0) or 0) >= FAKE_MIN_MINUTES and (s.get("pageTurns", 0) or 0) == 0:
            fake += 1
    def week(n):
        lo = start + timedelta(days=7 * n); hi = lo + timedelta(days=6)
        days = [k for k in per_day if lo <= k <= hi]
        return sum(1 for k in days if per_day[k] >= MIN_MINUTES), len(days)
    w1_ok, w1_any = week(0); w2_ok, w2_any = week(1)
    hero = sum(1 for e in data.get("events", []) if e.get("type") == "hero_create_tapped")
    # PDF watchdog recoveries: events[] {type, date, at, bookId, page, label, stalledMs, reason} (STORAGE.md)
    stalls = sum(1 for e in data.get("events", []) if e.get("type") == "pdf_stall_recovered")
    # Free 2nd skin: events[] {type:"theme_changed", from, to} with data-skin values (not day/night). "kept" = ended on a theme other than the starting one.
    th = [e for e in data.get("events", []) if e.get("type") == "theme_changed"]
    theme_kept = bool(th) and th[-1].get("to") != th[0].get("from")
    buys = len((data.get("game") or {}).get("rewardPurchases") or [])
    return {"buys": buys, "file": path, "w1_days10": w1_ok, "w2_days10": w2_ok, "w2_any": w2_any,
            "sessions": len(sessions), "fake": fake, "hero_taps": hero, "build": data.get("build", "?"), "pdf_stalls": stalls, "theme_changed": len(th) > 0, "theme_kept": theme_kept}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", required=True, help="test day 1, YYYY-MM-DD")
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    start = d(a.start)
    if start.weekday() != 0:
        print(f"! --start {start} is not a Monday: test weeks won't match the Mon–Sun weekly quest", file=sys.stderr)
    rows = [r for r in (tester(f, start) for f in a.files) if r]
    if not rows:
        sys.exit("no main-build (ns=rq) exports to count")
    print("file | build | w1 days>=10 | w2 days>=10 | w2 active days | sessions | fake | hero taps | reward buys")
    for r in rows:
        print(f"{r['file']} | {r['build']} | {r['w1_days10']} | {r['w2_days10']} | {r['w2_any']} | {r['sessions']} | {r['fake']} | {r['hero_taps']} | {r['buys']}")
    n = len(rows); tot = sum(r["sessions"] for r in rows) or 1
    med = statistics.median(r["w2_days10"] for r in rows)
    ret = sum(1 for r in rows if r["w2_any"] > 0) / n
    fake = sum(r["fake"] for r in rows) / tot
    hero = sum(1 for r in rows if r["hero_taps"] > 0) / n
    buy = sum(1 for r in rows if r["buys"] > 0) / n
    print()
    print(f"North star, week 2 median days >=10 min: {med}  (target >= 4)  {'OK' if med >= 4 else 'MISS'}")
    print(f"Returned in week 2: {ret:.0%}  (alarm < 50%)")
    print(f"Fake sessions (>=1 min, 0 page turns): {fake:.0%}  (alarm > 10%)")
    print(f"Tapped 'Создать героя': {hero:.0%}  (build AI hero if > 33%)")
    print(f"Bought at least one real reward: {buy:.0%}")
    th_ch = sum(1 for r in rows if r["theme_changed"]) / n
    th_kept = sum(1 for r in rows if r["theme_kept"]) / n
    print(f"Changed theme: {th_ch:.0%}; kept a non-starting theme: {th_kept:.0%}  (sell skins for coins if kept > 33%)")
    stall_tot = sum(r["pdf_stalls"] for r in rows)
    stall_testers = sum(1 for r in rows if r["pdf_stalls"] > 0)
    print(f"PDF stalls recovered by watchdog (pdf_stall_recovered): {stall_tot} total, {stall_testers}/{n} testers with >= 1")

if __name__ == "__main__":
    main()
