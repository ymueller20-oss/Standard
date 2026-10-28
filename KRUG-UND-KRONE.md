# Krug & Krone: Übergabe

Stand: 28.10.2026. Diese Datei reicht, um das Spiel auf einem anderen Claude-Account weiterzubauen. Lies sie ganz, bevor du etwas änderst.

## Schnellstart für den neuen Account

1. Auf claude.ai/code dasselbe GitHub-Konto verbinden und das Repo `ymueller20-oss/standard` freigeben.
2. Eine Session mit diesem Repo starten und schreiben: „Lies KRUG-UND-KRONE.md auf Branch `ccr-b73866f8-agrhad`“.
3. Gearbeitet und gepusht wird auf genau diesem Branch. Dort liegt das ganze Spiel.

**Wichtig zum Handy-Link:** Die bisherige Spielseite https://claude.ai/artifact/AasaopibDpG9Q4eU1TGRwd gehört dem alten Account. Ein neuer Account kann sie nicht aktualisieren. Er veröffentlicht stattdessen eine neue Seite mit einem neuen Link. Danach das alte Symbol vom Startbildschirm löschen und den neuen Link per „Zum Startbildschirm hinzufügen“ anlegen. Ab dann kommt jedes Update über diesen neuen Link an.

## Wer der Nutzer ist

- Azubi Mediengestalter Bild und Ton bei TIGA. Schreibt Deutsch, vom Handy, kurz und locker, mit vielen Tippfehlern.
- Will ehrliche, direkte Antworten ohne Absicherungen. Wenig Technikwissen, also Technik in einfachen Worten erklären.
- Sehr gutes Auge und Ohr: merkt sofort, wenn etwas billig, generisch oder „nach KI“ aussieht oder klingt.
- Ziel: etwa 200 € im Monat für ein höheres Claude-Abo. Er will ein Produkt bauen und verkaufen, keine Dienstleistungen anbieten.
- Wenn er „Link“ schreibt, will er die spielbare Seite fürs Handy.
- **Offen:** Ihn daran erinnern, den Google/YouTube-API-Key zu erneuern, den er in einer alten Session in den Chat kopiert hat (alten Key löschen, neuen erstellen).

## Produktplan

- Zuerst eine Android-App für etwa 3 €, nur gegen KI.
- Später neue Spielbretter und Kartendesigns für je 1 € im Spiel.
- Noch später online: freie Plätze am Tisch füllen KI-Gegner passender Stärke auf.
- Heute ist es ein statisches HTML-Spiel, das im Handy-Browser läuft. Für den Play Store fehlt noch die Verpackung als App (zum Beispiel TWA oder Capacitor), ebenso Konto, Datenschutzerklärung und Store-Eintrag.

## Das Spiel

Poker trifft Battlegrounds am Tavernentisch.

- **Partie:** sechs Spieler, du gegen fünf KI-Gegner. Start mit 500 Gold und 30 Thron-Leben, gespielt werden 12 Nächte (der Nutzer will die 12 behalten).
- **Hand:** Hold'em um Gold mit Kriegszoll (Blinds) und einer Opfer-Runde, in der eine Handkarte abgelegt wird.
- **Showdown:** eine automatische Schlacht. Jeder stellt 5 seiner 7 Karten auf. Die Pokerkombo wird zur Formation und gibt allen fünf Karten einen Bonus. Die Reihenfolge der Karten wählt der Spieler.
- **Karten:** Stärken 2 bis 14 sind Kreaturen, von der Ratte bis zum Drachen. Die vier Farben sind Reiche mit eigener Synergie:
  - Sonnenwacht: Gottesschild
  - Aschelande: Glut und Ketten
  - Nordmark: Frost
  - Blutmoor: Blutrausch

  Karten der Stärke 2 bis 5 sind Unterstützer, die ihr Reich stärken.
- **Kombos (Formationen):** Einzelgänger, Paar, Zwei Paare, Rudel (Drilling), Jagdkette (Straße), Banner (Flush), Horde (Full House), Plage (Vierling), Kriegszug (Straight Flush), Drachenkrone (Royal Flush).
- **Nach dem Showdown:** Wer verliert, verliert Thron-Leben. Zwischen den Nächten gibt es die Taverne: Siegel stärken eine Stärke oder ein Reich dauerhaft, Söldner kommen ins Heerlager (höchstens 2), dazu Relikte.
- **Lehrstunde:** Beim ersten Spiel erklärt der Wirt jeden Schritt einmal. Auf dem Titelbild lässt sie sich überspringen oder neu starten.

