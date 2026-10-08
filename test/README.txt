ReadQuest static build
----------------------
Upload the contents of this folder to GitHub Pages (or any static host).

Open: https://<user>.github.io/<repo>/
Under a project site the app uses relative paths (./storage/...), so it works
at https://<user>.github.io/<repo>/ as well as at the domain root.

No build step, no server API, no login required. Books & progress stay in the
browser (localStorage + IndexedDB).
