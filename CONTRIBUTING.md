# Guía de Contribución - ReparaYa

Bienvenido al proyecto ReparaYa. Esta guía está diseñada para **todos los desarrolladores**, independientemente de si usan Claude Code, GitHub Copilot, u otras herramientas de IA.

## 📋 Tabla de Contenidos

- [Principios Fundamentales](#principios-fundamentales)
- [Configuración Inicial](#configuración-inicial)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Testing Obligatorio](#testing-obligatorio)
- [Convenciones de Código](#convenciones-de-código)
- [Pull Requests](#pull-requests)
- [Documentación](#documentación)

---

## 🎯 Principios Fundamentales

### 1. Testing es OBLIGATORIO

**Ningún código se mergea sin tests completos.**

- ✅ Cobertura mínima: **70%** en módulos core
- ✅ Todos los tests deben pasar (0 failures)
- ✅ CI/CD debe estar en verde
- ✅ Tests documentados en `/docs/md/STP-ReparaYa.md`

### 2. Documentación Viva

- Specs en `openspec/specs/` son contratos
- Cambios significativos requieren propuesta OpenSpec
- STP debe actualizarse ANTES de implementar

### 3. Calidad sobre Velocidad

- Code reviews obligatorios (CodeRabbit + humano)
- TypeScript strict mode (no `any`)
- Linter sin errores

---

## 🚀 Configuración Inicial

### Prerrequisitos

```bash
# Node.js 18+ y npm
node --version
npm --version

# PostgreSQL 14+
psql --version

# Git configurado
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Setup del Proyecto

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd ReparaYa

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# 4. Configurar base de datos
npm run prisma:migrate:dev
npm run prisma:seed

# 5. Ejecutar tests para verificar setup
npm run test

# 6. Iniciar desarrollo
npm run dev
```

### Configuración de Herramientas

**VSCode** (recomendado):
```bash
# Extensiones recomendadas
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
```

**Otras IDEs**: Asegúrate de tener ESLint y Prettier configurados.

---

## 🔄 Flujo de Trabajo

### 1. Crear Feature Branch

```bash
# Siempre desde dev actualizado
git checkout dev
git pull origin dev

# Crear branch con nombre descriptivo
git checkout -b feature/nombre-descriptivo

# Ejemplos:
# feature/auth-clerk-setup
# feature/booking-checkout-flow
# fix/payment-webhook-timeout
```

### 2. Desarrollo con OpenSpec (Cambios Significativos)

**¿Cuándo usar OpenSpec?**
- Nueva funcionalidad
- Cambio de API/schema (breaking changes)
- Cambios arquitectónicos
- Optimizaciones de performance

**Flujo:**

```bash
# 1. Crear propuesta (con Claude Code)
/openspec:proposal

# O manualmente:
mkdir -p openspec/changes/NNN-nombre-cambio/specs
```

**La propuesta DEBE incluir (ver ejemplo completo abajo):**
- `proposal.md` con sección "Testing Plan"
- `tasks.md` con checklist de implementación
- Specs delta si aplica

**2. Actualizar STP ANTES de codificar:**

Edita `/docs/md/STP-ReparaYa.md` y agrega tus casos de prueba:

```markdown
#### 4.1.X Módulo Nuevo

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-XXX-01 | Caso de prueba 1 | RF-XXX | Alta | Pendiente |
| TC-RF-XXX-02 | Caso de prueba 2 | RF-XXX | Alta | Pendiente |
```

**3. Implementar código + tests en paralelo:**

```bash
# Implementa funcionalidad
# src/modules/nuevo-modulo/service.ts

# Implementa tests
# src/modules/nuevo-modulo/__tests__/service.test.ts
```

**4. Verificar tests:**

```bash
# Ejecutar tests del módulo
npm run test -- src/modules/nuevo-modulo

# Verificar cobertura
npm run test:coverage
```

**5. Aplicar cambios:**

```bash
# Con Claude Code
/openspec:apply

# O manualmente actualizar specs base
```

### 3. Desarrollo Simple (Bug Fixes, Docs)

Para cambios menores que no requieren OpenSpec:

```bash
# 1. Hacer el cambio
# 2. Escribir/actualizar tests
# 3. Verificar que pasen
npm run test

# 4. Commit
git add .
git commit -m "fix: descripción del fix"
```

---

## 🧪 Testing Obligatorio

### Regla de Oro

**TODO requiere tests. Sin excepciones.**

### Tipos de Tests por Cambio

| Tipo de Cambio | Tests Requeridos | Ejemplo |
|----------------|------------------|---------|
| Nueva feature | Unit + Integration + E2E | Auth module: service tests + API tests + E2E login |
| API endpoint | Integration + Auth | POST /api/bookings: test response + test auth |
| Schema DB | Migration + Data integrity | Nueva tabla: test up/down + constraints |
| Terraform | validate + plan + smoke | Nuevo S3 bucket: plan en CI + test upload |
| Bug fix | Regression test | Test que reproduzca el bug |
| Performance | k6 load test | Search endpoint: P95 ≤ 1.2s |

### Escribir Tests

**Estructura de tests:**

```typescript
// src/modules/auth/__tests__/authService.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AuthService } from '../authService';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result.token).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      const email = 'invalid@example.com';
      const password = 'wrongpassword';

      // Act & Assert
      await expect(
        authService.login(email, password)
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

**Ejecutar tests:**

```bash
# Todos los tests
npm run test

# Específicos de un módulo
npm run test -- src/modules/auth

# Con watch mode (desarrollo)
npm run test:watch

# Con cobertura
npm run test:coverage
```

### Criterios de Aceptación

Antes de hacer commit, verifica:

- ✅ `npm run test` → Todos pasan
- ✅ `npm run test:coverage` → Cobertura ≥ 70%
- ✅ `npm run lint` → Sin errores
- ✅ `npm run type-check` → Sin errores TypeScript

---

## 📝 Convenciones de Código

### Naming

```typescript
// Variables y funciones: camelCase
const userId = 123;
function getUserById(id: number) { }

// Componentes y clases: PascalCase
class UserService { }
function UserProfile() { }

// Constantes: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Archivos:
// - Componentes: PascalCase.tsx
// - Utilidades: camelCase.ts
// - Tests: *.test.ts
```

### TypeScript

```typescript
// ✅ HACER
interface User {
  id: string;
  email: string;
  role: 'client' | 'contractor' | 'admin';
}

function getUser(id: string): Promise<User> { }

// ❌ NO HACER
function getUser(id): any { }  // No usar any
function getUser(id: string): Promise<any> { }  // No usar any
```

### Imports

```typescript
// Orden de imports:
// 1. Externos
import { useState } from 'react';
import { z } from 'zod';

// 2. Internos absolutos
import { UserService } from '@/modules/users/userService';
import { Button } from '@/components/Button';

// 3. Relativos
import { helper } from './helper';
import type { Props } from './types';
```

### Commits

**Conventional Commits:**

```bash
feat: add two-factor authentication
fix: resolve payment webhook timeout
docs: update API documentation
test: add integration tests for booking
refactor: extract validation logic
chore: update dependencies
```

---

## 🔀 Pull Requests

### Antes de Crear PR

**Checklist:**

```bash
# 1. Tests pasan
npm run test

# 2. Linter limpio
npm run lint

# 3. Type-check OK
npm run type-check

# 4. Build exitoso
npm run build

# 5. Actualizado con dev
git checkout dev
git pull origin dev
git checkout feature/tu-branch
git merge dev
```

### Crear Pull Request

```bash
# Push de tu branch
git push origin feature/tu-branch
```

En GitHub:
1. Crea PR hacia `dev` (NO hacia `main`)
2. Llena el template de PR (se autocompleta)
3. Asigna reviewers
4. Espera CodeRabbit review
5. Espera aprobación humana

### Template de PR

El template se autocompleta al crear el PR. Asegúrate de marcar:

- [ ] Tests escritos y pasando
- [ ] Cobertura ≥ 70%
- [ ] STP actualizado (si aplica)
- [ ] Linter sin errores
- [ ] Type-check sin errores
- [ ] Build exitoso
- [ ] Documentación actualizada

### Code Review

- **CodeRabbit** revisa automáticamente
- Al menos **1 aprobación humana** requerida
- Responde a comentarios constructivamente
- Haz cambios solicitados en commits adicionales

---

## 📚 Documentación

### Archivos Clave

**Lee SIEMPRE antes de comenzar:**

1. **`openspec/project.md`** - Contexto del proyecto
2. **`openspec/AGENTS.md`** - Flujo de OpenSpec (para AI assistants)
3. **`openspec/README.md`** - Workflow de OpenSpec (español)
4. **`docs/md/STP-ReparaYa.md`** - Plan de pruebas
5. **`CLAUDE.md`** - Instrucciones para Claude Code
6. **Este archivo** - Guía general

### Actualizar Documentación

**Cuando actualizar docs:**

- Nueva feature → Actualizar STP con casos de prueba
- Cambio de API → Actualizar spec en `openspec/specs/`
- Cambio arquitectónico → Crear proposal OpenSpec
- Bug significativo → Documentar en STP como regression test

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev                    # Iniciar servidor de desarrollo
npm run build                  # Build de producción
npm run start                  # Iniciar build de producción

# Testing
npm run test                   # Ejecutar todos los tests
npm run test:watch             # Tests en modo watch
npm run test:coverage          # Tests con reporte de cobertura
npm run test -- path/to/file   # Tests específicos

# Calidad
npm run lint                   # Ejecutar ESLint
npm run lint:fix               # Arreglar problemas de linting
npm run type-check             # Verificar tipos TypeScript

# Base de datos
npm run prisma:migrate:dev     # Crear y aplicar migración
npm run prisma:seed            # Seed de datos de prueba
npm run prisma:studio          # Abrir Prisma Studio
npm run prisma:generate        # Regenerar Prisma Client

# Git
git checkout dev               # Cambiar a rama dev
git pull origin dev            # Actualizar dev
git checkout -b feature/name   # Crear feature branch
git add .                      # Agregar cambios
git commit -m "type: message"  # Commit con mensaje
git push origin branch-name    # Push a remote
```

---

## 🚨 Errores Comunes

### "Tests fallan localmente pero pasan en CI"

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Limpiar build cache
rm -rf .next

# Regenerar Prisma Client
npm run prisma:generate
```

### "Cobertura no alcanza 70%"

```bash
# Ver reporte detallado
npm run test:coverage

# Abrir reporte HTML
open coverage/lcov-report/index.html
```

### "Conflictos con dev"

```bash
# Actualizar tu branch con dev
git checkout dev
git pull origin dev
git checkout feature/tu-branch
git merge dev

# Resolver conflictos manualmente
# Luego:
git add .
git commit -m "merge: resolve conflicts with dev"
```

---

## 📞 Ayuda y Contacto

- **Issues**: Usa GitHub Issues para bugs y feature requests
- **Documentación técnica**: Revisa `openspec/` y `docs/md/`
- **Code reviews**: Menciona a reviewers en PR

---

## 📖 Ejemplo Completo: Implementar Nueva Feature

### Escenario

Implementar módulo de autenticación con Clerk.

### Paso a Paso

**1. Crear branch:**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/auth-clerk-implementation
```

**2. Crear propuesta OpenSpec:**

Crear `openspec/changes/001-implement-auth/proposal.md`:

```markdown
# Proposal: Implementar módulo de autenticación

## Why
Implementar autenticación de usuarios según spec de openspec/specs/auth/spec.md
usando Clerk para gestión de identidades.

## What Changes
- Configurar Clerk Provider en Next.js
- Implementar webhook handler para eventos de Clerk
- Crear middleware requireAuth para proteger rutas
- Implementar servicios de autenticación
- Escribir tests completos

## Impact
- Affected specs: `auth`
- Affected code: `src/modules/auth/`, `src/middleware/`, `app/api/webhooks/`

## Testing Plan

### Test Cases to Add to STP:

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-003-01 | Successful user registration | E2E | High | RF-003 |
| TC-RF-003-02 | Login with valid credentials | E2E | High | RF-003 |
| TC-RF-003-03 | Authorization by role | Integration | High | RF-003 |
| TC-RF-003-04 | Webhook processes user.created | Integration | High | RF-003 |
| TC-RF-003-05 | Middleware blocks unauthorized access | Integration | High | RF-003 |

### Acceptance Criteria:
- ✅ Coverage ≥ 75% in src/modules/auth
- ✅ All TC-RF-003-* cases pass
- ✅ Middleware blocks access without valid session
- ✅ Webhook is idempotent
- ✅ Role-based authorization works correctly

### Test Implementation Strategy:

**Test files to create:**
- `src/modules/auth/__tests__/authService.test.ts`
- `src/modules/auth/__tests__/requireAuth.test.ts`
- `tests/integration/api/webhooks/clerk.test.ts`
- `tests/e2e/auth.spec.ts`

**Mocks and fixtures:**
- Mock Clerk SDK for session verification
- Test user fixtures (client, contractor, admin)
- Mock webhook payloads

**Environment:**
- Clerk test environment with test users
- Test database for integration tests
```

**3. Actualizar STP:**

Editar `/docs/md/STP-ReparaYa.md`, sección 4.1.1:

```markdown
#### 4.1.1 Autenticación (Auth)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-003-01 | Registro exitoso de usuario | RF-003 | Alta | Pendiente |
| TC-RF-003-02 | Login con credenciales válidas | RF-003 | Alta | Pendiente |
| TC-RF-003-03 | Autorización por rol | RF-003 | Alta | Pendiente |
| TC-RF-003-04 | Webhook procesa user.created | RF-003 | Alta | Pendiente |
| TC-RF-003-05 | Middleware bloquea acceso no autorizado | RF-003 | Alta | Pendiente |
```

**4. Implementar código:**

```typescript
// src/modules/auth/authService.ts
export class AuthService {
  async getUserByClerkId(clerkId: string): Promise<User> {
    // Implementation
  }
}
```

**5. Escribir tests:**

```typescript
// src/modules/auth/__tests__/authService.test.ts
describe('AuthService', () => {
  it('should get user by Clerk ID', async () => {
    // Test implementation
  });
});
```

**6. Verificar:**

```bash
npm run test -- src/modules/auth
npm run test:coverage
npm run lint
npm run type-check
```

**7. Commit y push:**

```bash
git add .
git commit -m "feat: implement auth module with Clerk integration

- Configure Clerk Provider
- Implement webhook handler
- Create requireAuth middleware
- Add comprehensive tests (coverage: 78%)
- Update STP with test cases TC-RF-003-*"

git push origin feature/auth-clerk-implementation
```

**8. Crear PR:**

- Hacia `dev`
- Llenar template
- Esperar reviews

**9. Después de merge, archivar:**

```bash
# Con Claude Code
/openspec:archive

# O manualmente
mv openspec/changes/001-implement-auth openspec/changes/archive/2025-11-11-implement-auth
```

---

**¡Listo! Ahora estás preparado para contribuir a ReparaYa siguiendo las mejores prácticas del proyecto.**
