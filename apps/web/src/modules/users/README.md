# Módulo de Usuarios (Users)

## Propósito

Gestiona los perfiles de usuarios (clientes, contratistas y administradores).
Mantiene información adicional no gestionada por Clerk.

## Responsabilidades

- CRUD de perfiles de usuario
- Gestión de roles (client, contractor, admin)
- Perfiles de contratistas (datos profesionales, verificación)
- Sincronización con Clerk

## Estructura (a implementar)

```
users/
├── services/
│   ├── userService.ts           # Lógica de negocio de usuarios
│   └── contractorService.ts     # Lógica específica de contratistas
├── repositories/
│   └── userRepository.ts        # Acceso a datos vía Prisma
├── types/
│   └── index.ts                 # DTOs y tipos
└── validators/
    └── userSchemas.ts           # Validaciones con Zod
```

## TODOs

- [ ] Definir esquema Prisma para User
- [ ] Implementar servicios CRUD
- [ ] Crear endpoints API para gestión de perfil
- [ ] Implementar lógica de verificación de contratistas (KYC básico)
- [ ] Tests unitarios e integración

## Referencias

- **RF-003**: Registro y gestión de perfiles
- **BR-007**: Verificación KYC
- Ver `/openspec/specs/users/spec.md`
