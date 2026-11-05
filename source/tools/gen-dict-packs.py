#!/usr/bin/env python3
"""05.11 Словари (Джессика: «давай словари»): пакеты толковых словарей для читалки → main /dict/ (как /tr/ у перевода).
Usage: python3 tools/gen-dict-packs.py OUT [--ru RU_STARDICT_BASE] [--wn WORDNET_DICT_DIR] [--web WEBSTER_JSON]
  --ru   Русский Викисловарь, StarDict из github.com/Vuizur/ruwiktionary-htmldump-parser (Russian-Russian-dict.tar.gz), CC BY-SA
  --wn   WordNet 3.1 (Princeton), каталог dict/ из npm wordnet-db, лицензия WordNet
  --web  Webster's Unabridged Dictionary 1913 (Project Gutenberg #29765) — dictionary_compact.json из github.com/matthewreagan/WebstersEnglishDictionary
  --dal  Толковый словарь Даля (общественное достояние) — daldic-dump.sql из github.com/stolyarchukav/dal-dictionary (daldic-utils/src/main/resources)
  --enwikt  Английский Викисловарь, StarDict «English-English Wiktionary dictionary» из github.com/Vuizur/Wiktionary-Dictionaries, CC BY-SA
  --enru    Англо-русский: обратный индекс StarDict «Russian-English Wiktionary dictionary» оттуда же (+ формы английских слов из --enwikt)
Pack file <id>.rqd: one JSON line (header) + gzip chunks. Header: {v, id, name, lang, lic, src, n, nf, d:[[firstKey, off, len], …], f:[…]}
(offsets from the end of the header line). A D chunk = sorted lines «key\\theadword\\tdefinition» (\\n inside a definition = «\\\\n»),
an F chunk = sorted lines «form\\tlemma» where lemma = «<common prefix length><rest>», several lemmas joined by «|».
Keys: lower case, ё → е, no stress marks (js/dict.js dkNorm does the same). Same container is built in the browser for own StarDict / DSL files."""
import gzip, json, os, re, struct, sys, html

CHUNK = 48 * 1024

def norm(w):
    w = w.replace('́', '').replace('̀', '').lower().replace('ё', 'е')
    return re.sub(r'\s+', ' ', w).strip()

def enc_lemma(form, lemma):
    n = 0
    while n < min(len(form), len(lemma), 9) and form[n] == lemma[n]: n += 1
    return str(n) + lemma[n:]

def write_pack(out, meta, defs, forms):
    """defs: dict key -> (headword, text); forms: dict form -> set(lemma keys)"""
    def chunks(lines):
        res, buf, size, first = [], [], 0, None
        for k, line in lines:
            if first is None: first = k
            buf.append(line); size += len(line.encode()) + 1
            if size >= CHUNK:
                res.append((first, '\n'.join(buf))); buf, size, first = [], 0, None
        if buf: res.append((first, '\n'.join(buf)))
        return res
    dl = chunks((k, k + '\t' + defs[k][0] + '\t' + defs[k][1].replace('\t', ' ').replace('\n', '\\n')) for k in sorted(defs))
    fl = chunks((f, f + '\t' + '|'.join(enc_lemma(f, l) for l in sorted(forms[f]))) for f in sorted(forms))
    blobs, off, D, F = [], 0, [], []
    for tgt, lst in ((D, dl), (F, fl)):
        for first, txt in lst:
            z = gzip.compress(txt.encode(), 9, mtime=0)
            tgt.append([first, off, len(z)]); blobs.append(z); off += len(z)
    head = dict(meta, v=1, n=len(defs), nf=len(forms), d=D, f=F)
    with open(os.path.join(out, meta['id'] + '.rqd'), 'wb') as fh:
        fh.write(json.dumps(head, ensure_ascii=False, separators=(',', ':')).encode() + b'\n')
        for z in blobs: fh.write(z)
    size = os.path.getsize(os.path.join(out, meta['id'] + '.rqd'))
    print(meta['id'], len(defs), 'words', len(forms), 'forms', round(size / 1048576, 1), 'MB')
    return dict({k: meta[k] for k in ('id', 'name', 'lang', 'lic', 'src', 'about', 'kind') if k in meta}, n=len(defs), size=size, file=meta['id'] + '.rqd')

