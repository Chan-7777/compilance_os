// ============================================================================
// Design System Demo — renders every component for visual approval
// Access at: http://localhost:5173/?demo=1
// ============================================================================

import { useState } from 'react'
import { colors, fontFamily, fontSize, fontWeight, spacing, borderRadius, shadow } from '@theme/index'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card, CardHeader, CardContent, CardFooter } from './Card'
import { Input, Textarea } from './Input'
import { Modal } from './Modal'
import { PageHeader } from './PageHeader'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'
import { Toast } from './Toast'

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: spacing['2xl'] }}>
      <h2 style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.textSubtle,
        marginBottom: spacing.md,
        paddingBottom: spacing.xs,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ children, wrap = true }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </div>
  )
}

function Swatch({ hex, name }: { hex: string; name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
      <div style={{
        width: 56, height: 56, borderRadius: borderRadius.lg,
        backgroundColor: hex,
        border: `1px solid ${colors.border}`,
        boxShadow: shadow.sm,
      }} />
      <span style={{ fontSize: '0.625rem', color: colors.textMuted, textAlign: 'center', maxWidth: 60 }}>{name}</span>
      <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono }}>{hex}</span>
    </div>
  )
}

// ─── Main demo ──────────────────────────────────────────────────────────────

export function DesignSystemDemo() {
  const [modalOpen, setModalOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const pageStyle: React.CSSProperties = {
    fontFamily: fontFamily.sans,
    backgroundColor: colors.background,
    minHeight: '100vh',
    padding: `${spacing.xl} ${spacing.md}`,
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 900,
    margin: '0 auto',
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        {/* ── Header ── */}
        <div style={{ marginBottom: spacing['2xl'] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <div style={{
              width: 32, height: 32, borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span style={{ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.text }}>
              ComplianceOS Design System
            </span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: fontSize.sm, margin: 0 }}>
            Visual reference for all tokens and base components. Approve this look before Phase C refactoring begins.
          </p>
        </div>

        {/* ── TYPOGRAPHY ── */}
        <Section title="Typography — Outfit">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>4xl / 2.25rem / bold — display number</span>
              <span style={{ fontSize: fontSize['4xl'], fontWeight: fontWeight.bold, color: colors.text, fontFamily: fontFamily.mono }}>₹12.4 Cr</span>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>3xl / 1.875rem / bold — page title</span>
              <h1 style={{ margin: 0, fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text }}>Your Compliance Dashboard</h1>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>2xl / 1.5rem / semibold — section heading</span>
              <h2 style={{ margin: 0, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: colors.text }}>Shipment Risk Analysis</h2>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>xl / 1.25rem / semibold — card title</span>
              <h3 style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text }}>FTA Tariff Savings</h3>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>base / 1rem / normal — body text</span>
              <p style={{ margin: 0, fontSize: fontSize.base, color: colors.text, lineHeight: 1.6, maxWidth: 560 }}>
                This shipment has a medium OFAC sanctions risk based on the destination country and counterparty. Review the risk breakdown below before filing customs documents.
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>sm / 0.875rem / normal — secondary text</span>
              <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textMuted }}>Last updated 3 minutes ago · Powered by OFAC SDN List</p>
            </div>
            <div>
              <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono, display: 'block', marginBottom: 4 }}>xs / 0.75rem / medium — label / caption</span>
              <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>RISK SCORE</span>
            </div>
          </div>
        </Section>

        {/* ── COLORS ── */}
        <Section title="Color Palette">
          <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
            <Swatch hex={colors.primary} name="primary" />
            <Swatch hex={colors.primaryHover} name="primary hover" />
            <Swatch hex={colors.cta} name="cta" />
            <Swatch hex={colors.text} name="text" />
            <Swatch hex={colors.textMuted} name="text muted" />
            <Swatch hex={colors.textSubtle} name="text subtle" />
            <Swatch hex={colors.background} name="background" />
            <Swatch hex={colors.surface} name="surface" />
            <Swatch hex={colors.border} name="border" />
            <Swatch hex={colors.status.success} name="success" />
            <Swatch hex={colors.status.error} name="error" />
            <Swatch hex={colors.status.pending} name="pending" />
          </div>
          <div style={{ marginTop: spacing.md }}>
            <p style={{ fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm }}>Soft surfaces (for badges + banners)</p>
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
              <Swatch hex={colors.surfaces.successBg} name="success bg" />
              <Swatch hex={colors.surfaces.warningBg} name="warning bg" />
              <Swatch hex={colors.surfaces.dangerBg} name="danger bg" />
              <Swatch hex={colors.surfaces.infoBg} name="info bg" />
              <Swatch hex={colors.surfaces.amberBg} name="amber bg" />
            </div>
          </div>
        </Section>

        {/* ── BUTTONS ── */}
        <Section title="Buttons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Variants (md size)</p>
              <Row>
                <Button variant="primary">Primary</Button>
                <Button variant="cta">CTA / Upgrade</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Sizes (primary variant)</p>
              <Row>
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>States</p>
              <Row>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="secondary" loading>Saving...</Button>
                <Button variant="outline" disabled>Disabled</Button>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>With icons</p>
              <Row>
                <Button variant="primary" leftIcon={
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                }>Add Shipment</Button>
                <Button variant="secondary" rightIcon={
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }>Export PDF</Button>
              </Row>
            </div>
          </div>
        </Section>

        {/* ── BADGES ── */}
        <Section title="Badges">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Solid variants</p>
              <Row>
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Soft variants (use inside cards/tables)</p>
              <Row>
                <Badge variant="success-soft">Cleared</Badge>
                <Badge variant="warning-soft">Pending</Badge>
                <Badge variant="danger-soft">Blocked</Badge>
                <Badge variant="info-soft">In Review</Badge>
                <Badge variant="amber-soft">Action Required</Badge>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Risk variants</p>
              <Row>
                <Badge variant="risk-high">High Risk</Badge>
                <Badge variant="risk-medium">Medium Risk</Badge>
                <Badge variant="risk-low">Low Risk</Badge>
              </Row>
            </div>
            <div>
              <p style={{ margin: `0 0 ${spacing.sm}`, fontSize: fontSize.xs, color: colors.textSubtle }}>Sizes (success-soft)</p>
              <Row>
                <Badge variant="success-soft" size="sm">Small</Badge>
                <Badge variant="success-soft" size="md">Medium</Badge>
                <Badge variant="success-soft" size="lg">Large</Badge>
              </Row>
            </div>
          </div>
        </Section>

        {/* ── INPUTS ── */}
        <Section title="Inputs">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: spacing.lg }}>
            <Input label="Company Name" placeholder="Tata Steel Ltd." hint="As registered with DGFT" />
            <Input label="IEC Code" placeholder="0314012345" />
            <Input
              label="HS Code"
              placeholder="7208.10.00"
              error="This HS code is not eligible for RoDTEP"
            />
            <Input label="Email" type="email" placeholder="ops@company.com" leftAddon="@" />
            <Input label="Invoice Value" type="number" placeholder="0" leftAddon="₹" hint="FOB value in INR" />
            <Input label="Disabled field" placeholder="Cannot edit" disabled value="Read only" />
          </div>
          <div style={{ marginTop: spacing.lg }}>
            <Textarea label="Remarks" placeholder="Add compliance notes for this shipment..." hint="Visible to your CA on the deal pack" />
          </div>
        </Section>

        {/* ── CARDS ── */}
        <Section title="Cards">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spacing.md }}>
            <Card variant="default">
              <CardHeader>Default Card</CardHeader>
              <CardContent>
                <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textMuted }}>
                  Subtle border + soft shadow. Use for most content blocks.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm">Learn more</Button>
              </CardFooter>
            </Card>

            <Card variant="outlined">
              <CardHeader>Outlined Card</CardHeader>
              <CardContent>
                <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textMuted }}>
                  Border only, no shadow. Use for secondary info or inside grids.
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader action={<Badge variant="success-soft" size="sm">Active</Badge>}>
                Elevated Card
              </CardHeader>
              <CardContent>
                <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textMuted }}>
                  More prominent. Use for primary metrics or featured widgets.
                </p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ── PAGE HEADER ── */}
        <Section title="Page Header">
          <div style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg, padding: spacing.lg }}>
            <PageHeader
              title="Shipment Risk Gate"
              subtitle="Run pre-shipment compliance checks before filing with ICEGATE"
              badge={<Badge variant="info-soft" size="sm">Growth Plan</Badge>}
              action={
                <Button variant="primary" size="md" leftIcon={
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                }>
                  Add Shipment
                </Button>
              }
            />
            <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textMuted }}>
              Page content starts here.
            </p>
          </div>
        </Section>

        {/* ── MODAL ── */}
        <Section title="Modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirm Shipment Filing"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm & File</Button>
              </>
            }
          >
            <p style={{ margin: 0, fontSize: fontSize.base, color: colors.text, lineHeight: 1.6 }}>
              You are about to submit this shipment for customs filing via ICEGATE. This action cannot be undone.
            </p>
            <div style={{
              marginTop: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.surfaces.warningBg,
              borderRadius: borderRadius.md,
              fontSize: fontSize.sm,
              color: colors.surfaces.warningText,
            }}>
              Ensure all documents are attached before confirming.
            </div>
          </Modal>
        </Section>

        {/* ── TOAST ── */}
        <Section title="Toast Notifications">
          <Row>
            <Button variant="secondary" size="sm" onClick={() => setShowToast(true)}>
              Show Toast
            </Button>
          </Row>
          {showToast && (
            <Toast
              message="Sanctions check passed — shipment cleared for filing"
              type="success"
              duration={4000}
              onClose={() => setShowToast(false)}
            />
          )}
          <div style={{ marginTop: spacing.md, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {(['success', 'error', 'warning', 'info'] as const).map(type => (
              <div
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm} ${spacing.md}`,
                  borderRadius: borderRadius.md,
                  backgroundColor: {
                    success: colors.surfaces.successBg,
                    error: colors.surfaces.dangerBg,
                    warning: colors.surfaces.warningBg,
                    info: colors.surfaces.infoBg,
                  }[type],
                }}
              >
                <span style={{
                  fontSize: fontSize.sm,
                  color: {
                    success: colors.surfaces.successText,
                    error: colors.surfaces.dangerText,
                    warning: colors.surfaces.warningText,
                    info: colors.surfaces.infoText,
                  }[type],
                  fontWeight: fontWeight.medium,
                }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)} toast pattern
                </span>
                <Badge variant={
                  type === 'success' ? 'success-soft' :
                  type === 'error' ? 'danger-soft' :
                  type === 'warning' ? 'warning-soft' : 'info-soft'
                } size="sm">{type}</Badge>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SPINNER ── */}
        <Section title="Spinner">
          <Row>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <Spinner size="sm" />
              <span style={{ fontSize: fontSize.xs, color: colors.textSubtle }}>sm</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <Spinner size="md" />
              <span style={{ fontSize: fontSize.xs, color: colors.textSubtle }}>md</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <Spinner size="lg" />
              <span style={{ fontSize: fontSize.xs, color: colors.textSubtle }}>lg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
              <Spinner size="md" color={colors.cta} />
              <span style={{ fontSize: fontSize.xs, color: colors.textSubtle }}>cta color</span>
            </div>
          </Row>
        </Section>

        {/* ── EMPTY STATE ── */}
        <Section title="Empty State">
          <Card variant="outlined">
            <EmptyState
              title="No shipments yet"
              description="Add your first shipment to run a pre-shipment compliance gate check before filing with ICEGATE."
              actionLabel="Add Shipment"
              onAction={() => {}}
              secondaryLabel="Import CSV"
              onSecondaryAction={() => {}}
            />
          </Card>
        </Section>

        {/* ── FORM PATTERNS ── */}
        <Section title="Form Patterns — Input with validation">
          <Card variant="default" style={{ maxWidth: 480 }}>
            <CardHeader>Add new shipment</CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                <Input
                  label="Buyer Name *"
                  placeholder="Enter buyer company name"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  error={inputVal.length > 0 && inputVal.length < 3 ? 'Name must be at least 3 characters' : undefined}
                  hint={inputVal.length >= 3 ? undefined : 'As per export invoice'}
                />
                <Input label="Destination Country *" placeholder="e.g. United Arab Emirates" />
                <Input label="Invoice Value (FOB)" type="number" leftAddon="₹" placeholder="0" hint="In INR" />
              </div>
            </CardContent>
            <CardFooter>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button variant="secondary" size="sm">Cancel</Button>
                <Button variant="primary" size="sm">Save Shipment</Button>
              </div>
            </CardFooter>
          </Card>
        </Section>

        {/* ── SPACING ── */}
        <Section title="Spacing Scale">
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end' }}>
            {([['xs', '4px'], ['sm', '8px'], ['md', '16px'], ['lg', '24px'], ['xl', '32px'], ['2xl', '48px']] as const).map(([name, px]) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
                <div style={{
                  width: 8,
                  backgroundColor: colors.primary,
                  opacity: 0.3,
                  height: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 }[name],
                }} />
                <span style={{ fontSize: '0.625rem', color: colors.textSubtle, fontFamily: fontFamily.mono }}>{name}</span>
                <span style={{ fontSize: '0.625rem', color: colors.textSubtle }}>{px}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SHADOW ── */}
        <Section title="Elevation / Shadow Scale">
          <Row>
            {(['sm', 'md', 'lg', 'xl'] as const).map(s => (
              <div key={s} style={{
                width: 100, height: 60,
                backgroundColor: colors.white,
                borderRadius: borderRadius.lg,
                boxShadow: shadow[s],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: fontSize.xs, fontFamily: fontFamily.mono, color: colors.textMuted,
              }}>
                {s}
              </div>
            ))}
          </Row>
        </Section>

        <div style={{ paddingTop: spacing['2xl'], borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: fontSize.xs, color: colors.textSubtle, margin: 0 }}>
            ComplianceOS Design System v4 · Outfit + JetBrains Mono · ?demo=1
          </p>
        </div>
      </div>
    </div>
  )
}
