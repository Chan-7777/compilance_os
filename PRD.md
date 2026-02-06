# ComplianceOS - Executable PRD

**Project Type:** Web Application (SPA)
**Target Directory:** `./compliance-os`
**Primary Language/Framework:** TypeScript / React / Vite
**Version:** 1.0.0
**Last Updated:** 2025-02-06

---

## 1. Project Overview

**ComplianceOS** is an export compliance and risk management platform designed specifically for Indian exporters and MSMEs navigating complex international trade regulations. The application provides real-time regulatory intelligence across 6+ destination markets (EU, US, UK, UAE, Japan, Australia), with particular focus on emerging compliance challenges like CBAM (Carbon Border Adjustment Mechanism), ESG disclosures, and evolving trade agreements.

The platform serves as a "compliance co-pilot" that transforms dense regulatory requirements into actionable checklists, risk scores, and alerts. It addresses the critical gap faced by Indian exporters who must simultaneously comply with Indian export regulations (IEC, GST/LUT, FEMA, RBI reporting) AND destination-country requirements (certifications, labeling, customs documentation, carbon reporting).

Key differentiators include: (1) a rules engine that calculates compliance risk scores based on product category, destination market, company size, and regulatory exposure; (2) auto-generated per-shipment checklists that adapt to product-country combinations; (3) a regulatory alert system tracking CBAM deadlines, FTA negotiations, and policy changes; and (4) integration with Indian export schemes (RoDTEP, PLI, Advance Authorization) to maximize duty benefits.

---

## 2. Success Criteria (Test-First Specifications)

### Critical Success Metrics

- [ ] **Risk Accuracy**: Risk scoring algorithm produces consistent, explainable scores (0-100) for all 54 product-country combinations (9 products × 6 countries)
- [ ] **Checklist Completeness**: Generated checklists cover 100% of mandatory documentation for each product-country pair
- [ ] **Alert Timeliness**: System surfaces regulatory deadlines at least 90 days in advance
- [ ] **Performance**: Initial render < 2s, interaction response < 100ms, no layout shift
- [ ] **Data Integrity**: All regulatory data matches official sources (EU CBAM, DGFT, customs authorities)
- [ ] **Usability**: Complete onboarding flow achievable in < 60 seconds

### Acceptance Tests (Define BEFORE Implementation)

```gherkin
Feature: Risk Scoring Engine

  Scenario: Calculate risk for CBAM-covered product to EU
    Given a user has selected "steel" as product category
    And selected "EU" as destination market
    And company size is "small"
    When the risk score is calculated
    Then the score should be >= 50 (medium-high risk)
    And factors should include "CBAM" with severity "high"
    And recommendations should include carbon tracking guidance

  Scenario: Calculate risk for non-CBAM product to FTA market
    Given a user has selected "textiles" as product category
    And selected "UAE" as destination market (active CEPA)
    When the risk score is calculated
    Then the score should be < 40 (low-medium risk)
    And factors should include "Trade Agreement" with severity "positive"

  Scenario: Risk recalculates when inputs change
    Given a risk score has been calculated for steel to EU
    When the user changes destination to "Japan"
    Then the risk score should update automatically
    And CBAM-related factors should be removed or modified

Feature: Compliance Checklist Generator

  Scenario: Generate checklist for food exports to EU
    Given product category is "food"
    And destination is "EU"
    When checklist is generated
    Then it should include "FSSAI Export Certificate"
    And it should include "Phytosanitary Certificate"
    And it should include "HACCP"
    And it should include Indian compliance items (IEC, GST/LUT)
    And items should be categorized by phase (pre-production, pre-shipment, etc.)

  Scenario: Checklist items can be marked complete
    Given a checklist has been generated
    When user clicks on a checklist item
    Then item should toggle to completed state
    And progress bar should update
    And completion state should persist across view changes

  Scenario: Checklist adapts to FTA availability
    Given destination has active FTA (UAE CEPA)
    When checklist is generated
    Then it should include "Certificate of Origin (for preferential tariff)"
    And it should include "Rules of Origin compliance documentation"

Feature: Regulatory Alerts

  Scenario: Display CBAM deadline alerts
    Given EU CBAM has key dates in the future
    When alerts are generated for EU market
    Then alerts should include upcoming deadlines
    And alerts within 90 days should have severity "critical"
    And alerts should show days remaining

  Scenario: Filter alerts by severity
    Given multiple alerts exist with different severities
    When user selects "critical" filter
    Then only critical alerts should be displayed
    When user selects "all" filter
    Then all alerts should be displayed

Feature: Onboarding Flow

  Scenario: Complete onboarding with minimum inputs
    Given user is on onboarding screen
    When user selects company size "small"
    And selects product category "steel"
    And selects at least one destination country
    And clicks "Generate Compliance Report"
    Then user should see the main dashboard
    And dashboard should show risk scores for selected markets

  Scenario: Validation prevents incomplete onboarding
    Given user is on onboarding screen
    And no product is selected
    When user tries to proceed
    Then the proceed button should be disabled
    And user should remain on onboarding screen

Feature: Shipment Tracker

  Scenario: Create new shipment
    Given user is on shipments view
    When user clicks "New Shipment"
    And fills in shipment name, product, country, date
    And clicks "Create Shipment"
    Then new shipment should appear in the list
    And shipment should have auto-generated checklist
    And shipment should show risk score

  Scenario: Shipment persists across sessions
    Given a shipment has been created
    When user refreshes the page (or simulated state reset)
    Then shipment should still be visible
    Note: For MVP, use localStorage; later migrate to backend
```

