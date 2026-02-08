import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './Tabs'

describe('Tabs', () => {
  const renderTabs = (props = {}) =>
    render(
      <Tabs defaultIndex={0} {...props}>
        <TabList>
          <Tab>Tab 1</Tab>
          <Tab>Tab 2</Tab>
          <Tab>Tab 3</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>Content 1</TabPanel>
          <TabPanel>Content 2</TabPanel>
          <TabPanel>Content 3</TabPanel>
        </TabPanels>
      </Tabs>
    )

  describe('TabList', () => {
    it('renders all tabs', () => {
      renderTabs()
      expect(screen.getByText('Tab 1')).toBeInTheDocument()
      expect(screen.getByText('Tab 2')).toBeInTheDocument()
      expect(screen.getByText('Tab 3')).toBeInTheDocument()
    })

    it('has tablist role', () => {
      renderTabs()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('Tab Selection', () => {
    it('first tab is selected by default', () => {
      renderTabs()
      const firstTab = screen.getByText('Tab 1')
      expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })

    it('shows content for selected tab', () => {
      renderTabs()
      expect(screen.getByText('Content 1')).toBeVisible()
    })

    it('clicking tab changes selection', () => {
      renderTabs()
      fireEvent.click(screen.getByText('Tab 2'))

      expect(screen.getByText('Tab 2')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Tab 1')).toHaveAttribute('aria-selected', 'false')
    })

    it('shows correct content when tab changes', () => {
      renderTabs()
      fireEvent.click(screen.getByText('Tab 2'))

      expect(screen.getByText('Content 2')).toBeVisible()
    })
  })

  describe('Controlled Mode', () => {
    it('respects controlled index', () => {
      const onChange = vi.fn()
      render(
        <Tabs index={1} onChange={onChange}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Content 1</TabPanel>
            <TabPanel>Content 2</TabPanel>
          </TabPanels>
        </Tabs>
      )

      expect(screen.getByText('Tab 2')).toHaveAttribute('aria-selected', 'true')
    })

    it('calls onChange when tab clicked', () => {
      const onChange = vi.fn()
      render(
        <Tabs index={0} onChange={onChange}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Content 1</TabPanel>
            <TabPanel>Content 2</TabPanel>
          </TabPanels>
        </Tabs>
      )

      fireEvent.click(screen.getByText('Tab 2'))
      expect(onChange).toHaveBeenCalledWith(1)
    })
  })

  describe('Disabled Tabs', () => {
    it('renders disabled tab', () => {
      render(
        <Tabs defaultIndex={0}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab disabled>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Content 1</TabPanel>
            <TabPanel>Content 2</TabPanel>
          </TabPanels>
        </Tabs>
      )

      const disabledTab = screen.getByText('Tab 2')
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true')
    })

    it('cannot select disabled tab', () => {
      render(
        <Tabs defaultIndex={0}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab disabled>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Content 1</TabPanel>
            <TabPanel>Content 2</TabPanel>
          </TabPanels>
        </Tabs>
      )

      fireEvent.click(screen.getByText('Tab 2'))
      expect(screen.getByText('Tab 1')).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Accessibility', () => {
    it('tabs have correct role', () => {
      renderTabs()
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)
    })

    it('panels have correct role', () => {
      renderTabs()
      const panels = screen.getAllByRole('tabpanel')
      expect(panels.length).toBeGreaterThan(0)
    })

    it('tab and panel are linked via aria attributes', () => {
      renderTabs()
      const firstTab = screen.getByText('Tab 1')
      const tabId = firstTab.getAttribute('id')
      const controlledPanelId = firstTab.getAttribute('aria-controls')

      expect(tabId).toBeTruthy()
      expect(controlledPanelId).toBeTruthy()
    })
  })

  describe('Keyboard Navigation', () => {
    it('arrow right moves to next tab', () => {
      renderTabs()
      const firstTab = screen.getByText('Tab 1')
      firstTab.focus()

      fireEvent.keyDown(firstTab, { key: 'ArrowRight' })
      expect(screen.getByText('Tab 2')).toHaveFocus()
    })

    it('arrow left moves to previous tab', () => {
      renderTabs()
      const secondTab = screen.getByText('Tab 2')
      fireEvent.click(secondTab)
      secondTab.focus()

      fireEvent.keyDown(secondTab, { key: 'ArrowLeft' })
      expect(screen.getByText('Tab 1')).toHaveFocus()
    })

    it('home key moves to first tab', () => {
      renderTabs()
      const thirdTab = screen.getByText('Tab 3')
      fireEvent.click(thirdTab)
      thirdTab.focus()

      fireEvent.keyDown(thirdTab, { key: 'Home' })
      expect(screen.getByText('Tab 1')).toHaveFocus()
    })

    it('end key moves to last tab', () => {
      renderTabs()
      const firstTab = screen.getByText('Tab 1')
      firstTab.focus()

      fireEvent.keyDown(firstTab, { key: 'End' })
      expect(screen.getByText('Tab 3')).toHaveFocus()
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      renderTabs()
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('data-variant', 'default')
    })

    it('renders pills variant', () => {
      renderTabs({ variant: 'pills' })
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('data-variant', 'pills')
    })

    it('renders underline variant', () => {
      renderTabs({ variant: 'underline' })
      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('data-variant', 'underline')
    })
  })
})
