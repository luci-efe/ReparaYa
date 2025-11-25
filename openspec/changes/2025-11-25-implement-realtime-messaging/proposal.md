# Change: Implement Real-Time Messaging Between Clients and Contractors

## Why

The ReparaYa marketplace requires communication between clients and contractors within booking contexts. Per RF-008, users need to exchange messages from the reservation phase until 2 hours after service completion. This is a critical feature for:
- Coordination before service (access instructions, material needs)
- Real-time updates during service execution
- Post-service follow-up and clarifications

The existing spec (`reservation-lifecycle-messaging`) defines HTTP polling, but the user has opted for **Supabase Realtime** to provide a seamless, instant messaging experience leveraging the existing Supabase infrastructure.

## What Changes

### Backend - Messaging Module

- **Message Service** (`src/modules/messaging/services/messageService.ts`)
  - `sendMessage(bookingId, senderId, text)` - Creates message with sanitization
  - `getMessages(bookingId, userId, options)` - Retrieves conversation with pagination
  - `canAccessMessages(bookingId, userId)` - Authorization check (participant + time window)
  - `isWithinMessagingWindow(booking)` - Validates messaging time restrictions

- **Message Repository** (`src/modules/messaging/repositories/messageRepository.ts`)
  - `create(message)` - Insert new message
  - `findByBookingId(bookingId, options)` - Paginated retrieval with cursor
  - `countUnread(userId)` - Count messages in active bookings (for dashboard metrics)

- **Sanitization Service** (`src/modules/messaging/services/sanitizationService.ts`)
  - XSS prevention via HTML stripping and character escaping
  - Link detection and validation (only allow https links)
  - Profanity filter (optional, configurable)