## Dateien

| Datei | Inhalt |
|---|---|
| `engine.js` | Kampf-Engine und alle Balance-Werte (`K`, `PST`). Wird auch von den Simulationen benutzt. |
| `game.js` | Ablauf, Oberfläche, KI, Taverne, Lehrstunde, Regeln, Effekt-Anzeigen |
| `battle.js` | Inszenierung des Showdowns |
| `audio.js` | Musik und Geräusche (Objekt `AU`) |
| `style.css` | Alles Optische. Feste Bühne von 400 px Breite, skaliert über `--s` |
| `index.html` | Lädt alles. Zum Testen `python3 -m http.server` im Ordner starten |
| `cards/`, `art/`, `orn/`, `fonts/` | Kartenbilder, Brett und Texturen, Ornamente, Schriften (alles lokal) |
| `audio/` | `musik/*.mp3`, `sfx/*.mp3`, `index.json` (Schleifenlängen und Anzahl Varianten) |
| `audio-src/` | Skripte, die Musik und Geräusche erzeugen |
| `sim/` | Balance-Simulationen |
| `werbung/` | 15-Sekunden-Werbeclip und Skripte dazu |
| `build.sh` | Baut `dist/krug-und-krone.zip` für itch.io oder CrazyGames |
| `LIZENZEN.md` | Herkunft und Lizenzen aller Inhalte |

## Balance (per Simulation geprüft)

- Kommandos: `node sim/balance.js` (Kämpfe), `node sim/taverne.js` (Wert pro Gold), `node sim/kombos.js` (Kombos gegeneinander).
- **Ziele, die aktuell erreicht sind:**

  | Was | Ergebnis |
  |---|---|
  | Bessere Kombo gewinnt insgesamt | etwa 75 % |
  | Rudel (Drilling) | ~82 % |
  | Jagdkette (Straße) | ~90 % |
  | Horde (Full House) | ~95 % |
  | Plage (Vierling) | ~99 % |
  | Kampfdauer | 3–4 Runden, kaum Unentschieden |

  Die Reihenfolge der Karten dreht etwa 20 % der Niederlagen.
- **Wichtige Werte:**
  - Formationsbonus `K.FB = [0,0,2,7,9,11,14,22,28,36]`
  - Grundwerte `PST` mit dreifachen Leben
  - Bei gegenseitiger Auslöschung gewinnt die bessere Formation.
- **Wunsch des Nutzers:** Seltene Kombos müssen sich lohnen, auch mit kleinen Karten. Er hat sich beschwert, als ein Vierling mit Siebenen verloren hat und als ein Drilling zu schwach war. Diese Werte nicht wieder absenken.
- **Taverne:**
  - Preise und Gewinne sind auf den Wert pro Gold abgestimmt (`FORGE_UP=6`, `OATH_UP=3`, `MERC_GAIN`, `mercCost`).
  - Angebote zeigen ein „Tipp“-Abzeichen, wenn sie sich für das eigene Blatt lohnen.
  - Die KI kauft nach demselben Wert (`offerValue`, `aiShop`).
- **Effekte ohne Zahlen:**
  - Symbole auf den Karten zeigen Formation, Schild, Glut, Frost, Blutrausch, Reichsbonus, Siegel und Leibwächter in drei Stufen.
  - Eine Stärke-Anzeige bewertet das Team von Schwach bis Legendär.
  - Eine Treppe zeigt, wo die Kombo steht.
  - Sterne bewerten die Synergien.

## Showdown

Ziel des Nutzers: „Nägel abkauen, große Augen, wie ein AAA-Titel.“

**Ablauf:**
1. Kinobalken und ein „gegen“-Intro mit Gegnerspruch.
2. Die Karten werden aufgedeckt, die Formation bekommt eine Aura, dazu ein Kriegsruf.
3. Die Runden laufen als Duelle auf den Bahnen, mit Treffern, Kritischen, Feueratem, Frost, Gift und Wiederbelebung.
4. Der letzte Schlag kommt in Zeitlupe, dazu ein Satz zum Sieger.
5. Finale mit Lichtstrahlen, Münzregen und dem Thron-Leben, das herunterzählt.

