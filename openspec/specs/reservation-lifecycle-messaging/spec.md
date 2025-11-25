# Especificación: Mensajería en Ciclo de Vida de Reservas

## Propósito y alcance

Sistema de mensajería contextual entre cliente y contratista dentro de una reserva.
MVP con polling, diseñado para evolucionar a real-time (SSE/WebSockets).

## Requisitos relacionados

- **RF-008**: Mensajería
- **RNF-3.5.1**: Performance (enviar/recibir P95 ≤ 0.6s)
- **RNF-3.5.3**: Seguridad (sanitización anti-XSS)

## Interfaces y contratos

### Endpoints

**POST `/api/bookings/:bookingId/messages`**

Body:
```json
{
  "text": "..."
}
```

Validaciones:
- Usuario debe ser cliente o contratista de la reserva
- Sanitización de contenido (strip HTML, escapar caracteres especiales)
- Longitud máxima: 2000 caracteres

Acción:
- Guardar mensaje
- (Opcional) Enviar notificación por email al destinatario

**GET `/api/bookings/:bookingId/messages`**

Query params:
- `since` (timestamp, opcional): Obtener mensajes desde timestamp (para polling)

Respuesta:
```json
{
  "messages": [
    {
      "id": "...",
      "sender_id": "...",
      "sender_name": "...",
      "text": "...",
      "created_at": "2025-11-10T10:30:00Z"
    }
  ]
}
```

## Modelo de datos

### Entidad: Message

```typescript
{
  id: string
  booking_id: string (FK Booking)
  sender_id: string (FK User)
  text: string
  created_at: timestamp
}
```

### Retención

- Mensajes se retienen mínimo 7 días después del cierre de la reserva
- Proceso batch diario para eliminar mensajes expirados

## Integraciones externas

- **AWS SES**: Notificaciones por email de nuevos mensajes

## Consideraciones de seguridad

- Sanitización de contenido (prevenir XSS)
- Rate limiting por usuario (máx. 10 mensajes/minuto)
- Solo participantes de la reserva pueden ver/enviar mensajes

## Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Sanitización de contenido
   - Validaciones de longitud

2. **Integración**:
   - Envío y recepción de mensajes
   - Notificaciones por email

3. **E2E**:
   - Flujo de chat completo en una reserva

### Casos de prueba relacionados

- `TC-RF-008-01`: Envío de mensaje exitoso
- `TC-RF-008-02`: Sanitización anti-XSS
- `TC-RF-008-03`: Retención de mensajes

## TODOs

- [ ] Definir esquema Prisma (Message)
- [ ] Implementar endpoints de mensajería
- [ ] Sanitización de contenido
- [ ] Integración SES para notificaciones
- [ ] Sistema de retención (job cron)
- [ ] Preparar para evolución a SSE/WebSocket
- [ ] Tests de sanitización
## Requirements
### Requirement: Real-Time Message Delivery
The system SHALL deliver messages in real-time using Supabase Realtime WebSocket subscriptions.

**Previous:** MVP with HTTP polling
**Updated:** Supabase Realtime with PostgreSQL LISTEN/NOTIFY

#### Scenario: Message delivered in real-time
**Given** a client and contractor are viewing the same booking chat
**When** one party sends a message
**Then** the message appears on both screens within 500ms

#### Scenario: Subscription setup on chat load
**Given** a user navigates to a booking chat
**When** the chat component mounts
**Then** a Supabase Realtime subscription is established for that booking's messages

#### Scenario: Subscription cleanup
**Given** a user is viewing a booking chat
**When** they navigate away
**Then** the Supabase Realtime subscription is cleaned up

### Requirement: Messaging Time Window
The system SHALL restrict messaging to confirmed bookings and MUST close the messaging window 2 hours after booking completion.

#### Scenario: Messaging available for confirmed booking
**Given** a booking with status CONFIRMED
**When** a participant tries to send a message
**Then** the message is sent successfully

#### Scenario: Messaging available during service
**Given** a booking with status ON_ROUTE, ON_SITE, or IN_PROGRESS
**When** a participant tries to send a message
**Then** the message is sent successfully

#### Scenario: Messaging available within 2 hours of completion
**Given** a booking with status COMPLETED
**And** less than 2 hours have passed since completion
**When** a participant tries to send a message
**Then** the message is sent successfully

#### Scenario: Messaging blocked after 2 hour window
**Given** a booking with status COMPLETED
**And** more than 2 hours have passed since completion
**When** a participant tries to send a message
**Then** the request is rejected with 403 and message "Messaging window expired"

### Requirement: Conversation List
The system SHALL display a list of conversations for users. Users MUST be able to view all their active conversations grouped by booking.

#### Scenario: Client views conversation list
**Given** a logged-in client with bookings that have messages
**When** they navigate to /clients/messages
**Then** they see a list of conversations with:
  - Contractor name and avatar
  - Service name
  - Last message preview (truncated to 50 chars)
  - Time since last message
  - Unread indicator if new messages

#### Scenario: Contractor views conversation list
**Given** a logged-in contractor with bookings that have messages
**When** they navigate to /contractors/messages
**Then** they see a list of conversations with:
  - Client name and avatar
  - Service name
  - Last message preview (truncated to 50 chars)
  - Time since last message
  - Unread indicator if new messages

### Requirement: Dashboard Unread Count
The dashboard SHALL display unread message count. Users MUST see their current unread message count for quick visibility.

#### Scenario: Dashboard displays unread count
**Given** a user with 3 unread messages
**When** they view the dashboard
**Then** the unread message counter shows "3"

### Requirement: Chat Integration in Booking Detail
Chat SHALL be accessible directly from booking detail pages. Users MUST be able to view and send messages from the booking context.

#### Scenario: Access chat from booking detail
**Given** a user viewing a booking detail page
**When** they click the "Messages" tab
**Then** the chat interface is displayed with history

### Requirement: Message Pagination
Messages SHALL be loaded with cursor-based pagination. The system MUST support efficient loading of large conversation histories.

#### Scenario: Load initial messages
**Given** a chat with 100 messages
**When** the chat loads
**Then** the most recent 50 messages are displayed

#### Scenario: Load more messages
**Given** a chat with loaded messages
**When** the user scrolls to the top
**Then** the next batch of 50 messages is loaded

### Requirement: Optimistic UI Updates
The UI SHALL implement optimistic updates for message sending. Messages MUST appear instantly in the sender's UI before server confirmation.

#### Scenario: Instant message display
**Given** a user sends a message
**When** they press enter
**Then** the message appears immediately in the list with a "sending" state