---

## 3. Testing Strategy (Design First)

### Unit Test Requirements

```
Test Suite: RegulatoryDatabase
├── Test: REGULATORY_DB structure integrity
│   ├── Input: Each country key (EU, US, UK, UAE, Japan, Australia)
│   ├── Expected: All required fields present (name, flag, cbam, esg, certifications)
│   └── Edge Cases: Missing nested fields, null values
├── Test: CBAM sector coverage accuracy
│   ├── Input: countryData.cbam.coveredSectors
│   ├── Expected: Array of valid sector strings
│   └── Edge Cases: Empty array, undefined cbam object
└── Test: Certification lookup by product
    ├── Input: countryData.certifications[productId]
    ├── Expected: Array of certification strings
    └── Edge Cases: Unknown product ID falls back to "general"

Test Suite: RiskScoringEngine (calculateRiskScore)
├── Test: CBAM risk calculation
│   ├── Input: product="steel", country="EU", companyProfile={size:"small"}
│   ├── Expected: score includes +30 for CBAM, factors include CBAM high severity
│   └── Edge Cases: Non-CBAM product, country without active CBAM
├── Test: ESG risk factors
│   ├── Input: Country with scope3Required=true
│   ├── Expected: score includes +15, factors include Scope 3 requirement
│   └── Edge Cases: Missing esg object
├── Test: FTA positive adjustment
│   ├── Input: Country with active FTA (UAE, Australia, Japan)
│   ├── Expected: score includes -5, factors include positive severity
│   └── Edge Cases: FTA under negotiation (no reduction)
├── Test: Company size modifier
│   ├── Input: companyProfile.size = "micro" or "small"
│   ├── Expected: score includes +10, MSME capacity factor added
│   └── Edge Cases: Missing companyProfile, undefined size
├── Test: Score normalization
│   ├── Input: Extreme cases that would exceed 0-100
│   ├── Expected: Score clamped to 0-100 range
│   └── Edge Cases: All risk factors present (max), no risk factors (min)
└── Test: Risk level classification
    ├── Input: Various scores
    ├── Expected: score >= 60 → "high", 30-59 → "medium", < 30 → "low"
    └── Edge Cases: Boundary values (29, 30, 59, 60)

Test Suite: ChecklistGenerator (generateChecklist)
├── Test: Base documentation always included
│   ├── Input: Any valid product/country combination
│   ├── Expected: Commercial Invoice, Packing List, Bill of Lading present
│   └── Edge Cases: None (universal requirements)
├── Test: Product-specific certifications included
│   ├── Input: product="food", country="EU"
│   ├── Expected: FSSAI, Phytosanitary, HACCP in checklist
│   └── Edge Cases: Product not in country's certification list
├── Test: CBAM items for covered products
│   ├── Input: product="steel", country="EU"
│   ├── Expected: Emissions calculation, Carbon declaration items present
│   └── Edge Cases: CBAM inactive country
├── Test: FTA Certificate of Origin handling
│   ├── Input: Country with preferentialTariff=true
│   ├── Expected: Preferential CoO item with FTA name
│   └── Edge Cases: FTA under negotiation (non-preferential CoO)
├── Test: Indian compliance items always present
│   ├── Input: Any product/country
│   ├── Expected: IEC, AD Code, GST/LUT, FEMA items present
│   └── Edge Cases: None (universal for Indian exporters)
└── Test: Checklist item structure
    ├── Input: Generated checklist
    ├── Expected: Each item has id, category, item, priority, phase
    └── Edge Cases: None

Test Suite: AlertGenerator (generateAlerts)
├── Test: Regulation changes surfaced
│   ├── Input: Country with recentChanges array
│   ├── Expected: Alerts created for each change
│   └── Edge Cases: Empty recentChanges
├── Test: CBAM deadline alerts with days remaining
│   ├── Input: Country with future keyDates
│   ├── Expected: Alerts show days until deadline
│   └── Edge Cases: Past dates filtered out
├── Test: Alert severity based on proximity
│   ├── Input: Deadline < 90 days away
│   ├── Expected: severity = "critical"
│   └── Edge Cases: Deadline exactly 90 days away
├── Test: FTA negotiation alerts
│   ├── Input: Country with FTA status "Under Negotiation"
│   ├── Expected: Info alert with FTA notes
│   └── Edge Cases: Active FTA (no negotiation alert)
└── Test: Alerts sorted by severity
    ├── Input: Mixed severity alerts
    ├── Expected: critical first, then warning, then info
    └── Edge Cases: All same severity

Test Suite: UI Components
├── Test: RiskGauge renders correctly
│   ├── Input: score=75, level="high"
│   ├── Expected: SVG renders, arc fills to 75%, color is red
│   └── Edge Cases: score=0, score=100
├── Test: Badge component styling
│   ├── Input: Various color props
│   ├── Expected: Correct text color and background
│   └── Edge Cases: Missing color prop (default)
├── Test: Card interactive states
│   ├── Input: Card with onClick handler
│   ├── Expected: Hover state changes border and background
│   └── Edge Cases: Card without onClick (no hover effect)
├── Test: Button disabled state
│   ├── Input: disabled=true
│   ├── Expected: Reduced opacity, cursor not-allowed
│   └── Edge Cases: Clicking disabled button (no action)
└── Test: Tab active state
    ├── Input: active=true
    ├── Expected: Accent background and color
    └── Edge Cases: Switching between tabs
```

