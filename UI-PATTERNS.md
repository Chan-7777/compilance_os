# ComplianceOS UI Patterns

Design system reference for this codebase. All styling is inline React `CSSProperties` — no CSS framework, no Tailwind.

---

## The only import you need

```ts
import { colors, spacing, borderRadius } from '@theme/index'
```

Never import from `@/styles/*` (that folder is deleted). Never write raw hex in a component.

---

## Color tokens

### Core palette
| Token | Value | Use |
|---|---|---|
| `colors.primary` | `#1A2440` navy | Primary buttons, headings, strong accents |
| `colors.accent` | `#0D9488` teal | Links, active states, highlights, CTA borders |
| `colors.cta` | `#F97316` orange | Upgrade badge, PRO pill — use sparingly |
| `colors.background` | `#FAFAF8` warm white | Page background |
| `colors.white` | `#FFFFFF` | Card backgrounds, input fills |
| `colors.surface` | `#FFFFFF` | Same as white, for surfaces |
| `colors.text` | `#1E293B` | Body text |
| `colors.textMuted` | `#64748B` | Secondary text, labels, hints |
| `colors.border` | `#E2E8F0` | Card borders, dividers, input borders |

### Sidebar
| Token | Use |
|---|---|
| `colors.sidebar` | `#0F1A2E` — sidebar background |
| `colors.sidebarActive` | `#0D9488` — active nav item background |
| `colors.sidebarText` | `#94A3B8` — inactive nav text |
| `colors.sidebarBorder` | `#1A2440` — group dividers |

### Semantic surfaces — tinted bg/text pairs
Use these for alert boxes, status banners, and info panels. Never mix bg from one and text from another.

| Token pair | Use |
|---|---|
| `colors.surfaces.successBg` / `.successText` | Positive outcomes, verified states |
| `colors.surfaces.dangerBg` / `.dangerText` | Errors, blocked states, critical alerts |
| `colors.surfaces.warningBg` / `.warningText` | Caution, review required |
| `colors.surfaces.infoBg` / `.infoText` | Neutral information, teal-tinted |
| `colors.surfaces.amberBg` / `.amberText` | Deadlines, pending obligations |
| `colors.surfaces.neutralBg` / `.neutralText` | Disabled, inactive |

### Risk / status
| Token | Use |
|---|---|
| `colors.risk.high` | Red — high-risk countries, critical alerts |
| `colors.risk.medium` | Amber — medium risk |
| `colors.risk.low` | Green — low risk |
| `colors.status.success` | Green — approvals, verified |
| `colors.status.error` | Red — blocked, rejected |
| `colors.status.pending` | Amber — in review |
| `colors.accentSurface` | `#F0FDFA` — teal-tinted bg for highlights |

---

## Typography

### Fonts (loaded in `index.html`)
- **Space Grotesk** — headings, nav labels, UI chrome  
- **JetBrains Mono** — numbers, HS codes, currency, percentages, API keys

```tsx
// Headings — implicit via body font-family
<h2 style={{ fontWeight: 700, color: colors.text }}>Title</h2>

// Any number, code, or monetary value
<span style={{ fontFamily: "'JetBrains Mono', monospace" }}>₹2,34,500</span>
<span style={{ fontFamily: "'JetBrains Mono', monospace" }}>7208.51</span>
```

### Type scale
| Size | Use |
|---|---|
| `1.5rem / 700` | Page titles (h2) |
| `1.125rem / 600` | Section titles (h3) |
| `0.875rem / 400` | Body text |
| `0.8rem / 500` | Labels, metadata |
| `0.75rem / 400` | Fine print, source citations |
| `0.72rem / 700 uppercase` | Section eyebrows, filter labels |

---

## Spacing

All spacing comes from the `spacing` object. Never use raw px values for layout gaps.

| Token | Value |
|---|---|
| `spacing.xs` | `0.25rem` |
| `spacing.sm` | `0.5rem` |
| `spacing.md` | `1rem` |
| `spacing.lg` | `1.5rem` |
| `spacing.xl` | `2rem` |
| `spacing['2xl']` | `3rem` |

---

## Border radius

| Token | Value | Use |
|---|---|---|
| `borderRadius.sm` | `0.25rem` | Badges, pills |
| `borderRadius.md` | `0.375rem` | Inputs, buttons |
| `borderRadius.lg` | `0.75rem` | Cards |
| `borderRadius.xl` | `1rem` | Modal shells, large cards |

---

## Common patterns

### Card
```tsx
<div style={{
  backgroundColor: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: borderRadius.lg,
  padding: spacing.md,
}}>
```

### Status banner (inline alert)
```tsx
// Success
<div style={{
  backgroundColor: colors.surfaces.successBg,
  color: colors.surfaces.successText,
  border: `1px solid ${colors.status.success}44`,
  borderRadius: borderRadius.md,
  padding: spacing.sm,
}}>

// Danger — same shape, swap tokens
backgroundColor: colors.surfaces.dangerBg
color: colors.surfaces.dangerText
border: `1px solid ${colors.status.error}44`
```

### Teal highlight panel (CBAM, FTA savings)
```tsx
<div style={{
  backgroundColor: colors.accentSurface,
  border: `1px solid ${colors.accent}44`,
  borderRadius: borderRadius.lg,
  padding: spacing.md,
}}>
```

### Primary button
```tsx
<button style={{
  backgroundColor: colors.primary,
  color: colors.white,
  border: 'none',
  borderRadius: borderRadius.md,
  fontWeight: 700,
  cursor: 'pointer',
}}>
```

### Accent/teal button
```tsx
backgroundColor: colors.accent,  // use for secondary CTAs and tool actions
```

---

## Anti-patterns

| Don't | Do instead |
|---|---|
| `color: '#2563EB'` | `color: colors.accent` |
| `backgroundColor: '#FEE2E2'` | `backgroundColor: colors.surfaces.dangerBg` |
| `backgroundColor: '#EFF6FF'` | `backgroundColor: colors.accentSurface` |
| `color: '#16A34A'` | `color: colors.status.success` |
| `backgroundColor: '#FFF7ED'` | `backgroundColor: colors.surfaces.amberBg` |
| `<span>⚙️</span>` as nav icon | Use SVG from Lucide/Heroicons |
| `import { COLORS } from '@/styles/colors'` | `import { colors } from '@theme/index'` |

---

## Guardrail script

Run before committing any UI changes:

```bash
node scripts/check-tokens.cjs
```

Zero output = clean. Non-zero exit = hardcoded hex found, fix before pushing.

Add to CI when ready:
```json
// package.json
"lint:tokens": "node scripts/check-tokens.cjs"
```
