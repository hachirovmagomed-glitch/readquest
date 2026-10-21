#!/usr/bin/env python3
"""21.10 перевод: пакеты языков для js/translate.js из моделей Mozilla (Firefox Translations).

Ведро Mozilla не отдаёт CORS, поэтому из браузера их не скачать — кладём к себе: в main /tr/ (один раз на весь
сайт, общий для корня и /test/; в source/ и dist/ модели не попадают).

  python3 tools/gen-tr-models.py OUT_DIR [en-ru ru-en de-en ...]

Пишет OUT_DIR/index.json ({v, pairs: {enru: {files: {model, lex, vocab: {name, size, sha256}}}}}),
OUT_DIR/<пара>/*.gz (файлы как у Mozilla, сжатые; браузер распаковывает DecompressionStream) и README.txt.
Модель для каждой пары: base-memory из релиза Firefox (Android/общий), иначе tiny из релиза.
"""
import hashlib, json, os, sys, urllib.request

REG = 'https://storage.googleapis.com/moz-fx-translations-data--303e-prod-translations-data/db/models.json'
DEFAULT = ['en-ru', 'ru-en', 'de-en', 'fr-en', 'es-en', 'it-en']


def pick(models):
    def rank(m):
        st = m.get('releaseStatus') or ''
        rel = 0 if st in ('Release', 'Release Android') else 1 if st else 2
        arch = {'base-memory': 0, 'tiny': 1, 'base': 2}.get(m.get('architecture'), 3)
        return (rel, arch)
    return sorted(models, key=rank)[0]


def get(url):
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = sys.argv[1]
    pairs = sys.argv[2:] or DEFAULT
    reg = json.loads(get(REG))
    base = reg['baseUrl'].rstrip('/')
    idx = {'v': 1, 'source': 'Mozilla Firefox Translations models, ' + REG, 'pairs': {}}
    for p in pairs:
        m = pick(reg['models'][p])
        key = p.replace('-', '')
        files = {}
        for part in ('model', 'lex', 'vocab'):
            path = m['files']['lexicalShortlist' if part == 'lex' else part]['path']
            data = get(base + '/' + path)
            name = key + '/' + os.path.basename(path)
            os.makedirs(os.path.join(out, key), exist_ok=True)
            with open(os.path.join(out, name), 'wb') as f:
                f.write(data)
            files[part] = {'name': name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        idx['pairs'][key] = {'arch': m['architecture'], 'release': m.get('releaseStatus'), 'files': files}
        print(p, m['architecture'], m.get('releaseStatus'), round(sum(f['size'] for f in files.values()) / 1048576, 1), 'MB')
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump(idx, f, ensure_ascii=False, indent=1)
    with open(os.path.join(out, 'README.txt'), 'w') as f:
        f.write('Translation models for ReadQuest offline translation (js/translate.js).\n'
                'Copied unchanged from Mozilla Firefox Translations (https://github.com/mozilla/translations), '
                'registry ' + REG + '\nUsed with the Bergamot engine (vendor/bergamot, MPL-2.0).\n')


if __name__ == '__main__':
    main()
