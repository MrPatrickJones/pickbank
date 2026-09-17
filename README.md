# PickTheBank · Kundenportal

Kundenportal-Prototyp für PickTheBank: Login-Fenster und Kundendashboard mit
Portfolio-Report, Anlagen, Transaktionen, Dokumenten und Partnerbanken.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS · Recharts · lucide-react

## Entwicklung

```bash
pnpm install
pnpm dev     # http://localhost:3000 → leitet auf /login
pnpm build
```

## Routen

| Route     | Inhalt                                                                        |
| --------- | ----------------------------------------------------------------------------- |
| `/login`  | Kundenlogin: Anmeldung, Passwort-Reset, Demo-Zugang, DE/EN                      |
| `/portal` | Kundendashboard mit Portfolio-Report, Anlagen, Transaktionen, Dokumenten, Banken |

## Daten und Grenzen des Prototyps

- Alle Zahlen stammen aus `lib/portfolio.ts` und sind **Beispieldaten**; im Portal
  sind sie als „Demo-Daten" gekennzeichnet.
- Portfoliowert, Zinsertrag und Fälligkeiten werden aus Anlagebetrag, Zinssatz und
  Laufzeit **berechnet** (`valueOf`, `totals`) – sie werden nicht manuell gesetzt.
- Die Anmeldung ist ein Platzhalter: Die Session liegt ausschließlich im Browser
  (`lib/auth.ts`), es gibt keine Benutzerverwaltung und keine Server-Session.
  Vor einem Produktiveinsatz gehört dahinter eine echte Authentifizierung mit
  serverseitiger Session, starker Kundenauthentifizierung und einer Anbindung an
  die tatsächlichen Bestandsdaten der Partnerbanken.
