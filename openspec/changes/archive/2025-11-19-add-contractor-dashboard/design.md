# Design: Contractor Dashboard

## Context

Contractors in ReparaYa need a centralized workspace to manage their business presence on the platform. Currently, contractors can:
- Create and edit their profile (via `/contractors/profile`)
- View their verification status (DRAFT/ACTIVE)

However, there's no unified dashboard to:
- Access key features (services, availability, messages)
- Monitor business metrics
- Complete onboarding steps (e.g., configure service area)

This design establishes the dashboard shell and navigation structure that will serve as the foundation for future contractor-specific features.

**Stakeholders:**
- Contractors (primary users)
- Product team (needs extensible structure for future features)
- Development team (needs clear IA and component boundaries)

**Constraints:**
- No new dependencies (use existing Next.js, TailwindCSS, Clerk)
- No new environment variables
- Must work on mobile, tablet, desktop (responsive)
- Must be accessible (WCAG A/AA)
- Must integrate with existing auth module (role guards)

## Goals / Non-Goals

**Goals:**
- Provide contractors with a clear, navigable dashboard shell
- Display verification status prominently
- Create extension points for future features (services, calendar, messaging)
- Ensure responsive design (mobile-first)
- Ensure accessibility (keyboard navigation, ARIA, screen readers)
- Maintain consistency with existing UI patterns (Button, Card, Input components)

**Non-Goals:**
- Implement full CRUD for services (future spec: `catalog-search`)
- Implement real availability/calendar (future spec: `booking-checkout`)
- Implement real-time messaging (future spec: `reservation-lifecycle-messaging`)
- Implement analytics backend (future spec: TBD)
- Create admin dashboard (separate spec: `admin-moderation`)
- Create client dashboard (separate spec: TBD)

## Information Architecture (IA)

### Navigation Structure

```
/contractors/dashboard (CONTRACTOR role only)
├── Dashboard (home) - Overview widgets
├── Mi Perfil - Edit business profile
├── Mis Servicios - CRUD for services (placeholder → future spec)
├── Disponibilidad - Calendar/availability management (placeholder → future spec)
├── Mensajes - Messaging with clients (placeholder → future spec)
├── Reservas - Bookings management (placeholder → future spec)
└── Configuración - Settings (placeholder → future spec)
```

### Dashboard Sections (Home View)

```
┌─────────────────────────────────────────────────────────────────┐
│ TOPBAR: Logo | Notifications | User Menu                        │
├─────────────┬───────────────────────────────────────────────────┤
│ SIDEBAR     │ MAIN CONTENT AREA                                 │
│             │                                                   │
│ • Dashboard │ ┌─────────────────────────────────────────────┐ │
│ • Perfil    │ │ Verification Status Widget                  │ │
│ • Servicios │ │ [DRAFT ⏱ En Revisión] or [ACTIVE ✓ Verificado]│ │
│ • Disponib. │ └─────────────────────────────────────────────┘ │
│ • Mensajes  │                                                   │
│ • Reservas  │ ┌─────────────────────────────────────────────┐ │
│ • Config.   │ │ Service Area CTA (if missing)               │ │
│             │ │ "Configura tu zona de operación para recibir│ │
│             │ │  solicitudes" [Configurar →]                │ │
│             │ └─────────────────────────────────────────────┘ │
│             │                                                   │
│             │ ┌─────────────────────────────────────────────┐ │
│             │ │ Quick Access Tiles                          │ │
│             │ │ [Mis Servicios] [Disponibilidad] [Mensajes] │ │
│             │ └─────────────────────────────────────────────┘ │
│             │                                                   │
│             │ ┌─────────────────────────────────────────────┐ │
│             │ │ Upcoming Availability Blocks (placeholder)  │ │
│             │ │ "Próximos bloqueos: Ninguno"                │ │
│             │ └─────────────────────────────────────────────┘ │
│             │                                                   │
│             │ ┌─────────────────────────────────────────────┐ │
│             │ │ Metrics Overview (placeholder)              │ │
│             │ │ Servicios Activos: 0 | Reservas Pend.: 0   │ │
│             │ └─────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────────┘
```

### Responsive Behavior

**Mobile (≤640px):**
```
┌─────────────────────────────────┐
│ TOPBAR: ☰ Menu | Logo | User   │
├─────────────────────────────────┤
│ MAIN CONTENT (full width)       │
│ (sidebar hidden, toggled by ☰)  │
│                                 │
│ [Verification Widget]           │
│ [Service Area CTA]              │
│ [Quick Access Tiles - stacked]  │
│ [Availability Summary]          │
│ [Metrics]                       │
└─────────────────────────────────┘
│ BOTTOM NAV: 🏠 📋 💬 👤        │
└─────────────────────────────────┘
```