### Integration Test Requirements

```
Integration Suite: Full User Journey

Test: Onboarding to Dashboard Flow
├── Setup: Fresh app state (showOnboarding=true)
├── Actions:
│   1. Select company size "medium"
│   2. Select product "chemicals"
│   3. Select countries ["EU", "US", "UK"]
│   4. Click "Generate Compliance Report"
├── Validations:
│   - Dashboard view renders
│   - Risk scores appear for all 3 countries
│   - Alert count badge shows correct number
│   - Markets card shows selected countries

Test: Risk Analysis Deep Dive
├── Setup: Onboarding complete, steel to EU selected
├── Actions:
│   1. Navigate to "Risk Analysis" via sidebar
│   2. View risk factors for EU
│   3. Expand recommendations
├── Validations:
│   - CBAM factor visible with high severity
│   - Recommendations include carbon tracking
│   - Risk gauge shows correct score and color

Test: Checklist Completion Flow
├── Setup: Onboarding complete, food to UAE selected
├── Actions:
│   1. Navigate to "Checklists" view
│   2. Click on first checklist item to mark complete
│   3. Click on third item to mark complete
│   4. Switch country tab
│   5. Switch back to original country
├── Validations:
│   - Progress bar updates after each completion
│   - Checked state persists across tab switches
│   - Correct items remain checked

Test: Alert Filtering
├── Setup: Multiple markets selected with varied alerts
├── Actions:
│   1. Navigate to "Alerts" view
│   2. Click "Critical" filter
│   3. Click "Warning" filter
│   4. Click "All" filter
├── Validations:
│   - Only matching alerts displayed for each filter
│   - Count badges update correctly

Test: Shipment Creation and Tracking
├── Setup: Onboarding complete
├── Actions:
│   1. Navigate to "Shipments" view
│   2. Click "New Shipment"
│   3. Fill form: name="Q1 Steel Batch", product="steel", country="EU"
│   4. Click "Create Shipment"
│   5. Navigate away and back
├── Validations:
│   - Shipment appears in list
│   - Shipment shows risk score
│   - Shipment persists after navigation

Test: Configuration Change Flow
├── Setup: Dashboard with existing selections
├── Actions:
│   1. Click "Change Product / Markets" from Quick Actions
│   2. Change product to "textiles"
│   3. Remove one country, add different country
│   4. Proceed back to dashboard
├── Validations:
│   - Risk scores recalculate for new configuration
│   - Alerts update for new markets
│   - Previous checklist state does not carry over incorrectly
```

### Regression Test Protocol

```bash
# After each new feature, run:
npm run test:unit              # All unit tests
npm run test:integration       # All integration tests
npm run test:e2e:smoke         # Critical path E2E

# Specific regression targets by feature area:
# If modifying RiskScoringEngine:
npm test -- --grep "RiskScoringEngine"
npm test -- --grep "Dashboard"

# If modifying ChecklistGenerator:
npm test -- --grep "ChecklistGenerator"
npm test -- --grep "Checklist Completion Flow"

# If modifying AlertGenerator:
npm test -- --grep "AlertGenerator"
npm test -- --grep "Alert Filtering"

# If modifying UI components:
npm test -- --grep "UI Components"
npm run test:visual-regression  # If configured
```