- **Notification Service** (`src/modules/messaging/services/notificationService.ts`)
  - AWS SES email notifications for new messages
  - Batching strategy (don't send email if recipient is online)

### API Routes

- `POST /api/bookings/[bookingId]/messages` - Send a message
- `GET /api/bookings/[bookingId]/messages` - Get messages (with `cursor`, `limit` params)
- `GET /api/users/me/messages/unread-count` - Get unread message count for dashboard

### Frontend - Messaging UI

**Client Side** (`app/clients/messages/page.tsx`)
- Replace placeholder with conversation list
- Create `ClientMessagesPage` with booking-based conversation threads
- Create `ConversationPreviewCard` showing last message, contractor info
- Navigation to booking detail with chat

**Contractor Side** (`app/contractors/messages/page.tsx`)
- Create page (currently missing)
- Create `ContractorMessagesPage` with conversation list
- Similar structure to client side

**Shared Chat Component** (`src/components/shared/messaging/`)
- `ChatContainer` - Main chat UI wrapper
- `MessageList` - Virtual scrolling message display
- `MessageBubble` - Individual message styling (sent vs received)
- `MessageInput` - Text input with send button
- `TypingIndicator` - Optional typing status (Supabase Presence)
- `useSupabaseMessages` - Custom hook for Supabase Realtime subscription

**Booking Detail Integration**
- Add chat panel/tab to `/clients/bookings/[id]` page
- Add chat panel/tab to `/contractors/bookings/[id]` page
- Show messaging availability status (within window or expired)

### Real-Time Infrastructure

**Supabase Realtime Setup**
- Configure Row Level Security (RLS) for `Message` table
- Create Supabase subscription for `INSERT` events on `Message`
- Client-side subscription management via custom hook
- Optimistic UI updates for sent messages

**Time Window Logic**
- Messaging available when: `booking.status IN ('CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED')`
- For COMPLETED: available until `booking.updatedAt + 2 hours`
- Display countdown/expiry notice in UI

### Database Changes

No schema changes required - `Message` table already exists with correct structure:
```prisma
model Message {
  id        String   @id @default(uuid())
  bookingId String
  senderId  String
  text      String   @db.VarChar(2000)
  createdAt DateTime @default(now())
  booking   Booking  @relation(...)
  sender    User     @relation(...)
  @@index([bookingId, createdAt])
}
```

**Row Level Security (RLS) for Supabase Realtime:**
```sql
-- Enable RLS on Message table
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from their bookings
CREATE POLICY "Users can read own booking messages" ON "Message"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b.id = "Message"."bookingId"
      AND (b."clientId" = auth.uid() OR b."contractorId" = auth.uid())
    )
  );

-- Policy: Users can insert messages to their bookings
CREATE POLICY "Users can send messages to own bookings" ON "Message"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Booking" b
      WHERE b.id = "bookingId"
      AND (b."clientId" = auth.uid() OR b."contractorId" = auth.uid())
    )
  );
```

## Impact

### Affected Specs
- `reservation-lifecycle-messaging` - UPDATE: Add Supabase Realtime details, time window logic
- `client-dashboard` - UPDATE: Unread message count integration
- `contractor-dashboard` - UPDATE: Unread message count integration

### Affected Code
- `src/modules/messaging/` - Full module implementation
- `app/api/bookings/[id]/messages/` - New API routes
- `app/api/users/me/messages/` - New endpoint for unread count
- `app/clients/messages/` - Replace placeholder
- `app/contractors/messages/` - Create new page
- `app/clients/bookings/[id]/` - Add chat integration
- `app/contractors/bookings/[id]/` - Add chat integration
- `src/components/shared/messaging/` - New shared components
- `src/components/clients/ClientMetricsOverview.tsx` - Real unread count
- `src/components/contractors/MetricsOverview.tsx` - Real unread count

### Dependencies
- **Booking Module** (`2025-11-24-implement-contractor-booking-management`) - REQUIRED
  - Messaging depends on bookings existing with proper state machine
  - Must be implemented first or in parallel
- **Supabase Client** - Already configured in project
- **AWS SES** - For email notifications (optional, can be deferred)

### External Integrations
- **Supabase Realtime** - WebSocket subscriptions for instant message delivery
- **AWS SES** - Email notifications for offline users (can be mock/stub for MVP)

## Out of Scope

- File/image attachments in messages
- Voice messages or media
- Message editing or deletion
- Read receipts / seen status (can be added later)
- Typing indicators (optional, can be added with Supabase Presence)
- Push notifications (web/mobile)
- Admin moderation panel for messages
- Group conversations (always 1:1 within booking)
- Message search functionality

## Testing Plan

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-MSG-001-01 | Client can send message to contractor | RF | High | messaging-module |
| TC-RF-MSG-002-01 | Contractor can send message to client | RF | High | messaging-module |
| TC-RF-MSG-003-01 | Messages display in real-time via WebSocket | RF | High | messaging-realtime |
| TC-RF-MSG-004-01 | Message history loads on page open | RF | High | messaging-module |
| TC-RF-MSG-005-01 | Messaging window enforces 2-hour limit after completion | RF | High | messaging-timewindow |
| TC-RF-MSG-006-01 | Only booking participants can access messages | RF | High | messaging-security |
| TC-BR-MSG-007-01 | XSS content is sanitized from messages | BR | High | messaging-security |
| TC-BR-MSG-008-01 | Rate limiting prevents spam (10 msg/min) | BR | Medium | messaging-security |
| TC-RNF-MSG-009-01 | Message delivery latency < 100ms | RNF | Medium | messaging-realtime |
| TC-RNF-MSG-010-01 | Message history loads within 1 second | RNF | Medium | messaging-module |

See `tasks.md` for additional test cases TC-MSG-011 to TC-MSG-030.

**Coverage target:** ≥70% for messaging module

## Technical Design Decisions

### Why Supabase Realtime over HTTP Polling?
- **User Experience**: Instant message delivery (< 100ms) vs 3-5 second polling delay
- **Efficiency**: Single WebSocket connection vs repeated HTTP requests
- **Infrastructure**: Already using Supabase for PostgreSQL, no additional services
- **Scalability**: Supabase handles connection management and message broadcasting

### Why Not WebSockets (Custom)?
- Additional infrastructure complexity
- Would require separate WebSocket server on Vercel (limitations)
- Supabase Realtime is battle-tested and included in the stack

### Message Access Time Window
- 2 hours post-completion allows for:
  - Quick follow-up questions
  - Clarifications about work performed
  - Issue reporting before rating
- After 2 hours, users must use support/dispute system
