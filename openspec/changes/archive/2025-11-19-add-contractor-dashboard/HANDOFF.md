# Handoff Notes: Contractor Dashboard

## Summary

This change implements the minimal viable dashboard shell for contractors, including:
- Responsive layout (sidebar + topbar)
- Verification status widget
- Service area configuration CTA (conditional)
- Quick access tiles for future features (Services, Availability, Messages)
- Placeholder sections (metrics, availability summary)
- Access guards for CONTRACTOR role
- A11y and responsive design compliance

## What's Implemented

### Components
- **DashboardShell**: Main layout wrapper with responsive sidebar and topbar
- **ContractorSidebar**: Navigation sidebar (desktop: fixed, mobile: collapsible)
- **ContractorTopbar**: Top navigation bar with user menu
- **VerificationStatusWidget**: Shows DRAFT/ACTIVE badge based on `verified` field
- **ServiceAreaCTA**: Conditional CTA to configure service area (shows if `serviceArea` is null)
- **QuickAccessTiles**: Grid of navigation tiles to future features
- **AvailabilitySummary**: Placeholder for upcoming availability blocks
- **MetricsOverview**: Placeholder counters (all showing "0" for now)

### Routes
- **`/contractors/dashboard`**: Main contractor dashboard (CONTRACTOR role only)
- **Placeholder routes** (not implemented yet, show "Coming soon" message):
  - `/contractors/services`
  - `/contractors/availability`
  - `/contractors/messages`

### Access Control
- Uses existing `requireRole('CONTRACTOR')` from auth module
- CLIENT/ADMIN users redirected to their dashboards
- Unauthenticated users redirected to `/sign-in`

### Responsive Breakpoints
- **Mobile (≤640px)**: Bottom nav, stacked sections, collapsible sidebar
- **Tablet (640-1024px)**: Collapsible sidebar, 2-column grid for tiles
- **Desktop (≥1024px)**: Fixed sidebar, 3-column grid for tiles

### Accessibility
- All navigation with proper ARIA labels (`aria-label`, `aria-current`)
- Semantic HTML (`<nav>`, `<main>`, `<aside>`, `<header>`)
- Keyboard navigation support (Tab, Enter, Esc)
- Focus indicators (`focus:ring-2`)
- Skip-to-content link

## What's NOT Implemented (Placeholders)

The following features are intentionally left as placeholders for future specs:

1. **Services CRUD** (`add-contractor-services-crud`)
   - Current: QuickAccessTiles links to `/contractors/services` (placeholder page)
   - Future: Full service creation, editing, publishing interface

2. **Availability Calendar** (`add-contractor-availability`)
   - Current: AvailabilitySummary shows static "No tienes bloqueos programados"
   - Future: Interactive calendar, availability block management

3. **Messaging** (`add-contractor-messaging`)
   - Current: QuickAccessTiles links to `/contractors/messages` (placeholder)
   - Future: Real-time messaging interface with clients

4. **Analytics/Metrics** (`add-contractor-analytics`)
   - Current: MetricsOverview shows all "0" values
   - Future: Real data from DB (active services, pending bookings, unread messages, avg rating)

5. **Service Area Configuration** (`add-service-area-config`)
   - Current: ServiceAreaCTA shows CTA but links to non-existent wizard
   - Future: Wizard to configure service area (map, radius, zones)

## Extension Points for Future Specs

### 1. Services CRUD Integration

**File to modify:** `apps/web/src/components/contractors/QuickAccessTiles.tsx`

Replace:
```typescript
const tiles = [
  { title: 'Mis Servicios', href: '/contractors/services', icon: ... },
  // ...
];
```

With:
```typescript
const tiles = [
  { title: 'Mis Servicios', href: '/contractors/services', icon: ..., count: servicesCount },
  // ...
];
```

And pass real `servicesCount` from API.

**New route:** `apps/web/app/contractors/services/page.tsx`

### 2. Availability Calendar Integration

**File to modify:** `apps/web/src/components/contractors/AvailabilitySummary.tsx`

Replace static placeholder with:
```typescript
const upcomingBlocks = useAvailabilityBlocks(); // custom hook
return (
  <Card>
    <h3>Próximos bloqueos de disponibilidad</h3>
    {upcomingBlocks.length === 0 ? (
      <p>No tienes bloqueos programados</p>
    ) : (
      <ul>
        {upcomingBlocks.map(block => (
          <li key={block.id}>{block.date} - {block.reason}</li>
        ))}
      </ul>
    )}
  </Card>
);
```

**New route:** `apps/web/app/contractors/availability/page.tsx`

### 3. Messaging Integration

