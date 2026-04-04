# Hook Writer

Dieses Dokument beschreibt die Hook-Logik fuer LinkedIn-Formate im Curator.

## Ziel

Schwache Hooks sollen in scroll-stoppende Hooks transformiert werden, die:
- mobil lesbar sind
- Neugier erzeugen
- nicht die Pointe vorwegnehmen
- persoenlich, kontrastreich oder pointiert wirken
- zu Dr. Dirk Koettings Stil passen

## Grundprinzipien

1. Erste Zeile maximal 8 bis 10 Woerter.
2. Erste und zweite Zeile muessen mobil lesbar bleiben.
3. Zwischen Hook-Zeile 1 und Hook-Zeile 2 steht eine Leerzeile.
4. Die Hook darf nicht wie generischer LinkedIn-Ratgebertext klingen.
5. Persoenlicher Bezug, Kontrast oder klare Position sind staerker als reine How-to-Einstiege.
6. Die Hook muss zum eigentlichen Post passen und darf nichts versprechen, was der Inhalt nicht haelt.

## Bevorzugte Hook-Formeln

### 1. Ich-hab-Twist
- Start mit "Ich hab ..."
- emotionaler, verletzlicher oder ueberraschender Dreh

### 2. Gegensatz
- zwei kurze Saetze mit klar erkennbarem Widerspruch
- besonders wirksam bei Vorher/Nachher oder Erwartung/Realitaet

### 3. Zitat plus Konter
- verbreitete Aussage in Anfuehrungszeichen
- kurze, schlagfertige Gegenposition

### 4. Gestaendnis plus Klammer-Twist
- persoenliche Aussage
- Klammer mit Bruch, Ueberraschung oder Selbstironie

### 5. Zahl plus persoenlicher Proof
- konkrete Zahl
- aber nur mit glaubwuerdigem persoenlichem Bezug

### 6. Starkes Statement
- kurze, klare Position
- kein "kommt drauf an"

## Curator-spezifische Regeln

- LinkedIn-Formate im Curator sollen den DACH-Ton von Dr. Dirk Koetting treffen:
  - sachlich
  - autoritativ
  - glaubwuerdig
  - ohne Marketing-Sprech
- Wenn kein persoenlicher Erlebnisbezug vorliegt, darf die Hook aus einer professionellen Beobachter- oder Governance-Perspektive formuliert werden.
- Reine "5 Tipps fuer ..." Hooks sind zu vermeiden.
- Hooks sollen bevorzugt mit Regulatorik, Verantwortung, Fuehrung, Risiko oder Umsetzung spielen.

## Verwendung im Curator

Die Hook-Regeln werden derzeit serverseitig in `api/generate.js` bei allen LinkedIn-Formaten verstaerkt:
- `li-post`
- `li-story`
- `li-list`
- `li-question`
- `li-news`
- `li-article`

Zusatzsignale aus der UI:
- `focus`
- `tone`
- `articleTitle`
- aktive `topics`

## Naechster Ausbauschritt

Ein eigener Hook-Coach-Modus kann spaeter ergaenzt werden mit:
- Hook-Analyse
- persoenlichem Bezug
- 5 Varianten nach unterschiedlichen Formeln
- mobilem Preview-Check
