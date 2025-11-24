# Design: Client Dashboard Architecture

## Overview

Este documento describe las decisiones arquitectónicas para el dashboard de clientes, explicando por qué se eligieron ciertos patrones y cómo se integran con el sistema existente.

## Architectural Decisions

### AD-001: Replicar Patrón del Dashboard de Contratista

**Decisión**: Seguir exactamente el mismo patrón arquitectónico del dashboard de contratistas.

**Razón**:
- Consistencia en el codebase
- Patrones ya probados y funcionando
- Facilita el mantenimiento
- UX consistente para usuarios que tengan ambos roles

**Consecuencias**:
- Código similar (no idéntico) entre dashboards
- Posible extracción futura de componentes compartidos
- Misma curva de aprendizaje para desarrolladores

### AD-002: Server Component para Página Principal

**Decisión**: La página del dashboard (`page.tsx`) es un Server Component que hace fetch de datos y pasa props a Client Components.

**Razón**:
- Seguridad: autenticación se verifica en el servidor
- Performance: datos cargados antes del render
- SEO: contenido disponible en el HTML inicial (aunque no es crítico para dashboard)

**Patrón**:
```typescript
// page.tsx (Server Component)
export default async function ClientDashboardPage() {
  const user = await requireRole('CLIENT');
  const addresses = await addressService.getByUserId(user.id);

  return (
    <ClientDashboardShell user={userData}>
      <WelcomeWidget user={userData} addressCount={addresses.length} />
      {/* ... */}
    </ClientDashboardShell>
  );
}
```

### AD-003: Client Components para Interactividad

**Decisión**: Shell, Sidebar y Topbar son Client Components (`'use client'`).

**Razón**:
- Necesitan estado (sidebar open/close)
- Necesitan hooks (usePathname, useState)
- Interactividad inmediata (clicks, hover)

**Trade-off**: Más JavaScript en el cliente, pero necesario para UX fluida.

### AD-004: Navegación Específica para Clientes

**Decisión**: Items de navegación diferentes a los del contratista.

| Contratista | Cliente |
|-------------|---------|
| Dashboard | Dashboard |
| Mi Perfil | Mi Perfil |
| Mis Servicios | Mis Reservas |
| Disponibilidad | Mensajes |
| Mensajes | Direcciones |
| Reservas | Configuración |
| Configuración | - |

**Razón**: Los clientes tienen necesidades diferentes a los contratistas.

### AD-005: Placeholders para Funcionalidad Futura

**Decisión**: Crear páginas placeholder para todas las rutas del sidebar.

**Razón**:
- Navegación funcional desde el día 1
- UX clara (usuario sabe qué viene)
- Facilita desarrollo incremental

**Patrón Placeholder**:
```typescript
export default async function ClientBookingsPage() {
  const user = await requireRole('CLIENT');

  return (
    <ClientDashboardShell user={userData}>
      <div className="text-center py-12">
        <h1>Mis Reservas</h1>
        <p>Esta sección estará disponible próximamente.</p>
      </div>
    </ClientDashboardShell>
  );
}
```

## Component Architecture

### Component Hierarchy

```
ClientDashboardPage (Server Component)
├── ClientDashboardShell (Client Component)
│   ├── ClientTopbar (Client Component)
│   │   └── ClerkUserButton
│   ├── ClientSidebar (Client Component)
│   │   └── Navigation Links
│   └── Main Content Area
│       ├── WelcomeWidget (Client Component)
│       ├── ClientQuickAccessTiles (Server Component)
│       ├── ClientMetricsOverview (Server Component)
│       └── UpcomingBookings (Server Component)
```

### Props Flow

```
Page fetches: user, addresses
     ↓
ClientDashboardShell receives: { user, children }
     ↓
     ├── ClientTopbar receives: { user, onMenuClick }
     ├── ClientSidebar receives: { isOpen, onClose }
     └── Children receive: data via props from page
         ├── WelcomeWidget: { user, addressCount }
         ├── ClientQuickAccessTiles: (no props, static)
         ├── ClientMetricsOverview: { metrics } (placeholder 0s)
         └── UpcomingBookings: { bookings: [] } (empty)
```

## Data Model Integration

### User Data Required

```typescript
interface ClientDashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  addresses: Address[];
  // Future: metrics from API
  metrics?: {
    activeBookings: number;
    unreadMessages: number;
    savedAddresses: number;
    averageRatingGiven: number | null;
  };
}
```

