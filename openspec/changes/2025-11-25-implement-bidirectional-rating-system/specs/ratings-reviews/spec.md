# Spec Delta: Calificaciones y Resenas (Ratings & Reviews)

## MODIFIED Requirements

### Requirement: RF-009-BIDIRECTIONAL - Sistema de Calificaciones Bidireccional

The system SHALL allow mutual ratings between clients and contractors after service completion. Clients SHALL be able to rate contractors and vice versa, with a rating of 1 to 5 stars and an optional comment of up to 500 characters. The system SHALL reject duplicate ratings for the same booking.

#### Scenario: Cliente califica al contratista

```gherkin
Given una reserva en estado COMPLETED
And el usuario autenticado es el cliente de la reserva
And no existe una calificacion previa del cliente para esta reserva
When el cliente envia una calificacion con estrellas (1-5) y comentario opcional
Then se crea un registro ClientRating
And se recalculan las estadisticas del contratista y servicio
And el contratista recibe notificacion de nueva calificacion (contenido oculto)
```

#### Scenario: Contratista califica al cliente

```gherkin
Given una reserva en estado COMPLETED
And el usuario autenticado es el contratista de la reserva
And no existe una calificacion previa del contratista para esta reserva
When el contratista envia una calificacion con estrellas (1-5) y comentario opcional
Then se crea un registro ContractorRating
And se recalculan las estadisticas del cliente
And el cliente recibe notificacion de nueva calificacion (contenido oculto)
```

#### Scenario: Calificacion duplicada rechazada

```gherkin
Given una reserva en estado COMPLETED
And ya existe una calificacion del usuario para esta reserva
When el usuario intenta enviar otra calificacion
Then el sistema rechaza con error 409 Conflict
And el mensaje indica "Ya has calificado esta reserva"
```

### Requirement: RF-009-VISIBILITY - Visibilidad Double-Blind de Calificaciones

The system SHALL implement double-blind visibility for ratings. Ratings SHALL remain hidden until both parties have rated or until the 7-day deadline expires after service completion. The system SHALL show that a rating exists but MUST hide the content (stars and comment) until the reveal conditions are met.

#### Scenario: Calificaciones ocultas hasta ambas partes califiquen

```gherkin
Given una reserva COMPLETED con calificacion solo del cliente
When el contratista consulta las calificaciones de la reserva
Then puede ver que existe una calificacion del cliente
But el contenido (estrellas, comentario) esta oculto
And ve el mensaje "Califica para ver la opinion del cliente"
```

#### Scenario: Calificaciones reveladas cuando ambos califican

```gherkin
Given una reserva COMPLETED
And el cliente ha calificado con 4 estrellas
And el contratista ha calificado con 5 estrellas
When cualquier parte consulta las calificaciones
Then ambas calificaciones son completamente visibles
And incluyen estrellas, comentario y fecha
```

#### Scenario: Calificaciones reveladas por expiracion de plazo

```gherkin
Given una reserva completada hace mas de 7 dias
And solo existe calificacion del cliente
When el contratista consulta las calificaciones
Then la calificacion del cliente es visible
And ve aviso "El plazo para calificar ha expirado"
```

#### Scenario: Conteo de dias desde completacion

```gherkin
Given una reserva con completedAt = "2025-11-18 10:00:00"
And fecha actual = "2025-11-25 09:59:59"
When se calcula si el plazo ha expirado
Then el resultado es false (6 dias, 23 horas)

Given fecha actual = "2025-11-25 10:00:01"
When se calcula si el plazo ha expirado
Then el resultado es true (7 dias cumplidos)
```

### Requirement: RF-009-STATS - Estadisticas Agregadas de Calificaciones

The system SHALL maintain pre-calculated rating statistics for efficient querying. Statistics SHALL include the average and total number of ratings. The system SHALL update statistics when a new rating is created. Only ratings with APPROVED status SHALL count towards the average calculation.

#### Scenario: Calculo de promedio de contratista

```gherkin
Given un contratista con 3 calificaciones aprobadas: 5, 4, 5 estrellas
When se consultan las estadisticas del contratista
Then el promedio es 4.67
And el total de calificaciones es 3
```

#### Scenario: Calculo de promedio de cliente

```gherkin
Given un cliente con 2 calificaciones recibidas: 4, 5 estrellas
When se consultan las estadisticas del cliente
Then el promedio es 4.50
And el total de calificaciones es 2
```

#### Scenario: Solo calificaciones aprobadas cuentan en promedio

```gherkin
Given un contratista con calificaciones:
  | stars | moderationStatus |
  | 5     | APPROVED         |
  | 1     | REJECTED         |
  | 4     | PENDING          |
When se calculan las estadisticas
Then solo cuenta la calificacion APPROVED
And el promedio es 5.00
And el total es 1
```

### Requirement: RF-009-MODERATION - Moderacion de Calificaciones

The system SHALL implement comment moderation for ratings. Ratings without comments SHALL be approved automatically. Ratings with comments SHALL remain in PENDING status until an administrator approves or rejects them. Rejected comments SHALL remain hidden permanently, but stars SHALL continue counting in statistics.

#### Scenario: Calificacion sin comentario aprobada automaticamente

```gherkin
Given una calificacion nueva sin comentario
When se crea la calificacion
Then moderationStatus = APPROVED automaticamente
And las estrellas cuentan en estadisticas inmediatamente
```

#### Scenario: Calificacion con comentario requiere moderacion

```gherkin
Given una calificacion nueva con comentario
When se crea la calificacion
Then moderationStatus = PENDING
And las estrellas cuentan en estadisticas
But el comentario no es visible publicamente hasta APPROVED
```

#### Scenario: Admin aprueba comentario

