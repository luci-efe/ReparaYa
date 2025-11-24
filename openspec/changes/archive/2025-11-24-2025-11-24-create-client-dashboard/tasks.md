# Tasks: Create Client Dashboard

## Phase 1: Foundation (Backend & Shell Components)

### 1.1 Create Client Layout and Route Structure

- [ ] Create `apps/web/app/clients/layout.tsx` with minimal wrapper
- [ ] Create `apps/web/app/clients/dashboard/page.tsx` (server component)
- [ ] Implement `requireRole('CLIENT')` check in dashboard page
- [ ] Add redirect to sign-in for unauthenticated users
- [ ] Add redirect/403 for non-CLIENT roles

**Validation**: Navegación a `/clients/dashboard` sin autenticación redirige a `/sign-in`

### 1.2 Create ClientDashboardShell Component

- [ ] Create `apps/web/src/components/clients/ClientDashboardShell.tsx`
- [ ] Implement responsive layout (sidebar + main content)
- [ ] Add skip-to-content accessibility link
- [ ] Add mobile overlay for sidebar
- [ ] Export from `src/components/clients/index.ts`

**Validation**: Componente renderiza sin errores con children

### 1.3 Create ClientTopbar Component

- [ ] Create `apps/web/src/components/clients/ClientTopbar.tsx`
- [ ] Add logo with link to dashboard
- [ ] Add hamburger menu button for mobile
- [ ] Integrate Clerk UserButton for auth menu
- [ ] Add proper ARIA labels

**Validation**: Topbar muestra logo, menú de usuario y botón hamburger en mobile

### 1.4 Create ClientSidebar Component

- [ ] Create `apps/web/src/components/clients/ClientSidebar.tsx`
- [ ] Define navigation items for client (Dashboard, Mi Perfil, Mis Reservas, Mensajes, Direcciones, Configuración)
- [ ] Implement active state detection with `usePathname()`
- [ ] Desktop: fixed sidebar (w-64)
- [ ] Mobile: slide-in sidebar with close handler
- [ ] Add proper ARIA labels and keyboard navigation

**Validation**: Sidebar muestra todos los items, resalta el activo, funciona en mobile

---

## Phase 2: Dashboard Content Components

### 2.1 Create WelcomeWidget Component

- [ ] Create `apps/web/src/components/clients/WelcomeWidget.tsx`
- [ ] Display user name and avatar
- [ ] Show welcome message based on time of day
- [ ] Show number of addresses (with default highlighted)
- [ ] Style with Card component

**Validation**: Widget muestra nombre del usuario y cantidad de direcciones

### 2.2 Create ClientQuickAccessTiles Component

- [ ] Create `apps/web/src/components/clients/ClientQuickAccessTiles.tsx`
- [ ] Create tiles: "Mis Reservas", "Buscar Servicios", "Mensajes"
- [ ] Each tile with icon, title, description, and link
- [ ] Hover animations (scale icon, color change)
- [ ] Responsive grid (1 col mobile, 2-3 col desktop)

**Validation**: 3 tiles visibles, clickeables, con animaciones de hover

### 2.3 Create ClientMetricsOverview Component

- [ ] Create `apps/web/src/components/clients/ClientMetricsOverview.tsx`
- [ ] Create MetricCard sub-component (reuse pattern from contractor)
- [ ] Metrics: Reservas Activas (0), Mensajes Sin Leer (0), Direcciones Guardadas (N)
- [ ] Add "Promedio de Calificaciones Dadas" metric (N/A placeholder)
- [ ] Grid layout (1 col mobile, 2 col tablet, 4 col desktop)

**Validation**: 4 métricas visibles con valores placeholder

### 2.4 Create UpcomingBookings Component (Placeholder)

- [ ] Create `apps/web/src/components/clients/UpcomingBookings.tsx`
- [ ] Display section header with calendar icon
- [ ] Show empty state message: "No tienes reservas próximas"
- [ ] Add helper text explaining the section

**Validation**: Sección renderiza con mensaje de estado vacío

---

## Phase 3: Dashboard Page Assembly

### 3.1 Assemble Dashboard Page

- [ ] Import all components in `apps/web/app/clients/dashboard/page.tsx`
- [ ] Fetch user data server-side
- [ ] Fetch user addresses count
- [ ] Pass props to ClientDashboardShell
- [ ] Render: WelcomeWidget → ClientQuickAccessTiles → ClientMetricsOverview → UpcomingBookings

**Validation**: Dashboard completo renderiza con todos los componentes

### 3.2 Create Placeholder Pages