---

## 4. Implementation Phases (Spec-Driven)

### Phase 0: Project Scaffolding

**Spec:**
- Input: Empty directory
- Output: Configured Vite + React + TypeScript project with testing infrastructure
- Side Effects: Git repository initialized, dependencies installed
- Error Handling: N/A

**Tests to Write First:**
1. Test that `npm run dev` starts without errors
2. Test that `npm run build` produces valid output
3. Test that `npm test` runs without errors (even if no tests yet)

**Implementation Checklist:**
- [ ] Initialize Vite project with React + TypeScript template
- [ ] Install testing dependencies (Vitest, React Testing Library, jsdom)
- [ ] Configure Vitest with jsdom environment
- [ ] Install additional dependencies (if any: date-fns, etc.)
- [ ] Create folder structure: `src/components`, `src/data`, `src/utils`, `src/hooks`
- [ ] Add ESLint + Prettier configuration
- [ ] Verify all scripts work
- [ ] Git commit

**Git Commit Strategy:**
```bash
git init
git add .
git commit -m "chore: initialize project scaffolding

- Vite + React + TypeScript setup
- Vitest configured with jsdom
- Folder structure created
- Tests: build and test scripts verified"
```

---

### Phase 1: Data Layer & Core Utilities

**Spec:**
- Input: Raw regulatory data structures
- Output: Type-safe data models, exported constants, utility functions
- Side Effects: None (pure data/functions)
- Error Handling: Type guards for runtime validation

**Tests to Write First:**
1. `REGULATORY_DB` has all 6 countries with required fields
2. `PRODUCT_CATEGORIES` has all 9 categories with required fields
3. `FTA_DATABASE` has entries for all country keys
4. `INDIAN_EXPORT_SCHEMES` has all 8 schemes
5. Type guards correctly validate data structures

**Implementation Checklist:**
- [ ] Write unit tests for data structure integrity (should fail)
- [ ] Create `src/data/regulatory-db.ts` with typed REGULATORY_DB
- [ ] Create `src/data/products.ts` with PRODUCT_CATEGORIES
- [ ] Create `src/data/fta.ts` with FTA_DATABASE
- [ ] Create `src/data/indian-schemes.ts` with INDIAN_EXPORT_SCHEMES
- [ ] Create `src/types/index.ts` with all TypeScript interfaces
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 0 (build still works)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(data): add regulatory database and type definitions

- REGULATORY_DB with 6 country profiles
- PRODUCT_CATEGORIES with 9 product types
- FTA_DATABASE with trade agreement status
- INDIAN_EXPORT_SCHEMES with 8 schemes
- TypeScript interfaces for all data structures
- Tests: 12 unit tests passing
- Regression: Phase 0 verified (build works)"
```

---

### Phase 2: Risk Scoring Engine

**Spec:**
- Input: `product: string, country: string, companyProfile: CompanyProfile`
- Output: `{ score: number, level: 'high'|'medium'|'low', factors: RiskFactor[], recommendations: string[] }`
- Side Effects: None (pure function)
- Error Handling: Return default medium risk if country not found

**Tests to Write First:**
1. CBAM risk calculation for covered products
2. ESG Scope 3 requirement detection
3. FTA positive adjustment
4. Company size MSME modifier
5. Score normalization (0-100 bounds)
6. Risk level classification boundaries
7. Unknown country handling

**Implementation Checklist:**
- [ ] Write unit tests for calculateRiskScore (should fail)
- [ ] Create `src/utils/risk-scoring.ts`
- [ ] Implement CBAM risk factor logic
- [ ] Implement ESG risk factor logic
- [ ] Implement certification complexity factor
- [ ] Implement FTA adjustment logic
- [ ] Implement company size modifier
- [ ] Implement special cases (EUDR, UFLPA)
- [ ] Implement score normalization and level assignment
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 1 (data imports still work)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(risk): implement risk scoring engine

- calculateRiskScore function with multi-factor analysis
- CBAM, ESG, certification, FTA, MSME factors
- Score normalization and level classification
- Recommendation generation based on factors
- Tests: 18 unit tests passing
- Regression: Phase 1 data layer verified"
```

---

### Phase 3: Checklist Generator

**Spec:**
- Input: `product: string, country: string`
- Output: `ChecklistItem[]` with id, category, item, priority, phase
- Side Effects: None (pure function)
- Error Handling: Return empty array if country not found

