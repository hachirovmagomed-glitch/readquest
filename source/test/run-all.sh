#!/usr/bin/env bash
# Full suite (1б). Builds dist (rq) + dist/test (rqt) with one RQ_BUILD, runs every test, prints one score line per test.
# RQ_HOST: server that maps /readquest/ → source/dist (box: :8767 /tmp/rqp-serve). pwa-verify rebuilds dist itself → runs last.
# Usage: ./run-all.sh [test-name …]   (default: all)
set -uo pipefail
cd "$(dirname "$0")"
HOST="${RQ_HOST:-http://127.0.0.1:8767}"
BUILD="${RQ_BUILD:-$(date +%Y%m%d-%H%M)}"
(cd .. && RQ_BUILD=$BUILD ./build-dist.sh >/dev/null && RQ_NS=rqt RQ_BUILD=$BUILD ./build-dist.sh >/dev/null) || { echo "build failed"; exit 1; }
ALL="menu modes export honest honest-ui export-test reset-timeout names savetext scriptv cap awards lvl golden back resume hyph begin summary streak-reset android stage1b tts dayring themes pencil small-batch shop shop-storage shop2 ellada babochkovyi celestial pencil2 headers nightbtn profbits skinsplit remindrow themecolors drawer uifix nav mvpflag extra achgate ach ach2 setentry expand qhint bookcard lvlcard sysback rowfix gatepick libhead blackcanvas importskin import-many path mvp-check audit1 audit2 pdf pdf-test pwa noemoji adv adv2 adv3 adv4 adv5 hero ai selpop hlcolor sliders pdfhl quotetap bookfind translate focus focusui selpage"
SEL="${*:-$ALL}"
LOG="/tmp/rq-runall/$BUILD"; mkdir -p "$LOG"; rc=0  # per-run log dir: a rerun never overwrites the logs of a failed run
for t in $SEL; do
  case "$t" in
    export)       cmd="node export.test.mjs";;
    export-test)  cmd="env RQ_URL=$HOST/readquest/test/ node export.test.mjs";;
    reset-timeout) cmd="node reset-timeout.test.mjs";;
    names)        cmd="node names.test.mjs";;
    savetext)     cmd="node savetext.test.mjs";;
    scriptv)      cmd="node scriptv.test.mjs";;
    cap)          cmd="node cap.test.mjs";;
    honest)       cmd="node honest.test.mjs";;
    honest-ui)    cmd="env RQ_URL=$HOST/readquest/test/ node honest-ui.test.mjs";;
    awards)       cmd="node awards.test.mjs";;
    lvl)          cmd="node lvl.test.mjs";;
    golden)       cmd="node golden.test.mjs";;
    back)         cmd="node back.test.mjs";;
    resume)       cmd="node resume.test.mjs";;
    hyph)         cmd="node hyph.test.mjs";;
    begin)        cmd="node begin.test.mjs";;
    summary)      cmd="node summary.test.mjs";;
    streak-reset) cmd="env RQ_URL=$HOST/readquest/test/ node streak-reset.test.mjs";;
    android)      cmd="node android-verify.mjs";;
    stage1b)      cmd="node stage1b.test.mjs";;
    tts)          cmd="node tts.test.mjs";;
    dayring)      cmd="node dayring.test.mjs";;
    themes)       cmd="node themes.test.mjs";;
    pencil)       cmd="node pencil.test.mjs";;
    small-batch)  cmd="node small-batch.test.mjs";;
    shop)         cmd="node shop.test.mjs";;
    shop-storage) cmd="env RQ_URL=$HOST/readquest/test/ node shop-storage.test.mjs";;
    uifix)        cmd="env RQ_URL=$HOST/readquest/test/ node uifix.test.mjs";;
    mvpflag)      cmd="env RQ_URL=$HOST/readquest/test/ node mvpflag.test.mjs";;
    extra)        cmd="env RQ_URL=$HOST/readquest/test/ node extra.test.mjs";;
    achgate)      cmd="env RQ_URL=$HOST/readquest/test/ node achgate.test.mjs";;
    ach)          cmd="node ach.test.mjs";;
    ach2)         cmd="env RQ_URL=$HOST/readquest/test/ RQ_MAIN_URL=$HOST/readquest/ node ach2.test.mjs";;
    setentry)     cmd="env RQ_URL=$HOST/readquest/test/ node setentry.test.mjs";;
    expand)       cmd="env RQ_URL=$HOST/readquest/test/ node expand.test.mjs";;
    qhint)        cmd="env RQ_URL=$HOST/readquest/test/ node qhint.test.mjs";;
    bookcard)     cmd="env RQ_URL=$HOST/readquest/test/ node bookcard.test.mjs";;
    lvlcard)      cmd="env RQ_URL=$HOST/readquest/test/ RQ_MAIN_URL=$HOST/readquest/ node lvlcard.test.mjs";;
    sysback)      cmd="env RQ_URL=$HOST/readquest/test/ node sysback.test.mjs";;
    libhead)      cmd="env RQ_URL=$HOST/readquest/test/ node libhead.test.mjs";;
    path)         cmd="env RQ_URL=$HOST/readquest/test/ node path.test.mjs";;
    adv)          cmd="env RQ_URL=$HOST/readquest/test/ node adv.test.mjs";;
    adv2)         cmd="env RQ_URL=$HOST/readquest/test/ node adv2.test.mjs";;
    adv3)         cmd="env RQ_URL=$HOST/readquest/test/ node adv3.test.mjs";;
    adv4)         cmd="env RQ_URL=$HOST/readquest/test/ node adv4.test.mjs";;
    adv5)         cmd="env RQ_URL=$HOST/readquest/test/ node adv5.test.mjs";;
    noemoji)      cmd="env RQ_URL=$HOST/readquest/test/ node noemoji.test.mjs";;
    gatepick)     cmd="env RQ_URL=$HOST/readquest/test/ node gatepick.test.mjs";;
    rowfix)       cmd="env RQ_URL=$HOST/readquest/test/ node rowfix.test.mjs";;
    nav)          cmd="env RQ_URL=$HOST/readquest/test/ node nav.test.mjs";;
    drawer)       cmd="env RQ_URL=$HOST/readquest/test/ node drawer.test.mjs";;
    ellada)       cmd="env RQ_URL=$HOST/readquest/test/ node ellada.test.mjs";;
    babochkovyi)  cmd="env RQ_URL=$HOST/readquest/test/ node babochkovyi.test.mjs";;
    celestial)    cmd="env RQ_URL=$HOST/readquest/test/ node celestial.test.mjs";;
    pencil2)      cmd="env RQ_URL=$HOST/readquest/test/ node pencil2.test.mjs";;
    headers)      cmd="env RQ_URL=$HOST/readquest/test/ node headers.test.mjs";;
    nightbtn)     cmd="env RQ_URL=$HOST/readquest/test/ node nightbtn.test.mjs";;
    profbits)     cmd="env RQ_URL=$HOST/readquest/test/ node profbits.test.mjs";;
    skinsplit)    cmd="env RQ_URL=$HOST/readquest/test/ node skinsplit.test.mjs";;
    selpop)       cmd="env RQ_URL=$HOST/readquest/test/ node selpop.test.mjs";;
    selpage)      cmd="env RQ_URL=$HOST/readquest/test/ node selpage.test.mjs";;
    hlcolor)      cmd="env RQ_URL=$HOST/readquest/test/ node hlcolor.test.mjs";;
    sliders)      cmd="env RQ_URL=$HOST/readquest/test/ node sliders.test.mjs";;
    pdfhl)        cmd="env RQ_URL=$HOST/readquest/test/ node pdfhl.test.mjs";;
    quotetap)     cmd="env RQ_URL=$HOST/readquest/test/ node quotetap.test.mjs";;
    menu)         cmd="env RQ_URL=$HOST/readquest/test/ node menu.test.mjs";;
    remindrow)    cmd="env RQ_URL=$HOST/readquest/test/ node remindrow.test.mjs";;
    themecolors)  cmd="env RQ_URL=$HOST/readquest/test/ node themecolors.test.mjs";;
    shop2)        cmd="env RQ_URL=$HOST/readquest/test/ RQ_MAIN_URL=$HOST/readquest/ node shop2.test.mjs";;
    blackcanvas)  cmd="node blackcanvas.test.mjs";;
    focus)        cmd="node focus.test.mjs";;
    focusui)      cmd="env RQ_URL=$HOST/readquest/test/ RQ_MAIN_URL=$HOST/readquest/ node focusui.test.mjs";;
    bookfind)     cmd="env RQ_URL=$HOST/readquest/test/ node bookfind.test.mjs";;
    hero)         cmd="env RQ_URL=$HOST/readquest/test/ node hero.test.mjs";;
    ai)           cmd="env RQ_URL=$HOST/readquest/test/ node ai.test.mjs";;
    translate)    cmd="env RQ_URL=$HOST/readquest/test/ node translate.test.mjs";;
    importskin)   cmd="bash serve-old-root.sh && env RQ_OLD_URL=http://127.0.0.1:8770/readquest/ node importskin.test.mjs";;
    import-many)  cmd="env RQ_URL=$HOST/readquest/test/ node import-many.test.mjs";;
    mvp-check)    cmd="node mvp-check.mjs";;
    audit1)       cmd="node audit1.test.mjs";;
    audit2)       cmd="node audit2.test.mjs";;
    modes)        cmd="node modes.test.mjs";;
    pdf)          cmd="node pdf-verify.mjs";;
    pdf-test)     cmd="env RQ_URL=$HOST/readquest/test/ node pdf-verify.mjs";;
    pwa)          cmd="node pwa-verify.mjs";;
    *) echo "unknown test $t"; rc=1; continue;;
  esac
  RQ_URL="${RQ_URL_OVERRIDE:-$HOST/readquest/}" bash -c "$cmd" > "$LOG/$t.log" 2>&1; code=$?
  [ $code -ne 0 ] && rc=1
  echo "$t: exit $code — $( (grep -E 'SUMMARY|passed|Итого|^[0-9]+\/[0-9]+' "$LOG/$t.log" || true) | tail -1 | cut -c1-200) (PASS $(grep -c '^PASS' "$LOG/$t.log"), FAIL $(grep -c '^FAIL' "$LOG/$t.log"))"
done
exit $rc
