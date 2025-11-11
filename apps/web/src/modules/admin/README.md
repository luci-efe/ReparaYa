# Módulo de Administración (Admin)

## Propósito

Panel administrativo para moderación de contenido, gestión de usuarios,
resolución de disputas y métricas básicas.

## Responsabilidades

- Moderación de servicios y reseñas
- Gestión de categorías de servicio
- Bloqueo/desbloqueo de usuarios
- Resolución de disputas
- Métricas y dashboard (reservas, conversión, disputas)

## Estructura (a implementar)

```
admin/
├── services/
│   ├── moderationService.ts     # Moderación de contenido
│   ├── categoryService.ts       # Gestión de categorías
│   ├── userManagementService.ts # Bloqueo de usuarios
│   ├── disputeResolutionService.ts # Resolución de disputas
│   └── metricsService.ts        # Métricas y reportes
├── repositories/
│   └── adminRepository.ts       # Acceso a datos admin
├── types/
│   └── index.ts
└── validators/
    └── adminSchemas.ts
```

## TODOs

- [ ] Implementar permisos de admin
- [ ] CRUD de categorías
- [ ] Sistema de moderación de servicios/reseñas
- [ ] Lógica de bloqueo de usuarios
- [ ] Panel de resolución de disputas
- [ ] Métricas básicas (KPIs de negocio)
- [ ] Tests de autorización admin

## Referencias

- **RF-011**: Admin básico
- **BR-005**: Disputas
- Ver `/openspec/specs/admin-moderation/spec.md`
