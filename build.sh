#!/bin/sh
# Baut dist/krug-und-krone.zip zum Hochladen auf itch.io, CrazyGames & Co.
# index.html muss im Wurzelverzeichnis des Zips liegen.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist/game/art
cp index.html game.js engine.js style.css LIZENZEN.md dist/game/
cp -r cards fonts orn dist/game/
cp art/board.jpg art/edgewear.png art/grime.jpg art/scratch.jpg art/scratch.png dist/game/art/
(cd dist/game && zip -qr9 ../krug-und-krone.zip .)
echo "dist/krug-und-krone.zip: $(du -h dist/krug-und-krone.zip | cut -f1), $(cd dist/game && find . -type f | wc -l) Dateien"