def strip_html(s):
    s = re.sub(r'<li[^>]*>', '\n• ', s); s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<i>\s*◆', '\n  ◆', s); s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\[[≈≠▲▼△▽]\s*\d+\]', '', s)
    s = html.unescape(s); s = re.sub(r'[ \t]+', ' ', s); s = re.sub(r'\n\s*\n+', '\n', s)
    return s.strip()

def read_stardict(base):
    idx = open(base + '.idx', 'rb').read()
    dz = base + '.dict.dz'; d = gzip.open(dz).read() if os.path.exists(dz) else open(base + '.dict', 'rb').read()
    words, i = [], 0
    while i < len(idx):
        j = idx.index(b'\0', i); w = idx[i:j].decode('utf8', 'replace'); off, sz = struct.unpack('>II', idx[j + 1:j + 9]); i = j + 9
        words.append((w, d[off:off + sz].decode('utf8', 'replace')))
    syn = []
    if os.path.exists(base + '.syn'):
        s = open(base + '.syn', 'rb').read(); i = 0
        while i < len(s):
            j = s.index(b'\0', i); w = s[i:j].decode('utf8', 'replace'); k, = struct.unpack('>I', s[j + 1:j + 5]); i = j + 5; syn.append((w, k))
    return words, syn

def pack_ru(base, out):
    words, syn = read_stardict(base)
    defs, keep = {}, set()
    for i, (w, x) in enumerate(words):
        k = norm(w)
        if not k or ' ' in k or len(k) > 40: continue
        t = strip_html(x)
        lines = [l for l in t.split('\n') if l.strip()]
        # first example per sense only, at most 12 senses, at most 1600 chars
        out_l, ex = [], False
        for l in lines:
            if l.lstrip().startswith('◆'):
                if ex: continue
                ex = True; out_l.append('  ' + l.strip()[:220])
            else:
                if sum(1 for q in out_l if q.startswith('•')) >= 12: break
                ex = False; out_l.append(l.strip())
        t = '\n'.join(out_l)[:1600]
        if not t: continue
        if k in defs:
            if len(defs[k][1]) < 1500: defs[k] = (defs[k][0], (defs[k][1] + '\n' + w + ':\n' + t)[:1600])
        else: defs[k] = (w, t)
        keep.add(i)
    forms = {}
    for w, k in syn:
        if k not in keep: continue
        f = norm(w); l = norm(words[k][0])
        if not f or f == l or ' ' in f or l not in defs: continue
        forms.setdefault(f, set()).add(l)
    return write_pack(out, dict(id='ru-wikt', name='Русский Викисловарь', lang='ru', lic='CC BY-SA 3.0',
        src='ru.wiktionary.org (Vuizur/ruwiktionary-htmldump-parser, дамп 2022)', about='Толковый: значения, примеры, все формы слов'), defs, forms)

WN_POS = {'n': 'сущ.', 'v': 'гл.', 'a': 'прил.', 's': 'прил.', 'r': 'нареч.'}
def pack_wn(dirn, out):
    data = {}
    for pos in ('noun', 'verb', 'adj', 'adv'):
        for line in open(os.path.join(dirn, 'data.' + pos), encoding='utf8', errors='replace'):
            if line.startswith('  '): continue
            off = line.split(' ', 1)[0]; g = line.split(' | ', 1)
            data[(pos, off)] = g[1].strip() if len(g) > 1 else ''
    defs = {}
    for pos in ('noun', 'verb', 'adj', 'adv'):
        for line in open(os.path.join(dirn, 'index.' + pos), encoding='utf8', errors='replace'):
            if line.startswith('  '): continue
            p = line.split(); lemma = p[0]; sc = int(p[2]); pc = int(p[3]); offs = p[4 + pc + 2:][:sc]
            k = norm(lemma.replace('_', ' '))
            if ' ' in k: continue
            senses = [data.get((pos, o), '') for o in offs[:8]]
            t = '\n'.join('• (' + {'noun': 'n.', 'verb': 'v.', 'adj': 'adj.', 'adv': 'adv.'}[pos] + ') ' + s.replace('; "', '\n  ◆ "') for s in senses if s)
            if k in defs: defs[k] = (defs[k][0], (defs[k][1] + '\n' + t)[:2400])
            else: defs[k] = (lemma.replace('_', ' '), t[:2400])
    return write_pack(out, dict(id='en-wordnet', name='WordNet (Принстон)', lang='en', lic='WordNet 3.1 License (Princeton University)',
        src='wordnet.princeton.edu (npm wordnet-db 3.1.14)', about='Английский толковый Принстонского университета'), defs, {})

