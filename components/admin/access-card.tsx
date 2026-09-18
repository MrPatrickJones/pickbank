"use client"

import { useState } from "react"

import { Icon } from "@/components/admin/icons"
import { Badge, Button, Card } from "@/components/ui/primitives"
import { ConfirmDialog, Modal, useToast } from "@/components/ui/overlays"
import { ApiRequestError, api } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useSession } from "@/lib/session"
import type { Customer, CustomerLogin } from "@/lib/types"

/** The generated password is shown once – afterwards only the hash exists. */
export function CredentialsModal({
  open,
  email,
  password,
  customerName,
  onClose,
}: {
  open: boolean
  email: string
  password: string
  customerName: string
  onClose: () => void
}) {
  const toast = useToast()

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast(`${label} kopiert.`)
    } catch {
      toast("Kopieren nicht möglich – bitte manuell übernehmen.", "info")
    }
  }

  return (
    <Modal
      open={open}
      title="Zugangsdaten für den Kunden"
      subtitle={`Einmalig sichtbar · ${customerName}`}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Fertig
        </Button>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-[var(--body)]">
        Übergeben Sie diese Daten dem Kunden auf einem sicheren Weg. Das Passwort wird nicht gespeichert und kann
        danach nicht erneut angezeigt, sondern nur neu vergeben werden.
      </p>

      <div className="mt-4 space-y-2.5">
        {[
          { label: "Benutzername (E-Mail)", value: email },
          { label: "Passwort", value: password },
        ].map((entry) => (
          <div
            key={entry.label}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--faint)]">{entry.label}</div>
              <div className="num mt-1 break-all text-[15px] font-semibold text-[var(--ink)]">{entry.value}</div>
            </div>
            <Button size="sm" onClick={() => copy(entry.value, entry.label)}>
              Kopieren
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
        <Icon name="shield" className="mt-0.5 h-4 w-4 flex-none text-[var(--good)]" />
        Der Kunde wird beim ersten Login aufgefordert, das Passwort zu ändern. Er sieht ausschließlich seine eigenen
        Daten und kann nichts ändern.
      </p>
    </Modal>
  )
}

export function AccessCard({
  customer,
  login,
  onChanged,
}: {
  customer: Customer
  login: CustomerLogin | null
  onChanged: () => void
}) {
  const { can } = useSession()
  const toast = useToast()

  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [confirm, setConfirm] = useState<"create" | "reset" | "lock" | "unlock" | null>(null)
  const [busy, setBusy] = useState(false)

  const manage = can("logins.manage")

  const run = async (action: "create" | "reset" | "lock" | "unlock", message: string) => {
    setBusy(true)
    try {
      const result = await api.post<{ login: CustomerLogin | null; password?: string }>(
        `/api/customers/${customer.id}/login`,
        { action },
      )
      if (result.password) setCredentials({ email: result.login?.email ?? customer.email, password: result.password })
      toast(message)
      onChanged()
    } catch (caught) {
      toast(caught instanceof ApiRequestError ? caught.message : "Aktion fehlgeschlagen.", "error")
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  return (
    <>
      <Card
        title="Kundenzugang"
        subtitle="Login für das Kundenportal – wird ausschließlich von Pick The Bank vergeben"
        action={
          login ? (
            <Badge tone={login.status === "ACTIVE" ? "good" : "danger"}>
              {login.status === "ACTIVE" ? "Aktiv" : "Gesperrt"}
            </Badge>
          ) : (
            <Badge tone="neutral">Kein Zugang</Badge>
          )
        }
      >
        {login ? (
          <>
            <dl className="divide-y divide-[var(--line-soft)]">
              {[
                ["Benutzername", login.email],
                ["Angelegt von", `${login.createdBy ?? "–"} · ${formatDateTime(login.createdAt)}`],
                ["Passwort zuletzt vergeben", formatDateTime(login.passwordChangedAt)],
                ["Letzte Anmeldung", login.lastLoginAt ? formatDateTime(login.lastLoginAt) : "noch nie angemeldet"],
                ["Rechte", "Nur Lesen – Änderungen ausschließlich durch Pick The Bank"],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
                  <dt className="text-[13px] text-[var(--muted)]">{label}</dt>
                  <dd className="text-[13.5px] font-medium text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            {manage && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] px-5 py-4">
                <Button size="sm" disabled={busy} onClick={() => setConfirm("reset")}>
                  Passwort zurücksetzen
                </Button>
                {login.status === "ACTIVE" ? (
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirm("lock")}>
                    Zugang sperren
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => setConfirm("unlock")}>
                    Zugang entsperren
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="px-5 py-6">
            <p className="text-[13.5px] leading-relaxed text-[var(--body)]">
              Für diesen Kunden besteht noch kein Zugang zum Kundenportal. Beim Anlegen erzeugt der Server ein Passwort,
              das Sie einmalig sehen und dem Kunden übergeben.
            </p>
            {manage && (
              <Button variant="primary" size="sm" className="mt-4" disabled={busy} onClick={() => setConfirm("create")}>
                <Icon name="plus" className="h-4 w-4" />
                Zugang anlegen
              </Button>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirm === "create"}
        title="Kundenzugang anlegen"
        message={`Für ${customer.firstName} ${customer.lastName} wird ein Zugang mit dem Benutzernamen ${customer.email} erstellt. Das Passwort wird einmalig angezeigt.`}
        confirmLabel="Zugang anlegen"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("create", "Kundenzugang wurde angelegt.")}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        title="Passwort zurücksetzen"
        message="Möchten Sie ein neues Passwort vergeben? Das bisherige Passwort wird sofort ungültig und offene Sitzungen werden beendet."
        confirmLabel="Neues Passwort erzeugen"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("reset", "Neues Passwort wurde vergeben.")}
      />
      <ConfirmDialog
        open={confirm === "lock"}
        title="Zugang sperren"
        message="Der Kunde kann sich danach nicht mehr anmelden. Die Daten bleiben erhalten."
        confirmLabel="Sperren"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("lock", "Zugang wurde gesperrt.")}
      />
      <ConfirmDialog
        open={confirm === "unlock"}
        title="Zugang entsperren"
        message="Der Kunde kann sich anschließend wieder mit seinen Zugangsdaten anmelden."
        confirmLabel="Entsperren"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("unlock", "Zugang wurde entsperrt.")}
      />

      <CredentialsModal
        open={Boolean(credentials)}
        email={credentials?.email ?? ""}
        password={credentials?.password ?? ""}
        customerName={`${customer.firstName} ${customer.lastName}`}
        onClose={() => setCredentials(null)}
      />
    </>
  )
}
