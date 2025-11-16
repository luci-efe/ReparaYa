# Project Context

## Purpose

ReparaYa es una plataforma web que conecta clientes residenciales con contratistas de servicios de mantenimiento, reparación y mejoras del hogar (plomería, electricidad, carpintería, etc.) en el área metropolitana de Guadalajara.

El MVP debe cubrir de extremo a extremo el flujo:
búsqueda → detalle de servicio → reserva → pago (anticipo + liquidación) → ejecución del servicio → mensajería entre cliente y contratista → calificación y liquidación al contratista.

El proyecto se desarrolla como parte de una materia universitaria de Ingeniería de Software, con entregables formales de documentación (SRS, SDD, SPMP, STP) y un enfoque fuerte en requisitos, diseño, pruebas y trazabilidad.

## Tech Stack

**Aplicación**

- Frontend: Next.js (App Router) + React + TypeScript
- Estilos: TailwindCSS
- Backend: API Routes de Next.js (Node.js runtime, monolito modular por dominios)
- Lenguaje: TypeScript full-stack (frontend y backend)

**Datos**

- Base de datos: PostgreSQL
- ORM: Prisma

**Autenticación y pagos**

- Autenticación: Clerk (SDK para Next.js + Vercel)
- Modelo de identidad:
  - Clerk gestiona autenticación y datos básicos del usuario.
  - Base de datos propia con tabla `users` enlazada por `clerk_user_id` y campo `role` (`client`, `contractor`, `admin`).
- Pagos: Stripe Checkout + Stripe Connect Express
  - Cobro de anticipo y liquidación.
  - Payouts a contratistas (cuentas conectadas).
  - Entorno: modo test para el MVP.

**Nube / Infraestructura**

- Hosting principal: Vercel (frontend + backend Next.js en un mismo proyecto).
- AWS:
  - S3: almacenamiento de imágenes de servicios.
  - SES (o SMTP compatible): correos transaccionales.
  - Amazon Location Service: geocodificación y cálculo de distancias.
  - (Opcional) CloudFront como CDN para servir medios desde S3.
- Infra-as-Code:
  - Terraform mínimo para declarar recursos AWS (S3, SES, Location, IAM básico).

**Tooling**

- OpenSpec: desarrollo guiado por especificaciones (`openspec/project.md`, `openspec/specs/*`, `openspec/changes/*`).
- Claude Code: asistente de desarrollo y de escritura de specs/código.
- CodeRabbit: revisor automático de pull requests en GitHub (configurado vía `.coderabbit.yaml`).

## Project Conventions

### Documentation Layout

- **Documentación base (referencia congelada - NO leer salvo excepciones)**:
  - `/docs/pdf/` - Entregables formales en PDF (SRS, SPMP, SDD) para la materia
  - `/docs/md/` - Versiones markdown de documentos base
    - `1. Especificación de Requerimientos de Software (SRS).md` (17K)
    - `2. Plan de Gestión del Proyecto de Software (SPMP).md` (8.8K)
    - `3. Software Development Design (SDD).md` (68K)
    - `modelo_datos_reparaya.md` (40K)
    - `architecture-overview.md` (7.6K)
    - `RESUMEN_EJECUTIVO.md`, `srs-requirements-table.md`

- **🔴 POLÍTICA DE LECTURA PARA AGENTES DE IA**:
  - **NUNCA leas** los archivos grandes de `/docs/md/` (SRS, SPMP, SDD, modelo_datos) durante operaciones normales
  - Estos documentos son **baseline congelada** - su contenido ya está consolidado en:
    - `openspec/project.md` (este archivo) - Arquitectura, stack, convenciones
    - `openspec/specs/*/spec.md` - Especificaciones por módulo
  - **ÚNICA EXCEPCIÓN**: Si necesitas información muy específica que no encuentres en `openspec/`, pregunta al usuario antes de leer archivos grandes

- **Documentación activa (leer/modificar regularmente)**:
  - ✅ **`docs/md/STP-ReparaYa.md`** - Plan de pruebas (DEBE actualizarse con cada implementación)
  - ✅ **`openspec/project.md`** - Este archivo (contexto del proyecto)
  - ✅ **`openspec/specs/*/spec.md`** - Especificaciones de módulos
  - ✅ **`openspec/changes/*/`** - Propuestas y cambios evolutivos
  - ✅ **`CLAUDE.md`** - Instrucciones para Claude Code

- **Convención para modificaciones**:
  - Los agentes SOLO modifican archivos en `openspec/` y `docs/md/STP-ReparaYa.md`
  - Los PDFs y otros archivos `.md` en `/docs/md/` son referencia de solo lectura (salvo excepciones justificadas)

### Code Style

- Lenguaje:
  - TypeScript en todo el código de aplicación (frontend y backend).
- Naming:
  - `camelCase` para variables y funciones.
  - `PascalCase` para componentes React, clases y tipos/interfaces.
  - `SCREAMING_SNAKE_CASE` para constantes globales.
