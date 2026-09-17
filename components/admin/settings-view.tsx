"use client"

import { useState } from "react"

import { Icon } from "@/components/admin/icons"
import { Badge, Button, Card, PageHeader, Table, cell, cellStrong, rowClass } from "@/components/ui/primitives"
import { ConfirmDialog, useToast } from "@/components/ui/overlays"
import { formatDateTime } from "@/lib/format"
import { IDLE_TIMEOUT_MINUTES, roleLabel, staffAccounts, useSession } from "@/lib/session"
import { useData } from "@/lib/store"

const permissionMatrix = [
  { label: "Kundenzugang anlegen, sperren, Passwort neu vergeben", admin: true, mitarbeiter: true, kunde: false },
  { label: "Eigenes Passwort ändern", admin: true, mitarbeiter: true, kunde: true },
  { label: "Kunden ansehen", admin: true, mitarbeiter: true, kunde: "nur eigene" },
  { label: "Kunden anlegen und bearbeiten", admin: true, mitarbeiter: true, kunde: false },
  { label: "Kunden deaktivieren", admin: true, mitarbeiter: false, kunde: false },
  { label: "Anlagen anlegen und bearbeiten", admin: true, mitarbeiter: true, kunde: false },
  { label: "Dokumente hochladen und löschen", admin: true, mitarbeiter: true, kunde: "nur ansehen" },
  { label: "Nachrichten versenden", admin: true, mitarbeiter: true, kunde: false },
  { label: "Aktivitätsprotokoll einsehen", admin: true, mitarbeiter: true, kunde: false },
  { label: "Einstellungen und Benutzerverwaltung", admin: true, mitarbeiter: false, kunde: false },
]

function Mark({ value }: { value: boolean | string }) {
  if (value === true) return <Icon name="check" className="h-4 w-4 text-[var(--good)]" />
  if (value === false) return <span className="text-[var(--faint)]">–</span>
  return <span className="text-[12.5px] text-[var(--muted)]">{value}</span>
}

export function SettingsView() {
  const { user, can } = useSession()
  const { resetDemoData, customers, investments, documents, activities, accounts } = useData()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="space-y-5">
      <PageHeader title="Einstellungen" subtitle="Rollen, Sitzungen und Demodaten des Portals." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Angemeldeter Benutzer">
          <dl className="divide-y divide-[var(--line-soft)]">
            {[
              ["Name", user?.name ?? "–"],
              ["E-Mail", user?.email ?? "–"],
              ["Rolle", user ? roleLabel[user.role] : "–"],
              ["Automatische Abmeldung", `nach ${IDLE_TIMEOUT_MINUTES} Minuten Inaktivität`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 px-5 py-3">
                <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Datenbestand" subtitle="Demodaten dieses Prototyps">
          <dl className="divide-y divide-[var(--line-soft)]">
            {[
              ["Kunden", customers.length],
              ["Anlagen", investments.length],
              ["Dokumente", documents.length],
              ["Aktivitäten", activities.length],
              ["Kundenzugänge", accounts.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-3 px-5 py-3">
                <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                <dd className="num text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
          {can("settings.manage") && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] px-5 py-4">
              <p className="text-[13px] text-[var(--muted)]">Alle Änderungen verwerfen und Demodaten neu laden.</p>
              <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
                Zurücksetzen
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card title="Rollen und Rechte" subtitle="Welche Rolle welche Aktion ausführen darf">
        <Table minWidth={720} headers={["Berechtigung", "Administrator", "Mitarbeiter", "Kunde"]}>
          {permissionMatrix.map((row) => (
            <tr key={row.label} className={rowClass}>
              <td className={cellStrong}>{row.label}</td>
              <td className={cell}>
                <Mark value={row.admin} />
              </td>
              <td className={cell}>
                <Mark value={row.mitarbeiter} />
              </td>
              <td className={cell}>
                <Mark value={row.kunde} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card
        title="Kundenzugänge"
        subtitle="Logins für das Kundenportal – angelegt und verwaltet von Pick The Bank"
      >
        {accounts.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-[var(--muted)]">
            Noch keine Kundenzugänge vergeben. Zugänge legen Sie in der jeweiligen Kundenakte an.
          </p>
        ) : (
          <Table minWidth={780} headers={["Kunde", "Benutzername", "Status", "Angelegt von", "Letzte Anmeldung"]}>
            {accounts.map((account) => {
              const customer = customers.find((entry) => entry.id === account.customerId)
              return (
                <tr key={account.id} className={rowClass}>
                  <td className={cellStrong}>
                    {customer ? `${customer.firstName} ${customer.lastName}` : "–"}
                    <div className="num text-[12px] font-normal text-[var(--faint)]">{customer?.customerNumber}</div>
                  </td>
                  <td className={cell}>{account.loginEmail}</td>
                  <td className={cell}>
                    <Badge tone={account.status === "aktiv" ? "good" : "danger"}>
                      {account.status === "aktiv" ? "Aktiv" : "Gesperrt"}
                    </Badge>
                    {account.mustChangePassword && (
                      <span className="ml-2 text-[12px] text-[var(--warn)]">Startpasswort</span>
                    )}
                  </td>
                  <td className={cell}>{account.createdBy}</td>
                  <td className={`${cell} num`}>
                    {account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "noch nie"}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <Card title="Mitarbeiterzugänge" subtitle="Interne Benutzer dieses Prototyps">
        <Table minWidth={640} headers={["Benutzer", "E-Mail", "Rolle", "Zugriff"]}>
          {staffAccounts.map((account) => (
            <tr key={account.email} className={rowClass}>
              <td className={cellStrong}>{account.name}</td>
              <td className={cell}>{account.email}</td>
              <td className={cell}>
                <Badge tone={account.role === "admin" ? "info" : account.role === "mitarbeiter" ? "neutral" : "good"}>
                  {roleLabel[account.role]}
                </Badge>
              </td>
              <td className={cell}>{account.hint}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Sicherheitshinweise" subtitle="Was dieser Prototyp leistet – und was der Produktivbetrieb braucht">
        <ul className="space-y-2.5 px-5 py-5 text-[13.5px] leading-relaxed text-[var(--body)]">
          <li>• Rollen und Rechte werden in der Oberfläche durchgesetzt; im Produktivbetrieb muss dies serverseitig erfolgen.</li>
          <li>• Kundendaten stehen in keiner URL – die Navigation läuft vollständig über den Anwendungszustand.</li>
          <li>• Jede Änderung wird mit Benutzer, Zeitpunkt, altem und neuem Wert protokolliert.</li>
          <li>• Kritische Änderungen verlangen eine Bestätigung, Formulare werden vor dem Speichern validiert.</li>
          <li>• Die Sitzung endet automatisch nach {IDLE_TIMEOUT_MINUTES} Minuten ohne Aktivität.</li>
          <li>• Kundenzugänge vergibt ausschließlich Pick The Bank; Kunden haben reinen Lesezugriff auf die eigenen Daten.</li>
          <li>• Passwörter werden nie gespeichert – nur ein SHA-256-Hash mit Zufallssalz; das Startpasswort ist einmalig sichtbar.</li>
          <li>• Daten liegen ausschließlich im Browser dieses Prototyps; es werden keine echten Kundendaten verarbeitet.</li>
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Demodaten zurücksetzen"
        message="Möchten Sie alle Änderungen verwerfen und die ursprünglichen Demodaten wiederherstellen?"
        confirmLabel="Zurücksetzen"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemoData()
          setConfirmReset(false)
          toast("Demodaten wurden zurückgesetzt.")
        }}
      />
    </div>
  )
}
