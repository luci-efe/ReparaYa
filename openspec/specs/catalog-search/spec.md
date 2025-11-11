# Especificación: Búsqueda y Catálogo de Servicios

## Propósito y alcance

Implementa la búsqueda de servicios por ubicación, categoría y otros filtros,
con requisitos estrictos de performance (P95 ≤ 1.2s).

## Requisitos relacionados

- **RF-001**: Búsqueda y listado de servicios
- **RF-002**: Detalle del servicio
- **RNF-3.5.1**: Performance (búsqueda P95 ≤ 1.2s)

## Interfaces y contratos

### Endpoints

**GET `/api/services/search`**

Query params:
- `location` (string): Dirección o coordenadas
- `category_id` (string, opcional): ID de categoría
- `radius` (number, opcional): Radio en km (default: 10)
- `page` (number, default: 1)
- `limit` (number, default: 20)

Respuesta:
```json
{
  "results": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "base_price": 1000,
      "contractor": {
        "id": "...",
        "name": "...",
        "avatar_url": "..."
      },
      "rating": 4.5,
      "distance_km": 2.3,
      "thumbnail_url": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**GET `/api/services/:id`**

Respuesta: Detalle completo del servicio con disponibilidad y galería de imágenes.

## Modelo de datos

### Entidad: Service

```typescript
{
  id: string
  contractor_id: string (FK User)
  category_id: string (FK Category)
  title: string
  description: string
  base_price: number
  location_lat: number
  location_lng: number
  location_address: string
  coverage_radius_km: number
  images: string[] // S3 URLs
  status: 'active' | 'inactive' | 'under_review'
  created_at: timestamp
  updated_at: timestamp
}
```

### Índices requeridos

- `(location_lat, location_lng)` con GiST para búsquedas geoespaciales
- `(category_id, status)`
- `(contractor_id)`

## Integraciones externas

- **Amazon Location Service**: Geocodificación y cálculo de distancias
- **AWS S3 + CloudFront**: Imágenes optimizadas y CDN

## Consideraciones de seguridad

- Validar parámetros de búsqueda (prevenir SQL injection)
- Rate limiting en búsqueda (evitar abuse)
- No exponer ubicación exacta de contratista (solo aproximada)

## Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Lógica de geocodificación
   - Cálculo de distancias

2. **Integración**:
   - Búsqueda con dataset de 300+ servicios
   - Validar P95 ≤ 1.2s (k6)

3. **E2E**:
   - Flujo: buscar → filtrar → ver detalle

### Casos de prueba relacionados

- `TC-RF-001-01`: Búsqueda por ubicación
- `TC-RF-001-02`: Filtrado por categoría
- `TC-RF-001-03`: Performance P95 ≤ 1.2s
- `TC-RF-002-01`: Visualización de detalle

## TODOs

- [ ] Definir esquema Prisma (Service, Category)
- [ ] Implementar geocodificación con Amazon Location
- [ ] Búsqueda geoespacial con PostGIS o similar
- [ ] Optimizar queries (índices, caching)
- [ ] Tests de performance con k6