- [ ] Create `apps/web/app/clients/profile/page.tsx` con mensaje "Próximamente"
- [ ] Create `apps/web/app/clients/bookings/page.tsx` con mensaje "Próximamente"
- [ ] Create `apps/web/app/clients/messages/page.tsx` con mensaje "Próximamente"
- [ ] Create `apps/web/app/clients/addresses/page.tsx` con mensaje "Próximamente"
- [ ] Create `apps/web/app/clients/settings/page.tsx` con mensaje "Próximamente"
- [ ] All pages use ClientDashboardShell for consistent layout

**Validation**: Todas las rutas /clients/* cargan sin error con layout consistente

---

## Phase 4: Navigation Integration

### 4.1 Integrate with Main Dashboard Router

- [ ] Update `apps/web/app/dashboard/DashboardContent.tsx` to route CLIENT users to `/clients/dashboard`
- [ ] Ensure `/dashboard` redirects based on user role

**Validation**: Usuario CLIENT en /dashboard es redirigido a /clients/dashboard

### 4.2 Update Main Navbar (if needed)

- [ ] Add "Mi Dashboard" link for authenticated CLIENT users in navbar
- [ ] Link should navigate to `/clients/dashboard`
- [ ] Hide for CONTRACTOR and ADMIN users

**Validation**: Navbar muestra "Mi Dashboard" solo para usuarios CLIENT autenticados

---

## Phase 5: Testing

### 5.1 Unit Tests for Shell Components

- [ ] Create `__tests__/ClientDashboardShell.test.tsx`
  - Test renders with children
  - Test sidebar toggle state
  - Test accessibility (skip-to-content, ARIA)
- [ ] Create `__tests__/ClientSidebar.test.tsx`
  - Test renders all navigation items
  - Test active state highlighting
  - Test mobile close handler
- [ ] Create `__tests__/ClientTopbar.test.tsx`
  - Test renders logo and user menu
  - Test menu button click handler

**Validation**: `npm run test -- --testPathPattern=clients` pasa

### 5.2 Unit Tests for Dashboard Components

- [ ] Create `__tests__/WelcomeWidget.test.tsx`
  - Test renders user name
  - Test renders address count
- [ ] Create `__tests__/ClientQuickAccessTiles.test.tsx`
  - Test renders all tiles
  - Test tile links are correct
- [ ] Create `__tests__/ClientMetricsOverview.test.tsx`
  - Test renders all metrics
  - Test metric values display correctly
- [ ] Create `__tests__/UpcomingBookings.test.tsx`
  - Test empty state renders

**Validation**: Todos los tests unitarios pasan

### 5.3 Integration Tests

- [ ] Create `tests/integration/clients/dashboard.test.ts`
  - Test unauthenticated access returns 401/redirect
  - Test CONTRACTOR access returns 403
  - Test CLIENT access returns 200 with dashboard content

**Validation**: Tests de integración pasan

### 5.4 Update STP with Test Cases

- [ ] Add TC-CDASH-001 through TC-CDASH-008 to `docs/md/STP-ReparaYa.md`
- [ ] Include test evidence screenshots/logs after tests pass

**Validation**: STP actualizado con casos de prueba documentados

---

## Phase 6: Verification & Polish

### 6.1 Verify All Routes Work

- [ ] Test `/clients/dashboard` loads correctly
- [ ] Test all sidebar navigation links work
- [ ] Test mobile responsive behavior
- [ ] Test logout and re-login flow

**Validation**: Navegación completa funciona sin errores

### 6.2 Accessibility Audit

- [ ] Verify keyboard navigation works
- [ ] Verify screen reader announces correctly
- [ ] Verify skip-to-content link works
- [ ] Verify focus states are visible

**Validation**: Sin violaciones de accesibilidad críticas

### 6.3 Performance Check

- [ ] Verify page loads in < 1.5s
- [ ] Check no console errors
- [ ] Verify no layout shift

**Validation**: Performance acceptable

### 6.4 Coverage Report

- [ ] Run `npm run test:coverage` for clients components
- [ ] Verify ≥ 70% coverage in `src/components/clients/`

**Validation**: Cobertura ≥ 70%

---

## Parallelization Notes

- **Phase 1.2, 1.3, 1.4** can be done in parallel after 1.1
- **Phase 2.1, 2.2, 2.3, 2.4** can all be done in parallel
- **Phase 3** depends on Phase 1 and 2
- **Phase 4** depends on Phase 3
- **Phase 5** can start as soon as components are created (parallel with 3, 4)
- **Phase 6** depends on all previous phases

## Definition of Done

- [ ] All routes `/clients/*` are accessible and render correctly
- [ ] Dashboard shows user information and placeholder metrics
- [ ] Sidebar navigation works on desktop and mobile
- [ ] All tests pass with ≥ 70% coverage
- [ ] STP updated with test cases and evidence
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] CI/CD passes