**Tablet (640-1024px):**
```
┌─────────────────────────────────────┐
│ TOPBAR: Logo | Nav | User          │
├───────┬─────────────────────────────┤
│ SIDE  │ MAIN CONTENT                │
│ (col) │ (grid 2 cols for tiles)     │
└───────┴─────────────────────────────┘
```

**Desktop (≥1024px):**
```
┌─────────────────────────────────────┐
│ TOPBAR: Logo | Nav | Notifications │
├───────┬─────────────────────────────┤
│ SIDE  │ MAIN CONTENT                │
│ (fix) │ (grid 3 cols for tiles)     │
└───────┴─────────────────────────────┘
```

## Decisions

### Decision 1: Dashboard Layout Pattern

**Chosen:** Sidebar + Topbar layout with responsive adaptations

**Rationale:**
- Industry standard for SaaS dashboards (familiar UX)
- Allows persistent navigation on desktop
- Adapts well to mobile (collapsible sidebar → bottom nav)
- Consistent with modern web app patterns

**Alternatives considered:**
- Top-only navigation: Poor use of vertical space on desktop
- Tab-based navigation: Less scalable as features grow
- Full-page transitions: More disorienting for users

### Decision 2: Placeholder Sections (No Backend Logic)

**Chosen:** Render placeholder components with static text (e.g., "Servicios Activos: 0")

**Rationale:**
- Faster implementation (no backend required)
- Clear visual structure for future features
- Users understand what features are coming
- Easy to replace placeholders with real data later

**Alternatives considered:**
- Hide sections until features are ready: Users don't see roadmap
- Implement full backend for metrics: Out of scope, delays MVP

### Decision 3: Access Guard Strategy

**Chosen:** Use existing `requireRole('CONTRACTOR')` helper from auth module

**Rationale:**
- Reuses existing auth infrastructure
- Consistent with other role-based routes
- No new dependencies or patterns

**Alternatives considered:**
- Inline role check in page component: Less reusable
- Middleware-based guard: Overkill for single role check

### Decision 4: Verification Status Display

**Chosen:** Persistent widget at top of dashboard (always visible)

**Rationale:**
- Critical information for contractors (blocks service publishing)
- Should not be hidden or require scrolling
- Encourages completion of onboarding

**Alternatives considered:**
- Modal on first login: Annoying, dismissible
- Banner only: Less prominent, easily ignored

### Decision 5: Service Area CTA

**Chosen:** Conditional CTA (show only if service area not configured)

**Rationale:**
- Non-intrusive: disappears once completed
- Actionable: direct link to configuration
- Contextual: only shown when relevant

**Alternatives considered:**
- Always show: Clutters dashboard for completed profiles
- Toast notification: Easily dismissed, forgotten

### Decision 6: Component Structure

**Chosen:** Atomic components in `src/components/contractors/`

```
src/components/contractors/
├── DashboardShell.tsx          # Layout wrapper (sidebar + main)
├── ContractorSidebar.tsx       # Navigation sidebar
├── ContractorTopbar.tsx        # Topbar with user menu
├── VerificationStatusWidget.tsx # Status badge + description
├── ServiceAreaCTA.tsx          # Conditional CTA
├── QuickAccessTiles.tsx        # Grid of action tiles
├── AvailabilitySummary.tsx     # Placeholder for calendar
├── MetricsOverview.tsx         # Placeholder for counters
└── index.ts                    # Barrel export
```

**Rationale:**
- Clear separation of concerns (each widget is a component)
- Easy to test in isolation
- Easy to replace placeholders later
- Follows existing project structure (`src/components/ui/`)

**Alternatives considered:**
- Monolithic dashboard component: Hard to test, maintain
- Feature-based folders: Premature for simple dashboard

## Component Specifications

### 1. DashboardShell

**Props:**
```typescript
interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
  profile: {
    verified: boolean;
    businessName: string;
  };
}
```

**Behavior:**
- Renders sidebar (desktop) or collapsible menu (mobile)
- Renders topbar with user menu
- Wraps children in `<main>` with proper ARIA landmarks

### 2. VerificationStatusWidget

**Props:**
```typescript
interface VerificationStatusWidgetProps {
  verified: boolean; // true = ACTIVE, false = DRAFT
}
```

**States:**
- DRAFT: Yellow badge "⏱ En Revisión", message "Tu perfil está en revisión..."
- ACTIVE: Green badge "✓ Verificado", message "Tu perfil ha sido aprobado..."

