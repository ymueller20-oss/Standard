# Krug & Krone

Poker + Battlegrounds im Thronsaal. Einfach `index.html` über einen lokalen Server öffnen (z. B. `python3 -m http.server`).

- Hold'em um Gold mit Opfer-Runde; der Showdown ist eine automatische Schlacht (5 von 7 Karten, die Pokerkombo ist die Formation).
- Verlierer verlieren Thron-Leben, zwischen den Händen kaufst du dauerhafte Siegel in der Aschenschmiede.
- Das untere Drittel gehört deinen Karten; Kampf-Engine in `engine.js`.

## Balance messen

`node sim/balance.js` simuliert 3.000 Kämpfe und zeigt, wie stark Kombo, Reiche und einzelne Karten entscheiden. Zielwerte: bessere Kombo gewinnt 60–70 %, Kämpfe dauern 3–4 Runden, kaum Remis. Alle Stellschrauben stehen in `engine.js` unter `K` und `PST`.
