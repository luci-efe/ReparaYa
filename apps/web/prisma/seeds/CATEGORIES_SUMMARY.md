# Service Categories - Complete List

**Total**: 12 main categories + 52 subcategories = **64 categories**

## Complete Catalog

### 1. Plomería (5 subcategories)
- ✓ Instalación
- ✓ Reparación
- ✓ Mantenimiento
- ✓ Desazolve
- ✓ Calentadores

### 2. Electricidad (5 subcategories)
- ✓ Instalación Eléctrica
- ✓ Reparación
- ✓ Iluminación
- ✓ Mantenimiento
- ✓ Emergencias

### 3. Carpintería (4 subcategories)
- ✓ Muebles a Medida
- ✓ Puertas y Ventanas
- ✓ Reparación
- ✓ Pisos de Madera

### 4. Limpieza (5 subcategories)
- ✓ Limpieza Residencial
- ✓ Limpieza Profunda
- ✓ Limpieza de Oficinas
- ✓ Limpieza Post-Obra
- ✓ Limpieza de Alfombras

### 5. Pintura (4 subcategories)
- ✓ Pintura Interior
- ✓ Pintura Exterior
- ✓ Acabados Especiales
- ✓ Impermeabilización

### 6. Jardinería (4 subcategories)
- ✓ Mantenimiento
- ✓ Diseño de Jardines
- ✓ Poda y Tala
- ✓ Sistemas de Riego

### 7. Albañilería (5 subcategories)
- ✓ Construcción
- ✓ Remodelación
- ✓ Pisos y Azulejos
- ✓ Reparaciones
- ✓ Cancelería

### 8. Cerrajería (4 subcategories)
- ✓ Instalación
- ✓ Apertura de Puertas
- ✓ Reparación
- ✓ Duplicado de Llaves

### 9. Climatización (4 subcategories)
- ✓ Instalación de A/C
- ✓ Mantenimiento
- ✓ Recarga de Gas
- ✓ Reparación

### 10. Mudanzas (4 subcategories)
- ✓ Mudanza Local
- ✓ Mudanza Foránea
- ✓ Empaque
- ✓ Mudanza de Oficinas

### 11. Herrería (4 subcategories)
- ✓ Protecciones
- ✓ Portones
- ✓ Escaleras
- ✓ Reparación

### 12. Techado (4 subcategories)
- ✓ Instalación
- ✓ Reparación
- ✓ Impermeabilización
- ✓ Canaletas

---

## Slug Examples

| Category | Slug | Type |
|----------|------|------|
| Plomería | `plomeria` | Main |
| Plomería → Instalación | `plomeria-instalacion` | Sub |
| Electricidad | `electricidad` | Main |
| Electricidad → Iluminación | `electricidad-iluminacion` | Sub |
| Carpintería | `carpinteria` | Main |
| Carpintería → Muebles a Medida | `carpinteria-muebles-a-medida` | Sub |
| Limpieza | `limpieza` | Main |
| Limpieza → Limpieza de Oficinas | `limpieza-limpieza-de-oficinas` | Sub |

---

## Database Structure

```
Category
├── id: UUID (PK)
├── name: String (Spanish with accents)
├── slug: String (UNIQUE, URL-safe)
├── description: String
├── iconUrl: String? (optional)
├── parentId: UUID? (FK to Category.id)
├── createdAt: DateTime
└── updatedAt: DateTime
```

### Relationships
- **Self-referential**: Category can have parent (1:N)
- **Services**: Category hasMany Service (1:N)

---

## Market Coverage

This catalog covers the most common home services in Mexico:

- **Essential Home Maintenance**: Plomería, Electricidad, Albañilería
- **Aesthetic & Comfort**: Pintura, Carpintería, Limpieza
- **Outdoor & Garden**: Jardinería, Techado
- **Specialty Services**: Cerrajería, Climatización, Herrería
- **Moving & Logistics**: Mudanzas

---

## Usage in API

### Get all main categories
```typescript
const categories = await prisma.category.findMany({
  where: { parentId: null },
  include: { children: true }
});
```

### Get category with subcategories
```typescript
const category = await prisma.category.findUnique({
  where: { slug: 'plomeria' },
  include: { children: true }
});
```

### Get services by category
```typescript
const services = await prisma.service.findMany({
  where: {
    category: { slug: 'electricidad' },
    status: 'ACTIVE'
  },
  include: { category: true }
});
```

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
