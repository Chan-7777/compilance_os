// ============================================================================
// Tabs Component - Tabbed navigation with panels
// ============================================================================

import {
  createContext,
  useContext,
  useState,
  useRef,
  useId,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { colors, spacing, borderRadius, transition } from '@theme/index'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabsVariant = 'default' | 'pills' | 'underline'

interface TabsContextValue {
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  variant: TabsVariant
  tabIds: string[]
  panelIds: string[]
  registerTab: (index: number) => string
  registerPanel: (index: number) => string
  focusTab: (index: number) => void
  tabRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  tabCount: number
  setTabCount: (count: number) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component')
  }
  return context
}

// ─── Tabs Container ──────────────────────────────────────────────────────────

export interface TabsProps {
  children: ReactNode
  defaultIndex?: number
  index?: number
  onChange?: (index: number) => void
  variant?: TabsVariant
}

export function Tabs({
  children,
  defaultIndex = 0,
  index,
  onChange,
  variant = 'default',
}: TabsProps) {
  const baseId = useId()
  const [internalIndex, setInternalIndex] = useState(defaultIndex)
  const [tabCount, setTabCount] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const isControlled = index !== undefined
  const selectedIndex = isControlled ? index : internalIndex

  const setSelectedIndex = (newIndex: number) => {
    if (!isControlled) {
      setInternalIndex(newIndex)
    }
    onChange?.(newIndex)
  }

  const tabIds = Array.from({ length: tabCount }, (_, i) => `${baseId}-tab-${i}`)
  const panelIds = Array.from({ length: tabCount }, (_, i) => `${baseId}-panel-${i}`)

  const registerTab = (tabIndex: number) => tabIds[tabIndex] || `${baseId}-tab-${tabIndex}`
  const registerPanel = (panelIndex: number) => panelIds[panelIndex] || `${baseId}-panel-${panelIndex}`

  const focusTab = (tabIndex: number) => {
    tabRefs.current[tabIndex]?.focus()
  }

  return (
    <TabsContext.Provider
      value={{
        selectedIndex,
        setSelectedIndex,
        variant,
        tabIds,
        panelIds,
        registerTab,
        registerPanel,
        focusTab,
        tabRefs,
        tabCount,
        setTabCount,
      }}
    >
      <div data-component="tabs">{children}</div>
    </TabsContext.Provider>
  )
}

// ─── TabList ─────────────────────────────────────────────────────────────────

export interface TabListProps {
  children: ReactNode
  className?: string
}

const variantListStyles: Record<TabsVariant, React.CSSProperties> = {
  default: {
    borderBottom: `2px solid ${colors.border}`,
  },
  pills: {
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  underline: {
    borderBottom: `1px solid ${colors.border}`,
  },
}

export function TabList({ children, className = '' }: TabListProps) {
  const { variant, setTabCount } = useTabsContext()

  // Count children to set tab count
  const childArray = Array.isArray(children) ? children : [children]
  const count = childArray.filter(Boolean).length

  // Update tab count on mount/change via effect to avoid setState during render
  useEffect(() => {
    if (count !== 0) {
      setTabCount(count)
    }
  }, [count, setTabCount])

  const style: React.CSSProperties = {
    display: 'flex',
    gap: spacing.xs,
    ...variantListStyles[variant],
  }

  return (
    <div
      role="tablist"
      data-variant={variant}
      className={className}
      style={style}
    >
      {childArray.map((child, index) => {
        if (!child) return null
        return (
          <TabIndexProvider key={index} index={index}>
            {child}
          </TabIndexProvider>
        )
      })}
    </div>
  )
}

// ─── Tab Index Context ───────────────────────────────────────────────────────

const TabIndexContext = createContext<number>(0)

function TabIndexProvider({ children, index }: { children: ReactNode; index: number }) {
  return <TabIndexContext.Provider value={index}>{children}</TabIndexContext.Provider>
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export interface TabProps {
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Tab({ children, disabled = false, className = '' }: TabProps) {
  const index = useContext(TabIndexContext)
  const {
    selectedIndex,
    setSelectedIndex,
    variant,
    registerTab,
    registerPanel,
    focusTab,
    tabRefs,
    tabCount,
  } = useTabsContext()

  const isSelected = selectedIndex === index
  const tabId = registerTab(index)
  const panelId = registerPanel(index)

  const handleClick = () => {
    if (!disabled) {
      setSelectedIndex(index)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = index

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabCount
        break
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabCount) % tabCount
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabCount - 1
        break
      default:
        return
    }

    e.preventDefault()
    focusTab(nextIndex)
  }

  const baseStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    background: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: isSelected ? 600 : 400,
    color: isSelected ? colors.accent : colors.textMuted,
    transition: `all ${transition.fast}`,
    position: 'relative',
  }

  // Variant-specific selected styles
  const variantSelectedStyles: Record<TabsVariant, React.CSSProperties> = {
    default: isSelected
      ? {
          borderBottom: `2px solid ${colors.accent}`,
          marginBottom: '-2px',
        }
      : {},
    pills: isSelected
      ? {
          backgroundColor: colors.accent,
          color: colors.white,
          borderRadius: borderRadius.md,
        }
      : {},
    underline: isSelected
      ? {
          borderBottom: `2px solid ${colors.accent}`,
          marginBottom: '-1px',
        }
      : {},
  }

  return (
    <button
      ref={el => {
        tabRefs.current[index] = el
      }}
      id={tabId}
      role="tab"
      aria-selected={isSelected}
      aria-controls={panelId}
      aria-disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ ...baseStyle, ...variantSelectedStyles[variant] }}
    >
      {children}
    </button>
  )
}

// ─── TabPanels ───────────────────────────────────────────────────────────────

export interface TabPanelsProps {
  children: ReactNode
  className?: string
}

export function TabPanels({ children, className = '' }: TabPanelsProps) {
  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div data-component="tab-panels" className={className}>
      {childArray.map((child, index) => {
        if (!child) return null
        return (
          <TabIndexProvider key={index} index={index}>
            {child}
          </TabIndexProvider>
        )
      })}
    </div>
  )
}

// ─── TabPanel ────────────────────────────────────────────────────────────────

export interface TabPanelProps {
  children: ReactNode
  className?: string
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  const index = useContext(TabIndexContext)
  const { selectedIndex, registerTab, registerPanel } = useTabsContext()

  const isSelected = selectedIndex === index
  const tabId = registerTab(index)
  const panelId = registerPanel(index)

  const style: React.CSSProperties = {
    padding: spacing.lg,
    display: isSelected ? 'block' : 'none',
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      hidden={!isSelected}
      tabIndex={0}
      className={className}
      style={style}
    >
      {children}
    </div>
  )
}
