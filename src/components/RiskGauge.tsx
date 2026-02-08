// ============================================================================
// RiskGauge Component - Visual risk score indicator
// ============================================================================

import { colors, spacing, fontSize, fontWeight } from '@theme/index'
import type { RiskLevel } from '@theme/index'

export type GaugeSize = 'sm' | 'md' | 'lg'

export interface RiskGaugeProps {
  score: number
  level: RiskLevel
  size?: GaugeSize
  label?: string
}

const levelColors: Record<RiskLevel, string> = {
  high: colors.risk.high,
  medium: colors.risk.medium,
  low: colors.risk.low,
}

const sizeConfig: Record<GaugeSize, { width: number; strokeWidth: number; fontSize: string }> = {
  sm: { width: 80, strokeWidth: 6, fontSize: fontSize.sm },
  md: { width: 120, strokeWidth: 8, fontSize: fontSize.xl },
  lg: { width: 160, strokeWidth: 10, fontSize: fontSize['2xl'] },
}

export function RiskGauge({ score, level, size = 'md', label }: RiskGaugeProps) {
  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, score))

  const config = sizeConfig[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (clampedScore / 100) * circumference
  const offset = circumference - progress

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const gaugeContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: config.width,
    height: config.width,
  }

  const svgStyle: React.CSSProperties = {
    transform: 'rotate(-90deg)',
  }

  const centerContentStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const scoreStyle: React.CSSProperties = {
    fontSize: config.fontSize,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 1,
  }

  const levelStyle: React.CSSProperties = {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: levelColors[level],
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  }

  return (
    <div
      data-testid="risk-gauge"
      data-level={level}
      data-size={size}
      style={containerStyle}
    >
      <div
        role="meter"
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score: ${clampedScore} out of 100, ${level} risk`}
        style={gaugeContainerStyle}
      >
        <svg width={config.width} height={config.width} style={svgStyle}>
          {/* Background circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={colors.border}
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={levelColors[level]}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div style={centerContentStyle}>
          <span style={scoreStyle}>{clampedScore}</span>
          <span style={levelStyle}>{level}</span>
        </div>
      </div>
      <span style={labelStyle}>{label || 'Risk Score'}</span>
    </div>
  )
}
