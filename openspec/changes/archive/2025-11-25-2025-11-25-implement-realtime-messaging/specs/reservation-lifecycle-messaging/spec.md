# Spec Delta: Messaging (reservation-lifecycle-messaging)

This spec delta extends the existing `reservation-lifecycle-messaging` specification.

## ADDED Requirements

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

## MODIFIED Interfaces y contratos

### Endpoints

#### POST /api/bookings/:bookingId/messages

**Request Body:**
```json
{
  "text": "string (1-2000 characters, required)"
}
```

**Success Response (201):**
```json
{
  "id": "string (UUID)",
  "bookingId": "string (UUID)",
  "senderId": "string (UUID)",
  "senderName": "string",
  "senderRole": "CLIENT | CONTRACTOR",
  "text": "string (sanitized)",
  "createdAt": "string (ISO 8601)"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid message (empty or > 2000 chars)
- `403 Forbidden` - Not a booking participant
- `403 Forbidden` - Messaging window expired/not started
- `429 Too Many Requests` - Rate limit exceeded (10 msg/min)

#### GET /api/bookings/:bookingId/messages

**Query Parameters:**
- `cursor` (optional): Message ID for cursor-based pagination
- `limit` (optional, default: 50, max: 100): Number of messages to return

**Success Response (200):**
```json
{
  "messages": [
    {
      "id": "string (UUID)",
      "senderId": "string (UUID)",
      "senderName": "string",
      "senderRole": "CLIENT | CONTRACTOR",
      "text": "string",
      "createdAt": "string (ISO 8601)"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": "boolean",
  "messagingWindow": {
    "status": "OPEN | EXPIRING | EXPIRED | NOT_STARTED",
    "expiresAt": "string (ISO 8601) | null",
    "message": "string"
  }
}
```

#### GET /api/users/me/messages (NEW)

Returns conversation list for the current user.

**Success Response (200):**
```json
{
  "conversations": [
    {
      "bookingId": "string (UUID)",
      "serviceName": "string",
      "serviceDate": "string (ISO 8601)",
      "otherParty": {
        "id": "string (UUID)",
        "name": "string",
        "avatarUrl": "string | null"
      },
      "lastMessage": {
        "text": "string (truncated to 50 chars)",
        "createdAt": "string (ISO 8601)",
        "isOwn": "boolean"
      },
      "unreadCount": "number",
      "messagingWindow": {
        "status": "OPEN | EXPIRING | EXPIRED",
        "expiresAt": "string | null"
      }
    }
  ]
}
```

#### GET /api/users/me/messages/unread-count (NEW)

Returns total unread message count for dashboard.

**Success Response (200):**
```json
{
  "unreadCount": "number"
}
```

## ADDED Integrations

### Supabase Realtime

**Channel Pattern:** `booking:{bookingId}`

**Subscription Event:**
```typescript
{
  event: 'postgres_changes',
  schema: 'public',
  table: 'Message',
  filter: `bookingId=eq.${bookingId}`
}
```

## MODIFIED Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Sanitización de contenido
   - Validaciones de longitud
   - Hooks de mensajería (useBookingMessages, useSendMessage)

2. **Integración**:
   - Envío y recepción de mensajes
   - Notificaciones por email
   - Rate limiting
   - Time windows
   - Authorization rules

3. **E2E**:
   - Flujo de chat completo en una reserva
   - Real-time updates
   - Optimistic UI

### Casos de prueba relacionados

- `TC-RF-008-01`: Envío de mensaje exitoso
- `TC-RF-008-02`: Sanitización anti-XSS
- `TC-RF-008-03`: Retención de mensajes
- `TC-RF-008-04`: Real-time message delivery < 500ms
- `TC-RF-008-05`: Messaging blocked after 2h post-completion
- `TC-RF-008-06`: Conversation list displays correctly
- `TC-RF-008-07`: Unread count accurate on dashboard
- `TC-RF-008-08`: Pagination loads older messages
- `TC-RF-008-09`: Optimistic UI update works