**Tests to Write First:**
1. Base documentation always included
2. Product-specific certifications included
3. CBAM items for covered products/countries
4. FTA Certificate of Origin handling
5. Indian compliance items always present
6. Checklist item structure validation
7. Category assignment correctness

**Implementation Checklist:**
- [ ] Write unit tests for generateChecklist (should fail)
- [ ] Create `src/utils/checklist-generator.ts`
- [ ] Implement base documentation section
- [ ] Implement Certificate of Origin logic (preferential vs non-preferential)
- [ ] Implement product certification lookup
- [ ] Implement CBAM checklist items
- [ ] Implement ESG checklist items
- [ ] Implement packaging/labeling items
- [ ] Implement customs items
- [ ] Implement Indian compliance items
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 2 (risk scoring still works)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(checklist): implement compliance checklist generator

- generateChecklist function with categorized items
- Dynamic items based on product-country combination
- CBAM-specific items for covered sectors
- FTA-aware Certificate of Origin handling
- Indian export compliance requirements
- Tests: 15 unit tests passing
- Regression: Phase 2 risk scoring verified"
```

---

### Phase 4: Alert System

**Spec:**
- Input: `product: string, countries: string[]`
- Output: `Alert[]` sorted by severity (critical first)
- Side Effects: None (pure function, uses current date for deadline calculation)
- Error Handling: Skip countries not in database

**Tests to Write First:**
1. Regulation changes surfaced from recentChanges
2. CBAM deadline alerts with days remaining calculation
3. Alert severity based on deadline proximity (< 90 days = critical)
4. FTA negotiation alerts
5. Alerts sorted by severity
6. Empty/missing data handling

**Implementation Checklist:**
- [ ] Write unit tests for generateAlerts (should fail)
- [ ] Create `src/utils/alert-generator.ts`
- [ ] Implement regulation change alerts
- [ ] Implement CBAM deadline alerts with days calculation
- [ ] Implement FTA status alerts
- [ ] Implement severity classification
- [ ] Implement sorting logic
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 3 (checklist still works)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(alerts): implement regulatory alert system

- generateAlerts function with multi-source alerts
- CBAM deadline tracking with days remaining
- Severity classification (critical/warning/info)
- FTA negotiation status alerts
- Sorted output by severity
- Tests: 12 unit tests passing
- Regression: Phase 3 checklist generator verified"
```

---

### Phase 5: UI Components (Primitives)

**Spec:**
- Input: Props as defined in component interfaces
- Output: Styled React components
- Side Effects: DOM rendering
- Error Handling: Default props where appropriate

**Tests to Write First:**
1. RiskGauge renders with correct arc fill percentage
2. Badge renders with correct colors
3. Card hover states work with onClick
4. Button disabled state prevents interaction
5. Tab active state styling

**Implementation Checklist:**
- [ ] Write component tests (should fail)
- [ ] Create `src/components/ui/RiskGauge.tsx`
- [ ] Create `src/components/ui/Badge.tsx`
- [ ] Create `src/components/ui/Card.tsx`
- [ ] Create `src/components/ui/Button.tsx`
- [ ] Create `src/components/ui/Tab.tsx`
- [ ] Create `src/styles/colors.ts` with COLORS constant
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 4 (alerts still work)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(ui): implement core UI components

- RiskGauge with SVG arc visualization
- Badge for status indicators
- Card with hover states
- Button with primary/disabled variants
- Tab for navigation
- Centralized color system
- Tests: 10 component tests passing
- Regression: Phase 4 alert system verified"
```

---

### Phase 6: Main Application Views

**Spec:**
- Input: Application state (selectedProduct, selectedCountries, etc.)
- Output: Complete rendered views (Dashboard, Risk, Checklist, Alerts, FTA, Shipments)
- Side Effects: DOM rendering, state updates
- Error Handling: Empty states for no data

**Tests to Write First:**
1. Dashboard renders all summary cards
2. Risk view shows all selected countries
3. Checklist view with tab switching
4. Alert view with filtering
5. FTA view with schemes list
6. Shipments view with add/list functionality

**Implementation Checklist:**
- [ ] Write view component tests (should fail)
- [ ] Create `src/components/views/Dashboard.tsx`
- [ ] Create `src/components/views/RiskAnalysis.tsx`
- [ ] Create `src/components/views/Checklist.tsx`
- [ ] Create `src/components/views/Alerts.tsx`
- [ ] Create `src/components/views/FTASchemes.tsx`
- [ ] Create `src/components/views/Shipments.tsx`
- [ ] Create `src/components/Sidebar.tsx`
- [ ] Run tests (should pass)
- [ ] Run full test suite
- [ ] Git commit
- [ ] Retest Phase 5 (UI components still work)

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(views): implement main application views

- Dashboard with summary cards and quick actions
- Risk Analysis with per-country breakdown
- Checklist with progress tracking
- Alerts with severity filtering
- FTA & Schemes reference view
- Shipments tracker with CRUD
- Sidebar navigation
- Tests: 18 view tests passing
- Regression: Phase 5 UI components verified"
```

