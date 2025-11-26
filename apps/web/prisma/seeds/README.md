# ReparaYa Seed Scripts

Este directorio contiene scripts modulares para poblar la base de datos con datos de prueba y desarrollo.

## Estructura

```
seeds/
├── README.md                    # Esta documentación
└── serviceCategories.ts         # Categorías de servicios (12 principales + 50 subcategorías)
```

## Service Categories Seed

### Descripción

El script `serviceCategories.ts` crea un catálogo completo de categorías de servicios para el mercado mexicano de reparaciones del hogar.

### Características

- **Idempotente**: Usa `upsert` para actualizar categorías existentes sin duplicar
- **Jerárquico**: Soporta categorías principales y subcategorías
- **Slug automático**: Genera slugs URL-friendly eliminando acentos y caracteres especiales
- **Completo**: 12 categorías principales con 3-5 subcategorías cada una

### Categorías Incluidas

1. **Plomería** (5 subcategorías)
   - Instalación, Reparación, Mantenimiento, Desazolve, Calentadores

2. **Electricidad** (5 subcategorías)
   - Instalación Eléctrica, Reparación, Iluminación, Mantenimiento, Emergencias

3. **Carpintería** (4 subcategorías)
   - Muebles a Medida, Puertas y Ventanas, Reparación, Pisos de Madera

4. **Limpieza** (5 subcategorías)
   - Limpieza Residencial, Limpieza Profunda, Limpieza de Oficinas, Limpieza Post-Obra, Limpieza de Alfombras

5. **Pintura** (4 subcategorías)
   - Pintura Interior, Pintura Exterior, Acabados Especiales, Impermeabilización

6. **Jardinería** (4 subcategorías)
   - Mantenimiento, Diseño de Jardines, Poda y Tala, Sistemas de Riego

7. **Albañilería** (5 subcategorías)
   - Construcción, Remodelación, Pisos y Azulejos, Reparaciones, Cancelería

8. **Cerrajería** (4 subcategorías)
   - Instalación, Apertura de Puertas, Reparación, Duplicado de Llaves

9. **Climatización** (4 subcategorías)
   - Instalación de A/C, Mantenimiento, Recarga de Gas, Reparación

10. **Mudanzas** (4 subcategorías)
    - Mudanza Local, Mudanza Foránea, Empaque, Mudanza de Oficinas

11. **Herrería** (4 subcategorías)
    - Protecciones, Portones, Escaleras, Reparación

12. **Techado** (4 subcategorías)
    - Instalación, Reparación, Impermeabilización, Canaletas

**Total**: 12 categorías principales + 52 subcategorías = **64 categorías**

### Uso

#### Desde el seed principal

```bash
SEED_ALLOW_DATA_WIPE=true npm run prisma:seed
```

El script principal (`prisma/seed.ts`) ya importa y ejecuta `seedServiceCategories()` automáticamente.

#### Standalone

```bash
cd apps/web
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seeds/serviceCategories.ts
```

### Integración con el Seed Principal

El archivo `prisma/seed.ts` ya está configurado para usar este módulo:

```typescript
import { seedServiceCategories } from './seeds/serviceCategories';

// En la función main()
const categoryStats = await seedServiceCategories(prisma);
console.log(`   - Main categories: ${categoryStats.mainCategories}`);
console.log(`   - Subcategories: ${categoryStats.subcategories}`);
console.log(`   - Total categories: ${categoryStats.total}`);
```

### Estructura de Datos

Cada categoría se crea con:
- `name`: Nombre en español con acentos
- `slug`: Versión normalizada para URLs (sin acentos, minúsculas, con guiones)
- `description`: Descripción detallada del servicio
- `iconUrl`: (opcional) URL del icono
- `parentId`: (subcategorías) ID de la categoría padre

#### Ejemplos de Slugs Generados

| Nombre Original | Slug Generado |
|----------------|---------------|
| Plomería | `plomeria` |
| Electricidad | `electricidad` |
| Carpintería | `carpinteria` |
| Limpieza de Oficinas | `limpieza-limpieza-de-oficinas` |
| Instalación Eléctrica | `electricidad-instalacion-electrica` |

### Función slugify()

La función `slugify()` normaliza nombres a slugs URL-safe:

```typescript
slugify('Plomería') // → 'plomeria'
slugify('Instalación Eléctrica') // → 'instalacion-electrica'
slugify('A/C Mantenimiento') // → 'ac-mantenimiento'
```

**Proceso:**
1. Convierte a minúsculas
2. Normaliza y elimina acentos (NFD decomposition)
3. Elimina caracteres especiales
4. Reemplaza espacios con guiones
5. Elimina guiones duplicados

### Testing

Para verificar que las categorías se crearon correctamente:

```bash
# Abrir Prisma Studio
npm run prisma:studio

# O consultar con psql
psql $DATABASE_URL -c "SELECT name, slug, \"parentId\" FROM \"Category\" ORDER BY \"parentId\" NULLS FIRST, name;"
```

### Mantenimiento

#### Agregar una Nueva Categoría

Edita el array `CATEGORIES` en `serviceCategories.ts`:

```typescript
{
  name: 'Nueva Categoría',
  description: 'Descripción completa del servicio',
  subcategories: [
    {
      name: 'Subcategoría 1',
      description: 'Descripción de la subcategoría',
    },
    // ... más subcategorías
  ],
}
```

Luego ejecuta el seed nuevamente. El script actualizará las existentes y creará las nuevas.

#### Modificar una Categoría Existente

Simplemente modifica los datos en el array `CATEGORIES` y ejecuta el seed. El `upsert` actualizará la categoría existente.

#### Eliminar una Categoría

**ADVERTENCIA**: La eliminación debe hacerse con cuidado, ya que las categorías pueden estar relacionadas con servicios.

```sql
-- Verificar si tiene servicios asociados
SELECT COUNT(*) FROM "Service" WHERE "categoryId" = 'uuid-de-categoria';

-- Si no tiene servicios, eliminar de forma segura
DELETE FROM "Category" WHERE slug = 'slug-a-eliminar';
```

### Mejores Prácticas

1. **Siempre usa el seed en desarrollo**: Mantiene consistencia entre entornos
2. **No elimines categorías en producción**: Solo marca como inactivas (futuro: campo `status`)
3. **Documenta cambios**: Si agregas categorías, actualiza este README
4. **Mantén las descripciones claras**: Ayudan al SEO y UX del marketplace

### Notas de Producción

- **NO ejecutar** en producción sin antes hacer backup
- En producción, considera crear un endpoint admin para gestionar categorías
- El seed es **idempotente** pero **elimina datos relacionados** cuando se ejecuta `seed.ts` completo
- Para actualizar solo categorías en producción, ejecuta `serviceCategories.ts` standalone

### Troubleshooting

#### Error: "Unique constraint failed on slug"

El slug ya existe. Verifica que no estés creando duplicados:
```sql
SELECT * FROM "Category" WHERE slug = 'tu-slug';
```

#### Error: "Foreign key constraint failed"

Estás intentando eliminar una categoría que tiene servicios asociados. Primero elimina o reasigna los servicios.

#### Las categorías se duplican

Revisa que el `slug` sea único. El script usa `slug` como clave para el upsert.

## Roadmap

Futuros scripts de seed a agregar:

- [ ] `contractors.ts` - Contratistas de ejemplo con perfiles completos
- [ ] `services.ts` - Servicios variados por categoría
- [ ] `bookings.ts` - Historial de reservas de ejemplo
- [ ] `ratings.ts` - Calificaciones y reviews
- [ ] `geoData.ts` - Datos de ubicación para ciudades principales de México