def pack_web(path, out):
    j = json.load(open(path, encoding='utf8'))
    defs = {}
    for w, t in j.items():
        k = norm(w)
        if not k or ' ' in k: continue
        t = re.sub(r'\s+', ' ', t).strip()
        t = re.sub(r'\s*(?=\b\d{1,2}\. )', '\n', t).strip()
        defs[k] = (w.lower(), t[:2400])
    return write_pack(out, dict(id='en-webster1913', name='Webster 1913', lang='en', lic='Public domain (Project Gutenberg #29765)',
        src='gutenberg.org/ebooks/29765', about='Большой английский словарь 1913 года, хорош для классики'), defs, {})

def pack_dal(sql, out):
    import sqlite3
    c = sqlite3.connect(':memory:'); c.executescript(open(sql, encoding='utf8').read())
    defs = {}
    for w, d in c.execute('select word, description from word'):
        if not w or not d: continue
        k = norm(w)
        if not k or ' ' in k: continue
        d = re.sub(r'\s+', ' ', d).strip()
        m = re.match(r'^([^\s,.;]+)[\s,.;]+', d)
        head = w.lower()
        if m and norm(m.group(1)) == k: head = m.group(1).lower(); d = d[m.end():].strip()
        d = re.sub(r'\s*\|\s*', '\n• ', d)
        if '\n• ' in d: d = '• ' + d
        if k in defs: defs[k] = (defs[k][0], (defs[k][1] + '\n' + d)[:3000])
        else: defs[k] = (head, d[:3000])
    return write_pack(out, dict(id='ru-dal', name='Словарь Даля', lang='ru', lic='Общественное достояние (1863–1866)',
        src='Толковый словарь живого великорусского языка (stolyarchukav/dal-dictionary)', about='Толковый словарь живого великорусского языка: старинные и народные слова, пословицы'), defs, {})

def wikt_text(x, senses=10, cap=1500):
    x = re.sub(r'<i>([^<]{1,40})</i>\s*<br\s*/?>', lambda m: '\n(' + m.group(1) + ')\n', x)
    t = strip_html(x)
    out_l, n = [], 0
    for l in t.split('\n'):
        l = l.strip()
        if not l: continue
        if l.startswith('•'):
            n += 1
            if n > senses: continue
        out_l.append(l)
    return '\n'.join(out_l)[:cap]

def pack_enwikt(base, out):
    words, syn = read_stardict(base)
    grp, keep = {}, set()
    for i, (w, x) in enumerate(words):
        k = norm(w)
        if not k or ' ' in k or len(k) > 40: continue
        t = wikt_text(x)
        if not t: continue
        grp.setdefault(k, []).append((w != w.lower(), i, w, t)); keep.add(i)
    defs = {}
    for k, L in grp.items():
        L.sort()  # the lower-case word first («cat» before «CAT»)
        txt = ''
        for low, i, w, t in L:
            if len(txt) >= 1400: break
            txt = (txt + '\n' + (w + ':\n' if txt else '') + t) if txt else t
        defs[k] = (L[0][2], txt[:1600])
    forms = {}
    for w, k in syn:
        if k not in keep: continue
        f = norm(w); l = norm(words[k][0])
        if not f or f == l or ' ' in f or l not in defs: continue
        forms.setdefault(f, set()).add(l)
    pack_enwikt.forms = forms
    return write_pack(out, dict(id='en-wikt', name='Английский Викисловарь', lang='en', lic='CC BY-SA 3.0',
        src='en.wiktionary.org (Vuizur/Wiktionary-Dictionaries)', about='Самый полный английский толковый: современные слова, сленг, все формы'), defs, forms)