---

### Phase 7: Main App Integration & Onboarding

**Spec:**
- Input: User interactions
- Output: Fully functional SPA with state management
- Side Effects: State updates, localStorage persistence (future)
- Error Handling: Validation on onboarding inputs

**Tests to Write First:**
1. Onboarding flow completion
2. View navigation via sidebar
3. State propagation to child views
4. Configuration change flow
5. Shipment persistence

**Implementation Checklist:**
- [ ] Write integration tests (should fail)
- [ ] Create `src/components/Onboarding.tsx`
- [ ] Create `src/App.tsx` with state management
- [ ] Wire up all views to main state
- [ ] Implement view switching logic
- [ ] Implement checkedItems state management
- [ ] Implement shipments state management
- [ ] Add localStorage persistence (optional for MVP)
- [ ] Run tests (should pass)
- [ ] Run full test suite (ALL tests)
- [ ] Git commit
- [ ] Retest ALL previous phases

**Git Commit Strategy:**
```bash
git add .
git commit -m "feat(app): complete application integration

- Onboarding flow with validation
- Main App with centralized state
- View routing and navigation
- Checklist completion state
- Shipment tracking state
- Tests: 25 integration tests passing
- Regression: ALL previous phases verified
- Total: 110 tests passing"
```

---

## 5. Agent Self-Documentation Space

> **AGENT INSTRUCTIONS:** After each implementation phase, update this section with:
> - What worked well
> - Unexpected challenges
> - Code patterns that emerged
> - Refactoring opportunities
> - Technical debt items

### Implementation Log

#### Session 1: [Date/Time]
**Phase Completed:**
-

**Completed Tasks:**
-

**Tests Written:**
-

**Learnings:**
-

**Challenges Encountered:**
-

**Patterns Discovered:**
-

**Technical Debt Identified:**
-

**Next Session Priorities:**
-

**Regression Test Results:**
- Previous features tested:
- Status: ✅ / ⚠️ / ❌
- Issues found:

---

#### Session 2: [Date/Time]
**Phase Completed:**
-

**Completed Tasks:**
-

**Tests Written:**
-

**Learnings:**
-

**Regression Test Results:**
- Previous features tested:
- Status: ✅ / ⚠️ / ❌

---

#### Session 3: [Date/Time]
[Agent fills in]

---

#### Session 4: [Date/Time]
[Agent fills in]

---

#### Session 5: [Date/Time]
[Agent fills in]

---

#### Session 6: [Date/Time]
[Agent fills in]

---

#### Session 7: [Date/Time]
[Agent fills in]

---

## 6. Continuous Validation Rules (MANDATORY)

### After Every Feature Implementation:

1. **Run Test Pyramid**
```bash
# Unit tests (fast, run frequently)
npm test

# Integration tests
npm run test:integration

# E2E smoke tests (critical paths only)
npm run test:e2e:smoke

# Full suite before commits
npm run test:all
```

2. **Git Workflow**
```bash
# Review changes
git status
git diff

# Stage specific files (avoid git add .)
git add src/utils/risk-scoring.ts
git add src/utils/risk-scoring.test.ts

# Commit with context
git commit -m "feat(risk): add CBAM risk factor calculation

Tests: 8 unit tests passing
Impact: src/utils/risk-scoring.ts
Regression: data layer tests passing"

# Review history for regression targets
git log --oneline -10
```

3. **Retrospective Testing**
```bash
# Check commit history
git log --oneline -10

# Identify files changed recently
git diff HEAD~5 --name-only

# Run targeted regression tests
npm test -- --grep "calculateRiskScore"
npm test -- --grep "generateChecklist"

# If data layer changed, retest everything using it
npm test -- --grep "REGULATORY_DB"
```

4. **Update Agent Memory**
   - Document in Section 5
   - Note any breaking changes
   - Update test cases if specs evolved
   - Flag technical debt items

### Failure Recovery Protocol:

If ANY test fails:
1. **STOP** new implementation immediately
2. Document the failure in Agent Self-Documentation:
   ```
   **FAILURE DETECTED**
   - Test: [test name]
   - Error: [error message]
   - Likely cause: [analysis]
   ```
