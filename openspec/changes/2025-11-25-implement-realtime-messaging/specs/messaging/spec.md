# Spec Delta: Messaging (reservation-lifecycle-messaging)

This spec delta extends the existing `reservation-lifecycle-messaging` specification to add Supabase Realtime implementation details, time window restrictions, and refined API contracts.

## MODIFIED Requirements

### Requirement: Real-Time Message Delivery
The system SHALL deliver messages in real-time using Supabase Realtime WebSocket subscriptions.

**Previous:** MVP with HTTP polling, designed for future SSE/WebSockets
**Updated:** Supabase Realtime with PostgreSQL LISTEN/NOTIFY for instant delivery

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

---

### Requirement: Messaging Time Window
The system SHALL restrict messaging to confirmed bookings and MUST close the messaging window 2 hours after booking completion.

**Previous:** Not explicitly defined
**Updated:** Messaging available from CONFIRMED until 2 hours after COMPLETED

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

#### Scenario: Messaging blocked for pending payment
**Given** a booking with status PENDING_PAYMENT
**When** a participant tries to send a message
**Then** the request is rejected with 403 and message "Messaging not available until booking is confirmed"

#### Scenario: Messaging blocked for cancelled booking
**Given** a booking with status CANCELLED
**When** a participant tries to send a message
**Then** the request is rejected with 403 and message "Messaging not available for cancelled bookings"

---

## ADDED Requirements

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

#### Scenario: Empty conversation list
**Given** a user with no bookings or no messages
**When** they navigate to the messages page
**Then** they see an empty state with message "No conversations yet"

---

### Requirement: Dashboard Unread Count
The dashboard SHALL display unread message count. Users MUST see their current unread message count for quick visibility.

#### Scenario: Client dashboard shows unread count
**Given** a client with 3 unread messages across active bookings
**When** they view the client dashboard
**Then** the "Mensajes Sin Leer" metric shows "3"

#### Scenario: Contractor dashboard shows unread count
**Given** a contractor with 5 unread messages across active bookings
**When** they view the contractor dashboard
**Then** the messaging metric shows "5"

#### Scenario: Unread count updates on message read
**Given** a user with unread messages
**When** they open a conversation and view the messages
**Then** the unread count decreases accordingly

---

### Requirement: Chat Integration in Booking Detail
Chat SHALL be accessible directly from booking detail pages. Users MUST be able to view and send messages from the booking context.

#### Scenario: Client accesses chat from booking detail
**Given** a client viewing their booking detail at /clients/bookings/[id]
**And** the booking has messaging available
**When** they click on the chat tab/section
**Then** they see the full conversation with that contractor

#### Scenario: Contractor accesses chat from booking detail
**Given** a contractor viewing a booking detail at /contractors/bookings/[id]
**And** the booking has messaging available
**When** they click on the chat tab/section
**Then** they see the full conversation with that client

#### Scenario: Expired window shown in booking detail
**Given** a user viewing a COMPLETED booking older than 2 hours
**When** they view the chat section
**Then** they see the message history (read-only)
**And** a notice "Messaging window has expired"
**And** the message input is disabled

---

### Requirement: Message Pagination
Messages SHALL be loaded with cursor-based pagination. The system MUST support efficient loading of large conversation histories.

#### Scenario: Initial message load
**Given** a booking with 100 messages
**When** a user opens the chat
**Then** the 50 most recent messages are loaded first

#### Scenario: Load older messages
**Given** a chat with more than 50 messages
**When** the user scrolls up past the oldest loaded message
**Then** the next 50 older messages are loaded

#### Scenario: Pagination with cursor
**Given** API request GET /api/bookings/:id/messages?cursor=msg_50&limit=50
**When** processed by the server
**Then** returns messages older than msg_50, up to 50 messages

---

### Requirement: Optimistic UI Updates
The UI SHALL implement optimistic updates for message sending. Messages MUST appear instantly in the sender's UI before server confirmation.

#### Scenario: Optimistic message display
**Given** a user typing a message
**When** they click send
**Then** the message appears immediately in their message list (with pending indicator)

#### Scenario: Optimistic update confirmed
**Given** a message was sent optimistically
**When** the server confirms the message
**Then** the pending indicator is removed

#### Scenario: Optimistic update failed
**Given** a message was sent optimistically
**When** the server returns an error
**Then** the optimistic message is removed
**And** an error notification is shown

---

## MODIFIED Interfaces

### Endpoint: POST /api/bookings/:bookingId/messages

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

---

### Endpoint: GET /api/bookings/:bookingId/messages

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

---

### Endpoint: GET /api/users/me/messages (NEW)

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

---

### Endpoint: GET /api/users/me/messages/unread-count (NEW)

Returns total unread message count for dashboard.

**Success Response (200):**
```json
{
  "unreadCount": "number"
}
```

---

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

**Payload Format:**
```typescript
{
  eventType: 'INSERT',
  new: {
    id: string,
    bookingId: string,
    senderId: string,
    text: string,
    createdAt: string
  },
  old: null
}
```

---

## Testing & QA Updates

### Additional Test Cases

| ID | Description | Type | Priority |
|----|-------------|------|----------|
| TC-RF-008-04 | Real-time message delivery < 500ms | E2E | Alta |
| TC-RF-008-05 | Messaging blocked after 2h post-completion | Integración | Alta |
| TC-RF-008-06 | Conversation list displays correctly | E2E | Alta |
| TC-RF-008-07 | Unread count accurate on dashboard | E2E | Media |
| TC-RF-008-08 | Pagination loads older messages | Integración | Media |
| TC-RF-008-09 | Optimistic UI update works | E2E | Media |
| TC-RF-008-10 | Supabase subscription cleanup on unmount | Unitaria | Media |

### Performance Criteria
- Message delivery latency: P95 < 500ms
- Message send API: P95 < 600ms (unchanged)
- Conversation list load: P95 < 1s
- Initial chat load (50 messages): P95 < 800ms
