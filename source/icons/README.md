# App icons (PWA)
Currently wired: **variant 1** from `/workspace/readquest-ui/pwa/` (Интерфейс).
To swap variant: overwrite these three files only (names stay the same, manifest/app.html untouched):
- `icon-192.png`, `icon-512.png` — purpose `any`
- `icon-maskable-512.png` — purpose `maskable` (art inside 80 % safe zone)
build-dist.sh copies `icons/*.png`; sw.js precaches them.
