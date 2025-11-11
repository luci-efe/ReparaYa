# ReparaYa

**Plataforma de servicios de reparación y mantenimiento del hogar**

ReparaYa es un marketplace que conecta clientes residenciales con contratistas especializados en servicios de mantenimiento, reparación y mejoras del hogar (plomería, electricidad, carpintería, etc.) en el área metropolitana de Guadalajara.

---

## Tabla de Contenidos

- [Descripción](#descripción)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Setup Local](#setup-local)
- [Desarrollo](#desarrollo)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentación](#documentación)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Descripción

ReparaYa cubre de extremo a extremo el flujo de:

**búsqueda** → **detalle de servicio** → **reserva** → **pago (anticipo + liquidación)** → **ejecución del servicio** → **mensajería** → **calificación**

### Roles de usuario

- **Cliente**: Busca, reserva y paga servicios; califica contratistas
- **Contratista**: Publica servicios, gestiona reservas, recibe pagos vía Stripe Connect
- **Admin**: Modera contenido, gestiona usuarios, resuelve disputas

---

## Características Principales

### Para Clientes
- Búsqueda de servicios por ubicación y categoría
- Visualización de perfiles de contratistas con calificaciones
- Reserva de servicios con pago de anticipo
- Mensajería en contexto de reserva
- Calificación y reseñas post-servicio

### Para Contratistas
- Publicación de servicios con fotos y precios
- Gestión de disponibilidad (agenda)
- Notificaciones de nuevas reservas
- Chat con clientes
- Recepción de pagos vía Stripe Connect

### Para Administradores
- Moderación de servicios y reseñas
- Gestión de usuarios (bloqueo/desbloqueo)
- Resolución de disputas
- Dashboard con métricas de negocio

---

## Stack Tecnológico

### Frontend & Backend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/) + [TailwindCSS](https://tailwindcss.com/)
- **Runtime**: Node.js (Vercel serverless)

### Base de Datos
- **DBMS**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)

### Autenticación & Pagos
- **Auth**: [Clerk](https://clerk.com/) (SDK para Next.js)
- **Pagos**: [Stripe](https://stripe.com/) (Checkout + Connect Express)

### Cloud & Infraestructura
- **Hosting**: [Vercel](https://vercel.com/)
- **Almacenamiento**: AWS S3 (imágenes)
- **Emails**: AWS SES
- **Geocodificación**: Amazon Location Service
- **IaC**: [Terraform](https://www.terraform.io/) (para recursos AWS)

### Tooling
- **Linter**: ESLint
- **Formatter**: Prettier
- **Testing**: Jest + Testing Library + Playwright
- **Performance**: k6
- **CI/CD**: GitHub Actions
- **Code Review**: CodeRabbit
- **Specs**: OpenSpec

---

## Arquitectura

ReparaYa sigue una **arquitectura de 3 capas** dentro de un **monolito modular**:

```
┌─────────────────────────────────────────┐
│   Capa de Presentación                  │
│   Next.js (App Router) + React          │
│   - Páginas y componentes UI            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Capa de Negocio                       │
│   Módulos de dominio + Servicios        │
│   - auth, users, services, booking,     │
│     payments, messaging, ratings, admin │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Capa de Datos                         │
│   Prisma + PostgreSQL                   │
│   - Repositorios y acceso a BD          │
└─────────────────────────────────────────┘
```

### Módulos de Dominio

| Módulo | Responsabilidad |
|--------|-----------------|
| `auth` | Autenticación con Clerk, sincronización de usuarios |
| `users` | Gestión de perfiles (clientes, contratistas, admins) |
| `services` | Catálogo, búsqueda, disponibilidad |
| `booking` | Creación y gestión de reservas, estados |
| `payments` | Integración Stripe (anticipos, liquidaciones, webhooks) |
| `messaging` | Chat entre cliente y contratista |
| `ratings` | Calificaciones y reseñas |
| `admin` | Moderación y administración |

Ver [Architecture Overview](./docs/md/architecture-overview.md) para más detalles.

---

## Estructura del Proyecto

```
ReparaYa/
├── .github/
│   └── workflows/          # CI/CD (GitHub Actions)
├── apps/
│   └── web/                # Aplicación Next.js principal
│       ├── app/            # Pages (App Router)
│       ├── src/
│       │   ├── components/ # Componentes React compartidos
│       │   ├── modules/    # Módulos de dominio
│       │   └── lib/        # Utilidades y configuración
│       ├── tests/          # Tests unitarios y E2E
│       └── prisma/         # Esquema y migraciones
├── docs/
│   ├── pdf/                # Documentos formales (SRS, SDD, SPMP)
│   └── md/                 # Versiones editables en Markdown
├── infra/
│   └── terraform/          # Infraestructura como código (AWS)
├── openspec/
│   ├── project.md          # Contexto del proyecto (⭐)
│   └── specs/              # Especificaciones por módulo
├── .coderabbit.yaml        # Configuración CodeRabbit
├── CLAUDE.md               # Instrucciones para Claude Code
└── README.md               # Este archivo
```

---

## Configuración del Entorno Local

Esta sección te guiará paso a paso para configurar el proyecto ReparaYa en tu máquina local, desde la clonación del repositorio hasta ejecutar la aplicación.

### Prerrequisitos

Asegúrate de tener instalado:

- **[Node.js](https://nodejs.org/)** >= 20
- **[PostgreSQL](https://www.postgresql.org/)** >= 15
- **[Git](https://git-scm.com/)**

### Cuentas necesarias (para funcionalidades completas)

- **[Clerk](https://clerk.com/)** - Autenticación (plan gratuito disponible)
- **[Stripe](https://stripe.com/)** - Pagos en modo test (no requiere verificación)
- **[AWS](https://aws.amazon.com/)** - S3, SES, Location Service (opcional para desarrollo básico)

---

### Guía de Instalación

#### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/reparaya.git
cd reparaya
```

#### 2. Configurar variables de entorno

El proyecto utiliza variables de entorno para credenciales y configuración. **Nunca subas archivos `.env.local` al repositorio.**

```bash
cd apps/web
cp .env.example .env.local
```

Abre `.env.local` en tu editor y completa las variables con tus credenciales:

```bash
# Mínimas para desarrollo básico:
DATABASE_URL="postgresql://user:password@localhost:5432/reparaya_dev?schema=public"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..." # Obtener de Clerk Dashboard
CLERK_SECRET_KEY="sk_test_..."
STRIPE_SECRET_KEY="sk_test_..." # Obtener de Stripe Dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# AWS (opcional, para S3/SES/Location)
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_MEDIA="reparaya-media-dev"
```

**Tip**: El archivo `.env.example` incluye comentarios detallados sobre cada variable y enlaces a los dashboards donde obtener las credenciales.

#### 3. Instalar dependencias

```bash
npm install
```

Este comando instalará todas las dependencias del proyecto definidas en `package.json`.

#### 4. Configurar base de datos

```bash
# Crear base de datos PostgreSQL
createdb reparaya_dev

# Ejecutar migraciones de Prisma (cuando estén disponibles)
npx prisma migrate dev

# (Opcional) Seed de datos de prueba
npm run prisma:seed
```

**Nota**: Si no tienes migraciones aún, este paso puede fallar. En ese caso, continúa con el siguiente paso.

#### 5. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **[http://localhost:3000](http://localhost:3000)**.

---

### Flujo de Trabajo con Ramas

ReparaYa sigue un flujo de desarrollo basado en ramas:

```
main (producción) ← dev (integración) ← feature/nombre-descriptivo (tu trabajo)
```

#### Crear una nueva rama para tu funcionalidad

```bash
# Asegúrate de estar en 'dev' y tener los últimos cambios
git checkout dev
git pull origin dev

# Crea tu rama de feature
git checkout -b feature/nombre-descriptivo
```

#### Desarrollar y commitear cambios

Sigue las convenciones de [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: descripción breve del cambio"
```

Tipos de commits:
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `test:` - Agregar o actualizar tests
- `refactor:` - Refactorización de código
- `chore:` - Tareas de mantenimiento

#### Crear Pull Request

```bash
# Subir tu rama al repositorio remoto
git push origin feature/nombre-descriptivo
```

Luego, en GitHub:
1. Crea un Pull Request hacia la rama `dev` (no hacia `main`)
2. **CodeRabbit** revisará automáticamente tu código
3. Espera la aprobación y que CI pase
4. Haz merge a `dev`

---

### Herramientas de IA y Automatización

Este proyecto utiliza herramientas de IA para mejorar la calidad del código:

#### CodeRabbit (Revisor Automático de PRs)

- Revisa **automáticamente** todos los PRs hacia `dev`
- Proporciona sugerencias de seguridad, performance y buenas prácticas
- Configuración en `.coderabbit.yaml`
- Ver [configuración de CodeRabbit](./.coderabbit.yaml)

#### OpenSpec (Framework de Especificaciones)

- Define la arquitectura y contratos de cada módulo
- Las especificaciones están en `/openspec/specs/`
- **Importante**: Lee `openspec/project.md` antes de trabajar en nuevas features
- Usa `/openspec:proposal` para cambios arquitectónicos

#### Claude Code (Asistente de Desarrollo)

- Lee las instrucciones en `CLAUDE.md` para interactuar con Claude Code
- Claude puede ayudarte con implementación, testing y documentación

---

### Verificar que todo funciona

Ejecuta los siguientes comandos para asegurar que tu entorno está correctamente configurado:

```bash
# Linter (debe pasar sin errores)
npm run lint

# Type check (debe pasar sin errores)
npm run type-check

# Tests (debe pasar incluyendo smoke test)
npm run test

# Build (debe compilar correctamente)
npm run build
```

Si todos los comandos pasan sin errores, ¡estás listo para desarrollar! 🎉

---

## Setup Local (Referencia Rápida)

Para desarrolladores experimentados, aquí está la versión resumida:

---

## Desarrollo

### Scripts disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo

# Build
npm run build            # Compilar para producción
npm run start            # Ejecutar build de producción

# Linting y formato
npm run lint             # Ejecutar ESLint
npm run format           # Formatear con Prettier

# Testing
npm run test             # Ejecutar tests unitarios
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con reporte de cobertura
npm run test:e2e         # Tests end-to-end (Playwright)

# Prisma
npx prisma studio        # Explorar BD visualmente
npx prisma migrate dev   # Crear/aplicar migración
npx prisma generate      # Regenerar cliente Prisma

# TypeScript
npm run type-check       # Verificar tipos sin compilar
```

### Convenciones de código

- **Naming**:
  - Variables/funciones: `camelCase`
  - Componentes/clases: `PascalCase`
  - Constantes: `SCREAMING_SNAKE_CASE`
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `docs:` documentación
  - `refactor:` refactorización
  - `test:` tests
  - `chore:` tareas de mantenimiento

---

## Testing

### Estrategia

- **Unitarias**: Jest + ts-jest (cobertura ≥ 70%)
- **Integración**: Jest + Supertest (API routes)
- **E2E**: Playwright (flujos críticos)
- **Performance**: k6 (P95/P99 targets)

### Ejecutar tests

```bash
# Todos los tests
npm run test

# Con cobertura
npm run test:coverage

# E2E
npm run test:e2e

# Performance (requiere k6 instalado)
k6 run tests/performance/search.js
```

Ver [STP-ReparaYa.md](./docs/md/STP-ReparaYa.md) para el plan completo de pruebas.

---

## Deployment

### Vercel (recomendado)

1. Conectar repositorio en [Vercel](https://vercel.com/)
2. Configurar variables de entorno en el dashboard
3. Vercel desplegará automáticamente:
   - **Preview**: En cada PR hacia `dev`
   - **Production**: En push a `main`

### Variables de entorno requeridas

Ver `apps/web/.env.example` para la lista completa.

Mínimas para funcionar:
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`

---

## Documentación

### Documentos formales

Todos los documentos formales están en `/docs/`:

- **PDF** (versión congelada): `/docs/pdf/`
  - SRS (Especificación de Requerimientos)
  - SPMP (Plan de Gestión del Proyecto)
  - SDD (Diseño del Software)

- **Markdown** (versión editable): `/docs/md/`
  - [SRS](./docs/md/1.%20Especificación%20de%20Requerimientos%20de%20Software%20(SRS).md)
  - [SPMP](./docs/md/2.%20Plan%20de%20Gestión%20del%20Proyecto%20de%20Software%20(SPMP).md)
  - [SDD](./docs/md/3.%20Software%20Development%20Design%20(SDD).md)
  - [STP](./docs/md/STP-ReparaYa.md) (Plan de Pruebas)
  - [Architecture Overview](./docs/md/architecture-overview.md)
  - [Requirements Table](./docs/md/srs-requirements-table.md)

### OpenSpec

El contexto completo del proyecto está en [`/openspec/project.md`](./openspec/project.md).

Especificaciones por módulo en `/openspec/specs/`:
- [auth](./openspec/specs/auth/spec.md)
- [users](./openspec/specs/users/spec.md)
- [catalog-search](./openspec/specs/catalog-search/spec.md)
- [services-publishing](./openspec/specs/services-publishing/spec.md)
- [booking-checkout](./openspec/specs/booking-checkout/spec.md)
- [payments-webhooks](./openspec/specs/payments-webhooks/spec.md)
- [reservation-lifecycle-messaging](./openspec/specs/reservation-lifecycle-messaging/spec.md)
- [ratings-reviews](./openspec/specs/ratings-reviews/spec.md)
- [admin-moderation](./openspec/specs/admin-moderation/spec.md)
- [testing-qa](./openspec/specs/testing-qa/spec.md)

---

## Flujo de Trabajo

### Ramas

- `main`: Producción (estable para demos)
- `dev`: Integración de desarrollo
- `feature/*`: Ramas de funcionalidad

### Proceso de desarrollo

1. Crear rama desde `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/nombre-descriptivo
   ```

2. Desarrollar y commitear:
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   ```

3. Hacer push y crear PR:
   ```bash
   git push origin feature/nombre-descriptivo
   # Crear PR en GitHub hacia 'dev'
   ```

4. CodeRabbit revisará automáticamente el PR

5. Una vez aprobado y con CI passing, hacer merge a `dev`

### Promoción a producción

```bash
# Desde dev hacia main (solo cuando esté listo para demo)
git checkout main
git merge dev
git push origin main
```

---

## Contribuir

Este es un proyecto académico de la materia de Ingeniería de Software.

### Guidelines

1. Leer [`CLAUDE.md`](./CLAUDE.md) y [`openspec/project.md`](./openspec/project.md)
2. Seguir convenciones de código y commits
3. Escribir tests para nuevas funcionalidades
4. Actualizar documentación relevante
5. Asegurar que CI pasa antes de solicitar merge

---

## Herramientas de IA

Este proyecto utiliza:
- **Claude Code**: Asistente de desarrollo (ver `CLAUDE.md`)
- **CodeRabbit**: Revisor automático de PRs (ver `.coderabbit.yaml`)
- **OpenSpec**: Framework de especificaciones

---

## Licencia

Este proyecto es parte de un trabajo universitario.

---

## Contacto

Para preguntas o reportar issues, usa el [sistema de issues de GitHub](https://github.com/tu-usuario/reparaya/issues).

---

## Estado del Proyecto

🚧 **En desarrollo activo**

- [x] Estructura base del proyecto
- [x] Configuración de tooling (ESLint, Prettier, Jest)
- [x] Documentación inicial (SRS, SDD, SPMP, STP)
- [x] Especificaciones OpenSpec por módulo
- [x] CI/CD básico (GitHub Actions)
- [x] Configuración CodeRabbit
- [ ] Esquema Prisma completo
- [ ] Módulos de dominio (auth, services, booking, payments)
- [ ] Integraciones externas (Clerk, Stripe, AWS)
- [ ] Tests con cobertura ≥ 70%
- [ ] Deploy a Vercel staging

Ver [SPMP](./docs/md/2.%20Plan%20de%20Gestión%20del%20Proyecto%20de%20Software%20(SPMP).md) para el plan completo del proyecto y sprints.

---

**ReparaYa** - Conectando clientes con contratistas de confianza 🔧🏠
