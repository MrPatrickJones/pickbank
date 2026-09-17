# Pick The Bank · Kundenportal

Interaktiver Prototyp des Kundenportals von Pick The Bank mit zwei getrennten
Bereichen:

- **Admin-Dashboard** (`/admin`) – Kundenverwaltung für Mitarbeiterinnen und Mitarbeiter
- **Kundenansicht** (`/portal`) – jeder Kunde sieht ausschließlich die eigenen Daten

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Instrument Sans

## Entwicklung

```bash
pnpm install
pnpm dev        # http://localhost:3000 → /login
pnpm build
pnpm lint
```

## Zugänge

Die Anmeldung unter `/login` hat zwei Bereiche.

**Kundenlogin** – echte Prüfung gegen die vergebenen Zugangsdaten:

| Kunde | Benutzername | Passwort |
| --- | --- | --- |
| Max Mustermann (PTB-000001) | max@example.com | PTB-Demo-2026 |

Weitere Kundenzugänge entstehen ausschließlich im Admin-Bereich (Kundenakte →
„Zugang anlegen" oder direkt im Assistenten). Das erzeugte Passwort ist einmalig
sichtbar; gespeichert wird nur ein SHA-256-Hash mit Zufallssalz. Kunden haben
reinen Lesezugriff und können lediglich ihr eigenes Passwort ändern.

**Mitarbeiterzugang** – Demo-Rollen, Passwort beliebig (mindestens 8 Zeichen):

| Rolle | E-Mail | Zugriff |
| --- | --- | --- |
| Administrator | admin@pickthebank.eu | alles inkl. Einstellungen und Benutzerverwaltung |
| Mitarbeiter | mitarbeiter@pickthebank.eu | Kunden, Anlagen, Dokumente, Nachrichten, Zugänge |

## Funktionsumfang

**Admin**

- Dashboard mit sechs KPI-Karten, Fälligkeiten, Aktivitäten und offenen Vorgängen
- Kundenliste mit Suche, sieben Filtern, Sortierung, Pagination und Deaktivierung
- Sechsstufiger Assistent „Neuer Kunde“ inkl. Inline-Validierung, Entwurfs-Speicherung
  und Zusammenfassung vor dem Speichern
- Kundenakte mit Stammdaten, Kontakt, Anlagen, Dokumenten, Aktivitäten und Nachrichten
- Anlagen anlegen und bearbeiten (Betrag, Zins, Laufzeit, Daten, Zinszahlung, Status,
  Referenzkonto, Notizen) mit Bestätigungsdialog
- Kundenzugänge: anlegen, Passwort neu vergeben, sperren und entsperren; das Passwort
  wird einmalig angezeigt, jede Aktion landet im Protokoll
- Bereiche Anlagen, Festgeldkonten, Dokumente, Auszahlungen, Aktivitäten, Nachrichten,
  Einstellungen sowie globale Suche über Kunden, Kundennummern, E-Mails und Anlage-IDs

**Kunde**

- Begrüßung, Kennzahlen, große Anlagekarte, Vertragsliste, Dokumente, Nachrichten, Stammdaten
- Eigenes Passwort ändern; alle übrigen Änderungen bleiben Pick The Bank vorbehalten

## Architektur

```
app/            Routen: /login, /admin, /portal
components/ui   Button, Card, Table, Tabs, Badge, Modal, ConfirmDialog, Toast, FileDrop, Formfelder
components/admin  Shell, Dashboard, Kundenliste, Kundenakte, Assistent, Anlageformular, Listen, Einstellungen
components/customer  Kundenansicht
lib/types.ts    Datenmodell (Customer, Investment, Document, Activity, Message)
lib/seed.ts     Demodaten: 9 Kunden, 13 Anlagen, Dokumente, Aktivitäten, Nachrichten
lib/finance.ts  Berechnungen: Zinsen, Laufzeiten, Fälligkeiten, KPIs
lib/store.tsx   Zustand und alle schreibenden Aktionen – jede Änderung schreibt eine Aktivität
lib/session.tsx Rollen, Rechte, automatische Abmeldung
lib/credentials.ts Passwort erzeugen, salzen, hashen und prüfen
```

Die Daten liegen im Browser (`localStorage`). `lib/store.tsx` ist die einzige Stelle,
die schreibt – ein Austausch gegen eine API betrifft nur diese Datei.

## Sicherheit – Stand des Prototyps

Umgesetzt: Rollen und Rechte in der Oberfläche, Kundendaten niemals in der URL,
Bestätigung bei kritischen Änderungen, Eingabevalidierung, lückenloses
Aktivitätsprotokoll mit altem und neuem Wert, automatische Abmeldung nach 15 Minuten.

Kundenpasswörter werden nie im Klartext gespeichert: Das Portal legt einen zufälligen
Salt und den SHA-256-Hash von `salt:passwort` ab und vergleicht in konstanter Zeit.
Für den Produktivbetrieb erforderlich: serverseitige Authentifizierung mit einer
langsamen Hash-Funktion (bcrypt, scrypt, Argon2), Session,
serverseitige Durchsetzung der Rollen und der Validierung, echte Dokumentenablage,
Verschlüsselung und ein Audit-Log außerhalb des Browsers. Alle Daten dieses Prototyps
sind erfunden.