### API Endpoints Used

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `requireRole('CLIENT')` | Auth + role check | Existing |
| `/api/users/me` | Get user profile | Existing |
| `/api/users/me/addresses` | Get user addresses | Existing |
| `/api/clients/metrics` | Dashboard metrics | Future |

## Routing Strategy

### Route Protection

Todas las rutas bajo `/clients/*` están protegidas:

```typescript
// Middleware pattern (already exists)
export const config = {
  matcher: ['/clients/:path*']
};

// Per-page protection
const user = await requireRole('CLIENT');
```

### Role-Based Dashboard Routing

```
/dashboard (entry point)
    ↓
DashboardContent checks user.role
    ↓
    ├── role === 'CLIENT' → redirect to /clients/dashboard
    ├── role === 'CONTRACTOR' → redirect to /contractors/dashboard
    └── role === 'ADMIN' → redirect to /admin/dashboard
```

## Responsive Design

### Breakpoints

| Breakpoint | Sidebar | Topbar |
|------------|---------|--------|
| < 640px (sm) | Hidden, slide-in on menu click | Hamburger visible |
| 640px - 1024px (md) | Hidden, slide-in on menu click | Hamburger visible |
| ≥ 1024px (lg) | Fixed, always visible | Hamburger hidden |

### Layout Grid

```
Desktop (lg+):
┌─────────────────────────────────────────────────┐
│ Topbar (fixed, z-30)                            │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main Content (pt-16 for topbar)    │
│ (w-64)   │  (ml-64 for sidebar)                │
│          │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘

Mobile (< lg):
┌─────────────────────────────────────────────────┐
│ Topbar (fixed, z-30) [≡ hamburger]             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Main Content (pt-16 for topbar)               │
│  (full width)                                   │
│                                                 │
│  [Sidebar slides in from left when ≡ clicked]  │
└─────────────────────────────────────────────────┘
```

## Accessibility Considerations

### ARIA Landmarks

```html
<div>
  <!-- Skip link -->
  <a href="#main-content" class="sr-only focus:not-sr-only">
    Saltar al contenido principal
  </a>

  <header role="banner">
    <!-- Topbar -->
  </header>

  <nav aria-label="Navegación principal">
    <!-- Sidebar -->
  </nav>

  <main id="main-content" aria-label="Contenido del dashboard">
    <!-- Content -->
  </main>
</div>
```

### Keyboard Navigation

- Tab order: Skip link → Topbar → Sidebar items → Main content
- Enter/Space: Activate links and buttons
- Escape: Close mobile sidebar
- Focus visible: Ring styling on all focusable elements

## Testing Strategy

### Unit Test Focus

| Component | Key Tests |
|-----------|-----------|
| ClientDashboardShell | Renders children, sidebar toggle works |
| ClientSidebar | All nav items render, active state, mobile close |
| ClientTopbar | Logo, user menu, hamburger click |
| WelcomeWidget | User name display, address count |
| ClientQuickAccessTiles | All tiles render, correct links |
| ClientMetricsOverview | All metrics display |
| UpcomingBookings | Empty state renders |

### Integration Test Focus

| Test | Purpose |
|------|---------|
| Auth redirect | Unauthenticated → /sign-in |
| Role check | CONTRACTOR → 403 |
| Happy path | CLIENT → 200 + dashboard |

### Mock Strategy

```typescript
// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  UserButton: () => <div data-testid="user-button" />,
  // ...
}));

// Mock navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/clients/dashboard',
  useRouter: () => ({ push: jest.fn() }),
  redirect: jest.fn(),
}));
```

## Future Considerations

### Metrics API

Cuando se implemente el endpoint de métricas:

```typescript
// Future: GET /api/clients/metrics
interface ClientMetrics {
  activeBookings: number;
  unreadMessages: number;
  savedAddresses: number;
  averageRatingGiven: number | null;
  upcomingBookings: BookingSummary[];
}
```

### Real-Time Updates

Para notificaciones en tiempo real:
- Considerar Server-Sent Events (SSE) o WebSockets
- Badge de mensajes sin leer en sidebar
- Polling como fallback

### Shared Components

Componentes que podrían extraerse a `src/components/shared/`:
- `MetricCard` (usado en ambos dashboards)
- `DashboardShell` (parametrizado por role)
- `Sidebar` (con items configurables)

Por ahora, mantenemos separados para evitar abstracciones prematuras.
