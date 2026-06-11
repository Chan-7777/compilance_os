// ============================================================================
// GateStamp — the signature visual element
// Appears ONLY on gate check results. Mimics a physical customs clearance stamp.
// Disclaimer: ComplianceOS analysis only — not an official customs clearance.
// ============================================================================

import { colors, fontFamily } from '@theme/index'

export type GateStatus = 'approved' | 'blocked' | 'conditional'

export interface GateStampProps {
  status: GateStatus
  date?: string
  companyName?: string
}

const CONFIG: Record<GateStatus, { ring: string; text: string; label: string; crossStroke: boolean }> = {
  approved: {
    ring: colors.status.success,
    text: colors.status.success,
    label: 'GATE CLEARED',
    crossStroke: false,
  },
  blocked: {
    ring: colors.status.error,
    text: colors.status.error,
    label: 'GATE BLOCKED',
    crossStroke: true,
  },
  conditional: {
    ring: colors.status.pending,
    text: colors.status.pending,
    label: 'REVIEW REQUIRED',
    crossStroke: false,
  },
}

export function GateStamp({ status, date, companyName }: GateStampProps) {
  const cfg = CONFIG[status]
  const size = 120
  const cx = size / 2
  const cy = size / 2
  const r = 52
  const innerR = 40

  // Format date for stamp
  const stampDate = date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ opacity: 0.9 }}
        aria-label={`Gate status: ${cfg.label}`}
        role="img"
      >
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.ring} strokeWidth="2.5" />

        {/* Inner ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke={cfg.ring} strokeWidth="1" strokeDasharray="3 2" />

        {/* Status label — curved text approximation via straight text */}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fontFamily={fontFamily.sans}
          fontSize="8.5"
          fontWeight="700"
          fill={cfg.text}
          letterSpacing="1.5"
        >
          {cfg.label}
        </text>

        {/* Date */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fontFamily={fontFamily.mono}
          fontSize="9"
          fontWeight="500"
          fill={cfg.text}
          opacity="0.85"
        >
          {stampDate}
        </text>

        {/* Company initials or COS branding */}
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontFamily={fontFamily.sans}
          fontSize="7"
          fontWeight="400"
          fill={cfg.text}
          opacity="0.6"
          letterSpacing="0.5"
        >
          {companyName ? companyName.slice(0, 12).toUpperCase() : 'COMPLIANCEOS'}
        </text>

        {/* Cross-stroke for blocked */}
        {cfg.crossStroke && (
          <>
            <line
              x1={cx - r * 0.6}
              y1={cy - r * 0.6}
              x2={cx + r * 0.6}
              y2={cy + r * 0.6}
              stroke={cfg.ring}
              strokeWidth="2"
              opacity="0.5"
            />
            <line
              x1={cx + r * 0.6}
              y1={cy - r * 0.6}
              x2={cx - r * 0.6}
              y2={cy + r * 0.6}
              stroke={cfg.ring}
              strokeWidth="2"
              opacity="0.5"
            />
          </>
        )}

        {/* Tick for approved */}
        {status === 'approved' && (
          <path
            d={`M ${cx - 10} ${cy + 28} L ${cx - 3} ${cy + 35} L ${cx + 12} ${cy + 20}`}
            fill="none"
            stroke={cfg.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Disclaimer */}
      <p style={{
        margin: 0,
        fontSize: '0.6rem',
        color: colors.textSubtle,
        textAlign: 'center',
        maxWidth: 130,
        lineHeight: 1.3,
        fontFamily: fontFamily.sans,
      }}>
        ComplianceOS analysis · Not an official customs clearance
      </p>
    </div>
  )
}
