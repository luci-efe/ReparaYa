# Tasks: Contractor Profile Onboarding

## 1. Preparación y Diseño

- [x] 1.1 Crear spec delta `/openspec/specs/profiles/profiles-contractor.md` con requisitos formales
- [x] 1.2 Actualizar `/openspec/project.md` para enlazar al nuevo spec
- [x] 1.3 Actualizar `/docs/md/STP-ReparaYa.md` con casos de prueba `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012`

## 2. Implementación del Módulo `contractors`

### 2.1 Estructura de Carpetas

- [x] 2.1.1 Crear carpeta `apps/web/src/modules/contractors/`
- [x] 2.1.2 Crear subcarpetas: `services/`, `repositories/`, `types/`, `validators/`, `errors/`, `__tests__/`
- [x] 2.1.3 Crear archivo `index.ts` para exportación pública del módulo

### 2.2 Tipos y DTOs

- [x] 2.2.1 Crear `types/index.ts` con interfaces:
  - `ContractorProfileDTO` (respuesta completa)
  - `PublicContractorProfileDTO` (perfil público)
  - `CreateContractorProfileDTO` (request de creación)
  - `UpdateContractorProfileDTO` (request de actualización)
  - `VerificationStatus` (enum: DRAFT | ACTIVE)

### 2.3 Validadores Zod

- [x] 2.3.1 Crear `validators/index.ts` con schemas:
  - `createContractorProfileSchema` (businessName, description, specialties, verificationDocuments)
  - `updateContractorProfileSchema` (campos opcionales)
  - `verifyContractorProfileSchema` (verified: boolean)
  - Validaciones: businessName max 100 chars, description max 500 chars, specialties array no vacío

### 2.4 Errores

- [x] 2.4.1 Crear `errors/index.ts` con clases de error:
  - `ContractorProfileNotFoundError`
  - `ContractorProfileAlreadyExistsError`
  - `InvalidVerificationStatusError`
  - `UnauthorizedContractorActionError`

### 2.5 Repositorio

- [x] 2.5.1 Crear `repositories/contractorProfileRepository.ts` con métodos:
  - `create(data: CreateContractorProfileDTO): Promise<ContractorProfile>`
  - `findById(id: string): Promise<ContractorProfile | null>`
  - `findByUserId(userId: string): Promise<ContractorProfile | null>`
  - `update(id: string, data: UpdateContractorProfileDTO): Promise<ContractorProfile>`
  - `updateVerificationStatus(id: string, verified: boolean): Promise<ContractorProfile>`
  - `findPublicById(id: string): Promise<PublicContractorProfileDTO | null>`

### 2.6 Servicios de Dominio

- [x] 2.6.1 Crear `services/contractorProfileService.ts` con métodos:
  - `createProfile(userId: string, data: CreateContractorProfileDTO): Promise<ContractorProfile>`
    - Validar que no exista perfil previo para ese userId
    - Validar que usuario tenga `role=CONTRACTOR`
    - Crear perfil con `verified: false` (estado DRAFT)
  - `getProfileByUserId(userId: string): Promise<ContractorProfile>`
    - Lanzar error si no existe
  - `updateProfile(userId: string, data: UpdateContractorProfileDTO): Promise<ContractorProfile>`
    - Validar que perfil esté en estado DRAFT (no permitir editar si está ACTIVE)
    - Actualizar campos
  - `getPublicProfile(contractorId: string): Promise<PublicContractorProfileDTO>`
    - Retornar solo campos públicos (sin verificationDocuments ni stripeConnectAccountId)
  - `verifyProfile(adminUserId: string, contractorId: string, verified: boolean): Promise<ContractorProfile>`
    - Validar que adminUserId tenga `role=ADMIN`
    - Actualizar `verified`

## 3. Implementación de Endpoints API

### 3.1 Endpoints de Contratista