def pack_enru(base, out, en_forms=None):
    words, syn = read_stardict(base)
    acc = {}
    for w, x in words:
        if not re.search('[а-яё]', w, re.I) or ' ' in w.strip(): continue
        x = re.sub(r'<i>([^<]{1,40})</i>\s*<br\s*/?>', lambda m: '\n(' + m.group(1) + ')\n', x)
        pos = ''
        si = 0
        for l in strip_html(x).split('\n'):
            l = l.strip()
            if l.startswith('(') and l.endswith(')') and len(l) < 40: pos = l[1:-1]; continue
            if not l.startswith('•'): continue
            si += 1
            g = l[1:].strip()
            if re.match(r'^(inflection|alternative|form|plural|genitive|dative|accusative|instrumental|prepositional|nominative|short|comparative|superlative|feminine|masculine|neuter|diminutive|augmentative|past|present|future|imperative|participle|first|second|third|singular|obsolete spelling|pre-reform)\b', g, re.I): continue
            core = re.sub(r'\([^)]*\)', '', g)
            for ci, cand in enumerate(re.split(r'[,;]', core)):
                cand = cand.strip().lower()
                cand = re.sub(r'^(to|a|an|the)\s+', '', cand)
                if not cand or ' ' in cand or not re.match(r"^[a-z][a-z'-]*$", cand): continue
                acc.setdefault(cand, []).append((si, ci, len(w), w, pos, g))
    defs = {}
    BAD = re.compile(r'\((?:[^)]*\b)?(archaic|dated|dialectal|obsolete|rare|derogatory|folklore|relational|poetic|slang|Internet|nautical|historical|vulgar|offensive|colloquial|regional|ironic|humorous|jargon|euphemistic|childish|figuratively|Christianity|Ukraine|Belarus)\b', re.I)
    for k, L in acc.items():
        L.sort(key=lambda r: (bool(BAD.search(r[5])) + ('iterative' in r[5]), r[5].strip().lower() not in (k, 'to ' + k, 'a ' + k, 'an ' + k), r[0], r[1], r[2]))
        seen, lines = set(), []
        for si, ci, _, w, pos, g in L:
            if norm(w) in seen: continue
            seen.add(norm(w))
            lines.append('• ' + w + (' (' + {'noun': 'сущ.', 'verb': 'гл.', 'adj': 'прил.', 'adv': 'нареч.'}.get(pos, pos) + ')' if pos else '') + ' — ' + g)
            if len(lines) >= 12: break
        defs[norm(k)] = (k, '\n'.join(lines)[:1800])
    forms = {}
    for f, ls in (en_forms or {}).items():
        ls = {l for l in ls if l in defs}
        if ls and f not in defs: forms[f] = ls
    return write_pack(out, dict(id='en-ru', name='Англо-русский (Викисловарь)', lang='en', kind='tr', lic='CC BY-SA 3.0',
        src='en.wiktionary.org, русские слова с переводом (Vuizur/Wiktionary-Dictionaries)', about='Перевод английских слов на русский, без интернета'), defs, forms)

if __name__ == '__main__':
    a = sys.argv[1:]; out = a[0]; os.makedirs(out, exist_ok=True)
    opt = {a[i]: a[i + 1] for i in range(1, len(a) - 1, 2)}
    cat = []
    if '--ru' in opt: cat.append(pack_ru(opt['--ru'], out))
    if '--wn' in opt: cat.append(pack_wn(opt['--wn'], out))
    if '--web' in opt: cat.append(pack_web(opt['--web'], out))
    if '--dal' in opt: cat.append(pack_dal(opt['--dal'], out))
    if '--enwikt' in opt: cat.append(pack_enwikt(opt['--enwikt'], out))
    if '--enru' in opt: cat.append(pack_enru(opt['--enru'], out, getattr(pack_enwikt, 'forms', None)))
    ORDER = ['ru-wikt', 'ru-dal', 'en-ru', 'en-wordnet', 'en-wikt', 'en-webster1913']  # the order in «Словарях» and in the word window
    cat.sort(key=lambda p: ORDER.index(p['id']) if p['id'] in ORDER else 99)
    json.dump({'v': 1, 'packs': cat}, open(os.path.join(out, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
