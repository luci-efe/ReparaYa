# Design: Real-Time Messaging Architecture

## Overview

This document describes the technical architecture for implementing real-time messaging between clients and contractors within booking contexts using Supabase Realtime.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ ChatContainer│  │MessageInput │  │  useSupabaseMessages   │ │
│  │             │  │             │  │  (Custom Hook)          │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         │                │                     │               │
│         ▼                ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase JavaScript Client                 │   │
│  │  ┌─────────────────┐  ┌────────────────────────────┐   │   │
│  │  │  REST Client    │  │  Realtime Client           │   │   │
│  │  │  (Send Message) │  │  (Subscribe to Channel)    │   │   │
│  │  └────────┬────────┘  └─────────────┬──────────────┘   │   │
│  └───────────┼─────────────────────────┼──────────────────┘   │
│              │                         │                       │
└──────────────┼─────────────────────────┼───────────────────────┘
               │ HTTPS                   │ WebSocket
               ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /api/bookings/[bookingId]/messages                   │ │
│  │  GET /api/bookings/[bookingId]/messages                    │ │
│  │  GET /api/users/me/messages/unread-count                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Messaging Module                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ messageService  │  │sanitizationSvc  │  │timeWindowService│  │
│  │                 │  │                 │  │                 │  │
│  │ - sendMessage() │  │ - sanitizeText()│  │ - isAvailable() │  │
│  │ - getMessages() │  │ - validateLinks()│ │ - getStatus()   │  │
│  │ - canAccess()   │  │ - truncate()    │  │ - getRemaining()│  │
│  └────────┬────────┘  └─────────────────┘  └─────────────────┘  │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   messageRepository                         ││
│  │  - create(message)                                          ││
│  │  - findByBookingId(bookingId, options)                      ││
│  │  - getUnreadCountForUser(userId)                            ││
│  │  - getConversationsForUser(userId, role)                    ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Supabase                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │ │
│  │  │   Message   │  │   Booking   │  │      User       │    │ │
│  │  │             │  │             │  │                 │    │ │
│  │  │ id          │  │ id          │  │ id              │    │ │
│  │  │ bookingId───┼──│◄────────────│  │ clerkUserId     │    │ │
│  │  │ senderId────┼──┼─────────────┼──│◄────────────────│    │ │
│  │  │ text        │  │ clientId────┼──│◄────────────────│    │ │
│  │  │ createdAt   │  │ contractorId│──│◄────────────────│    │ │
│  │  └─────────────┘  │ status      │  └─────────────────┘    │ │
│  │                   │ updatedAt   │                          │ │
│  │                   └─────────────┘                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Supabase Realtime                         │ │
│  │  Channel: booking:{bookingId}                              │ │
│  │  Event: INSERT on Message table                            │ │
│  │  Broadcast: To subscribed clients                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Sending a Message

```
1. User types message and clicks Send
   │
2. MessageInput calls sendMessage() in messageService
   │
3. messageService:
   │  a. Validates user is booking participant (canAccess)
   │  b. Validates messaging window is open (timeWindowService)
   │  c. Checks rate limit (10 msg/min)
   │  d. Sanitizes message text (sanitizationService)
   │  e. Calls messageRepository.create()
   │
4. messageRepository:
   │  a. Inserts message into PostgreSQL via Prisma
   │  b. Returns created message
   │
5. Supabase Realtime:
   │  a. Detects INSERT on Message table
   │  b. Broadcasts to channel "booking:{bookingId}"
   │
6. Recipient's browser:
   │  a. useSupabaseMessages hook receives event
   │  b. Updates local state with new message
   │  c. MessageList re-renders with new message
   │
7. (Optional) Notification service:
      a. Checks if recipient is offline
      b. Sends email via AWS SES
```

### Receiving Messages (Initial Load)

```
1. User navigates to chat/booking detail
   │
2. Component mounts, triggers useSupabaseMessages hook
   │
3. Hook:
   │  a. Fetches existing messages via GET /api/bookings/:id/messages
   │  b. Sets up Supabase Realtime subscription
   │  c. Returns messages + loading/error state
   │
4. ChatContainer renders MessageList with messages
```

## Supabase Realtime Implementation

### Channel Structure