- [x] 3.1.1 Crear `apps/web/src/app/api/contractors/profile/route.ts`:
  - `POST /api/contractors/profile` - Crear perfil
    - Middleware: `requireRole('CONTRACTOR')`
    - Body: validar con `createContractorProfileSchema`
    - Llamar a `contractorProfileService.createProfile()`
    - Retornar 201 con perfil creado

- [x] 3.1.2 Crear `apps/web/src/app/api/contractors/profile/me/route.ts`:
  - `GET /api/contractors/profile/me` - Obtener perfil propio
    - Middleware: `requireRole('CONTRACTOR')`
    - Llamar a `contractorProfileService.getProfileByUserId()`
    - Retornar 200 con perfil completo
  - `PATCH /api/contractors/profile/me` - Actualizar perfil propio
    - Middleware: `requireRole('CONTRACTOR')`
    - Body: validar con `updateContractorProfileSchema`
    - Llamar a `contractorProfileService.updateProfile()`
    - Retornar 200 con perfil actualizado

### 3.2 Endpoints Públicos

- [x] 3.2.1 Crear `apps/web/src/app/api/contractors/[id]/route.ts`:
  - `GET /api/contractors/:id` - Obtener perfil público
    - Sin autenticación (público)
    - Llamar a `contractorProfileService.getPublicProfile()`
    - Retornar 200 con perfil público (solo businessName, description, specialties, verified)

### 3.3 Endpoints de Admin

- [x] 3.3.1 Crear `apps/web/src/app/api/admin/contractors/[id]/verify/route.ts`:
  - `PATCH /api/admin/contractors/:id/verify` - Aprobar perfil
    - Middleware: `requireRole('ADMIN')`
    - Body: validar con `verifyContractorProfileSchema`
    - Llamar a `contractorProfileService.verifyProfile()`
    - Retornar 200 con perfil actualizado

## 4. Tests

### 4.1 Tests Unitarios

- [x] 4.1.1 Crear `__tests__/contractorProfileService.test.ts`:
  - TC-CONTRACTOR-001: Crear perfil de contratista exitosamente
  - TC-CONTRACTOR-002: No permitir crear perfil duplicado
  - TC-CONTRACTOR-003: Rechazar creación de perfil si usuario no es CONTRACTOR
  - TC-CONTRACTOR-005: Actualizar perfil de contratista
  - TC-CONTRACTOR-010: Validación de datos con Zod
  - TC-CONTRACTOR-011: Transición de estado DRAFT → ACTIVE
  - TC-CONTRACTOR-012: Campo stripeConnectAccountId es NULL por defecto
  - Mocks: Prisma, Clerk

- [x] 4.1.2 Crear `__tests__/contractorProfileRepository.test.ts`:
  - Tests de acceso a datos (create, findById, update, etc.)
  - Mocks: Prisma

- [x] 4.1.3 Crear `__tests__/validators.test.ts`:
  - Tests de schemas Zod (validaciones de businessName, description, specialties)

### 4.2 Tests de Integración

- [x] 4.2.1 Crear `tests/integration/api/contractors.test.ts`:
  - TC-CONTRACTOR-001: POST /api/contractors/profile crea perfil
  - TC-CONTRACTOR-002: POST /api/contractors/profile rechaza duplicado
  - TC-CONTRACTOR-003: POST /api/contractors/profile rechaza usuario CLIENT
  - TC-CONTRACTOR-004: GET /api/contractors/profile/me retorna perfil completo
  - TC-CONTRACTOR-005: PATCH /api/contractors/profile/me actualiza perfil
  - TC-CONTRACTOR-006: GET /api/contractors/:id retorna perfil público
  - TC-CONTRACTOR-007: GET /api/contractors/:id no expone datos sensibles
  - Usar base de datos de test (PostgreSQL local o Supabase test)
  - Mock de Clerk para autenticación

