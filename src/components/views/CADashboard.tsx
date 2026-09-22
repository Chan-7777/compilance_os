// ============================================================================
// CA Dashboard — Multi-client compliance overview for Chartered Accountants
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { colors, spacing, borderRadius, shadow } from '@theme/index'
import { supabase } from '@/lib/supabase'

interface ClientSummary {
  id: string
  companyId: string
  name: string
  label: string | null
  plan: string
  criticalAlerts: number
  overallRisk: 'high' | 'medium' | 'low' | null
  unclaimedRodtep: number
  unclaimedShipments: number
  pendingShipments: number
  lastActivity: string | null
}

export function CADashboard() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null)

  const loadClients = useCallback(async (caCompanyId: string) => {
    // Fetch all linked client companies
    const { data: rels } = await supabase
      .from('ca_relationships')
      .select('id, client_company_id, client_label')
      .eq('ca_company_id', caCompanyId)

    if (!rels || rels.length === 0) {
      setClients([])
      setLoading(false)
      return
    }

    const clientIds = rels.map((r: { client_company_id: string }) => r.client_company_id)

    // Fetch company names + plan
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, plan')
      .in('id', clientIds)

    // Fetch unclaimed RoDTEP per client
    const { data: rodtepData } = await supabase
      .from('shipments')
      .select('company_id, rodtep_rate, shipment_value, value_currency, rodtep_claimed, status, date')
      .in('company_id', clientIds)
      .not('hs_code', 'is', null)

    const summaries: ClientSummary[] = (companies ?? []).map((co: { id: string; name: string; plan: string }) => {
      const rel = rels.find((r: { client_company_id: string; client_label: string | null }) => r.client_company_id === co.id)
      const coShipments = (rodtepData ?? []).filter((s: { company_id: string }) => s.company_id === co.id)

      const unclaimedShips = coShipments.filter(
        (s: { rodtep_claimed: boolean; rodtep_rate: number | null; shipment_value: number | null }) =>
          !s.rodtep_claimed && s.rodtep_rate && s.shipment_value
      )

      const toINR = (value: number, currency: string) => {
        const rates: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107, AED: 23 }
        return value * (rates[currency?.toUpperCase()] ?? 84)
      }

      const unclaimedRodtep = unclaimedShips.reduce(
        (sum: number, s: { shipment_value: number; value_currency: string; rodtep_rate: number }) =>
          sum + Math.round(toINR(s.shipment_value, s.value_currency) * (s.rodtep_rate / 100)),
        0
      )

      const pendingShipments = coShipments.filter(
        (s: { status: string }) => ['pending', 'preparing', 'in_progress'].includes(s.status)
      ).length

      const lastShipment = coShipments
        .map((s: { date: string }) => s.date)
        .sort()
        .reverse()[0] ?? null

      return {
        id: rel?.id ?? co.id,
        companyId: co.id,
        name: co.name,
        label: rel?.client_label ?? null,
        plan: co.plan ?? 'free',
        criticalAlerts: 0, // alerts come from fetchAlerts — keeping it lightweight here
        overallRisk: null,
        unclaimedRodtep,
        unclaimedShipments: unclaimedShips.length,
        pendingShipments,
        lastActivity: lastShipment,
      }
    })

    setClients(summaries)
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile) { setLoading(false); return }
      setMyCompanyId(profile.company_id)
      await loadClients(profile.company_id)
    }
    init()
  }, [loadClients])

  async function handleAddClient() {
    if (!addEmail.trim() || !myCompanyId) return
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(false)

    // Look up the company by finding the user profile with this email
    const { data: users } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('email', addEmail.trim().toLowerCase())
      .limit(1)

    if (!users || users.length === 0) {
      setAddError(`No ComplianceOS account found for ${addEmail}. Ask your client to sign up first.`)
      setAddLoading(false)
      return
    }

    const clientCompanyId = users[0].company_id

    if (clientCompanyId === myCompanyId) {
      setAddError("You can't add your own company as a client.")
      setAddLoading(false)
      return
    }

    const { error } = await supabase
      .from('ca_relationships')
      .insert({
        ca_company_id: myCompanyId,
        client_company_id: clientCompanyId,
        client_label: addLabel.trim() || null,
      })

    if (error) {
      if (error.code === '23505') {
        setAddError('This client is already linked to your account.')
      } else {
        setAddError(error.message)
      }
      setAddLoading(false)
      return
    }

    setAddSuccess(true)
    setAddEmail('')
    setAddLabel('')
    await loadClients(myCompanyId)
    setAddLoading(false)
  }

  async function handleRemoveClient(relationId: string) {
    await supabase.from('ca_relationships').delete().eq('id', relationId)
    setClients(prev => prev.filter(c => c.id !== relationId))
  }

  function formatINR(v: number): string {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`
    if (v === 0) return '—'
    return `₹${v.toLocaleString('en-IN')}`
  }

  const totalUnclaimed = clients.reduce((s, c) => s + c.unclaimedRodtep, 0)

  return (
    <div style={{ padding: spacing.lg, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, marginBottom: spacing.xs, color: colors.text }}>
          CA Dashboard
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>
          All your client exporters in one view. Spot compliance gaps, unclaimed RoDTEP, and urgent alerts before they call you.
        </p>
      </div>

      {/* Summary bar */}
      {clients.length > 0 && (
        <div style={{
          display: 'flex', gap: spacing.md, flexWrap: 'wrap' as const,
          marginBottom: spacing.xl,
        }}>
          {[
            { label: 'Clients', value: String(clients.length), color: colors.accent },
            { label: 'Total unclaimed RoDTEP', value: formatINR(totalUnclaimed), color: colors.status.success },
            { label: 'Active shipments', value: String(clients.reduce((s, c) => s + c.pendingShipments, 0)), color: colors.primary },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: '1 1 180px', padding: spacing.lg,
              backgroundColor: colors.white, border: `1px solid ${colors.border}`,
              borderTop: `2px solid ${stat.color}`,
              borderRadius: borderRadius.lg, boxShadow: shadow.sm,
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.textMuted, marginBottom: spacing.xs }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add client form */}
      <div style={{
        padding: spacing.lg, backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
        marginBottom: spacing.xl, boxShadow: shadow.sm,
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.text, marginBottom: spacing.md }}>
          Add a client
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
          <div style={{ flex: '2 1 220px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
              Client's ComplianceOS email
            </label>
            <input
              type="email"
              placeholder="exporter@company.com"
              value={addEmail}
              onChange={e => { setAddEmail(e.target.value); setAddError(null); setAddSuccess(false) }}
              style={{
                width: '100%', padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
                backgroundColor: colors.white, color: colors.text,
                fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }}>
              Label (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Steel Exports Pvt Ltd"
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              style={{
                width: '100%', padding: `${spacing.sm} ${spacing.md}`,
                border: `1px solid ${colors.border}`, borderRadius: borderRadius.md,
                backgroundColor: colors.white, color: colors.text,
                fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
          <Button variant="primary" size="md" onClick={handleAddClient} loading={addLoading} disabled={!addEmail.trim()}>
            Add client
          </Button>
        </div>
        {addError && (
          <div style={{ marginTop: spacing.sm, fontSize: '0.8rem', color: colors.status.error }}>{addError}</div>
        )}
        {addSuccess && (
          <div style={{ marginTop: spacing.sm, fontSize: '0.8rem', color: colors.status.success, fontWeight: 500 }}>
            Client added successfully.
          </div>
        )}
      </div>

      {/* Client cards */}
      {loading ? (
        <div style={{ color: colors.textMuted, fontSize: '0.875rem' }}>Loading clients…</div>
      ) : clients.length === 0 ? (
        <div style={{
          padding: spacing.xl, textAlign: 'center' as const,
          backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg, color: colors.textMuted, fontSize: '0.875rem',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: spacing.sm }}>👥</div>
          <strong style={{ color: colors.text, display: 'block', marginBottom: spacing.xs }}>
            No clients linked yet
          </strong>
          Add your first client above — ask them to share their ComplianceOS email. Once linked, you'll see their compliance status here in real time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: spacing.md }}>
          {clients.map(client => (
            <div key={client.id} style={{
              padding: spacing.lg, backgroundColor: colors.white,
              border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg,
              boxShadow: shadow.sm,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' as const }}>
                {/* Name + plan */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: colors.text, marginBottom: 2 }}>
                    {client.label || client.name}
                  </div>
                  {client.label && (
                    <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{client.name}</div>
                  )}
                  <Badge variant={client.plan === 'ca' || client.plan === 'professional' ? 'info-soft' : 'default'} size="sm">
                    {client.plan}
                  </Badge>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' as const }}>
                  <div style={{ textAlign: 'center' as const, minWidth: 80 }}>
                    <div style={{
                      fontSize: '1.25rem', fontWeight: 700,
                      color: client.unclaimedRodtep > 0 ? colors.status.success : colors.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {formatINR(client.unclaimedRodtep)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 2 }}>unclaimed RoDTEP</div>
                  </div>
                  <div style={{ textAlign: 'center' as const, minWidth: 60 }}>
                    <div style={{
                      fontSize: '1.25rem', fontWeight: 700,
                      color: client.pendingShipments > 0 ? colors.accent : colors.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {client.pendingShipments || '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 2 }}>active shipments</div>
                  </div>
                  <div style={{ textAlign: 'center' as const, minWidth: 60 }}>
                    <div style={{
                      fontSize: '1.25rem', fontWeight: 700,
                      color: client.criticalAlerts > 0 ? colors.risk.high : colors.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {client.criticalAlerts || '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: colors.textMuted, marginTop: 2 }}>critical alerts</div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveClient(client.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.textMuted, fontSize: '0.75rem', padding: '4px',
                    flexShrink: 0, alignSelf: 'flex-start' as const,
                  }}
                  title="Remove client"
                >
                  ✕
                </button>
              </div>

              {client.lastActivity && (
                <div style={{ marginTop: spacing.sm, fontSize: '0.72rem', color: colors.textMuted }}>
                  Last shipment: {new Date(client.lastActivity).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
