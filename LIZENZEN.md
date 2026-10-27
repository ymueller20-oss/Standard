# Lizenzen und Herkunft der Inhalte

Stand: Oktober 2026. Das ist eine Bestandsaufnahme, keine Rechtsberatung.

## Code
Eigene Arbeit (`engine.js`, `game.js`, `index.html`, `style.css`). Es gibt keine Fremdbibliotheken und keinen Build-Schritt.

## Schriften (`fonts/`)
| Schrift | Lizenz |
|---|---|
| Crimson Pro | SIL Open Font License 1.1 |
| Grenze Gotisch | SIL Open Font License 1.1 |
| IM Fell English, IM Fell English SC | SIL Open Font License 1.1 |
| Vollkorn | SIL Open Font License 1.1 |

- Die Lizenztexte liegen in `fonts/LIZENZEN-OFL.txt`. Kommerzielle Nutzung und Mitliefern sind erlaubt. Verboten ist nur der Verkauf der Schriftdateien für sich allein.
- Die Schriften sind **selbst gehostet**. Das Spiel lädt sie nicht mehr von Google, weil das Einbinden von Google Fonts deutsche Seitenbetreiber abmahnbar macht: Das LG München I hat 2022 entschieden, dass dabei die IP-Adresse ohne Einwilligung an Google übertragen wird (Az. 3 O 17493/20).

## Bilder
| Datei | Herkunft |
|---|---|
| `cards/*.jpg`, `cards/s/*.jpg` (Kartenmotive, Porträts) | KI-generiert (Canva Magic Media bzw. Figma AI), danach zugeschnitten und skaliert |
| `art/board.jpg`, `art/board-buch.jpg` (Tisch) | KI-generiert (Figma AI), hochskaliert |
| `art/scratch.*`, `art/grime.jpg` (Gebrauchsspuren) | KI-generiert, nachbearbeitet |
| `art/edgewear.png` | per Skript erzeugt (eigene Arbeit) |
| `orn/*.svg`, Reichszeichen, Icons im Code | eigene Arbeit |

**Was die Anbieter sagen:**
- **Figma AI Terms:** „Customer retains all right, title, and interest in Customer's Input and Output.“ Die Bilder gehören dir. Figma gibt aber keine Garantie, dass sie keine Rechte Dritter verletzen, und keine Freistellung (Indemnity).
- **Canva AI Product Terms:** Erzeugte Bilder dürfen kommerziell genutzt werden, aber nicht exklusiv. Andere können ähnliche Bilder erzeugen. Prüfen musst du selbst, ob ein Bild geschützten Werken, Marken oder Logos ähnelt.

**Was das praktisch heißt:**
1. **Nutzen und verkaufen darfst du.** Ein Urheberrecht an rein KI-generierten Bildern bekommst du nach deutschem und US-Recht aber in der Regel nicht. Andere dürfen sie also kopieren. Schützen kannst du nur, was du selbst gestaltet hast: Spielregeln als Umsetzung, Code, Layout, Rahmen, Name als Marke.
2. **Kennzeichnen.** Im Spiel steht der Hinweis unter „Lizenzen & Hinweise“ auf dem Titelbild. Er deckt die Transparenzpflicht für künstlerische Werke nach Art. 50 der EU-KI-Verordnung ab, die seit 2. August 2026 gilt. Auf itch.io beim Hochladen die Frage „Generative AI Disclosure“ mit „Ja, Grafiken“ beantworten. Steam verlangt die Angabe ebenfalls.
3. **Keine fremden Marken.** Keine Namen, Logos oder Figuren aus Hearthstone, Warcraft oder Magic verwenden. Die Spielmechanik selbst ist nicht geschützt.

## Offene Punkte vor dem Verkauf
- [ ] Markenrecherche „Krug & Krone“: [DPMAregister](https://register.dpma.de) und [EUIPO eSearch](https://euipo.europa.eu/eSearch/), Klassen 9, 28 und 41.
- [ ] Prüfen, mit welchem Tarif (Free/Pro) die Canva-Bilder erzeugt wurden. Die kommerziellen Rechte können vom Tarif abhängen.
- [ ] Impressum und Datenschutzerklärung auf der Verkaufsseite (Pflicht bei gewerblichem Angebot in Deutschland).
- [ ] Gewerbe anmelden; beim Finanzamt die Kleinunternehmerregelung (§ 19 UStG) wählen.

## Klang (`audio/`)
| Inhalt | Herkunft | Lizenz |
|---|---|---|
| `audio/musik/*` | eigene Kompositionen (`audio-src/compose.py`), eingespielt mit dem FluidR3_GM-Soundfont | Musik eigene Arbeit; FluidR3_GM: MIT-Lizenz |
| `audio/sfx/` Karten, Chips, Würfel, Münzen, Klingen, Treffer, Glas, Glocke, Holz, Stein, Buch, Tür | Kenney.nl: Casino Audio, Impact Sounds, RPG Audio | CC0 |
| `audio/sfx/` Pauke, Taiko, Orchesterschlag, Röhrenglocke, Beckenschwell | mit FluidR3_GM eingespielt (`audio-src/sfx.py`) | MIT (Soundfont) |