- Formateo:
  - Prettier como formateador por defecto.
  - ESLint con configuración recomendada para Next.js + TypeScript + reglas adicionales (sin `any` implícito, imports ordenados, etc.).
- Estructura de módulos:
  - Organización por dominio:
    - `auth/`
    - `users/`
    - `services/`
    - `booking/`
    - `payments/`
    - `messaging/`
    - `ratings/`
    - `admin/`
  - Cada módulo con:
    - Capa de servicios de dominio (casos de uso).
    - Capa de repositorios (acceso vía Prisma).
    - Tipos/DTOs y validaciones.

### Architecture Patterns

- Arquitectura lógica en 3 capas:
  - **Presentación**:
    - Next.js (App Router).
    - Páginas, layouts y componentes React.
  - **Negocio / Dominio**:
    - Servicios que encapsulan lógica de casos de uso (reservas, pagos, mensajería, calificaciones, etc.).
    - Reglas de negocio independientes del framework.
  - **Datos**:
    - Repositorios Prisma sobre PostgreSQL.
    - Sin SQL “suelto” en controladores o componentes.

- Arquitectura física:
  - Monolito modular desplegado en Vercel:
    - `apps/web` contiene frontend + backend (API routes).
    - Módulos de dominio separados en carpetas, pero dentro de la misma app.

- Integraciones externas:
  - **Clerk**: autenticación y sesiones de usuario integradas con Next.js.
  - **Stripe**:
    - Módulo `payments` encapsula integración con Stripe Checkout + Connect.
    - Webhooks HTTP (API route) para actualizar estados de pagos/reservas.
  - **AWS**:
    - Adaptadores específicos para S3 (media), SES (emails) y Location (geocodificación/distancias).

### Testing Strategy

- Plan de pruebas central:
  - Archivo principal: `/docs/md/STP-ReparaYa.md`.
  - Estilo inspirado en IEEE 829:
    - Plan de pruebas.
    - Especificación de casos de prueba.
    - Procedimientos de prueba.
    - Registro de pruebas (logs).
    - Informe/resumen de pruebas.

- Objetivos:
  - Trazar cada RF/RNF del SRS hacia:
    - Alguna spec en `openspec/specs/`.
    - Uno o más casos de prueba (`TC-...`) en el STP.
  - Asegurar que todos los RF de prioridad alta tienen pruebas definidas y ejecutadas.

- Tipos de pruebas:
  - **Unitarias**:
    - Servicios de dominio y utilidades puras (Jest).
  - **Integración**:
    - Endpoints HTTP (Jest + Supertest).
    - Integración con Stripe (modo test).
    - Integración con AWS (tests limitados y/o mocks según costo y complejidad).
  - **End-to-end (E2E)**:
    - Flujos críticos:
      - Búsqueda → detalle → reserva → pago (anticipo) → cambio de estado → pago de liquidación → calificación.
    - Herramienta: Playwright o Cypress (a definir en el STP).
  - **Performance**:
    - k6 en endpoints de búsqueda y checkout.
    - Validar requisitos de latencia para P95/P99 definidos en el SRS.
  - **Seguridad básica**:
    - Pruebas de autorización (control de acceso por rol).
    - Pruebas de input sanitization (XSS básico en mensajería, por ejemplo).

- Criterios mínimos:
  - Cobertura ≥ 70 % en módulos core (auth, booking, payments).
  - Sin casos críticos abiertos al momento de presentar la versión final.

- **IMPORTANTE - Ciclo obligatorio de testing en OpenSpec**:
  - **ANTES de implementar cualquier funcionalidad**:
    1. El proposal (`/openspec:proposal`) DEBE incluir una sección "Testing Plan" con:
       - Casos de prueba a agregar al STP (IDs: `TC-RF-XXX-YY` o `TC-RNF-XXX-YY`)
       - Tipo de pruebas (unitaria, integración, E2E, performance)
       - Criterios de aceptación específicos
    2. Actualizar `/docs/md/STP-ReparaYa.md` con los casos de prueba ANTES de escribir código
    3. Implementar código Y tests simultáneamente
    4. Verificar cobertura ≥ 70% y que todos los tests pasen
    5. Actualizar STP con resultados de ejecución
  - **NO se puede archivar** (`/openspec:archive`) un cambio hasta que:
    - Todos los tests pasen
    - Cobertura cumpla objetivo
    - STP esté actualizado con resultados
    - CI/CD esté en verde

### Git Workflow

- Ramas principales:
  - `main`: rama estable para entregables “listos para demo/profesor”.
  - `dev`: rama de integración de desarrollo.

- Flujo de trabajo:
  - Toda nueva funcionalidad se desarrolla en ramas de feature:
    - Formato: `feature/<nombre-descriptivo>`
      - Ejemplos:
        - `feature/auth-clerk-setup`
        - `feature/booking-checkout-flow`
        - `feature/messaging-reservation-thread`
  - Base de cada feature branch: `dev`.
  - Los merges se hacen siempre via pull request hacia `dev`.
  - Promociones desde `dev` hacia `main` se hacen sólo cuando el incremento esté probado y listo para demo.

