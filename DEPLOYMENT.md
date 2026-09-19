# Deployment auf Namecheap cPanel (portal.pickbank.de)

Die Anwendung ist eine Next.js-Anwendung mit eigenem Node-Server und MySQL-Datenbank.
Auf cPanel läuft sie über **Setup Node.js App** (Passenger).

## 1. Voraussetzungen

| Komponente | Version |
| --- | --- |
| Node.js | 20 LTS oder 22 LTS (in cPanel unter „Setup Node.js App“ wählbar) |
| MySQL / MariaDB | MySQL 8 oder MariaDB 10.6+ |
| Paketmanager | pnpm (empfohlen) oder npm |

## 2. Datenbank anlegen

1. cPanel → **MySQL® Databases**
2. Datenbank anlegen, z. B. `cpaneluser_pickbank`
3. Benutzer anlegen, z. B. `cpaneluser_portal`, mit einem starken Passwort
4. Benutzer der Datenbank zuordnen: **ALL PRIVILEGES**
5. Zeichensatz `utf8mb4`, Kollation `utf8mb4_unicode_ci`

## 3. Subdomain und SSL

1. cPanel → **Domains → Create A New Domain**: `portal.pickbank.de`
   Dokumentstamm z. B. `/home/cpaneluser/portal.pickbank.de`

   Legen Sie zusätzlich ein Verzeichnis für hochgeladene Dateien an, das
   **außerhalb** des Dokumentstamms liegt, etwa `/home/cpaneluser/ptb-storage`,
   und tragen Sie es als `STORAGE_DIR` in die `.env` ein. Liegt die Ablage im
   Webroot, wären Ausweise und Verträge über eine URL abrufbar.