**Technik:**
- Animationen über WAAPI.
- Partikel auf einem Canvas mit vorberechneten Sprites.
- Hitstop, also ein kurzes Einfrieren beim Treffer.
- Herzschlag-Vignette, wenn es knapp wird.
- Läuft mit etwa 50–56 fps auf gedrosselter Hardware.
- Ein Kampf dauert etwa 17–28 Sekunden.

## Klang

- **Musik:** Irish Folk trifft Italo-Western. Der Nutzer findet sie „ultra geil“, also nicht anfassen.
  - Als MIDI komponiert (`audio-src/compose.py`).
  - Mit fluidsynth und FluidR3_GM eingespielt (`render_music.py`), mit sox gemastert und als MP3 gespeichert.
  - Schleifen: titel, tisch, taverne, showdown.
  - Kurze Stücke (Stings): duell, sieg, niederlage, spielsieg, spielende, nacht.
- **Geräusche:**
  - Aufnahmen aus Kenney-Paketen (CC0) plus Einzelschläge aus FluidR3 wie Pauke, Taiko, Orchesterschlag und Röhrenglocke (`audio-src/sfx.py`).
  - Derselbe Klang spielt höchstens alle 90 ms, sonst doppelt er sich.
  - **Keine erzeugten Synth-Klänge:** Der Nutzer fand sie „generisch und billig“.
- **Stimmen:** Komplett entfernt. Die TTS-Stimmen (Piper) nannte der Nutzer eine „Katastrophe“. Keine TTS-Stimmen wieder einbauen. Wenn Stimmen, dann echte Aufnahmen, eventuell vom Nutzer selbst.
- **Optionen:** Im Ton-Menü lassen sich nur Musik und Geräusche schalten.

## Werbeclip (`werbung/`)

- `krug-und-krone-15s.mp4`: 15 Sekunden, 1080×1920, nur echte Spielszenen.
  - Ablauf: Flop, vier Drachen, Team, Gegen-Bild, Schlacht, Sieg, Titel.
  - Musik und Geräusche stammen aus dem Spiel.
- Die Kartenverteilung war für den Dreh festgelegt. Im Begleittext deshalb nicht behaupten, dass vier Drachen oft vorkommen.
- **Neu aufnehmen:**
  1. Spiel lokal auf Port 8766 starten.
  2. `node capture.js frames` nimmt in Zeitlupe auf (Playwright und CDP).
  3. `python3 cut.py` schneidet. `cut.py` braucht unter `fonts/` die Spielschriften als TTF; die woff2-Dateien aus `fonts/` vorher umwandeln.
- `startbilder/`: Startbilder für Google Flow. Claude kann Flow nicht bedienen, der Nutzer macht das selbst. Flow nur Kamera, Licht und Partikel bewegen lassen, Karten nicht verändern.

## Veröffentlichen

- **Spielseite:** Das Spiel wird als mehrteiliges Artifact veröffentlicht. Dafür alle Spieldateien in einen Ordner kopieren:
  - `index.html` und die JS/CSS-Dateien
  - `cards`, `fonts`, `orn`, `audio`
  - aus `art/` nur die von `build.sh` genutzten Bilder

  `index.html` ist die Seite, alles andere kommt über `files`. Pro Veröffentlichung gehen höchstens 255 Dateien, große Updates daher auf mehrere Veröffentlichungen an dieselbe URL aufteilen, mit `index.html` zuletzt.
- **Nach jeder Änderung:**
  1. Im Browser durchspielen (Playwright; `?qa` in der URL macht das Spiel schnell).
  2. Auf Fehler in der Konsole achten.
  3. Committen und pushen.
  4. Die Seite neu veröffentlichen und dem Nutzer den Link geben.

## Was der Nutzer abgelehnt oder entschieden hat

- Canva-Vorlagen als Geschäftsidee: abgelehnt.
- Es bleibt bei 12 Nächten.
- Versteckte, überstarke Kombos: abgelehnt („Ne bro“).
- Billig wirkende Knöpfe wurden neu gestaltet. Beim Design immer auf hochwertig achten.

## Mögliche nächste Schritte

- **Mit Freunden testen:** Wie lange dauert eine Partie, wo hängen sie fest?
- **Android-Verpackung und Play-Store-Eintrag** (Preis etwa 3 €).
- **Erste Zusatzinhalte für 1 €:** ein zweites Brett (`art/board-buch.jpg` liegt schon da) oder ein Kartendesign.
- **Mehr Werbung:** weitere Clips aus echtem Material, eventuell eine englische Version.
- **Später:** Online-Modus mit KI-Lückenfüllern.
