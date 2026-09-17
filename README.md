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

## Zugänge (Demo)

| Rolle | E-Mail | Zugriff |
| --- | --- | --- |
| Administrator | admin@pickthebank.eu | alles inkl. Einstellungen und Benutzerverwaltung |
| Mitarbeiter | mitarbeiter@pickthebank.eu | Kunden, Anlagen, Dokumente, Nachrichten |
| Kunde | kunde@pickthebank.eu | nur die eigene Kundenakte (PTB-000001) |

Das Passwort ist im Prototyp beliebig (mindestens 8 Zeichen).

## Funktionsumfang

**Admin**

- Dashboard mit sechs KPI-Karten, Fälligkeiten, Aktivitäten und offenen Vorgängen
- Kundenliste mit Suche, sieben Filtern, Sortierung, Pagination und Deaktivierung
- Sechsstufiger Assistent „Neuer Kunde“ inkl. Inline-Validierung, Entwurfs-Speicherung
  und Zusammenfassung vor dem Speichern
- Kundenakte mit Stammdaten, Kontakt, Anlagen, Dokumenten, Aktivitäten und Nachrichten
- Anlagen anlegen und bearbeiten (Betrag, Zins, Laufzeit, Daten, Zinszahlung, Status,
  Referenzkonto, Notizen) mit Bestätigungsdialog
- Bereiche Anlagen, Festgeldkonten, Dokumente, Auszahlungen, Aktivitäten, Nachrichten,
  Einstellungen sowie globale Suche über Kunden, Kundennummern, E-Mails und Anlage-IDs

**Kunde**

- Begrüßung, Kennzahlen, große Anlagekarte, Vertragsliste, Dokumente, Nachrichten, Stammdaten

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
```

Die Daten liegen im Browser (`localStorage`). `lib/store.tsx` ist die einzige Stelle,
die schreibt – ein Austausch gegen eine API betrifft nur diese Datei.

## Sicherheit – Stand des Prototyps

Umgesetzt: Rollen und Rechte in der Oberfläche, Kundendaten niemals in der URL,
Bestätigung bei kritischen Änderungen, Eingabevalidierung, lückenloses
Aktivitätsprotokoll mit altem und neuem Wert, automatische Abmeldung nach 15 Minuten.

Für den Produktivbetrieb erforderlich: serverseitige Authentifizierung und Session,
serverseitige Durchsetzung der Rollen und der Validierung, echte Dokumentenablage,
Verschlüsselung und ein Audit-Log außerhalb des Browsers. Alle Daten dieses Prototyps
sind erfunden.
