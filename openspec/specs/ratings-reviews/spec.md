# Especificación: Calificaciones y Reseñas

## Propósito y alcance

Sistema de calificaciones (1-5 estrellas) y comentarios opcionales para servicios completados,
con moderación básica.

## Requisitos relacionados

- **RF-009**: Calificaciones

## Interfaces y contratos

### Endpoints

**POST `/api/bookings/:bookingId/rating`**

Body:
```json
{
  "stars": 5,
  "comment": "Excelente servicio, muy profesional"
}
```

Validaciones:
- Reserva debe estar en estado COMPLETADA
- Solo el cliente puede calificar
- Una calificación por reserva
- Stars: 1-5 (entero)
- Comment: máx. 500 caracteres

Acción:
- Crear calificación
- Recalcular promedio del servicio (cache)

**GET `/api/services/:serviceId/ratings`**

Query params:
- `page`, `limit`

Respuesta:
```json
{
  "average": 4.5,
  "total": 42,
  "ratings": [
    {
      "id": "...",
      "stars": 5,
      "comment": "...",
      "client_name": "Juan P.",
      "created_at": "..."
    }
  ]
}
```

## Modelo de datos

### Entidad: Rating

```typescript
{
  id: string
  booking_id: string (FK Booking, unique)
  service_id: string (FK Service)
  client_id: string (FK User)
  stars: number (1-5)
  comment?: string
  moderation_status: 'pending' | 'approved' | 'rejected'
  moderation_notes?: string
  created_at: timestamp
  updated_at: timestamp
}
```

### Cache de promedio

- Tabla `service_rating_stats`:
  ```typescript
  {
    service_id: string (PK)
    average: number
    total_ratings: number
    updated_at: timestamp
  }
  ```

## Integraciones externas

- Ninguna (módulo interno)

## Consideraciones de seguridad

- Validar que booking pertenece al cliente
- Sanitización de comentarios (anti-XSS)
- Moderación de comentarios inapropiados

## Testing & QA

### Casos de prueba relacionados

- `TC-RF-009-01`: Creación de calificación válida
- `TC-RF-009-02`: Rechazo de calificación duplicada
- `TC-RF-009-03`: Cálculo correcto de promedio

## TODOs

- [ ] Definir esquemas Prisma (Rating, ServiceRatingStats)
- [ ] Implementar endpoints
- [ ] Validación de unicidad (una calificación por booking)
- [ ] Cálculo y cache de promedio
- [ ] Sistema de moderación básico
- [ ] Tests
