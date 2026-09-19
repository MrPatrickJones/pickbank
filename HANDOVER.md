# Übergabe an den Webdesigner / Entwickler

Kurzbriefing für die Einrichtung des Pick The Bank Kundenportals auf
Namecheap cPanel, verbunden mit diesem GitHub-Repository.

Diese Datei sagt, **was** zu tun ist und **wie die Teile zusammenhängen**.
Die ausführliche Schritt-für-Schritt-Anleitung steht in **DEPLOYMENT.md**.

---

## 1. Was hier läuft

Eine Next.js-Anwendung mit eigenem Node-Server und MySQL-Datenbank – kein
WordPress, kein statisches Theme. Zwei Bereiche unter einer Anmeldung:

| Adresse | Bereich | Wer |
| --- | --- | --- |
| `/login` | Anmeldung | alle |
| `/admin` | Verwaltung (Kunden, Banken, Anlagen, Dokumente) | Mitarbeiter von Pick The Bank |
| `/portal` | Kundenakte | der jeweils angemeldete Kunde |

**Wichtig:** Design und Funktionen sind fertig und abgenommen. Es geht um
Einrichtung und Betrieb, nicht um Umbau der Oberfläche.

## 2. Die Kette, die stimmen muss

```
GitHub-Repository                 (Quellcode, Deploy Key)
        │  git pull
        ▼
cPanel: Application root          /home/<cpaneluser>/portal.pickbank.de
        │
        ├── Setup Node.js App  ──► server.js   (Passenger startet die Anwendung)
        │        │
        │        └── Environment Variables  (Datenbank, Sitzungen, STORAGE_DIR)
        │
        ├── MySQL-Datenbank     cpaneluser_pickbank
        │
        └── STORAGE_DIR         /home/<cpaneluser>/ptb-storage
                                 ⚠ AUSSERHALB des Dokumentstamms
        ▲
        │
Subdomain portal.pickbank.de  +  AutoSSL  +  Force HTTPS
```

Fünf Verbindungen müssen sitzen:

1. **Subdomain → Application root** (cPanel legt den Ordner an)
2. **Application root → GitHub** (Deploy Key, `git pull`)
3. **Anwendung → Datenbank** (`DB_*` in den Environment Variables)
4. **Anwendung → Dateiablage** (`STORAGE_DIR`, außerhalb des Webroots)
5. **Anwendung → eigene Domain** (`ALLOWED_ORIGINS=https://portal.pickbank.de`)

Stimmt Punkt 5 nicht, schlägt jede schreibende Aktion mit „Ungültige
Anfrage-Herkunft" fehl. Stimmt Punkt 4 nicht, liegen Ausweise im Webroot.

## 3. Zugänge, die der Bearbeiter braucht

| Zugang | Wofür | Wie vergeben |
| --- | --- | --- |
| GitHub, Leserecht auf dieses Repository | Quellcode holen | GitHub → Settings → Collaborators → Add people |
| cPanel-Login (Namecheap) | Subdomain, Node-App, Datenbank, Terminal | Ein eigenes Passwort setzen und es nach Abschluss wieder ändern |
| Domain-DNS | nur falls `portal.pickbank.de` noch nicht zeigt | meist im selben Namecheap-Konto |

**Nicht** nötig: Zugang zu Ihrem Anthropic-Konto, zu Kundendaten oder zu
E-Mail-Postfächern. Für den Passwortversand später: SMTP-Zugangsdaten – die
trägt er direkt auf dem Server ein, nicht in eine Datei im Repository.

## 4. Reihenfolge der Arbeiten

1. Subdomain `portal.pickbank.de` anlegen, AutoSSL ausstellen, HTTPS erzwingen
2. MySQL-Datenbank und -Benutzer anlegen (`utf8mb4_unicode_ci`, ALL PRIVILEGES)
3. Verzeichnis `/home/<cpaneluser>/ptb-storage` anlegen (Rechte `0700`)
4. Repository in den Application root holen (siehe Abschnitt 5)
5. **Setup Node.js App**: Node 20 oder 22, Mode `Production`, Startdatei `server.js`
6. Environment Variables setzen (Tabelle in DEPLOYMENT.md, Abschnitt 6)
7. Im Terminal: `pnpm install --frozen-lockfile` → `pnpm migrate` → `pnpm seed:admin` → `pnpm build` → App neu starten

Das Administratorpasswort aus Schritt 7 erscheint **einmalig** im Terminal.
Bitte an Pick The Bank übergeben und `ADMIN_PASSWORD` danach aus den
Environment Variables entfernen.

## 5. Die GitHub-Verknüpfung

