# Librería Compartida (lib)

## Propósito

Utilidades, helpers y configuraciones compartidas entre módulos.

## Estructura (a implementar)

```
lib/
├── config/
│   ├── clerk.ts                # Configuración Clerk
│   ├── stripe.ts               # Configuración Stripe
│   ├── aws.ts                  # Configuración AWS
│   └── database.ts             # Cliente Prisma singleton
├── utils/
│   ├── validation.ts           # Helpers de validación
│   ├── errors.ts               # Clases de error custom
│   ├── logger.ts               # Logger (Pino, Winston, etc.)
│   └── dates.ts                # Helpers de fechas
└── constants/
    ├── roles.ts                # Constantes de roles
    └── states.ts               # Constantes de estados
```

## TODOs

- [ ] Configurar cliente Prisma singleton
- [ ] Configurar clientes AWS (S3, SES, Location)
- [ ] Logger estructurado
- [ ] Helpers de validación comunes
- [ ] Clases de error personalizadas
- [ ] Constantes compartidas