- Revisión de código:
  - CodeRabbit configurado con `.coderabbit.yaml`:
    - Revisión automática de PRs con base `dev`.
    - Comentarios en español.
  - Idealmente, al menos una aprobación humana (o revisión consciente) antes de mergear a `dev`.

- Commits:
  - Convención: Conventional Commits:
    - `feat: ...`
    - `fix: ...`
    - `docs: ...`
    - `refactor: ...`
    - `test: ...`
    - `chore: ...`

- OpenSpec:
  - `openspec/project.md` es la visión y contexto global.
  - Specs por módulo en `openspec/specs/*`.
  - Cambios evolutivos gestionados con `openspec/changes/*`:
    - Cada change tiene `proposal.md`, `tasks.md` y posibles specs adicionales.
  - Los cambios aprobados se reflejan luego en las specs base.

## Domain Context

- Dominio: marketplace de servicios de reparación/mantenimiento del hogar.
- Roles:
  - **Cliente**:
    - Se registra, gestiona su perfil.
    - Busca servicios por ubicación/categoría.
    - Crea reservas.
    - Paga anticipos y liquidaciones.
    - Chatea con contratistas.
    - Califica servicios.
  - **Contratista**:
    - Se registra y configura su perfil profesional.
    - Publica servicios (descripción, precio, cobertura geográfica, disponibilidad).
    - Gestiona reservas (aceptar, rechazar, reagendar).
    - Se comunica con clientes vía mensajería.
    - Recibe payouts vía Stripe Connect.
  - **Admin**:
    - Modera contenido (servicios, reseñas).
    - Gestiona usuarios reportados.
    - Interviene en disputas.

- Entidades principales:
  - Usuario (cliente/contratista/admin)
  - Servicio
  - Disponibilidad
  - Reserva
  - Pago (anticipo, liquidación, reembolso)
  - Conversación/mensaje (ligado a reserva)
  - Calificación

- Mensajería:
  - Orientada a hilos por reserva (1 conversación por reserva).
  - MVP: entrega mediante polling periódico de mensajes.
  - Diseño preparado para evolucionar a SSE/WebSockets en el futuro sin romper modelo de datos.

- Contexto geográfico e idioma:
  - Foco inicial: Área Metropolitana de Guadalajara, México.
  - Idioma principal: español (MX) en UI y documentación de alto nivel.

## Important Constraints

- Proyecto académico:
  - Duración limitada (sprints definidos en el SPMP).
  - Entregables formales: SRS, SDD, SPMP y STP deben mantenerse alineados con la implementación.
- Presupuesto AWS:
  - Aproximadamente 100 USD de crédito.
  - Minimizar servicios caros:
    - Priorizar Vercel para compute.
    - Usar AWS principalmente para S3, SES y Location (bajo costo).
- Base de datos:
  - PostgreSQL en Supabase (free tier, sin auto-suspend)
  - Proyecto: https://vmsqbguwjjpusedhapqo.supabase.co
  - Cambio desde Neon: Supabase evita cold starts que causaban latencias de 3-5s en primera conexión después de 5 min de inactividad
- Alcance funcional:
  - Enfocarse en flujos principales y en calidad de la experiencia:
    - Búsqueda y reservas.
    - Pagos y estados.
    - Mensajería y calificaciones.
- Seguridad:
  - Uso de Stripe Connect sólo en modo test para el MVP.
  - Manejo acotado de datos personales (sin datos extremadamente sensibles).
  - Control de acceso por rol obligatorio en todas las rutas protegidas.

## External Dependencies

- **Next.js / React / Vercel**:
  - Framework y plataforma de hosting principal para frontend + backend.

- **PostgreSQL + Prisma**:
  - Base de datos relacional principal.
  - Prisma como capa de acceso a datos tipada.

- **Clerk**:
  - Autenticación de usuarios y manejo de sesiones en Next.js.
  - Gestión de identidades, mientras la lógica de roles se mantiene en la base de datos propia.

- **Stripe (Checkout + Connect Express)**:
  - Procesamiento de pagos.
  - Cobros de anticipo y liquidación.
  - Payouts a contratistas.

- **AWS S3**:
  - Almacenamiento de imágenes de servicios (y otros medios si aplica).

- **AWS SES / SMTP**:
  - Envío de correos transaccionales (confirmaciones, cambios de estado, recordatorios).

- **Amazon Location Service**:
  - Geocodificación de direcciones.
  - Cálculo de distancias para búsqueda por ubicación.

- **Terraform**:
  - Infra-as-Code para recursos AWS.
  - Permite recrear/ajustar infra con cambios controlados.

- **CodeRabbit**:
  - Revisión automática de pull requests en GitHub con base `dev`.

- **OpenSpec + Claude Code**:
  - Motor de especificaciones y asistente de desarrollo:
    - Specs describen comportamiento esperado y requisitos.
    - Claude Code opera dentro del repo siguiendo este `project.md`, los documentos en `/docs/md/` y la estructura de `openspec/`.
