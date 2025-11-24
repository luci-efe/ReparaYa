# Proposal: Create Client Dashboard

## Summary

Implementar el dashboard principal para usuarios con rol `CLIENT`, siguiendo los patrones establecidos en el dashboard de contratistas. Este dashboard servirá como el centro de operaciones para los clientes, desde donde podrán acceder a todas las funcionalidades de la plataforma: ver sus reservas, mensajes, perfil y direcciones.

## Motivation

Actualmente los contratistas tienen un dashboard completo (`/contractors/dashboard`) que les permite gestionar su negocio. Los clientes necesitan un equivalente que les permita:

1. Ver un resumen de su actividad (reservas activas, mensajes, etc.)
2. Acceder rápidamente a las secciones principales (Reservas, Mensajes, Perfil)
3. Gestionar su información personal y direcciones
4. Tener una experiencia de usuario de alta calidad comparable al dashboard de contratistas

## Scope

### In Scope

- **Estructura del dashboard de cliente** con layout sidebar + topbar (igual al contractor)
- **Página principal del dashboard** (`/clients/dashboard`) con:
  - Widget de bienvenida/perfil del usuario
  - Quick access tiles (Mis Reservas, Mensajes, Mi Perfil)
  - Resumen de métricas (Reservas Activas, Mensajes Sin Leer, etc.)
  - Sección de próximas reservas (placeholder)
- **Componentes del shell**:
  - `ClientDashboardShell` - Layout container
  - `ClientSidebar` - Navegación lateral adaptada para clientes
  - `ClientTopbar` - Header con logo y menú de usuario
- **Rutas de placeholder** para secciones futuras:
  - `/clients/profile` - Mi perfil
  - `/clients/bookings` - Mis reservas
  - `/clients/messages` - Mensajes
  - `/clients/addresses` - Direcciones (ver y cambiar default)
  - `/clients/settings` - Configuración
- **Integración con navbar existente** - Acceso al dashboard desde la navegación principal
- **Tests unitarios y de integración** para todos los componentes

### Out of Scope

- Implementación completa de páginas internas (solo estructura y placeholders)
- CRUD completo de direcciones (solo visualización y cambio de default)
- Funcionalidad de búsqueda de servicios (será página separada)
- Sistema de notificaciones en tiempo real
- Implementación del flujo de reservas

## Design

### Estructura de Archivos

```
apps/web/
├── app/
│   └── clients/
│       ├── layout.tsx                    # Layout wrapper para rutas /clients/*
│       ├── dashboard/
│       │   └── page.tsx                  # Dashboard principal (server component)
│       ├── profile/
│       │   └── page.tsx                  # Placeholder - Mi Perfil
│       ├── bookings/
│       │   └── page.tsx                  # Placeholder - Mis Reservas
│       ├── messages/
│       │   └── page.tsx                  # Placeholder - Mensajes
│       ├── addresses/
│       │   └── page.tsx                  # Placeholder - Direcciones
│       └── settings/
│           └── page.tsx                  # Placeholder - Configuración
├── src/
│   └── components/
│       └── clients/
│           ├── ClientDashboardShell.tsx  # Layout con sidebar + topbar
│           ├── ClientSidebar.tsx         # Navegación lateral
│           ├── ClientTopbar.tsx          # Header
│           ├── WelcomeWidget.tsx         # Widget de bienvenida
│           ├── ClientQuickAccessTiles.tsx# Tiles de acceso rápido
│           ├── ClientMetricsOverview.tsx # Resumen de métricas
│           ├── UpcomingBookings.tsx      # Próximas reservas (placeholder)
│           └── __tests__/
│               ├── ClientDashboardShell.test.tsx
│               ├── ClientSidebar.test.tsx
│               └── ...
```

### Navegación del Cliente

| Sección | Ruta | Descripción |
|---------|------|-------------|
| Dashboard | `/clients/dashboard` | Página principal |
| Mi Perfil | `/clients/profile` | Gestión de perfil |
| Mis Reservas | `/clients/bookings` | Historial y reservas activas |
| Mensajes | `/clients/messages` | Comunicación con contratistas |
| Direcciones | `/clients/addresses` | Ver direcciones, cambiar default |
| Configuración | `/clients/settings` | Preferencias de cuenta |

### Flujo de Autenticación

```
Usuario navega a /clients/dashboard
    ↓
requireRole('CLIENT') verifica:
  - ¿Está autenticado? → No → Redirect a /sign-in
  - ¿Tiene rol CLIENT? → No → HTTP 403 / Redirect a dashboard correspondiente
    ↓
Obtener datos del usuario (User + Addresses)
    ↓
Renderizar dashboard con datos del servidor
```

