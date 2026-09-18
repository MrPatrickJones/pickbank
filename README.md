# Pick The Bank · Kundenportal

Kundenportal und Verwaltung für Festgeldanlagen – Next.js-Frontend mit eigenem
Backend (REST-API, MySQL, Sessions, Rollen, Audit-Log).

Zwei Bereiche, eine Anmeldung unter `/login`:

- **Verwaltung** (`/admin`) – für Pick The Bank: Kunden, Festgeldkonten,
  Dokumente, Nachrichten, Auszahlungen, Aktivitätsprotokoll
- **Kundenansicht** (`/portal`) – der Kunde sieht ausschließlich seine eigenen
  Anlagen, Dokumente und Nachrichten und kann nur sein Passwort ändern

## Stack

| Schicht | Technologie |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| API | Next.js Route Handlers (`app/api/**`), Node-Runtime |
| Datenbank | MySQL 8 / MariaDB 10.6+ über `mysql2`, SQL-Migrationen |
| Auth | Server-Sessions (http-only Cookie), scrypt-Hashing, CSRF-Token |
| Validierung | zod – serverseitig bei jedem schreibenden Request |

## Lokale Einrichtung

```bash
cp .env.example .env     # Werte eintragen
pnpm install
pnpm migrate             # Tabellen anlegen
pnpm seed:admin          # ersten Administrator anlegen
pnpm dev                 # http://localhost:3000
```

Optionale Beispieldaten für eine Testumgebung (niemals in Produktion):

```bash
pnpm seed:demo
```

## Tests

```bash
pnpm build
PORT=3101 pnpm start &            # gegen eine Testdatenbank
BASE_URL=http://127.0.0.1:3101 pnpm test:api
```

Die Suite prüft Anmeldung, Rollen, Objektzugriff, Validierung, Audit-Log,
Passwortwechsel, CSRF, Brute-Force-Schutz und Fehlerfälle.

## API

| Methode | Pfad | Rolle |
| --- | --- | --- |
| POST | `/api/auth/login` | offen |
| POST | `/api/auth/logout` | angemeldet |
| GET | `/api/auth/session` | offen |
| POST | `/api/auth/password` | angemeldet (eigenes Passwort) |
| POST | `/api/auth/password-reset`, `/api/auth/password-reset/confirm` | offen |
| GET/POST | `/api/customers` | Mitarbeiter |
| GET | `/api/customers/:id` | Mitarbeiter, Kunde nur eigener Datensatz |
| PATCH/PUT | `/api/customers/:id` | Mitarbeiter |
| DELETE | `/api/customers/:id` | Administrator |
| GET/POST | `/api/customers/:id/accounts` | GET auch eigener Kunde |
| GET/PATCH/PUT | `/api/accounts/:id` | GET auch eigener Kunde |
| GET | `/api/accounts` | Mitarbeiter |
| GET/POST | `/api/customers/:id/documents`, `/messages` | GET auch eigener Kunde |
| DELETE | `/api/documents/:id` | Mitarbeiter |
| POST/GET | `/api/customers/:id/login` | Mitarbeiter (Zugänge vergeben) |
| GET | `/api/audit-log`, `/api/dashboard` | Mitarbeiter |
| GET | `/api/me` | Kunde (eigene Daten) |

## Datenmodell

```
customers ──< fixed_deposit_accounts
    │                 │
    ├──< documents ───┘
    ├──< messages
    ├──< auth_users (ein Login je Kunde)
    └──< audit_logs
auth_users ──< sessions, password_resets
```

Beträge liegen als `DECIMAL(18,2)`, Zinssätze als `DECIMAL(6,4)` in der
Datenbank; gerechnet wird serverseitig in Cent (`server/money.ts`).

## Sicherheit

- Rollen ADMIN / STAFF / CUSTOMER, serverseitig bei jedem Request geprüft
- Object-Level-Authorization: der Kunde erreicht ausschließlich seine eigene
  `customer_id`, unabhängig von der angefragten ID
- Passwörter: scrypt mit Zufallssalz, nie im Klartext gespeichert
- Sitzungen: Server-Session, http-only/secure/SameSite-Cookie, 15 Minuten
  Inaktivitätsgrenze, Sperre nach fünf Fehlversuchen, Rate-Limit je IP
- CSRF-Token für alle schreibenden Anfragen plus Origin-Prüfung
- Alle Eingaben werden serverseitig mit zod validiert, SQL ausschließlich
  parametrisiert; Fehlermeldungen enthalten keine internen Details
- Jede Änderung landet mit Benutzer, Rolle, Zeitpunkt, IP, altem und neuem Wert
  im `audit_logs`; Kunden haben darauf keinen Zugriff

Secrets stehen ausschließlich in Environment Variables (`.env.example` als
Vorlage), niemals im Repository.

## Deployment

Siehe **DEPLOYMENT.md** (Namecheap cPanel, portal.pickbank.de).