**File to modify:** `apps/web/src/components/contractors/QuickAccessTiles.tsx` and `apps/web/src/components/contractors/MetricsOverview.tsx`

Add unread message count:
```typescript
const { unreadCount } = useMessages(); // custom hook
// Pass unreadCount to "Mensajes" tile badge
```

**New route:** `apps/web/app/contractors/messages/page.tsx`

### 4. Analytics/Metrics Integration

**File to modify:** `apps/web/src/components/contractors/MetricsOverview.tsx`

Replace static values:
```typescript
const metrics = useDashboardMetrics(); // custom hook
return (
  <div className="grid grid-cols-2 gap-4">
    <MetricCard label="Servicios Activos" value={metrics.activeServices} />
    <MetricCard label="Reservas Pendientes" value={metrics.pendingBookings} />
    <MetricCard label="Mensajes Sin Leer" value={metrics.unreadMessages} />
    <MetricCard label="Calificación Promedio" value={metrics.avgRating} />
  </div>
);
```

**New API endpoint:** `apps/web/app/api/contractors/dashboard/metrics/route.ts`

### 5. Service Area Configuration

**File to modify:** `apps/web/src/components/contractors/ServiceAreaCTA.tsx`

Replace placeholder link:
```typescript
<Link href="/contractors/settings/service-area">
  Configurar →
</Link>
```

**New route:** `apps/web/app/contractors/settings/service-area/page.tsx`

## Testing Checklist

Before archiving this change, ensure:

- [x] OpenSpec proposal validated (`openspec validate add-contractor-dashboard --strict`)
- [x] STP updated with test cases TC-CDASH-001 to TC-CDASH-016
- [ ] All unit tests pass (`npm run test -- apps/web/src/components/contractors`)
- [ ] All integration tests pass (`npm run test -- tests/integration/api/contractors/dashboard-access.test.ts`)
- [ ] Code coverage ≥ 70% in dashboard components
- [ ] E2E tests executed manually (TC-CDASH-001 to TC-CDASH-007)
- [ ] A11y tests pass (axe-core + manual keyboard/screen reader)
- [ ] Responsive tests pass (mobile, tablet, desktop)
- [ ] Performance test passes (initial load ≤ 1.5s on 3G)
- [ ] Build succeeds (`npm run build`)
- [ ] Type-check passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)

## Known Limitations / Future Work

1. **Service Area Field**:
   - Currently assumes `serviceArea` field exists on `ContractorProfile` model
   - If field doesn't exist yet, ServiceAreaCTA will always show (harmless but not ideal)
   - **Action:** Add `serviceArea` field to Prisma schema in future migration

2. **Placeholder Routes**:
   - `/contractors/services`, `/contractors/availability`, `/contractors/messages` return 404 or placeholder page
   - **Action:** Implement in subsequent specs

3. **Bottom Navigation on Mobile**:
   - Currently hardcoded 4 icons
   - **Action:** Make configurable or dynamic based on enabled features

4. **Metrics Fetch**:
   - Metrics are static (all "0")
   - **Action:** Create API endpoint `/api/contractors/dashboard/metrics` to fetch real data

5. **Notifications**:
   - Topbar has "Notifications" placeholder icon but no functionality
   - **Action:** Implement notifications system in separate spec

## Dependencies

**Required for this dashboard to work:**
- ✅ Auth module (`requireRole`, `getCurrentUser`)
- ✅ Contractor profile module (`getContractorProfile`)
- ✅ UI components (`Button`, `Card`, `Input`, `Textarea`, `Checkbox`)

**Blocked by (not implemented yet, but dashboard is prepared for):**
- Services CRUD module
- Availability/Calendar module
- Messaging module
- Analytics module
- Service area configuration module

## Environment Variables

**No new environment variables** were introduced in this change.

Existing variables used:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (auth)
- `CLERK_SECRET_KEY` (auth)
- `DATABASE_URL` (Prisma)

## Deployment Notes

1. **No database migrations** required (no schema changes)
2. **No new secrets** to configure
3. **Backwards compatible** (additive change, no breaking modifications)
4. **Rollback strategy**: Remove route `/contractors/dashboard` and revert redirect in `/dashboard/DashboardContent.tsx`

## Contact

For questions about this change, refer to:
- **Spec**: `/openspec/specs/contractor-dashboard/spec.md`
- **Proposal**: `/openspec/changes/add-contractor-dashboard/proposal.md`
- **Design**: `/openspec/changes/add-contractor-dashboard/design.md`
- **Tasks**: `/openspec/changes/add-contractor-dashboard/tasks.md`
- **STP**: `/docs/md/STP-ReparaYa.md` section 4.1.4