- [x] 4.2.2 Crear `tests/integration/api/admin/contractorVerification.test.ts`:
  - TC-CONTRACTOR-008: PATCH /api/admin/contractors/:id/verify aprueba perfil
  - TC-CONTRACTOR-009: Contratista no puede auto-aprobar su perfil
  - Mock de Clerk para simular admin

### 4.3 Verificación de Cobertura

- [x] 4.3.1 Ejecutar `npm run test:coverage`
- [x] 4.3.2 Verificar que `src/modules/contractors` tenga cobertura ≥ 75%
- [x] 4.3.3 Si cobertura < 75%, agregar tests faltantes

### 4.4 Tests de Seguridad

- [x] 4.4.1 Verificar que usuario CLIENT no puede crear perfil de contratista (TC-CONTRACTOR-003)
- [x] 4.4.2 Verificar que contratista no puede auto-aprobar su perfil (TC-CONTRACTOR-009)
- [x] 4.4.3 Verificar que endpoint público no expone datos sensibles (TC-CONTRACTOR-007)
- [x] 4.4.4 Verificar validación de input sanitization con Zod (XSS, HTML en businessName)

## 5. Documentación

### 5.1 Actualización del STP

- [x] 5.1.1 Abrir `/docs/md/STP-ReparaYa.md`
- [x] 5.1.2 Crear sección 4.1.3 "Perfiles de Contratista"
- [x] 5.1.3 Documentar casos de prueba `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012` con formato:
  - ID del caso
  - Descripción
  - Tipo (unitaria, integración, E2E)
  - Prioridad (alta, media, baja)
  - Requisito asociado (RF-CONTRACTOR-XXX)
  - Procedimiento de prueba
  - Resultado esperado

### 5.2 Actualización de Specs

- [x] 5.2.1 Verificar que `/openspec/specs/profiles/profiles-contractor.md` esté completo
- [x] 5.2.2 Verificar que `/openspec/project.md` enlace al nuevo spec

### 5.3 Documentación de API (opcional)

- [ ] 5.3.1 Crear archivo `docs/api/contractors.md` con:
  - Endpoints disponibles
  - Request/response schemas
  - Ejemplos de uso
  - Códigos de error
  - **Nota**: Esto es opcional y puede hacerse en el futuro

## 6. Integración y CI/CD

### 6.1 Verificación Local

- [x] 6.1.1 Ejecutar `npm run test` - todos los tests deben pasar
- [x] 6.1.2 Ejecutar `npm run build` - build sin errores
- [ ] 6.1.3 Ejecutar `npm run lint` - linter sin errores
- [ ] 6.1.4 Ejecutar `npm run type-check` - TypeScript sin errores

### 6.2 Pull Request

- [ ] 6.2.1 Crear PR hacia `dev` con título: "feat: implementar perfiles de contratista con UI completo"
- [ ] 6.2.2 Descripción del PR con:
  - Resumen del cambio
  - Casos de prueba implementados
  - Cobertura de código alcanzada
  - Screenshots (si aplica)
  - Checklist de revisión
- [ ] 6.2.3 Esperar revisión de CodeRabbit
- [ ] 6.2.4 Resolver comentarios de revisión
- [ ] 6.2.5 Esperar aprobación humana (si aplica)
- [ ] 6.2.6 Mergear a `dev`

## 7. Finalización

- [ ] 7.1 Verificar que PR fue mergeado exitosamente a `dev`
- [ ] 7.2 Verificar que CI/CD pasó sin errores en `dev`
- [ ] 7.3 Actualizar `/docs/md/STP-ReparaYa.md` con resultados de ejecución de tests
- [ ] 7.4 Ejecutar `/openspec:archive 2025-11-17-profiles-contractor` para archivar el change

## 8. Frontend Implementado (Nuevo)

### 8.1 Componentes UI

- [x] 8.1.1 Crear `Textarea.tsx` - Componente de área de texto reutilizable
- [x] 8.1.2 Crear `Checkbox.tsx` - Componente de checkbox reutilizable
- [x] 8.1.3 Actualizar `index.ts` para exportar nuevos componentes