3. Analyze: Is it a regression or new bug?
   - Regression: Previous working code broke
   - New bug: New code has defect
4. Fix the failing test:
   - For regression: Check recent changes, revert if needed
   - For new bug: Fix implementation, not test
5. Rerun FULL test suite
6. Only proceed when ALL tests pass
7. Git commit the fix separately:
   ```bash
   git commit -m "fix(risk): correct score calculation for edge case

   Fixes regression in CBAM scoring
   Tests: all 45 tests passing"
   ```

---

## 7. Technical Architecture (Spec First)

### Data Models (Define Before Code)

```typescript
// src/types/index.ts

// Country regulatory profile
interface CountryRegulation {
  name: string;                    // Full country name
  flag: string;                    // Emoji flag
  cbam: CBAMConfig | null;         // CBAM configuration if active
  esg: ESGConfig;                  // ESG reporting requirements
  certifications: Record<string, string[]>; // Product -> certifications
  packaging: string[];             // Packaging regulations
  labeling: string[];              // Labeling requirements
  customs: string[];               // Customs documentation
  sanctions: string[];             // Sanctions screening requirements
  recentChanges: RegulationChange[]; // Recent regulatory changes
}

interface CBAMConfig {
  active: boolean;                 // Is CBAM currently active
  phase: string;                   // Current phase description
  coveredSectors: string[];        // Affected product categories
  reportingFrequency?: string;     // How often to report
  penaltyPerTonne?: string;        // Penalty rates
  keyDates: KeyDate[];             // Important deadlines
  notes?: string;                  // Additional context
}

interface ESGConfig {
  csrd?: boolean;                  // EU CSRD applies
  tcfd?: boolean;                  // TCFD reporting
  secClimate?: boolean;            // SEC climate rules
  taxonomy?: boolean;              // EU Taxonomy
  dueDiligence?: string;           // Due diligence directive
  reportingStandards: string[];    // Accepted standards
  scope3Required: boolean;         // Scope 3 emissions required
  notes?: string;
}

interface KeyDate {
  date: string;                    // ISO date string
  event: string;                   // Description of deadline
}

interface RegulationChange {
  date: string;                    // When change occurred/announced
  change: string;                  // Description of change
}

// Product category
interface ProductCategory {
  id: string;                      // Unique identifier
  label: string;                   // Display name
  icon: string;                    // Emoji icon
  hsPrefix: string[];              // HS code prefixes
}

// FTA status
interface FTAStatus {
  name: string;                    // Agreement name
  status: 'Active' | 'Under Negotiation' | 'No FTA';
  effectiveDate?: string;          // When it took effect
  round?: string;                  // Negotiation round
  preferentialTariff: boolean;     // Can get preferential rates
  notes: string;                   // Additional context
}

// Indian export scheme
interface ExportScheme {
  name: string;                    // Scheme name/acronym
  desc: string;                    // Full description
  status: string;                  // Current status
}

// Company profile
interface CompanyProfile {
  name: string;                    // Company name
  size: 'micro' | 'small' | 'medium' | 'large';
  iec?: string;                    // Import Export Code
}

// Risk assessment result
interface RiskResult {
  score: number;                   // 0-100
  level: 'high' | 'medium' | 'low';
  factors: RiskFactor[];
  recommendations: string[];
}

interface RiskFactor {
  category: string;                // CBAM, ESG, Certifications, etc.
  severity: 'high' | 'medium' | 'low' | 'info' | 'positive';
  detail: string;                  // Explanation
}

// Checklist item
interface ChecklistItem {
  id: number;
  category: string;                // Documentation, Certification, etc.
  item: string;                    // Item description
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: 'one-time' | 'pre-production' | 'pre-shipment' | 'per-shipment' | 'annual' | 'quarterly';
}

// Alert
interface Alert {
  id: number;
  type: 'regulation_change' | 'deadline' | 'fta_update';
  severity: 'critical' | 'warning' | 'info';
  country: string;                 // Country key
  countryName: string;
  flag: string;
  date: string;
  message: string;
}

// Shipment
interface Shipment {
  id: number;
  name: string;
  product: string;
  country: string;
  date: string;
  status: 'preparing' | 'in_transit' | 'delivered';
  checklist: ChecklistItem[];
  completed: number;               // Completed checklist items
}
```

### Component Interfaces

```typescript
// src/components/ui/RiskGauge.tsx
interface RiskGaugeProps {
  score: number;                   // 0-100
  level: 'high' | 'medium' | 'low';
}

// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  color?: string;                  // Text color
  bg?: string;                     // Background color
}

// src/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;            // Makes card clickable
}

// src/components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

// src/components/ui/Tab.tsx
interface TabProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}
```

