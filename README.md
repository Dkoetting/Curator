# Curator App Prototype

Dieses Verzeichnis ist jetzt für ein erstes statisches Hosting über `GitHub -> Vercel` vorbereitet.

## Aktueller Stand

- `index.html` liefert die aktuelle Curator-Oberfläche aus.
- `status.html` zeigt den Projektstatus aus `Status_20260403.txt` lesbar im Browser an.
- `archive/index-landing-v1.html` enthält die frühere Landingpage als Referenz.
- Weitere HTML-Snapshots bleiben im Projekt erhalten, damit frühere Iterationen nachvollziehbar bleiben.

## Empfohlener Ablauf

1. Neues Git-Repository in `D:\Curator_APP` initialisieren.
2. Dateien nach GitHub pushen.
3. Das GitHub-Repository in Vercel importieren.
4. Ohne Framework deployen, da es sich aktuell um eine statische HTML-Version handelt.

## Lokale Vorschau

- Startseite: `index.html`
- Statusseite: `status.html`

## Nächste technische Ausbaustufe

Wenn aus dem HTML-Prototyp eine echte App wird, ist die saubere nächste Stufe:

- `Next.js` für UI und Routing
- `Supabase` für Datenbank, Auth und Storage
- Deploy weiter über `Vercel`
- später optional Migration auf einen eigenen VPS
