# Resumen de Arquitectura - ReparaYa

## Introducción

Este documento proporciona una visión general de alto nivel de la arquitectura de ReparaYa,
incluyendo decisiones técnicas, organización de código y flujo de datos.

Para detalles completos, consultar:
- [Software Development Design (SDD)](./3.%20Software%20Development%20Design%20(SDD).md)
- [OpenSpec Project Context](../../openspec/project.md)

## Arquitectura Lógica (3 Capas)

ReparaYa sigue una arquitectura en tres capas:

### 1. Capa de Presentación

- **Tecnología**: Next.js 14 (App Router) + React + TypeScript
- **Responsabilidades**:
  - Renderizado de UI (páginas, componentes)
  - Interacción del usuario
  - Client-side routing
- **Ubicación**: `apps/web/app/` y `apps/web/src/components/`

### 2. Capa de Negocio/Dominio

- **Tecnología**: TypeScript (Node.js en API Routes de Next.js)
- **Responsabilidades**:
  - Lógica de casos de uso
  - Validaciones de negocio
  - Orquestación de repositorios
- **Ubicación**: `apps/web/src/modules/*/services/`

**Módulos de dominio**:
- `auth`: Autenticación y autorización (Clerk + roles)
- `users`: Gestión de perfiles (clientes, contratistas, admins)
- `services`: Catálogo y búsqueda de servicios
- `booking`: Creación y gestión de reservas
- `payments`: Integración Stripe (anticipos, liquidaciones, webhooks)
- `messaging`: Mensajería en contexto de reserva
- `ratings`: Calificaciones y reseñas
- `admin`: Moderación y gestión administrativa

### 3. Capa de Datos

- **Tecnología**: PostgreSQL + Prisma ORM
- **Responsabilidades**:
  - Persistencia de datos
  - Consultas optimizadas con índices
  - Integridad referencial
- **Ubicación**: `apps/web/src/modules/*/repositories/`

## Arquitectura Física

### Monolito Modular en Vercel

ReparaYa se despliega como un **monolito modular**:
- Una sola aplicación Next.js en Vercel
- Frontend y backend (API routes) en el mismo despliegue
- Módulos de dominio separados en carpetas, pero corriendo en el mismo proceso

**Ventajas**:
- Simplicidad de despliegue
- Bajo costo operativo
- Desarrollo ágil (proyecto académico)

**Preparado para evolución**:
- Módulos bien delimitados permiten extracción futura a microservicios si es necesario

### Stack Técnico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Frontend | Next.js + React + TypeScript | UI responsive |
| Backend | Next.js API Routes + TypeScript | Lógica de negocio |
| Base de datos | PostgreSQL (Supabase) | Persistencia |
| ORM | Prisma | Acceso a datos tipado |
| Autenticación | Clerk | Identidad y sesiones |
| Pagos | Stripe (Checkout + Connect) | Anticipos y payouts |
| Almacenamiento | AWS S3 | Imágenes de servicios |
| Email | AWS SES | Correos transaccionales |
| Geocodificación | Amazon Location Service | Búsqueda por ubicación |
| Hosting | Vercel | Despliegue y CDN |
| IaC | Terraform | Recursos AWS |

## Flujo de Datos

### Ejemplo: Flujo de Reserva y Pago

```
1. Cliente busca servicio
   → GET /api/services/search
   → searchService.search(location, category)
   → serviceRepository.findByLocation()
   → Amazon Location (geocodificación)
   → Retorna resultados

2. Cliente crea reserva
   → POST /api/bookings
   → bookingService.createBooking()
   → Valida disponibilidad
   → Crea Booking (status: PENDIENTE_PAGO)
   → stripeService.createPaymentIntent()
   → Retorna checkout URL

3. Cliente completa pago en Stripe
   → Stripe procesa pago
   → Envía webhook a POST /api/webhooks/stripe
   → webhookService.processPaymentSucceeded()
   → Actualiza Booking (status: CONFIRMADA)
   → Notifica a contratista (SES)

4. Contratista marca servicio completado
   → PATCH /api/bookings/:id/state
   → Valida transición de estado
   → Actualiza Booking (status: COMPLETADA)
   → Trigger payoutService.createPayout()
   → Stripe Connect libera pago a contratista
```

