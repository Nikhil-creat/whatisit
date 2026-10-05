# WhatIsIt AI Lens v3
On-device AI camera PWA: COCO-SSD detection (WebGPU > WebGL > CPU), Deep ID (MobileNet, 1000 object types), Wikipedia knowledge for any object, voice commands, auto-read, object counts, snapshots, scan history, offline install.

## Termux upload (phone only)
1. Create an EMPTY public repo `whatisit` on github.com (no README).
2. Create a token: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic) > repo scope. Copy it.
3. In Termux:
   pkg update -y && pkg install -y git unzip && termux-setup-storage
   cd ~ && unzip ~/storage/downloads/whatisit-master-v2.zip && cd whatisit-master
   bash push.sh
   (Username = your GitHub username, Password = the token.)
4. Repo > Settings > Pages > Deploy from a branch > main /(root) > Save.
5. Open https://YOUR-USERNAME.github.io/whatisit/ and tap Start lens.

## Updating later
cd ~/whatisit-master && git add . && git commit -m "update" && git push

## Troubleshooting
- Camera blocked: must be the https github.io link.
- 404: Pages not set to main /(root), or index.html not at repo root.
- Old version: clear site data (service worker cache).
- Push rejected: repo must be empty, or run: git pull origin main --allow-unrelated-histories

## AI chat setup (v3)
1. Free keys: Groq at console.groq.com/keys, Gemini at aistudio.google.com/apikey.
2. Open the app > Settings > pick provider > paste key > Load models > choose a text and a vision model > Test.
3. Chat tab: ask about the detected object, use the quick chips, or tap AI Vision to analyse the whole frame. Reply language: English, Hindi, Telugu, Tamil, Kannada, Bengali, Spanish.
Security: this is a static site, so the key lives only in your browser (localStorage). NEVER put a key in the code or the repo. Model names change; if you see a model error, use Load models and pick another.
Update in Termux: cd ~/whatisit-master && git add . && git commit -m "v3" && git push