### 8.2 Página de Onboarding

- [x] 8.2.1 Crear `/onboarding/contractor-profile/page.tsx`:
  - Formulario completo con react-hook-form + Zod
  - Campos: businessName, description, specialties (checkbox múltiple)
  - Validación en tiempo real con feedback visual
  - Submit a `POST /api/contractors/profile`
  - Mensaje informativo sobre verificación
  - Consistencia visual con onboarding de clientes

### 8.3 Actualización de Selección de Rol

- [x] 8.3.1 Actualizar `/onboarding/role-selection/page.tsx`:
  - Habilitar opción de contratista
  - Remover badge "Próximamente"
  - Cambiar color de icono a verde
  - Redirect a `/onboarding/contractor-profile`

### 8.4 Página de Perfil de Contratista

- [x] 8.4.1 Crear `/contractors/profile/page.tsx`:
  - Vista/edición de perfil del contratista
  - Mostrar estado de verificación (DRAFT/ACTIVE)
  - Permitir editar solo si está en DRAFT
  - Formulario prellenado con datos existentes
  - Submit a `PATCH /api/contractors/profile/me`
  - Indicador visual de verificación
  - Mensaje informativo si está verificado

### 8.5 Panel de Administración

- [x] 8.5.1 Crear `/admin/contractors/page.tsx`:
  - Lista de perfiles de contratistas
  - Filtros: Todos, Pendientes, Verificados
  - Stats cards (total, pendientes, verificados)
  - Cards clickables para ver detalles
  - Nota: endpoint de listado será implementado en el futuro

- [x] 8.5.2 Crear `/admin/contractors/[id]/page.tsx`:
  - Vista detallada de perfil de contratista
  - Información del negocio (nombre, descripción, especialidades)
  - Información técnica (IDs, fechas)
  - Botón para aprobar/revocar verificación
  - Submit a `PATCH /api/admin/contractors/:id/verify`
  - Feedback visual de estado de verificación

---

## Estimación de Esfuerzo

| Fase | Tareas | Estimación |
|------|--------|-----------|
| **Preparación** | 1.1 - 1.3 | 0.5 días |
| **Implementación** | 2.1 - 2.6 + 3.1 - 3.3 | 2 días |
| **Tests** | 4.1 - 4.4 | 1.5 días |
| **Documentación** | 5.1 - 5.3 | 0.5 días |
| **Integración** | 6.1 - 6.2 | 0.5 días |
| **Total** | | **5 días** |

## Notas de Implementación

### Orden Recomendado

1. **Primero**: Tipos y validadores (2.2, 2.3) - Definen contratos
2. **Segundo**: Errores (2.4) - Necesarios para servicios
3. **Tercero**: Repositorio (2.5) - Capa de datos
4. **Cuarto**: Servicios (2.6) - Lógica de negocio
5. **Quinto**: Endpoints (3.1, 3.2, 3.3) - Capa de presentación
6. **Sexto**: Tests (4.1 - 4.4) - Verificación
7. **Último**: Documentación (5.1 - 5.3) - Trazabilidad

### Tests en Paralelo

- Implementar tests unitarios mientras se escribe cada servicio
- No esperar a terminar todo el código para empezar con tests
- Usar TDD (Test-Driven Development) si es posible

### Dependencias Clave

- `@clerk/nextjs` - Autenticación y roles
- `@prisma/client` - Acceso a datos
- `zod` - Validación runtime
- `jest` - Framework de testing
- `@testing-library/*` - Testing utilities

### Puntos de Atención

- **No modificar schema Prisma**: Usar campos existentes en `ContractorProfile`
- **No implementar Stripe Connect**: Solo documentar campo `stripeConnectAccountId`
- **No implementar upload a S3**: Solo URLs dummy en `verificationDocuments`
- **Cobertura ≥ 75%**: Requisito obligatorio antes de PR