```gherkin
Given una calificacion con moderationStatus = PENDING
And usuario autenticado con role = ADMIN
When admin aprueba la calificacion
Then moderationStatus = APPROVED
And el comentario es visible publicamente
```

#### Scenario: Admin rechaza comentario

```gherkin
Given una calificacion con moderationStatus = PENDING
And usuario autenticado con role = ADMIN
When admin rechaza la calificacion con notas "Contenido inapropiado"
Then moderationStatus = REJECTED
And moderationNotes = "Contenido inapropiado"
And el comentario permanece oculto
And las estrellas siguen contando en estadisticas
```

## ADDED Requirements

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

## Interfaces y Contratos

### Types

```typescript
// DTOs
interface CreateClientRatingDTO {
  stars: number;      // 1-5
  comment?: string;   // max 500 chars
}

interface CreateContractorRatingDTO {
  stars: number;      // 1-5
  comment?: string;   // max 500 chars
}

interface RatingResponse {
  id: string;
  stars: number;
  comment: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

interface HiddenRatingResponse {
  hidden: true;
  submittedAt: string;
  message: string;
}

interface BookingRatingsResponse {
  clientRating: RatingResponse | HiddenRatingResponse | null;
  contractorRating: RatingResponse | HiddenRatingResponse | null;
  canReveal: boolean;
  revealDeadline: string;
}

interface UserRatingStatsResponse {
  average: number;
  totalRatings: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface ServiceRatingsResponse {
  average: number;
  totalRatings: number;
  ratings: Array<{
    id: string;
    stars: number;
    comment: string | null;
    clientName: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### Zod Schemas

```typescript
import { z } from 'zod';

export const createClientRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const createContractorRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const ratingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
```

## Modelo de Datos

### Entidad: ClientRating

```prisma
model ClientRating {
  id               String           @id @default(uuid())
  bookingId        String           @unique
  serviceId        String
  contractorId     String
  clientId         String
  stars            Int
  comment          String?          @db.VarChar(500)
  moderationStatus ModerationStatus @default(PENDING)
  moderationNotes  String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  booking          Booking          @relation("ClientRatingBooking", fields: [bookingId], references: [id], onDelete: Cascade)
  contractor       User             @relation("ContractorReceivedRatings", fields: [contractorId], references: [id])
  client           User             @relation("ClientGivenRatings", fields: [clientId], references: [id])
  service          Service          @relation(fields: [serviceId], references: [id])

  @@index([contractorId, moderationStatus])
  @@index([serviceId, moderationStatus])
  @@index([moderationStatus])
}
```

### Entidad: ContractorRating

```prisma
model ContractorRating {
  id               String           @id @default(uuid())
  bookingId        String           @unique
  contractorId     String
  clientId         String
  stars            Int
  comment          String?          @db.VarChar(500)
  moderationStatus ModerationStatus @default(PENDING)
  moderationNotes  String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  booking          Booking          @relation("ContractorRatingBooking", fields: [bookingId], references: [id], onDelete: Cascade)
  contractor       User             @relation("ContractorGivenRatings", fields: [contractorId], references: [id])
  client           User             @relation("ClientReceivedRatings", fields: [clientId], references: [id])

  @@index([clientId, moderationStatus])
  @@index([moderationStatus])
}
```

### Entidad: UserRatingStats

```prisma
model UserRatingStats {
  userId       String   @id
  role         UserRole
  average      Decimal  @db.Decimal(3, 2)
  totalRatings Int      @default(0)
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([role])
}
```

### Modificacion: Booking

```prisma
model Booking {
  // ... existing fields ...
  completedAt      DateTime?        // Track when booking was marked COMPLETED

  // Updated relations
  clientRating     ClientRating?    @relation("ClientRatingBooking")
  contractorRating ContractorRating? @relation("ContractorRatingBooking")
}
```

### Modificacion: User

```prisma
model User {
  // ... existing fields ...

  // New rating relations
  givenClientRatings      ClientRating[]     @relation("ClientGivenRatings")
  receivedContractorRatings ClientRating[]   @relation("ContractorReceivedRatings")
  givenContractorRatings  ContractorRating[] @relation("ContractorGivenRatings")
  receivedClientRatings   ContractorRating[] @relation("ClientReceivedRatings")
  ratingStats             UserRatingStats?
}
```

## Consideraciones de Seguridad

- Validar que el usuario es parte de la reserva antes de permitir calificar
- Sanitizar comentarios para prevenir XSS
- Rate limiting en endpoints de calificacion (1 calificacion por booking)
- Los admins son los unicos que pueden modificar moderationStatus
- Los comentarios REJECTED nunca se muestran publicamente

## Testing & QA

Ver archivo `tasks.md` para casos de prueba detallados.

### Casos de prueba relacionados

- `TC-RF-009-01`: Creacion de calificacion de cliente valida
- `TC-RF-009-02`: Creacion de calificacion de contratista valida
- `TC-RF-009-03`: Rechazo de calificacion duplicada
- `TC-RF-009-04`: Visibilidad double-blind antes de revelar
- `TC-RF-009-05`: Revelacion por ambas partes calificando
- `TC-RF-009-06`: Revelacion por expiracion de plazo
- `TC-RF-009-07`: Calculo correcto de promedio
- `TC-RF-009-08`: Moderacion de comentarios
- `TC-RF-009-09`: Dashboard muestra estadisticas reales
- `TC-RF-009-10`: Modal de calificacion funciona correctamente

## Cross-references

- `booking-checkout`: Rating habilitado cuando booking.status = COMPLETED
- `client-dashboard`: Metrica de calificacion promedio
- `contractor-dashboard`: Metrica de calificacion promedio
- `admin-moderation`: Flujo de moderacion de comentarios
