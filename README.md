# Krug & Krone

Poker trifft Battlegrounds am Tavernentisch: acht Nächte, sechs Spieler. Zum Starten `index.html` über einen lokalen Server öffnen (z. B. `python3 -m http.server`).

- Gespielt wird Hold'em um Gold mit Kriegszoll (Blinds) und einer Opfer-Runde.
- Der Showdown ist eine automatische Schlacht: Du stellst 5 von 7 Karten auf, die Pokerkombo wird zur Formation, und die Reihenfolge wählst du frei.
- Wer verliert, verliert Thron-Leben. Zwischen den Nächten kaufst du in der Taverne Siegel und Söldner fürs Heerlager.
- Beim ersten Spiel erklärt der Wirt jeden Schritt einmal (Lehrstunde). Auf dem Titelbild lässt sie sich überspringen oder neu starten.
- Die Kampf-Engine steckt in `engine.js`, Oberfläche und Ablauf in `game.js`.

## Balance messen
`node sim/balance.js` simuliert 3.000 Kämpfe und zeigt, wie stark Kombo, Reiche und einzelne Karten entscheiden. Zielwerte: bessere Kombo gewinnt etwa 3 von 4 Kämpfen; ab dem Rudel (Drilling) gewinnt die Kombo meist, Plage fast immer, Kämpfe dauern 3–4 Runden, kaum Remis. Alle Stellschrauben stehen in `engine.js` unter `K` und `PST`.

## Veröffentlichen
`./build.sh` erzeugt `dist/krug-und-krone.zip`. Das Zip lässt sich direkt als HTML-Spiel auf itch.io oder CrazyGames hochladen.

Das Spiel lädt nichts von fremden Servern: Die Schriften liegen in `fonts/`, Musik und Geräusche in `audio/` (Quellen und Skripte in `audio-src/`).

Herkunft und Lizenzen aller Inhalte stehen in [LIZENZEN.md](LIZENZEN.md).