```typescript
// Channel name format
const channelName = `booking:${bookingId}`;

// Subscription setup
const channel = supabase
  .channel(channelName)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'Message',
      filter: `bookingId=eq.${bookingId}`,
    },
    (payload) => {
      // Handle new message
      const newMessage = payload.new as Message;
      setMessages((prev) => [...prev, newMessage]);
    }
  )
  .subscribe();
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can read messages from bookings they participate in
CREATE POLICY "booking_participants_read_messages" ON "Message"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Booking"
    WHERE "Booking".id = "Message"."bookingId"
    AND ("Booking"."clientId" = auth.uid() OR "Booking"."contractorId" = auth.uid())
  )
);

-- INSERT policy: Users can send messages to bookings they participate in
CREATE POLICY "booking_participants_send_messages" ON "Message"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Booking"
    WHERE "Booking".id = "bookingId"
    AND ("Booking"."clientId" = auth.uid() OR "Booking"."contractorId" = auth.uid())
  )
  AND "senderId" = auth.uid()
);
```

### Clerk + Supabase Auth Integration

Since the project uses Clerk for auth but Supabase for the database, we need to handle auth carefully:

**Option 1: API Route Only (Recommended)**
- All message operations go through Next.js API routes
- API routes validate Clerk session and enforce authorization
- Supabase Realtime uses service role key (server-side only)
- Client subscribes via API-generated channel token

**Option 2: Supabase JWT Custom Claims**
- Generate Supabase JWT with Clerk user ID
- Map Clerk user ID to Supabase auth context
- More complex setup, better for pure Supabase apps

We recommend **Option 1** for simplicity with existing architecture.

## Time Window Logic

### States and Messaging Availability

| Booking Status | Messaging Available | Notes |
|----------------|---------------------|-------|
| PENDING_PAYMENT | NO | Booking not yet confirmed |
| CONFIRMED | YES | Service is scheduled |
| ON_ROUTE | YES | Contractor traveling |
| ON_SITE | YES | Service in progress |
| IN_PROGRESS | YES | Service being performed |
| COMPLETED | CONDITIONAL | 2 hours from updatedAt |
| CANCELLED | NO | Booking terminated |
| DISPUTED | YES | Support may need context |

### Implementation

```typescript
// timeWindowService.ts

export function isMessagingAvailable(booking: Booking): boolean {
  const { status, updatedAt } = booking;

  // States where messaging is always available
  const alwaysAllowed = ['CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'DISPUTED'];
  if (alwaysAllowed.includes(status)) {
    return true;
  }

  // COMPLETED: 2 hours window
  if (status === 'COMPLETED') {
    const completedAt = new Date(updatedAt);
    const windowEnd = addHours(completedAt, 2);
    return new Date() < windowEnd;
  }

  return false;
}

export function getWindowStatus(booking: Booking): MessagingWindowStatus {
  if (!isMessagingAvailable(booking)) {
    if (booking.status === 'PENDING_PAYMENT') {
      return { status: 'NOT_STARTED', message: 'Messaging available after payment' };
    }
    return { status: 'EXPIRED', message: 'Messaging window has closed' };
  }

  if (booking.status === 'COMPLETED') {
    const remaining = getTimeRemaining(booking);
    return { status: 'EXPIRING', remaining, message: `${remaining} remaining` };
  }

  return { status: 'OPEN', message: 'Messaging available' };
}
```

## Rate Limiting

### Implementation Strategy

Use in-memory rate limiting with sliding window:

```typescript
// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(userId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get user's message timestamps
  const timestamps = rateLimitMap.get(userId) || [];

  // Filter to only messages within window
  const recentTimestamps = timestamps.filter(ts => ts > windowStart);

  if (recentTimestamps.length >= limit) {
    return false; // Rate limited
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(userId, recentTimestamps);

  return true;
}
```

For production, consider Redis-based rate limiting.

## Security Considerations

### XSS Prevention

```typescript
// sanitizationService.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeText(text: string): string {
  // Strip all HTML tags
  let sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Validate links (only https)
  sanitized = validateLinks(sanitized);

  // Enforce max length
  return truncateText(sanitized, 2000);
}

export function validateLinks(text: string): string {
  // Replace non-https links with text only
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    if (url.startsWith('https://')) {
      return url;
    }
    return '[link removed]';
  });
}
```

### Authorization Flow

```
Every message operation:
1. Extract user from Clerk session
2. Fetch booking from database
3. Verify user is either clientId or contractorId
4. Verify messaging window is open
5. Check rate limit
6. Proceed with operation
```

## Component Hierarchy

