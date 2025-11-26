# Especificación: Calificaciones y Reseñas

## Purpose

Sistema de calificaciones (1-5 estrellas) y comentarios opcionales para servicios completados,
con moderación básica.

## Requisitos relacionados
## Requirements
### Requirement: RF-009 - Calificaciones

The system SHALL allow users to rate services.

#### Scenario: Basic Rating
- **WHEN** user rates
- **THEN** rating is saved

### Requirement: RF-009-API - Endpoints de Calificaciones

The system SHALL expose REST endpoints for rating management. There SHALL be separate endpoints for clients to rate contractors and vice versa. The system SHALL validate authorization on each endpoint and SHALL return appropriate errors for unauthorized requests.

#### Scenario: POST /api/bookings/[id]/ratings/client - Cliente califica

```gherkin
Given usuario autenticado como CLIENT
And bookingId valido con estado COMPLETED
And clientId del booking coincide con usuario autenticado
When POST /api/bookings/{id}/ratings/client
  {
    "stars": 5,
    "comment": "Excelente servicio"
  }
Then response status = 201
And response body contiene el rating creado
And contractor stats actualizadas
And service stats actualizadas
```

#### Scenario: POST /api/bookings/[id]/ratings/contractor - Contratista califica

```gherkin
Given usuario autenticado como CONTRACTOR
And bookingId valido con estado COMPLETED
And contractorId del booking coincide con usuario autenticado
When POST /api/bookings/{id}/ratings/contractor
  {
    "stars": 4,
    "comment": "Buen cliente, puntual"
  }
Then response status = 201
And response body contiene el rating creado
And client stats actualizadas
```

#### Scenario: GET /api/bookings/[id]/ratings - Obtener calificaciones de reserva

```gherkin
Given usuario autenticado (CLIENT o CONTRACTOR de la reserva)
When GET /api/bookings/{id}/ratings
Then response incluye:
  {
    "clientRating": { ... } | null | { hidden: true },
    "contractorRating": { ... } | null | { hidden: true },
    "canReveal": boolean,
    "revealDeadline": "2025-12-02T10:00:00Z"
  }
```

#### Scenario: GET /api/users/[id]/rating-stats - Estadisticas publicas

```gherkin
Given cualquier usuario (autenticado o no)
When GET /api/users/{id}/rating-stats
Then response:
  {
    "average": 4.75,
    "totalRatings": 12,
    "distribution": {
      "5": 8, "4": 3, "3": 1, "2": 0, "1": 0
    }
  }
```

#### Scenario: GET /api/services/[id]/ratings - Calificaciones de servicio

```gherkin
Given cualquier usuario
When GET /api/services/{id}/ratings?page=1&limit=10
Then response:
  {
    "average": 4.5,
    "totalRatings": 42,
    "ratings": [
      {
        "id": "...",
        "stars": 5,
        "comment": "Excelente",
        "clientName": "Juan P.",
        "createdAt": "2025-11-20T..."
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 42 }
  }
```

### Requirement: RF-009-VALIDATION - Validaciones de Calificaciones

The system SHALL validate all rating inputs. Stars SHALL be an integer between 1 and 5. Comments SHALL have a maximum of 500 characters. The system SHALL reject ratings for bookings that are not in COMPLETED status. The system SHALL reject ratings from users who are not part of the booking.

#### Scenario: Stars fuera de rango rechazado

```gherkin
Given payload con stars = 0 o stars = 6
When se intenta crear calificacion
Then response status = 400
And error message indica "Stars debe ser entre 1 y 5"
```

#### Scenario: Comentario excede limite rechazado

```gherkin
Given payload con comment de 501+ caracteres
When se intenta crear calificacion
Then response status = 400
And error message indica "Comentario excede 500 caracteres"
```

#### Scenario: Booking no completado rechazado

```gherkin
Given booking con status != COMPLETED
When se intenta crear calificacion
Then response status = 400
And error message indica "Solo puedes calificar reservas completadas"
```

#### Scenario: Usuario no autorizado rechazado

```gherkin
Given booking donde clientId != usuario autenticado
When cliente intenta calificar
Then response status = 403
And error message indica "No tienes permiso para calificar esta reserva"
```

### Requirement: RF-009-UI - Componentes de UI para Calificaciones

The system SHALL provide user interface components for rating management. Dashboards SHALL display the user's actual average rating. The system SHALL show a prompt to rate on completed bookings that haven't been rated. The rating modal SHALL allow selecting stars and adding an optional comment.

#### Scenario: Metrica de calificacion en dashboard cliente

```gherkin
Given cliente autenticado con calificacion promedio 4.5 de 8 calificaciones
When accede a /clients/dashboard
Then la tarjeta "Calif. Promedio" muestra "4.5"
And subtexto indica "(8 calificaciones)"
```

#### Scenario: Metrica de calificacion en dashboard contratista

```gherkin
Given contratista con calificacion promedio 4.8 de 25 calificaciones
When accede a /contractors/dashboard
Then la tarjeta "Calificacion Promedio" muestra "4.8"
And subtexto indica "(25 calificaciones)"
And color es amarillo (como en el diseno actual)
```

#### Scenario: Prompt de calificacion en reserva completada

```gherkin
Given reserva en estado COMPLETED
And usuario no ha calificado aun
When accede a detalle de reserva
Then ve banner "Califica tu experiencia"
And boton "Calificar" abre modal de calificacion
```

#### Scenario: Modal de calificacion

```gherkin
Given modal de calificacion abierto
Then muestra 5 estrellas seleccionables
And textarea opcional para comentario (max 500 chars)
And contador de caracteres
And boton "Enviar Calificacion" deshabilitado hasta seleccionar estrellas
```

#### Scenario: Estado de calificaciones en lista de reservas

```gherkin
Given lista de reservas completadas
Then cada reserva muestra estado de calificacion:
  - "Pendiente de calificar" si usuario no ha calificado
  - "Esperando calificacion del otro" si solo usuario califico
  - Estrellas visibles si ambos calificaron o plazo expiro
```

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
