# Pick The Bank · Kundenportal

Kundenportal und Verwaltung für Festgeldanlagen – Next.js-Frontend mit eigenem
Backend (REST-API, MySQL, Sessions, Rollen, Audit-Log).

Zwei Bereiche, eine Anmeldung unter `/login`:

- **Verwaltung** (`/admin`) – für Pick The Bank: Kunden, Festgeldkonten,
  Banken, Dokumente, Nachrichten, Auszahlungen, Aktivitätsprotokoll
- **Kundenansicht** (`/portal`) – die digitale Kundenakte: Übersicht, alle
  Festgeldanlagen samt Bank und Anlage-Detailseite, Dokumente nach Kategorien
  mit eigenem Upload, Stammdaten und Nachrichten. Ändern kann der Kunde nur
  sein Passwort und seine selbst hochgeladenen Dokumente.

Ein Kunde kann beliebig viele Festgeldanlagen bei unterschiedlichen Banken
haben; Banken werden einmal zentral gepflegt und von den Anlagen referenziert.

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

Hochgeladene Dateien liegen unter `STORAGE_DIR` (Vorgabe `./var/storage`) –
außerhalb von `public/` und damit nicht über eine URL erreichbar.

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
| GET/POST | `/api/customers/:id/documents` (Upload: multipart) | GET auch eigener Kunde |
| GET/POST | `/api/customers/:id/messages` | GET auch eigener Kunde |
| GET | `/api/documents` | Mitarbeiter |
| GET | `/api/documents/:id/file` | Mitarbeiter, Kunde nur eigene Dokumente |
| DELETE | `/api/documents/:id` | Mitarbeiter; Kunde nur eigene Uploads |
| GET/POST | `/api/banks` | GET angemeldet, POST Mitarbeiter |
| GET/PATCH | `/api/banks/:id` | GET angemeldet, PATCH Mitarbeiter |
| DELETE | `/api/banks/:id` | Administrator |
| GET/POST/DELETE | `/api/banks/:id/logo` | GET angemeldet, Rest Mitarbeiter |
| GET/POST | `/api/me/documents` | Kunde (eigene Akte) |
| POST/GET | `/api/customers/:id/login` | Mitarbeiter (Zugänge vergeben) |
| GET | `/api/audit-log`, `/api/dashboard` | Mitarbeiter |
| GET | `/api/me` | Kunde (eigene Daten) |

## Datenmodell

```
banks ──< fixed_deposit_accounts >── customers
                  │                      │
                  └──< documents >───────┤  (Dokument: Kunde Pflicht, Anlage optional)
                                         ├──< messages
                                         ├──< auth_users (ein Login je Kunde)
                                         └──< audit_logs
auth_users ──< sessions, password_resets
```

Dokumentenkategorien: `IDENTITY`, `KYC`, `CONTRACTS`, `BANK_DOCUMENTS`,
`OTHER`, je mit fester Unterart (z. B. Personalausweis, Adressnachweis,
Festgeldvertrag). Anlagestatus: Entwurf, KYC ausstehend, Unterlagen ausstehend,
In Bearbeitung, Vorgemerkt, Aktiv, Fällig, Ausgezahlt, Geschlossen, Storniert.

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
- Dateien liegen außerhalb des Webroots unter `STORAGE_DIR`; der Speichername
  wird zufällig erzeugt, nie aus dem Dateinamen abgeleitet. Ausgeliefert wird
  ausschließlich über `/api/documents/:id/file` nach Sitzungs- und
  Eigentümerprüfung, mit `nosniff` und ohne Zwischenspeicherung
- Uploads: Endung, gemeldeter Typ **und** Dateiinhalt (Magic Bytes) müssen
  zusammenpassen; Obergrenze `MAX_UPLOAD_MB` (Vorgabe 10 MB)

Secrets stehen ausschließlich in Environment Variables (`.env.example` als
Vorlage), niemals im Repository.

## Deployment

Siehe **DEPLOYMENT.md** (Namecheap cPanel, portal.pickbank.de).
