#!/usr/bin/env bash
#
# Aktualisiert die laufende Installation im Application root.
# Aufruf im Anwendungsstamm:  ./scripts/deploy.sh
#
# Danach in cPanel: Setup Node.js App → Restart
#
set -euo pipefail

echo "→ Quellcode aktualisieren"
git pull --ff-only

echo "→ Abhängigkeiten installieren"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
else
  npm ci
fi

echo "→ Datenbank migrieren"
npm run migrate

echo "→ Produktions-Build"
npm run build

echo
echo "Fertig. Bitte die Anwendung in cPanel neu starten:"
echo "  Setup Node.js App → portal.pickbank.de → Restart"