### 3. ServiceAreaCTA

**Props:**
```typescript
interface ServiceAreaCTAProps {
  hasServiceArea: boolean; // true = hide CTA, false = show CTA
}
```

**Behavior:**
- If `hasServiceArea === false`: Show CTA with "Configurar zona →" button
- If `hasServiceArea === true`: Render null (hide component)

### 4. QuickAccessTiles

**Props:** None (static tiles)

**Tiles:**
1. Mis Servicios → `/contractors/services` (placeholder route)
2. Disponibilidad → `/contractors/availability` (placeholder route)
3. Mensajes → `/contractors/messages` (placeholder route)

**Styling:**
- Grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- Each tile: Card with icon, title, description, hover effect

### 5. AvailabilitySummary

**Props:** None (placeholder)

**Content:**
- Heading: "Próximos bloqueos de disponibilidad"
- Message: "No tienes bloqueos programados" (static placeholder)

### 6. MetricsOverview

**Props:** None (placeholder)

**Metrics (all static "0"):**
- Servicios Activos: 0
- Reservas Pendientes: 0
- Mensajes Sin Leer: 0
- Calificación Promedio: N/A

## Accessibility (A11y) Requirements

### Keyboard Navigation
- **Tab**: Focus next interactive element
- **Shift+Tab**: Focus previous interactive element
- **Enter/Space**: Activate buttons and links
- **Esc**: Close mobile sidebar (if open)

### ARIA Attributes
```html
<!-- Sidebar -->
<nav aria-label="Navegación principal">
  <a href="/contractors/dashboard" aria-current="page">Dashboard</a>
  <a href="/contractors/profile">Mi Perfil</a>
  ...
</nav>

<!-- Main content -->
<main aria-label="Contenido del dashboard">
  <!-- Dashboard sections -->
</main>

<!-- Skip link -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Saltar al contenido principal
</a>
```

### Semantic HTML
- Use `<nav>` for navigation
- Use `<main>` for main content
- Use `<aside>` for sidebar
- Use `<header>` for topbar
- Use `<button>` (not `<div>` with onClick)

### Focus Indicators
- All focusable elements must have visible focus ring (`focus:ring-2 focus:ring-blue-500`)

### Screen Reader Support
- All images have `alt` text
- All icons have `aria-label` or are decorative (`aria-hidden="true"`)
- Status messages announced with `role="status"` or `aria-live="polite"`

## Responsive Breakpoints

```css
/* Mobile-first (default) */
.container { width: 100%; padding: 1rem; }

/* Tablet (sm: 640px) */
@media (min-width: 640px) {
  .sidebar { display: block; width: 16rem; }
  .main { margin-left: 16rem; }
}

/* Desktop (lg: 1024px) */
@media (min-width: 1024px) {
  .sidebar { position: fixed; }
  .tiles-grid { grid-template-columns: repeat(3, 1fr); }
}
```

**Testing devices:**
- Mobile: iPhone SE (375px), iPhone 12 (390px), Galaxy S21 (360px)
- Tablet: iPad (768px), iPad Pro (1024px)
- Desktop: MacBook (1440px), Full HD (1920px)

## Risks / Trade-offs

### Risk: Placeholder Confusion
**Description:** Users may click on placeholder sections expecting functionality.

**Mitigation:**
- Clear labeling: "Próximamente" or "En desarrollo"
- Disable links to non-existent routes (show tooltip: "Disponible pronto")
- Provide visual cue (e.g., greyed-out tile, lock icon)

### Risk: Mobile Navigation Complexity
**Description:** Bottom nav + collapsible sidebar may confuse users.

**Mitigation:**
- Use bottom nav as primary on mobile (4-5 key sections)
- Sidebar accessible via ☰ menu icon (optional, for full nav)
- Test with real users during QA

### Trade-off: Custom Dashboard vs. Generic
**Chosen:** Custom dashboard layout (not reusing generic `/dashboard`)

**Rationale:**
- Contractors have different needs than clients/admins
- Custom layout allows contractor-specific widgets
- Generic dashboard would require complex conditionals

**Downside:**
- More code to maintain (separate dashboard for each role)
- **Acceptable** because roles are distinct and layouts will diverge further

### Trade-off: Server vs. Client Components
**Chosen:** Server component for page, client components for interactive widgets

**Rationale:**
- Server component: Auth guard, initial data fetch
- Client components: Interactive UI (sidebar toggle, user menu)

