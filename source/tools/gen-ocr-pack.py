#!/usr/bin/env python3
"""28.10 распознавание сканов (js/ocr.js): движок Tesseract (tesseract.js-core, Apache-2.0) и языки rus + eng.

Как и пакеты перевода, лежит один раз на весь сайт: в main /ocr/ (общий для корня и /test/; в source/ и dist/ не попадает).
Телефон скачивает по кнопке ОДИН вариант движка (по поддержке SIMD) и оба языка, ~10 МБ, в Cache Storage NS_ocr.

  python3 tools/gen-ocr-pack.py OUT_DIR

Пишет OUT_DIR/index.json ({v, core: {relaxedsimd|simd|plain: {name, size, sha256}}, langs: {rus|eng: {name, size, sha256}}}),
OUT_DIR/tesseract-core-*-lstm.wasm.js, OUT_DIR/{rus,eng}.traineddata.gz (tessdata 4.0.0_best_int из @tesseract.js-data), LICENSE, README.txt.
"""
import hashlib, io, json, os, sys, tarfile, urllib.request

CORE = ('tesseract.js-core', '7.0.0')
LANGS = {'rus': ('@tesseract.js-data/rus', '1.0.0'), 'eng': ('@tesseract.js-data/eng', '1.0.0')}
VARIANTS = {'relaxedsimd': 'tesseract-core-relaxedsimd-lstm.wasm.js', 'simd': 'tesseract-core-simd-lstm.wasm.js', 'plain': 'tesseract-core-lstm.wasm.js'}


def tgz(name, ver):
    base = name.split('/')[-1]
    url = 'https://registry.npmjs.org/%s/-/%s-%s.tgz' % (name, base, ver)
    with urllib.request.urlopen(url, timeout=300) as r:
        return tarfile.open(fileobj=io.BytesIO(r.read()), mode='r:gz')


def put(out, name, data):
    with open(os.path.join(out, name), 'wb') as f:
        f.write(data)
    return {'name': name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    idx = {'v': 1, 'source': 'tesseract.js-core %s, @tesseract.js-data 4.0.0_best_int (Apache-2.0)' % CORE[1], 'core': {}, 'langs': {}}
    t = tgz(*CORE)
    for k, fn in VARIANTS.items():
        idx['core'][k] = put(out, fn, t.extractfile('package/' + fn).read())
    put(out, 'LICENSE', t.extractfile('package/LICENSE').read())
    for lang, (name, ver) in LANGS.items():
        t = tgz(name, ver)
        idx['langs'][lang] = put(out, lang + '.traineddata.gz', t.extractfile('package/4.0.0_best_int/%s.traineddata.gz' % lang).read())
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump(idx, f, ensure_ascii=False, indent=1)
    with open(os.path.join(out, 'README.txt'), 'w') as f:
        f.write('Распознавание текста сканов в ReadQuest (js/ocr.js): движок Tesseract и языки, Apache-2.0. Сделано tools/gen-ocr-pack.py.\n')
    print(out, sum(x['size'] for x in list(idx['core'].values()) + list(idx['langs'].values())) // 1048576, 'MB')


if __name__ == '__main__':
    main()
