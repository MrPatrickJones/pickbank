"use client"

import { useState } from "react"

import { Icon } from "@/components/admin/icons"
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  Table,
  cell,
  cellStrong,
  rowClass,
} from "@/components/ui/primitives"
import { Field, TextInput } from "@/components/ui/form"
import { Modal, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { roleLabels } from "@/lib/labels"
import { useSession } from "@/lib/session"
import { useResource } from "@/lib/use-resource"
import type { DashboardData } from "@/lib/types"

const permissionMatrix = [
  { label: "Kunden ansehen", admin: true, staff: true, customer: "nur eigene" },
  { label: "Kunden anlegen und bearbeiten", admin: true, staff: true, customer: false },
  { label: "Kunden löschen", admin: true, staff: false, customer: false },
  { label: "Festgeldkonten anlegen und bearbeiten", admin: true, staff: true, customer: false },
  { label: "Dokumente hinterlegen und löschen", admin: true, staff: true, customer: "nur ansehen" },
  { label: "Nachrichten versenden", admin: true, staff: true, customer: false },
  { label: "Kundenzugänge vergeben und sperren", admin: true, staff: true, customer: false },
  { label: "Aktivitätsprotokoll einsehen", admin: true, staff: true, customer: false },
  { label: "Eigenes Passwort ändern", admin: true, staff: true, customer: true },
]

function Mark({ value }: { value: boolean | string }) {
  if (value === true) return <Icon name="check" className="h-4 w-4 text-[var(--good)]" />
  if (value === false) return <span className="text-[var(--faint)]">–</span>
  return <span className="text-[12.5px] text-[var(--muted)]">{value}</span>
}

export function SettingsView() {
  const { user } = useSession()
  const toast = useToast()
  const [passwordOpen, setPasswordOpen] = useState(false)

  const { data, loading, error, reload } = useResource<DashboardData>(() => api.get<DashboardData>("/api/dashboard"))

  return (
    <div className="space-y-5">
      <PageHeader title="Einstellungen" subtitle="Konto, Rollen und Sicherheit des Portals." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Angemeldeter Benutzer">
          <dl className="divide-y divide-[var(--line-soft)]">
            {[
              ["Name", user?.fullName ?? "–"],
              ["E-Mail", user?.email ?? "–"],
              ["Rolle", user ? roleLabels[user.role] : "–"],
              ["Automatische Abmeldung", "nach 15 Minuten Inaktivität"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 px-5 py-3">
                <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-[var(--line-soft)] px-5 py-4">
            <Button size="sm" onClick={() => setPasswordOpen(true)}>
              Passwort ändern
            </Button>
          </div>
        </Card>

        <Card title="Datenbestand">
          {loading && !data && <LoadingState />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && (
            <dl className="divide-y divide-[var(--line-soft)]">
              {[
                ["Kunden", data.summary.customers.total],
                ["Aktive Kunden", data.summary.customers.active],
                ["Ausstehende Kunden", data.summary.customers.pending],
                ["Festgeldkonten", data.summary.accounts.total],
                ["Aktive Konten", data.summary.accounts.active],
                ["Überfällige Konten", data.summary.accounts.overdue],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-baseline justify-between gap-3 px-5 py-3">
                  <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                  <dd className="num text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      <Card title="Rollen und Rechte" subtitle="Serverseitig durchgesetzt – die Oberfläche spiegelt sie nur wider">
        <Table minWidth={720} headers={["Berechtigung", "Administrator", "Mitarbeiter", "Kunde"]}>
          {permissionMatrix.map((row) => (
            <tr key={row.label} className={rowClass}>
              <td className={cellStrong}>{row.label}</td>
              <td className={cell}>
                <Mark value={row.admin} />
              </td>
              <td className={cell}>
                <Mark value={row.staff} />
              </td>
              <td className={cell}>
                <Mark value={row.customer} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Sicherheit" subtitle="Wie das Portal Kundendaten schützt">
        <ul className="space-y-2.5 px-5 py-5 text-[13.5px] leading-relaxed text-[var(--body)]">
          <li>• Jede Anfrage wird serverseitig autorisiert; Kunden erreichen ausschließlich ihre eigenen Datensätze.</li>
          <li>• Passwörter werden mit scrypt und Zufallssalz gespeichert – niemals im Klartext.</li>
          <li>• Sitzungen laufen über ein http-only-Cookie, enden nach 15 Minuten Inaktivität und werden serverseitig geführt.</li>
          <li>• Schreibende Anfragen benötigen ein CSRF-Token und eine bekannte Herkunft.</li>
          <li>• Nach mehreren Fehlversuchen wird der Zugang vorübergehend gesperrt (Brute-Force-Schutz).</li>
          <li>• Beträge liegen als Dezimalwerte in der Datenbank; alle Finanzberechnungen erfolgen auf dem Server.</li>
          <li>• Jede Änderung landet mit Benutzer, Zeitpunkt, altem und neuem Wert im Aktivitätsprotokoll.</li>
        </ul>
      </Card>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} onDone={() => toast("Passwort wurde geändert.")} />
    </div>
  )
}

export function ChangePasswordModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setErrors({})
    try {
      await api.post("/api/auth/password", { currentPassword, newPassword, repeatPassword })
      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
      onDone()
      onClose()
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setErrors(Object.keys(caught.details).length ? caught.details : { form: caught.message })
      } else {
        setErrors({ form: "Das Passwort konnte nicht geändert werden." })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Passwort ändern"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Wird gespeichert …" : "Passwort speichern"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Aktuelles Passwort" required error={errors.currentPassword}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            invalid={Boolean(errors.currentPassword)}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="Neues Passwort" required error={errors.newPassword} hint="Mindestens 10 Zeichen">
          <TextInput
            type="password"
            autoComplete="new-password"
            value={newPassword}
            invalid={Boolean(errors.newPassword)}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="Neues Passwort wiederholen" required error={errors.repeatPassword}>
          <TextInput
            type="password"
            autoComplete="new-password"
            value={repeatPassword}
            invalid={Boolean(errors.repeatPassword)}
            onChange={(event) => setRepeatPassword(event.target.value)}
          />
        </Field>
        {errors.form && <p className="text-[13px] font-medium text-[var(--danger)]">{errors.form}</p>}
      </div>
    </Modal>
  )
}