2. cPanel → **SSL/TLS Status**: Zertifikat (AutoSSL / Let's Encrypt) ausstellen
3. cPanel → **Domains → Force HTTPS Redirect** aktivieren

## 4. Quellcode auf den Server bringen

**Empfohlen: direkt aus GitHub klonen.** Dann genügt für jedes spätere Update
ein `git pull`. Die Einrichtung des Deploy Keys steht in **HANDOVER.md,
Abschnitt 5**; in Kürze:

```bash
ssh-keygen -t ed25519 -C "cpanel-portal-pickbank" -f ~/.ssh/pickbank_deploy -N ""
cat ~/.ssh/pickbank_deploy.pub          # → GitHub → Settings → Deploy keys
git clone git@github.com:MrPatrickJones/pickbank.git portal.pickbank.de
```

Alternativ kann der Quellcode manuell hochgeladen werden
(nicht `node_modules`, nicht `.next`):

```
app/  components/  lib/  server/  migrations/  scripts/  public/
package.json  pnpm-lock.yaml  next.config.mjs  tsconfig.json
tailwind.config.ts  postcss.config.mjs  .eslintrc.json
```

Nicht hochladen: `.env` (wird auf dem Server erzeugt), `node_modules`, `.next`, `out`.

## 5. Node-Anwendung einrichten

cPanel → **Setup Node.js App → Create Application**

| Feld | Wert |
| --- | --- |
| Node.js version | 20.x oder 22.x |
| Application mode | Production |
| Application root | `portal.pickbank.de` |
| Application URL | `portal.pickbank.de` |
| Application startup file | `server.js` |

Danach „Run JS script“ → `build` ausführen (siehe Schritt 7).

`server.js` im Anwendungsstamm (startet den Next-Server für Passenger):

```js
const { createServer } = require("http")
const next = require("next")

const port = process.env.PORT || 3000
const app = next({ dev: false })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port)
})
```

## 6. Environment Variables

In cPanel unter **Setup Node.js App → Environment variables** eintragen
(Vorlage: `.env.example`, niemals echte Werte ins Repository):

| Variable | Beispiel | Bedeutung |
| --- | --- | --- |
| `NODE_ENV` | `production` | aktiviert sichere Cookies |
| `DB_HOST` | `127.0.0.1` | Datenbankserver |
| `DB_PORT` | `3306` | Port |
| `DB_USER` | `cpaneluser_portal` | Datenbankbenutzer |
| `DB_PASSWORD` | – | Passwort des Datenbankbenutzers |
| `DB_NAME` | `cpaneluser_pickbank` | Datenbankname |
| `DB_POOL_SIZE` | `10` | Verbindungen im Pool |
| `SESSION_LIFETIME_MINUTES` | `720` | maximale Sitzungsdauer |
| `SESSION_IDLE_MINUTES` | `15` | automatische Abmeldung bei Inaktivität |
| `MAX_LOGIN_ATTEMPTS` | `5` | Fehlversuche bis zur Sperre |
| `LOCKOUT_MINUTES` | `15` | Dauer der Sperre |
| `LOGIN_RATE_LIMIT` | `20` | Fehlversuche je IP im Zeitfenster |
| `ALLOWED_ORIGINS` | `https://portal.pickbank.de` | erlaubte Herkunft schreibender Anfragen |
| `STORAGE_DIR` | `/home/cpaneluser/ptb-storage` | Ablage für Dokumente und Banklogos – **außerhalb** des Dokumentstamms |
| `MAX_UPLOAD_MB` | `10` | Obergrenze je hochgeladenem Dokument |
| `MAX_LOGO_MB` | `2` | Obergrenze je Banklogo |
| `ADMIN_EMAIL` | `admin@pickbank.de` | erster Administrator (nur für die Ersteinrichtung) |
| `ADMIN_NAME` | `Pick The Bank` | Anzeigename |
| `ADMIN_PASSWORD` | – | optional; ohne Wert erzeugt das Skript eines und zeigt es einmalig an |

## 7. Installation, Migration, Build

Terminal in cPanel (oder SSH), im Anwendungsstamm:

```bash
source /home/cpaneluser/nodevenv/portal.pickbank.de/20/bin/activate   # Pfad laut cPanel
npm install -g pnpm        # einmalig, falls pnpm fehlt
pnpm install --frozen-lockfile
pnpm migrate               # legt alle Tabellen an
pnpm seed:admin            # erster Administrator – Passwort notieren
pnpm build                 # Produktions-Build
```

Anschließend in cPanel **Restart** der Anwendung.

## 8. Nach jedem Update

```bash
cd /home/cpaneluser/portal.pickbank.de
./scripts/deploy.sh          # Pull, Installation, Migration, Build
# cPanel → Setup Node.js App → Restart
```

Einzeln entspricht das:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm migrate      # neue Migrationen anwenden
pnpm build
```

Migrationen sind additiv und werden in `schema_migrations` protokolliert; ein
zweiter Lauf ist folgenlos.

## 9. Backups

Gesichert werden müssen **zwei** Dinge: die Datenbank **und** das Verzeichnis
aus `STORAGE_DIR`. Die hochgeladenen Dateien liegen nicht in der Datenbank –
ein reiner SQL-Dump allein reicht nicht.

- cPanel → **Backup Wizard**: täglicher Vollbackup der Datenbank aktivieren
- Zusätzlich empfohlen: nächtlicher Dump per Cronjob

```bash
mysqldump --single-transaction --routines \
  -u cpaneluser_portal -p'PASSWORT' cpaneluser_pickbank \
  | gzip > /home/cpaneluser/backups/pickbank-$(date +\%F).sql.gz
find /home/cpaneluser/backups -name 'pickbank-*.sql.gz' -mtime +30 -delete

# Dateiablage mitsichern
tar -czf /home/cpaneluser/backups/ptb-storage-$(date +\%F).tar.gz \
  -C /home/cpaneluser ptb-storage
find /home/cpaneluser/backups -name 'ptb-storage-*.tar.gz' -mtime +30 -delete
```

Aufbewahrung 30 Tage, Wiederherstellung:

```bash
gunzip < pickbank-2026-09-18.sql.gz | mysql -u cpaneluser_portal -p cpaneluser_pickbank
```

## 10. Betriebshinweise

- **Sitzungen und Anmeldeversuche** wachsen langsam; monatlich aufräumen:
  `DELETE FROM sessions WHERE expires_at < NOW(); DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL 30 DAY;`
- **Erster Administrator**: nach der Einrichtung `ADMIN_PASSWORD` aus den
  Environment Variables entfernen und das Passwort im Portal ändern.
- **Fehlersuche**: cPanel → Setup Node.js App → „stderr.log“. Die Anwendung gibt
  nach außen nur neutrale Fehlermeldungen aus; Details stehen im Serverlog.
- **Zeitzone**: Die Datenbank speichert UTC; die Oberfläche zeigt lokale Zeit.