### Diferencias con Dashboard de Contratista

| Aspecto | Contratista | Cliente |
|---------|-------------|---------|
| Verificación | Muestra estado DRAFT/ACTIVE | No aplica |
| Zona de servicio | CTA para configurar | No aplica |
| Quick Tiles | Mis Servicios, Disponibilidad, Mensajes | Mis Reservas, Buscar Servicios, Mensajes |
| Métricas | Servicios Activos, Reservas, Mensajes, Rating | Reservas Activas, Mensajes, Direcciones Guardadas |
| Secciones extra | Próximos bloqueos | Próximas reservas |

## Testing Plan

### Casos de prueba a documentar en STP:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-CDASH-001 | Cliente autenticado accede a dashboard correctamente | E2E | Alta | RF-CDASH-01 |
| TC-CDASH-002 | Usuario no autenticado es redirigido a login | E2E | Alta | RF-CDASH-01 |
| TC-CDASH-003 | Usuario CONTRACTOR no puede acceder a dashboard de cliente | Integración | Alta | RF-CDASH-01 |
| TC-CDASH-004 | Dashboard muestra información del usuario correctamente | Integración | Alta | RF-CDASH-02 |
| TC-CDASH-005 | Quick access tiles navegan a rutas correctas | E2E | Media | RF-CDASH-04 |
| TC-CDASH-006 | Sidebar responsive funciona en mobile | E2E | Media | RF-CDASH-05 |
| TC-CDASH-007 | Métricas muestran valores placeholder correctos | Unitaria | Media | RF-CDASH-06 |
| TC-CDASH-008 | Componentes renderizan sin errores | Unitaria | Alta | RF-CDASH-03 |

### Criterios de aceptación:

- ✅ Cobertura de código ≥ 70% en `src/components/clients/`
- ✅ Todos los casos de prueba TC-CDASH-* pasan
- ✅ Middleware bloquea acceso no autorizado (401/403)
- ✅ Dashboard carga en < 1.5s en condiciones normales
- ✅ Layout responsive funciona en mobile, tablet y desktop
- ✅ Accesibilidad: skip-to-content, ARIA labels, navegación por teclado
- ✅ CI/CD pasa sin errores

### Estrategia de implementación de tests:

**Archivos de test a crear:**
- `apps/web/src/components/clients/__tests__/ClientDashboardShell.test.tsx`
- `apps/web/src/components/clients/__tests__/ClientSidebar.test.tsx`
- `apps/web/src/components/clients/__tests__/ClientTopbar.test.tsx`
- `apps/web/src/components/clients/__tests__/WelcomeWidget.test.tsx`
- `apps/web/src/components/clients/__tests__/ClientQuickAccessTiles.test.tsx`
- `apps/web/src/components/clients/__tests__/ClientMetricsOverview.test.tsx`
- `tests/integration/api/clients/dashboard.test.ts`

**Mocks y fixtures:**
- Mock de Clerk para autenticación (`@clerk/nextjs`)
- Mock de `next/navigation` (usePathname, useRouter)
- Fixtures de usuarios de prueba con rol CLIENT
- Fixtures de direcciones de prueba

**Ambiente de testing:**
- Jest + React Testing Library para componentes
- Clerk test environment
- Mock de API calls donde sea necesario

## Dependencies

- **Existente**: `requireRole()` de `@/modules/auth/utils/requireRole`
- **Existente**: Componentes UI (`Card`, `Button`) de `@/components/ui`
- **Existente**: Users module para obtener datos del usuario
- **Nueva**: Integración con navbar para acceso al dashboard

## Risks & Mitigations

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Duplicación de código con contractor dashboard | Medio | Extraer componentes compartidos donde sea posible (MetricCard, etc.) |
| Inconsistencia visual | Bajo | Seguir exactamente los patrones del contractor dashboard |
| Performance en mobile | Bajo | Usar las mismas optimizaciones que el contractor dashboard |

## Success Metrics

- Dashboard accesible desde cualquier página del sitio
- Tiempo de carga < 1.5s
- Sin errores en consola
- Tests pasan al 100%
- Cobertura ≥ 70%

## References

- Dashboard de contratista: `apps/web/app/contractors/dashboard/page.tsx`
- Spec de contractor-dashboard: `openspec/specs/contractor-dashboard/spec.md`
- Users spec: `openspec/specs/users/spec.md`
- Auth spec: `openspec/specs/auth-clerk-integration/spec.md`