### Application State Shape

```typescript
// Main App state
interface AppState {
  currentView: ViewType;
  selectedProduct: string | null;
  selectedCountries: string[];
  companyProfile: CompanyProfile;
  checkedItems: Record<string, boolean>; // "country-itemId" -> checked
  showOnboarding: boolean;
  activeAlertFilter: 'all' | 'critical' | 'warning' | 'info';
  searchQuery: string;
  selectedShipment: Shipment | null;
  shipments: Shipment[];
  showAddShipment: boolean;
  newShipment: Partial<Shipment>;
}

type ViewType = 'dashboard' | 'risk' | 'checklist' | 'alerts' | 'fta' | 'shipments';
```

---

## 8. Quality Gates (Cannot Proceed Without)

### Phase Completion Checklist

Before marking ANY phase complete, ALL items must be checked:

- [ ] **Tests Written**: All specified unit tests for this phase exist
- [ ] **Tests Passing**: All unit tests pass (0 failures)
- [ ] **Integration Tests**: If applicable, integration tests pass
- [ ] **No Regressions**: Previous phase tests still pass
- [ ] **Code Committed**: Changes committed to git with structured message
- [ ] **Commit Message**: Includes test count, impact, regression status
- [ ] **Documentation Updated**: Agent Self-Documentation section filled
- [ ] **Technical Debt Noted**: Any shortcuts or TODOs documented
- [ ] **No TypeScript Errors**: `tsc --noEmit` passes
- [ ] **No Linting Errors**: `npm run lint` passes

### Final Release Checklist

Before considering the project complete:

- [ ] All 7 phases complete with quality gates passed
- [ ] Total test count matches expected (~110+ tests)
- [ ] Full test suite passes in under 30 seconds
- [ ] Build succeeds without warnings
- [ ] All acceptance tests (Gherkin scenarios) verified
- [ ] Agent Self-Documentation complete for all sessions
- [ ] Git history clean with meaningful commits
- [ ] No console errors or warnings in browser
- [ ] Performance targets met (< 2s initial load)
- [ ] README.md updated with setup/run instructions

---

## 9. Agent Instructions Summary

### YOU MUST:

1. **Read entire PRD** before writing any code
2. **Write tests FIRST** for current phase (they should fail initially)
3. **Implement minimal code** to make tests pass (no premature optimization)
4. **Run full test suite** after implementation (`npm run test:all`)
5. **Git commit** with structured message including test counts
6. **Review git log** to identify regression test targets
7. **Retest previous features** (at least 2-3 from recent phases)
8. **Document session** in Section 5 before ending
9. **Only move to next phase** when ALL quality gates pass

### RECURSIVE LOOP:

```
┌─────────────────────────────────────────────────────────────┐
│  Spec → Tests (fail) → Implement → Tests (pass) →          │
│  Full Suite → Commit → Review History → Regression Test →  │
│  Document → Next Spec                                       │
└─────────────────────────────────────────────────────────────┘
```

### NEVER:

- ❌ Skip writing tests
- ❌ Commit failing tests
- ❌ Implement without defined acceptance criteria
- ❌ Ignore regression test failures
- ❌ Forget to update Agent Self-Documentation
- ❌ Use `git add .` (add specific files)
- ❌ Proceed when quality gates fail
- ❌ Skip running full test suite before commits

---

## 10. Execution Prompt for AI Agent

When you receive this PRD, begin by:

1. **Confirm understanding** of the recursive testing loop
2. **Check git status** - is this a fresh repo or existing?
3. **Review git log** (if commits exist) to understand current state
4. **Run existing tests** (if any) to establish baseline
5. **Start with Phase 0** if fresh, or resume from incomplete phase
6. **Follow TDD strictly**: tests first, implementation second
7. **Commit after each phase** with structured messages
8. **Run regression tests** against git history
9. **Document in Section 5** before ending session

### Resumption Protocol

After each session, you can resume by:

1. Reading your previous documentation in **Section 5**
2. Checking `git log --oneline -10` for what's complete
3. Running `npm run test:all` to validate current state
4. Continuing from next incomplete phase or fixing failures

### Success Metrics

Your success is measured by:

```
✅ ALL TESTS PASSING (110+)
✅ COMPLETE GIT HISTORY (meaningful commits)
✅ THOROUGH DOCUMENTATION (Section 5 filled)
✅ QUALITY GATES MET (all phases)
✅ ACCEPTANCE TESTS VERIFIED (Gherkin scenarios)
```

---

**END OF PRD**

*This document serves as both human-readable specification and direct prompt for AI coding agents.*
