#!/data/data/com.termux/files/usr/bin/bash
# Termux helper: bash push.sh
set -e
pkg install -y git >/dev/null 2>&1 || true
read -p "GitHub username: " U
read -p "GitHub email: " E
read -p "Repo name [whatisit]: " R; R=${R:-whatisit}
git config --global user.name "$U"; git config --global user.email "$E"
[ -d .git ] || git init -q
git add .; git commit -qm "WhatIsIt v2" || true
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$U/$R.git"
echo; echo "When asked: Username = $U | Password = your Personal Access Token (not your GitHub password)"
git push -u origin main
echo; echo "Pushed. Now enable Pages: repo > Settings > Pages > main /(root) > Save"
echo "Your site: https://$U.github.io/$R/"
