# Módulo de Calificaciones (Ratings)

## Propósito

Sistema de calificaciones y comentarios de clientes hacia servicios completados.
Incluye moderación básica de comentarios.

## Responsabilidades

- Creación de calificaciones (1-5 estrellas) post-completado
- Comentarios opcionales con moderación
- Cálculo de promedios por servicio
- Moderación de contenido inapropiado

## Estructura (a implementar)

```
ratings/
├── services/
│   ├── ratingService.ts         # Lógica de calificaciones
│   └── moderationService.ts     # Moderación de comentarios
├── repositories/
│   └── ratingRepository.ts      # Acceso a datos
├── types/
│   └── index.ts
└── validators/
    └── ratingSchemas.ts
```

## TODOs

- [ ] Definir esquema Prisma para Rating (FK a Booking)
- [ ] Implementar creación de calificación (solo en COMPLETADA)
- [ ] Validación: una calificación por reserva
- [ ] Cálculo y cache de promedio por servicio
- [ ] Sistema de moderación básico (flags de admin)
- [ ] Tests de validaciones

## Referencias

- **RF-009**: Calificaciones
- Ver `/openspec/specs/ratings-reviews/spec.md`
