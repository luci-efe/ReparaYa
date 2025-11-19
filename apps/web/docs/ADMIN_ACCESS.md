# Acceso como Administrador

Este documento explica cómo crear y acceder como usuario administrador en ReparaYa.

## ¿Qué está implementado?

✅ **Sistema de aprobación de contratistas completamente implementado:**
- Backend: Endpoint `PATCH /api/admin/contractors/:id/verify`
- Frontend: Panel de administración en `/admin/contractors` y `/admin/contractors/[id]`
- Autorización: Solo usuarios con `role=ADMIN` pueden aprobar perfiles

## Cómo crear un usuario Admin

### Opción 1: Actualización manual en la Base de Datos (Desarrollo)

**Requisitos previos:**
- Tener un usuario registrado en Clerk
- Acceso a la base de datos PostgreSQL

**Pasos:**

1. **Regístrate normalmente** en la aplicación (con cualquier rol)

2. **Identifica tu `id` de usuario** en la base de datos:
   ```sql
   SELECT id, email, role FROM "User" WHERE email = 'tu-email@ejemplo.com';
   ```

3. **Actualiza el rol a ADMIN**:
   ```sql
   UPDATE "User"
   SET role = 'ADMIN'
   WHERE email = 'tu-email@ejemplo.com';
   ```

4. **Verifica el cambio**:
   ```sql
   SELECT id, email, role FROM "User" WHERE email = 'tu-email@ejemplo.com';
   ```

   Deberías ver `role: ADMIN`

5. **Cierra sesión y vuelve a iniciar** en la aplicación para que se actualice el token

### Opción 2: Script de migración (Recomendado para Producción)

Crear un script en `prisma/seed.ts` o una migración específica:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@reparaya.com';

  // Verificar si ya existe
  const existing = await prisma.user.findFirst({
    where: { email: adminEmail }
  });

  if (existing) {
    // Actualizar a admin si no lo es
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' }
    });
    console.log(`Usuario ${adminEmail} actualizado a ADMIN`);
  } else {
    console.log(`Usuario ${adminEmail} no encontrado. Regístrate primero en Clerk.`);
  }
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**
```bash
npx tsx prisma/seed.ts
# o agregarlo como script en package.json
npm run seed:admin
```

### Opción 3: Interfaz de Administración (Futuro)

En el futuro, se podría implementar:
- Un endpoint especial de setup inicial que permita crear el primer admin
- Una interfaz en `/setup` protegida con un secret token
- Un comando CLI: `npm run create-admin email@example.com`

## Cómo acceder al Panel de Administración

Una vez que tienes un usuario con `role=ADMIN`:

1. **Inicia sesión** con tu cuenta de administrador

2. **Accede a la gestión de contratistas**:
   - URL directa: `http://localhost:3000/admin/contractors`
   - O desde el dashboard (si se agrega navegación)

3. **Funcionalidades disponibles**:
   - Ver lista de contratistas (pendientes/verificados)
   - Filtrar por estado
   - Ver detalles completos de cada contratista
   - Aprobar perfiles (botón "Aprobar Perfil")
   - Revocar verificaciones (botón "Revocar Verificación")

## Verificación de Acceso

Para verificar que tienes acceso admin:

1. Abre la consola del navegador
2. Ve a Network tab
3. Haz clic en "Aprobar Perfil" en cualquier contratista
4. Si ves `403 Forbidden`, no tienes rol ADMIN
5. Si ves `200 OK`, el perfil fue aprobado exitosamente

## Flujo Completo de Aprobación

### Como Admin:

1. **Accede a** `/admin/contractors`
2. **Filtra por** "Pendientes" para ver solo los que necesitan revisión
3. **Haz clic** en un perfil para ver detalles
4. **Revisa**:
   - Nombre del negocio
   - Descripción
   - Especialidades
   - Fechas de creación
5. **Aprueba** haciendo clic en "Aprobar Perfil"
6. El badge cambia de "⏱ Pendiente" a "✓ Verificado"

### Como Contratista:

1. **Registrarse** y completar onboarding
2. **Ver estado** en `/contractors/profile`: "⏱ En Revisión"
3. **Esperar** aprobación del admin (el contratista NO puede editar mientras espera)
4. **Una vez aprobado**: El perfil queda en modo solo lectura
5. **Puede publicar servicios** (módulo futuro)

## Seguridad

- ✅ Solo usuarios con `role=ADMIN` pueden aprobar perfiles
- ✅ Los contratistas no pueden auto-aprobar sus perfiles
- ✅ Los endpoints verifican el rol en cada request
- ✅ El middleware `requireRole('ADMIN')` protege las rutas

## Solución de Problemas

### "403 Forbidden al aprobar perfil"

**Causa**: Tu usuario no tiene rol ADMIN

**Solución**:
1. Verifica tu rol con:
   ```sql
   SELECT email, role FROM "User" WHERE email = 'tu-email@ejemplo.com';
   ```
2. Si no es ADMIN, actualízalo manualmente (ver Opción 1 arriba)
3. Cierra sesión y vuelve a iniciar

### "No puedo acceder a /admin/contractors"

**Causa**: La ruta puede estar protegida

**Solución**:
- Por ahora, la ruta es pública (cualquiera puede ver)
- La protección real está en los endpoints de API
- En el futuro, se puede agregar middleware de protección de ruta

## Próximos Pasos

### Mejoras Recomendadas:

1. **Notificaciones**:
   - Enviar email al contratista cuando su perfil sea aprobado
   - Usar AWS SES o servicio similar

2. **Protección de Rutas**:
   - Agregar middleware en `/admin/*` para redirigir si no es admin
   - Mostrar 404 en lugar de 403 para usuarios no autorizados

3. **Auditoría**:
   - Log de quién aprobó cada perfil y cuándo
   - Tabla `admin_actions` para trazabilidad

4. **Dashboard Admin**:
   - Stats: total pendientes, aprobados hoy, tiempo promedio de aprobación
   - Búsqueda y filtros avanzados

## Contacto

Para más información o problemas de acceso, consulta la documentación del proyecto en `/openspec/project.md`.