Empfohlen ist der direkte Klon in den Application root – für eine Node-App
einfacher und weniger fehleranfällig als die Kopier-Variante.

### Einmalig einrichten

```bash
# 1. Schlüsselpaar auf dem Server erzeugen (cPanel → Terminal)
ssh-keygen -t ed25519 -C "cpanel-portal-pickbank" -f ~/.ssh/pickbank_deploy -N ""
cat ~/.ssh/pickbank_deploy.pub
```

Den ausgegebenen öffentlichen Schlüssel in GitHub eintragen:
**Repository → Settings → Deploy keys → Add deploy key**, Schreibrecht
**nicht** vergeben (der Server muss nur lesen).

```bash
# 2. SSH auf diesen Schlüssel festlegen
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/pickbank_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# 3. Repository in den Application root klonen
cd /home/<cpaneluser>
git clone git@github.com:MrPatrickJones/pickbank.git portal.pickbank.de
cd portal.pickbank.de
git checkout main        # oder den freigegebenen Branch
```

### Bei jedem Update

```bash
cd /home/<cpaneluser>/portal.pickbank.de
./scripts/deploy.sh
# danach in cPanel: Setup Node.js App → Restart
```

`scripts/deploy.sh` erledigt Pull, Installation, Migrationen und Build in der
richtigen Reihenfolge.

### Alternative: cPanel Git™ Version Control

Wer lieber die Oberfläche nutzt: **cPanel → Git Version Control → Create**,
Repository-URL eintragen, Klonpfad `/home/<cpaneluser>/portal.pickbank.de`.
Die mitgelieferte `.cpanel.yml` ist auf diesen Fall vorbereitet – dort muss
nur `<cpaneluser>` ersetzt werden.

⚠ Beim Kopier-Deployment **niemals** mit `--delete` über den Application root
gehen: `node_modules`, `.next` und vor allem `STORAGE_DIR` dürfen nicht
mitgelöscht werden.

## 6. Abnahme – das muss am Ende funktionieren

- [ ] `https://portal.pickbank.de` leitet auf `/login`, Zertifikat gültig
- [ ] Anmeldung als Administrator funktioniert, `/admin` erscheint
- [ ] Unter *Banken* lässt sich eine Bank anlegen und ein Logo hochladen
- [ ] Unter *Kunden* lässt sich ein Kunde mit Zugang und Anlage anlegen
- [ ] Ein Dokument lässt sich hochladen, anzeigen und herunterladen
- [ ] Der Kunde kann sich anmelden und sieht **nur** seine eigenen Daten
- [ ] Ruft der Kunde `/admin` auf, landet er in seiner eigenen Ansicht
- [ ] Die Datei-URL eines Dokuments ist ohne Anmeldung **nicht** abrufbar
- [ ] Nächtliches Backup läuft: Datenbank **und** `STORAGE_DIR`

Zur Kontrolle kann die mitgelieferte Testsuite gegen eine **Testdatenbank**
laufen (niemals gegen die Produktionsdatenbank):

```bash
BASE_URL=https://portal.pickbank.de pnpm test:api   # nur mit Testdaten!
```

## 7. Was nicht passieren darf

- **Keine `.env` und keine Passwörter ins Repository.** Alle Geheimnisse
  gehören in die Environment Variables der Node-App. `.env.example` ist die
  Vorlage und enthält bewusst keine echten Werte.
- **`STORAGE_DIR` nie in den Dokumentstamm legen.** Dort liegen Ausweise, KYC-
  Unterlagen und Verträge; im Webroot wären sie über eine URL abrufbar.
- **`NODE_ENV=production` nicht weglassen** – davon hängt ab, ob die
  Sitzungs-Cookies als `Secure` gesetzt werden.
- **`pnpm seed:demo` niemals in Produktion.** Das Skript legt erfundene
  Beispielkunden an und verweigert die Ausführung, wenn `NODE_ENV=production`
  gesetzt ist.
- **Keine Änderungen an Migrationen, die bereits gelaufen sind.** Neue
  Änderungen kommen als neue Datei `migrations/003_*.sql`.

## 8. Offene Punkte, die Pick The Bank klärt

| Punkt | Status |
| --- | --- |
| SMTP für den Passwort-Reset | Zugangsdaten fehlen; Versand wird danach ergänzt |
| Echte Partnerbanken samt Logos | aktuell fünf erfundene DEMO-Banken |
| Impressum, Datenschutzerklärung, Aufbewahrungsfristen | ausstehend |
| Virenprüfung der Uploads (z. B. ClamAV) | nicht angebunden |

Technische Einzelheiten zur Anwendung: **README.md**.
Schritt für Schritt durch cPanel: **DEPLOYMENT.md**.