## Integraciones Externas

### Clerk (Autenticación)

- SDK: `@clerk/nextjs`
- Flujo:
  1. Usuario se registra/loggea en Clerk
  2. Clerk envía webhook (user.created)
  3. Backend crea registro en tabla `users` con `clerk_user_id` y rol
  4. Middleware de autorización verifica rol en cada request

### Stripe (Pagos)

- Modos:
  - **Checkout**: Anticipos de clientes
  - **Connect Express**: Payouts a contratistas
- Webhooks:
  - `payment_intent.succeeded`
  - `charge.refunded`
  - `account.updated`

### AWS

- **S3**: Upload de imágenes de servicios
- **SES**: Envío de correos transaccionales
- **Location Service**: Geocodificación y cálculo de distancias

## Organización de Código

```
apps/web/
├── app/                    # Next.js App Router (páginas)
│   ├── page.tsx            # Landing
│   ├── login/
│   ├── register/
│   └── api/                # API Routes
│       ├── services/
│       ├── bookings/
│       ├── webhooks/
│       └── ...
├── src/
│   ├── components/         # Componentes React compartidos
│   ├── modules/            # Módulos de dominio
│   │   ├── auth/
│   │   ├── users/
│   │   ├── services/
│   │   ├── booking/
│   │   ├── payments/
│   │   ├── messaging/
│   │   ├── ratings/
│   │   └── admin/
│   └── lib/                # Utilidades compartidas
│       ├── config/
│       ├── utils/
│       └── constants/
├── tests/
│   ├── unit/
│   └── e2e/
├── prisma/
│   ├── schema.prisma       # Definición de modelos
│   └── migrations/
└── public/                 # Assets estáticos
```

## Seguridad

- **Autenticación**: Clerk con verificación de email
- **Autorización**: Middleware por rol (client, contractor, admin)
- **Datos sensibles**: No se almacenan datos de tarjeta (solo tokens de Stripe)
- **Webhooks**: Verificación de firmas (Stripe, Clerk)
- **Sanitización**: Inputs sanitizados (especialmente en mensajería)
- **Rate limiting**: En endpoints críticos (búsqueda, webhooks)

## Performance

### Objetivos P95/P99

Ver tabla completa en [SRS sección 3.5.1](./1.%20Especificación%20de%20Requerimientos%20de%20Software%20(SRS).md#3-5-1-desempeño)

Ejemplos clave:
- Búsqueda: P95 ≤ 1.2s
- Checkout: P95 ≤ 1.5s
- Webhooks: P95 ≤ 0.8s

### Estrategias

- **Índices**: Geoespaciales para búsqueda por ubicación
- **Caching**: CDN para imágenes (CloudFront), cache de promedios de ratings
- **Paginación**: 20 resultados por página
- **Optimización de queries**: Prisma con includes selectivos

## Testing

Ver [STP-ReparaYa.md](./STP-ReparaYa.md) para plan completo.

**Estrategia**:
- Unitarias: Jest (≥ 70% cobertura)
- Integración: Jest + Supertest
- E2E: Playwright
- Performance: k6

## Deployment

### Flujo de Git

```
feature/* → dev → main
           ↓      ↓
        Vercel   Vercel
        Preview  Production
```

### CI/CD

- GitHub Actions ejecuta:
  - Lint
  - Tests (unit + integration)
  - Build
- CodeRabbit revisa PRs automáticamente
- Vercel despliega previews en cada PR

## Próximos Pasos

1. Definir esquema completo de Prisma
2. Implementar módulos core (auth, services, booking, payments)
3. Configurar integraciones externas (Clerk, Stripe, AWS)
4. Escribir tests con cobertura ≥ 70%
5. Deploy a Vercel staging

---

**Referencias**:
- [SRS](./1.%20Especificación%20de%20Requerimientos%20de%20Software%20(SRS).md)
- [SDD](./3.%20Software%20Development%20Design%20(SDD).md)
- [SPMP](./2.%20Plan%20de%20Gestión%20del%20Proyecto%20de%20Software%20(SPMP).md)
- [OpenSpec Project](../../openspec/project.md)