**Implementation:**
```typescript
// apps/web/app/contractors/dashboard/page.tsx (server component)
export default async function ContractorDashboardPage() {
  const user = await getCurrentUser();
  requireRole(user, 'CONTRACTOR');
  const profile = await getContractorProfile(user.id);
  return <DashboardShell user={user} profile={profile} />;
}

// apps/web/src/components/contractors/DashboardShell.tsx (client component)
"use client";
export function DashboardShell({ user, profile }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // ... interactive UI
}
```

## Migration Plan

**Phase 1: Initial Scaffolding (this change)**
- Implement dashboard shell with placeholders
- Add access guards for CONTRACTOR role
- Update `/dashboard` to redirect contractors

**Phase 2: Services Module (future change: `add-contractor-services-crud`)**
- Replace "Mis Servicios" placeholder with real CRUD
- Integrate service creation/editing
- Update QuickAccessTiles to link to real route

**Phase 3: Availability Module (future change: `add-contractor-availability`)**
- Replace "Disponibilidad" placeholder with calendar
- Implement availability blocks CRUD
- Update AvailabilitySummary with real data

**Phase 4: Messaging Module (future change: `add-contractor-messaging`)**
- Replace "Mensajes" placeholder with message list
- Integrate real-time messaging
- Update metrics with unread count

**Phase 5: Analytics (future change: `add-contractor-analytics`)**
- Replace MetricsOverview with real data from DB
- Add charts/graphs for booking trends

**Rollback:**
- If dashboard causes issues, remove route `/contractors/dashboard`
- Revert redirect in `/dashboard/DashboardContent.tsx`
- No data migration required (additive change)

## Open Questions

1. **Service Area Configuration:** Where is this stored? In `ContractorProfile`? Separate table?
   - **Answer (for now):** Assume future field in `ContractorProfile` or linked to services. Placeholder logic checks `profile.serviceArea !== null`.

2. **Bottom Nav vs. Hamburger Menu on Mobile:** Which is primary?
   - **Answer:** Bottom nav for key sections (Dashboard, Profile, Services, Messages). Hamburger for less-used sections (Settings).

3. **Should we show onboarding checklist on dashboard?**
   - **Proposed:** Yes, if useful. Add as optional widget: "Completa tu perfil" with checkboxes (Profile ✓, Service Area ✗, First Service ✗).
   - **Decision:** Out of scope for this change. Add in future iteration if needed.

4. **Do we need a separate layout file for `/contractors` routes?**
   - **Answer:** Yes. Create `apps/web/app/contractors/layout.tsx` to wrap all contractor pages with DashboardShell (sidebar persists across routes).

## Extension Points for Future Specs

### 1. Services CRUD (`add-contractor-services-crud`)
**Hook:** QuickAccessTiles → "Mis Servicios" tile
- Replace link `/contractors/services` (placeholder) → real route
- Add service count to MetricsOverview

### 2. Availability Calendar (`add-contractor-availability`)
**Hook:** QuickAccessTiles → "Disponibilidad" tile, AvailabilitySummary widget
- Replace placeholder summary with real upcoming blocks
- Link to calendar interface

### 3. Messaging (`add-contractor-messaging`)
**Hook:** QuickAccessTiles → "Mensajes" tile, MetricsOverview → Unread count
- Replace placeholder with real message list
- Add notification badge to sidebar icon

### 4. Analytics/Reporting (`add-contractor-analytics`)
**Hook:** MetricsOverview widget, new "Reportes" section
- Replace static counters with DB queries
- Add charts/graphs for insights

### 5. Service Area Configuration (`add-service-area-config`)
**Hook:** ServiceAreaCTA widget
- Link to configuration wizard
- Update hasServiceArea check to query real data

## Summary Table: Dashboard Widgets

| Widget | Purpose | Data Source | Future Spec Hook |
|--------|---------|-------------|------------------|
| VerificationStatusWidget | Show DRAFT/ACTIVE status | ContractorProfile.verified | (stable) |
| ServiceAreaCTA | Prompt to configure zone | ContractorProfile.serviceArea (future) | add-service-area-config |
| QuickAccessTiles | Navigation to key features | Static (hardcoded links) | add-contractor-services-crud, add-contractor-availability, add-contractor-messaging |
| AvailabilitySummary | Show upcoming availability blocks | (placeholder) | add-contractor-availability |
| MetricsOverview | Show business metrics | (placeholder: all 0) | add-contractor-analytics |

## References

- Existing contractor profile: `apps/web/app/contractors/profile/page.tsx`
- Existing dashboard (generic): `apps/web/app/dashboard/page.tsx`
- UI components: `apps/web/src/components/ui/`
- Auth module: `apps/web/src/modules/auth/`
- Contractor module: `apps/web/src/modules/contractors/`
