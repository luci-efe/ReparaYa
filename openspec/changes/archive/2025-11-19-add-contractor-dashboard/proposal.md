# Change: Add Contractor Dashboard Shell and Navigation

## Why

Contractors currently have a basic profile management interface but lack a centralized dashboard to access key features and monitor their business activity. This change implements the minimal viable dashboard shell with navigation and placeholder sections that will serve as the foundation for future contractor-specific features (services CRUD, availability calendar, messaging, analytics).

The dashboard provides contractors with:
- Clear overview of their verification status
- Quick access to core functions (services, availability, messages)
- Visual indicators for incomplete onboarding (e.g., missing service area)
- Extensible structure for future feature modules

## What Changes

- **New dashboard shell** with responsive layout (sidebar + topbar navigation on desktop, bottom nav on mobile)
- **Placeholder dashboard sections** for:
  - Verification status widget
  - Service area configuration CTA (if incomplete)
  - Quick access tiles for "My Services", "Availability/Calendar", "Messages"
  - Upcoming availability blocks summary (placeholder)
  - Basic metrics counters (placeholder)
- **Access guards** for `CONTRACTOR` role (conceptual; implementation uses existing `requireRole` from auth module)
- **Empty, loading, and error states** consistent with project UI patterns
- **A11y and responsive design** (WCAG A/AA, mobile-first breakpoints, ARIA roles, keyboard navigation)
- **Extension points** documented for future modules to hook into the dashboard

**No-goals** (explicitly NOT included):
- Full CRUD for services (future spec)
- Real availability/calendar management (future spec)
- Real-time messaging UI (future spec)
- Analytics/reporting backend (future spec)

## Impact

**Affected specs:**
- `openspec/specs/contractor-dashboard/` (new capability)
- `openspec/specs/profiles/` (minor – dashboard links to existing profile page)

**Affected code:**
- `apps/web/app/contractors/dashboard/` (new)
- `apps/web/src/components/contractors/` (new)
- `apps/web/app/dashboard/DashboardContent.tsx` (minor update to redirect contractors to their dashboard)
- Navigation components (if shared nav exists; otherwise new sidebar/topbar components)

**Dependencies:**
- Existing auth module (role-based guards)
- Existing contractor profile module (verification status, profile data)
- Existing UI components (`Button`, `Card`, `Input`, etc.)

**Migration:**
- None (additive change, no breaking modifications)

## Testing Plan

### Test Cases to Add to STP:

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-CDASH-001 | Contractor with DRAFT profile sees verification pending status | E2E | High | RF-CDASH-001 |
| TC-CDASH-002 | Contractor with ACTIVE profile sees verified badge | E2E | High | RF-CDASH-001 |
| TC-CDASH-003 | Dashboard shows service area CTA when zone not configured | E2E | Medium | RF-CDASH-002 |
| TC-CDASH-004 | Dashboard hides service area CTA when zone is configured | E2E | Medium | RF-CDASH-002 |
| TC-CDASH-005 | Quick access tiles navigate to correct placeholders | E2E | High | RF-CDASH-003 |
| TC-CDASH-006 | Non-contractor user (CLIENT/ADMIN) cannot access contractor dashboard | Integration | Critical | RF-CDASH-004 |
| TC-CDASH-007 | Unauthenticated user redirected to /sign-in | Integration | Critical | RF-CDASH-004 |
| TC-CDASH-008 | Dashboard renders loading state correctly | Unit | Medium | RNF-CDASH-001 |
| TC-CDASH-009 | Dashboard renders error state when API fails | Unit | Medium | RNF-CDASH-001 |
| TC-CDASH-010 | Dashboard renders empty state when no data available | Unit | Medium | RNF-CDASH-001 |
| TC-CDASH-011 | Sidebar navigation keyboard accessible (Tab, Enter, Arrow keys) | A11y | High | RNF-CDASH-002 |
| TC-CDASH-012 | All interactive elements have ARIA labels | A11y | High | RNF-CDASH-002 |
| TC-CDASH-013 | Dashboard responsive on mobile (≤640px) | Responsive | High | RNF-CDASH-003 |
| TC-CDASH-014 | Dashboard responsive on tablet (640-1024px) | Responsive | Medium | RNF-CDASH-003 |
| TC-CDASH-015 | Dashboard responsive on desktop (≥1024px) | Responsive | High | RNF-CDASH-003 |
| TC-CDASH-016 | Performance: Dashboard initial load ≤ 1.5s on 3G | Performance | Medium | RNF-CDASH-004 |

### Acceptance Criteria:

- ✅ Code coverage ≥ 70% for new dashboard components
- ✅ All 16 test cases pass (E2E manual, Integration/Unit automated)
- ✅ No regressions in existing auth/profile tests
- ✅ Lighthouse Accessibility score ≥ 90
- ✅ Mobile, tablet, desktop layouts render correctly
- ✅ Build and type-check pass without errors
- ✅ No new environment variables introduced

### Test Implementation Strategy:

**Test files to create:**
- `apps/web/app/contractors/dashboard/__tests__/page.test.tsx` (unit tests for dashboard page)
- `apps/web/src/components/contractors/__tests__/DashboardShell.test.tsx` (unit tests for layout)
- `apps/web/src/components/contractors/__tests__/VerificationStatusWidget.test.tsx`
- `apps/web/src/components/contractors/__tests__/ServiceAreaCTA.test.tsx`
- `apps/web/src/components/contractors/__tests__/QuickAccessTiles.test.tsx`
- `tests/integration/api/contractors/dashboard-access.test.ts` (integration tests for access guards)

**E2E tests:**
- Manual execution of TC-CDASH-001 to TC-CDASH-007 (documented procedures in STP)
- Automated Playwright tests (optional, if E2E suite is set up in the project)

**Mocks and fixtures:**
- Mock `getCurrentUser()` to return contractor with `role=CONTRACTOR`
- Mock contractor profile API responses (DRAFT/ACTIVE states)
- Mock service area configuration status

**Accessibility testing:**
- Manual keyboard navigation testing (Tab, Enter, Esc)
- Automated axe-core checks in Jest tests
- Lighthouse CI in GitHub Actions (if available)

**Performance:**
- Measure bundle size impact (expect ≤ 20KB increase for dashboard shell)
- Test with Chrome DevTools Network throttling (Fast 3G)

**Responsiveness:**
- Test with Chrome DevTools device emulation (iPhone SE, iPad, Desktop 1920x1080)
- Verify breakpoints at 640px, 768px, 1024px, 1280px
