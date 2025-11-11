# Módulo de Servicios (Services)

## Propósito

Gestiona el catálogo de servicios publicados por contratistas.
Incluye búsqueda, filtrado, disponibilidad y gestión de medios (imágenes).

## Responsabilidades

- CRUD de servicios (solo contratistas)
- Búsqueda y filtrado por ubicación/categoría
- Gestión de disponibilidad (slots de tiempo)
- Upload y gestión de imágenes (integración S3)
- Cálculo de distancias (integración Amazon Location)

## Estructura (a implementar)

```
services/
├── services/
│   ├── serviceService.ts        # Lógica de negocio de servicios
│   ├── searchService.ts         # Búsqueda y filtrado
│   ├── availabilityService.ts   # Gestión de disponibilidad
│   └── mediaService.ts          # Upload de imágenes a S3
├── repositories/
│   └── serviceRepository.ts     # Acceso a datos
├── adapters/
│   ├── s3Adapter.ts            # Cliente S3
│   └── locationAdapter.ts      # Cliente Amazon Location
├── types/
│   └── index.ts
└── validators/
    └── serviceSchemas.ts
```

## TODOs

- [ ] Definir esquemas Prisma (Service, Availability, Category)
- [ ] Implementar búsqueda con índices geográficos
- [ ] Integrar S3 para almacenamiento de imágenes
- [ ] Implementar geocodificación con Amazon Location
- [ ] Sistema de disponibilidad con bloques de tiempo
- [ ] Tests de búsqueda y performance

## Referencias

- **RF-001**: Búsqueda y listado
- **RF-002**: Detalle del servicio
- **RF-004**: Publicación y disponibilidad
- **RNF-3.5.1**: Requisitos de performance para búsqueda
- Ver `/openspec/specs/catalog-search/spec.md` y `/openspec/specs/services-publishing/spec.md`
