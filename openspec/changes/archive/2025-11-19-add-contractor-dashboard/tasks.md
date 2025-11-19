# Implementation Tasks: Contractor Dashboard

## 1. OpenSpec and Documentation
- [x] 1.1 Create proposal.md with testing plan
- [x] 1.2 Create tasks.md (this file)
- [x] 1.3 Create design.md with IA and navigation structure
- [x] 1.4 Create spec delta in specs/contractor-dashboard/spec.md
- [x] 1.5 Update STP-ReparaYa.md with test cases TC-CDASH-001 to TC-CDASH-016
- [x] 1.6 Validate proposal with `openspec validate add-contractor-dashboard --strict`

## 2. Dashboard Shell and Layout
- [x] 2.1 Create `apps/web/app/contractors/dashboard/page.tsx` (server component with auth guard)
- [x] 2.2 Create `apps/web/app/contractors/dashboard/layout.tsx` (dashboard layout wrapper)
- [x] 2.3 Create `apps/web/src/components/contractors/DashboardShell.tsx` (responsive layout with sidebar + topbar)
- [x] 2.4 Create `apps/web/src/components/contractors/ContractorSidebar.tsx` (navigation sidebar, collapsible on mobile)
- [x] 2.5 Create `apps/web/src/components/contractors/ContractorTopbar.tsx` (topbar with user menu and notifications placeholder)
- [x] 2.6 Implement responsive breakpoints (mobile: bottom nav, tablet/desktop: sidebar)

## 3. Dashboard Sections (Placeholders)
- [x] 3.1 Create `apps/web/src/components/contractors/VerificationStatusWidget.tsx` (shows DRAFT/ACTIVE badge)
- [x] 3.2 Create `apps/web/src/components/contractors/ServiceAreaCTA.tsx` (CTA to configure service area if missing)
- [x] 3.3 Create `apps/web/src/components/contractors/QuickAccessTiles.tsx` (tiles for Services, Availability, Messages)
- [x] 3.4 Create `apps/web/src/components/contractors/AvailabilitySummary.tsx` (placeholder for upcoming blocks)
- [x] 3.5 Create `apps/web/src/components/contractors/MetricsOverview.tsx` (placeholder counters: active services, pending bookings, etc.)

## 4. States and Error Handling
- [x] 4.1 Implement loading state in dashboard page (skeleton loaders)
- [x] 4.2 Implement error state (API failure, network error)
- [x] 4.3 Implement empty state (new contractor with no data)
- [x] 4.4 Ensure consistent error boundaries for dashboard sections

## 5. Access Guards and Permissions
- [x] 5.1 Add role guard in `apps/web/app/contractors/dashboard/page.tsx` (use existing `requireRole('CONTRACTOR')`)
- [x] 5.2 Update `apps/web/app/dashboard/DashboardContent.tsx` to redirect contractors to `/contractors/dashboard`
- [x] 5.3 Document permission contract in spec (only CONTRACTOR role can access)

## 6. Accessibility (A11y)
- [x] 6.1 Add ARIA labels to all navigation links (`aria-label`, `aria-current`)
- [x] 6.2 Ensure keyboard navigation works (Tab, Enter, Esc for mobile menu)
- [x] 6.3 Add skip-to-content link for screen readers
- [x] 6.4 Ensure focus indicators are visible (focus:ring-2)
- [x] 6.5 Use semantic HTML (`<nav>`, `<main>`, `<aside>`)
- [x] 6.6 Test with axe-core in Jest tests

## 7. Responsive Design
- [x] 7.1 Mobile (≤640px): Bottom navigation, stacked sections
- [x] 7.2 Tablet (640-1024px): Collapsible sidebar, grid layout for tiles
- [x] 7.3 Desktop (≥1024px): Fixed sidebar, multi-column grid for sections
- [x] 7.4 Test with Chrome DevTools device emulation

## 8. Testing
- [x] 8.1 Write unit tests for DashboardShell (loading, error, empty states)
- [x] 8.2 Write unit tests for VerificationStatusWidget (DRAFT/ACTIVE rendering)
- [x] 8.3 Write unit tests for ServiceAreaCTA (show/hide logic)
- [x] 8.4 Write unit tests for QuickAccessTiles (navigation links)
- [ ] 8.5 Write integration tests for access guards (CONTRACTOR allowed, CLIENT/ADMIN blocked)
- [x] 8.6 Document E2E test procedures in STP for TC-CDASH-001 to TC-CDASH-007
- [x] 8.7 Run all tests: `npm run test -- apps/web/app/contractors/dashboard`
- [x] 8.8 Run coverage: `npm run test:coverage` (verify ≥ 70%)
- [ ] 8.9 Manual a11y testing (keyboard navigation, screen reader)
- [ ] 8.10 Manual responsive testing (mobile, tablet, desktop)

## 9. Build and Validation
- [x] 9.1 Run type-check: `npm run type-check`
- [x] 9.2 Run linter: `npm run lint`
- [x] 9.3 Run build: `npm run build` (ensure no errors)
- [ ] 9.4 Manual smoke test: navigate to `/contractors/dashboard` as contractor
- [x] 9.5 Verify no new environment variables were added

## 10. Documentation and Handoff
- [x] 10.1 Add inline JSDoc comments to all new components
- [x] 10.2 Create handoff notes in `openspec/changes/add-contractor-dashboard/HANDOFF.md`
- [x] 10.3 Document extension points for future specs (services CRUD, calendar, messaging)
- [x] 10.4 Update STP with test execution results
- [x] 10.5 Commit with atomic messages:
  - `docs: add contractor dashboard spec and testing plan`
  - `feat: implement contractor dashboard shell and navigation`
  - `test: add tests for contractor dashboard components`

## Dependencies and Blockers

**Dependencies:**
- ✅ Existing auth module (role guards) - READY
- ✅ Existing contractor profile module (verification status) - READY
- ✅ Existing UI components (Button, Card, Input) - READY

**Potential blockers:**
- If service area configuration is not yet implemented in contractor profile, document as placeholder logic
- If no shared navigation component exists, implement dashboard-specific sidebar (acceptable for MVP)

## Estimated Complexity

**Effort:** Medium (2-3 days for full implementation + testing)
- OpenSpec/Docs: ~2 hours
- Implementation: ~8-10 hours
- Testing: ~4-6 hours
- Review/polish: ~2 hours

**Risk:** Low (additive change, no breaking modifications, well-scoped)
