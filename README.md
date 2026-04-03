# Curator App Prototype

Dieses Verzeichnis ist fuer ein erstes Hosting ueber `GitHub -> Vercel` vorbereitet.

## Aktueller Stand

- `index.html` liefert die aktuelle Curator-Oberflaeche aus.
- `status.html` zeigt den Projektstatus aus `Status_20260403.txt` lesbar im Browser an.
- `archive/index-landing-v1.html` enthaelt die fruehere Landingpage als Referenz.

## Empfohlener Ablauf

1. Dateien nach GitHub pushen.
2. Das GitHub-Repository in Vercel importieren.
3. Ohne Framework deployen, solange die App als HTML-Prototyp laeuft.

## Lokale Vorschau

- Startseite: `index.html`
- Statusseite: `status.html`

## OpenAI Live-Generierung

Die UI kann serverseitig die Route `api/generate.js` ansprechen.

- In Vercel die Umgebungsvariable `OPENAI_API_KEY` setzen
- Danach neu deployen
- Der Key gehoert nicht dauerhaft ins Frontend
- Wenn der Server-Key fehlt oder die Live-Anfrage fehlschlaegt, bleibt die Demo-Ausgabe als Fallback erhalten

## Naechste technische Ausbaustufe

Wenn aus dem HTML-Prototyp eine echte App wird, ist die saubere naechste Stufe:

- `Next.js` fuer UI und Routing
- `Supabase` fuer Datenbank, Auth und Storage
- Deploy weiter ueber `Vercel`
- spaeter optional Migration auf einen eigenen VPS
