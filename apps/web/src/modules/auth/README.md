# Módulo de Autenticación (Auth)

## Propósito

Este módulo gestiona la autenticación de usuarios usando Clerk como proveedor de identidad.
Sincroniza usuarios de Clerk con la base de datos local para mantener roles y datos adicionales.

## Responsabilidades

- Integración con Clerk SDK para Next.js
- Webhooks de Clerk para sincronización de usuarios
- Middleware de autenticación y autorización
- Gestión de sesiones

## Estructura (a implementar)

```
auth/
├── services/
│   ├── clerkWebhookService.ts    # Procesar webhooks de Clerk
│   └── authorizationService.ts   # Verificar roles y permisos
├── middleware/
│   └── requireAuth.ts            # Middleware de protección de rutas
├── types/
│   └── index.ts                  # Tipos relacionados con auth
└── utils/
    └── roleHelpers.ts            # Utilidades para roles
```

## TODOs

- [ ] Configurar Clerk Provider en layout
- [ ] Implementar webhook handler para user.created/user.updated/user.deleted
- [ ] Crear middleware para proteger rutas por rol
- [ ] Implementar helpers para verificar permisos
- [ ] Escribir tests unitarios y de integración

## Referencias

- **RF-003**: Registro e inicio de sesión
- **RNF-Seguridad**: Autenticación robusta
- Ver `/openspec/specs/auth/spec.md` para especificación completa