```
ClientMessagesPage / ContractorMessagesPage
├── ConversationList
│   ├── ConversationPreviewCard (for each booking)
│   │   ├── Avatar
│   │   ├── Name
│   │   ├── LastMessage preview
│   │   └── Timestamp
│   └── EmptyState (no conversations)
│
BookingDetailPage (when clicking a conversation)
├── BookingInfo
├── ChatContainer
│   ├── MessagingWindowStatus
│   ├── MessageList
│   │   ├── MessageBubble (for each message)
│   │   │   ├── SenderName (if contractor/client context)
│   │   │   ├── MessageText
│   │   │   └── Timestamp
│   │   └── LoadMore trigger (infinite scroll)
│   ├── MessageInput
│   │   ├── TextArea
│   │   ├── CharacterCounter
│   │   └── SendButton
│   └── MessagingExpiredNotice (if window closed)
```

## API Contracts

### POST /api/bookings/[bookingId]/messages

**Request:**
```json
{
  "text": "Hola, estoy en camino. Llego en 15 minutos."
}
```

**Response (201):**
```json
{
  "id": "msg_uuid",
  "bookingId": "booking_uuid",
  "senderId": "user_uuid",
  "senderName": "Juan Pérez",
  "senderRole": "CONTRACTOR",
  "text": "Hola, estoy en camino. Llego en 15 minutos.",
  "createdAt": "2025-11-25T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid message (empty, too long)
- `403` - Not authorized (not a participant)
- `403` - Messaging window expired
- `429` - Rate limit exceeded

### GET /api/bookings/[bookingId]/messages

**Query Params:**
- `cursor` (optional): Message ID for pagination
- `limit` (optional, default 50): Messages per page

**Response (200):**
```json
{
  "messages": [
    {
      "id": "msg_uuid_1",
      "senderId": "user_uuid_client",
      "senderName": "María García",
      "senderRole": "CLIENT",
      "text": "Buenos días, ¿a qué hora llegas?",
      "createdAt": "2025-11-25T10:25:00.000Z"
    },
    {
      "id": "msg_uuid_2",
      "senderId": "user_uuid_contractor",
      "senderName": "Juan Pérez",
      "senderRole": "CONTRACTOR",
      "text": "Hola, estoy en camino. Llego en 15 minutos.",
      "createdAt": "2025-11-25T10:30:00.000Z"
    }
  ],
  "nextCursor": "msg_uuid_0",
  "hasMore": true,
  "messagingWindow": {
    "status": "OPEN",
    "expiresAt": null
  }
}
```

### GET /api/users/me/messages/unread-count

**Response (200):**
```json
{
  "unreadCount": 3
}
```

## Error Handling

### Client-Side Error States

```typescript
type MessagingError =
  | { type: 'UNAUTHORIZED'; message: string }
  | { type: 'WINDOW_EXPIRED'; message: string; expiredAt: Date }
  | { type: 'RATE_LIMITED'; message: string; retryAfter: number }
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'UNKNOWN'; message: string };
```

### Error Display

- **UNAUTHORIZED**: Redirect to booking list, show toast
- **WINDOW_EXPIRED**: Show notice in chat, disable input
- **RATE_LIMITED**: Show countdown, disable send button
- **NETWORK_ERROR**: Show retry button, queue message
- **UNKNOWN**: Show generic error, offer support contact

## Performance Considerations

### Message List Virtualization

For bookings with many messages, use virtualized scrolling:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80, // Estimated message height
  overscan: 5,
});
```

### Optimistic Updates

Send message shows immediately in UI:

```typescript
const sendMessage = async (text: string) => {
  // Optimistic update
  const tempMessage = {
    id: `temp_${Date.now()}`,
    text,
    senderId: currentUser.id,
    createdAt: new Date().toISOString(),
    pending: true,
  };
  setMessages((prev) => [...prev, tempMessage]);

  try {
    const savedMessage = await api.sendMessage(bookingId, text);
    // Replace temp with real message
    setMessages((prev) =>
      prev.map((m) => (m.id === tempMessage.id ? savedMessage : m))
    );
  } catch (error) {
    // Remove temp message, show error
    setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    showError(error);
  }
};
```

## Migration Plan

1. **Phase 1**: Backend (no breaking changes)
   - Implement services, repository, API routes
   - Add RLS policies to Supabase
   - All behind feature flag initially

2. **Phase 2**: Frontend (gradual rollout)
   - Deploy shared components
   - Replace client messages placeholder
   - Create contractor messages page

3. **Phase 3**: Integration
   - Add chat to booking details
   - Update dashboard metrics
   - Enable for all users

4. **Phase 4**: Polish
   - Add email notifications
   - Performance optimization
   - Monitoring and logging
