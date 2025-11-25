# Tasks: Implement Real-Time Messaging

## Prerequisites

- [ ] 0.1 Verify booking module implementation exists (from `2025-11-24-implement-contractor-booking-management`)
- [ ] 0.2 Verify Supabase project has Realtime enabled
- [ ] 0.3 Verify `Message` table exists in database with correct indexes
- [ ] 0.4 Review existing Supabase client configuration in `src/lib/`

## 1. Backend - Messaging Module Core

### 1.1 Types and Validators
- [ ] 1.1.1 Create `src/modules/messaging/types/index.ts`:
  - MessageDTO, CreateMessageDTO, MessageListDTO
  - MessagingWindowStatus enum (OPEN, EXPIRED, NOT_STARTED)
  - ConversationPreviewDTO (for listing)
- [ ] 1.1.2 Create `src/modules/messaging/validators/messageSchemas.ts`:
  - createMessageSchema (bookingId, text validation)
  - getMessagesSchema (cursor, limit, bookingId)
- [ ] 1.1.3 Create `src/modules/messaging/errors/index.ts`:
  - MessageNotFoundError
  - MessagingWindowExpiredError
  - UnauthorizedMessageAccessError
  - MessageTooLongError
  - RateLimitExceededError

### 1.2 Sanitization Service
- [ ] 1.2.1 Create `src/modules/messaging/services/sanitizationService.ts`:
  - `sanitizeText(text)` - Strip HTML tags, escape special chars
  - `validateLinks(text)` - Only allow https:// links
  - `truncateText(text, maxLength)` - Enforce 2000 char limit
- [ ] 1.2.2 Write unit tests `src/modules/messaging/__tests__/sanitizationService.test.ts`:
  - Test XSS prevention (script tags, event handlers)
  - Test HTML stripping
  - Test link validation
  - Test character escaping

### 1.3 Repository Layer
- [ ] 1.3.1 Create `src/modules/messaging/repositories/messageRepository.ts`:
  - `create(bookingId, senderId, text)` - Insert message
  - `findByBookingId(bookingId, options)` - Cursor-based pagination
  - `countByBookingId(bookingId)` - Total count
  - `getUnreadCountForUser(userId)` - Messages in active bookings
  - `getConversationsForUser(userId, role)` - List booking conversations
- [ ] 1.3.2 Write unit tests `src/modules/messaging/__tests__/messageRepository.test.ts`

### 1.4 Time Window Service
- [ ] 1.4.1 Create `src/modules/messaging/services/timeWindowService.ts`:
  - `isMessagingAvailable(booking)` - Check if within window
  - `getWindowStatus(booking)` - Returns status + expiry time
  - `getTimeRemaining(booking)` - For COMPLETED bookings
- [ ] 1.4.2 Write unit tests `src/modules/messaging/__tests__/timeWindowService.test.ts`:
  - Test various booking states
  - Test 2-hour window after COMPLETED
  - Test edge cases (exactly at boundary)

### 1.5 Message Service
- [ ] 1.5.1 Create `src/modules/messaging/services/messageService.ts`:
  - `sendMessage(bookingId, userId, text)` - Main send logic
  - `getMessages(bookingId, userId, options)` - With authorization
  - `getConversations(userId, role)` - List conversations
  - `canAccessBookingMessages(bookingId, userId)` - Auth check
  - Rate limiting logic (10 messages/minute)
- [ ] 1.5.2 Write unit tests `src/modules/messaging/__tests__/messageService.test.ts`

### 1.6 Notification Service (Optional - Can be stubbed)
- [ ] 1.6.1 Create `src/modules/messaging/services/notificationService.ts`:
  - `notifyNewMessage(message, recipient)` - Email notification
  - `shouldSendNotification(recipient)` - Debounce/batch logic
- [ ] 1.6.2 Create `src/modules/messaging/adapters/sesAdapter.ts`:
  - AWS SES integration for email sending
  - Template for new message notification
- [ ] 1.6.3 Write tests with mocked SES

### 1.7 Module Export
- [ ] 1.7.1 Create `src/modules/messaging/index.ts` - Barrel export

## 2. Backend - API Routes

### 2.1 Message Endpoints
- [ ] 2.1.1 Create `app/api/bookings/[bookingId]/messages/route.ts`:
  - POST: Send message (auth + rate limit + sanitize + save)
  - GET: List messages (auth + pagination)
- [ ] 2.1.2 Write integration tests for messaging endpoints:
  - Test authorization (only participants)
  - Test rate limiting
  - Test sanitization
  - Test pagination
  - Test time window enforcement

### 2.2 User Message Endpoints
- [ ] 2.2.1 Create `app/api/users/me/messages/route.ts`:
  - GET: Get conversations list for current user
- [ ] 2.2.2 Create `app/api/users/me/messages/unread-count/route.ts`:
  - GET: Get unread message count
- [ ] 2.2.3 Write integration tests for user message endpoints

## 3. Supabase Realtime Setup

### 3.1 Database Configuration
- [ ] 3.1.1 Create migration for RLS policies on Message table:
  - Enable RLS
  - Policy for SELECT (booking participants)
  - Policy for INSERT (booking participants)
- [ ] 3.1.2 Verify Realtime is enabled for Message table in Supabase dashboard
- [ ] 3.1.3 Document Supabase Realtime configuration in spec

### 3.2 Client-Side Realtime
- [ ] 3.2.1 Create `src/lib/supabase/realtime.ts`:
  - Helper functions for subscribing to channels
  - Type-safe event handlers
- [ ] 3.2.2 Create `src/hooks/useSupabaseMessages.ts`:
  - Subscribe to booking channel for new messages
  - Handle message insertion events
  - Cleanup on unmount
  - Error handling and reconnection
- [ ] 3.2.3 Write tests for realtime hook (mock Supabase client)

## 4. Frontend - Shared Messaging Components

### 4.1 Core Chat Components
- [ ] 4.1.1 Create `src/components/shared/messaging/ChatContainer.tsx`:
  - Main wrapper component
  - Loading, error, empty states
  - Scrollable message area
- [ ] 4.1.2 Create `src/components/shared/messaging/MessageList.tsx`:
  - Virtualized scrolling for performance
  - Auto-scroll to bottom on new messages
  - Load more on scroll up
- [ ] 4.1.3 Create `src/components/shared/messaging/MessageBubble.tsx`:
  - Sent vs received styling
  - Timestamp display
  - Sender name (for contractor/client identification)
- [ ] 4.1.4 Create `src/components/shared/messaging/MessageInput.tsx`:
  - Text input with character counter
  - Send button (enabled when valid)
  - Disabled state when window expired
- [ ] 4.1.5 Create `src/components/shared/messaging/MessagingExpiredNotice.tsx`:
  - Display when 2-hour window has passed
  - Link to support/dispute if needed

### 4.2 Conversation List Components
- [ ] 4.2.1 Create `src/components/shared/messaging/ConversationList.tsx`:
  - List of active booking conversations
  - Preview of last message
  - Unread indicator
- [ ] 4.2.2 Create `src/components/shared/messaging/ConversationPreviewCard.tsx`:
  - Booking info (service, date)
  - Other party name/avatar
  - Last message preview
  - Time since last message

### 4.3 Utility Components
- [ ] 4.3.1 Create `src/components/shared/messaging/MessagingWindowStatus.tsx`:
  - Shows time remaining for COMPLETED bookings
  - Visual indicator (green/yellow/red)
- [ ] 4.3.2 Create `src/components/shared/messaging/EmptyConversationState.tsx`:
  - No messages yet state
  - Suggested first message prompts

## 5. Frontend - Client Messages Page

### 5.1 Client Messages List
- [ ] 5.1.1 Update `app/clients/messages/page.tsx`:
  - Replace "Coming Soon" placeholder
  - Server component fetching conversations
- [ ] 5.1.2 Create `src/components/clients/messages/ClientMessagesPage.tsx`:
  - Client component with ConversationList
  - Click to navigate to booking detail with chat
- [ ] 5.1.3 Update `src/components/clients/ClientMetricsOverview.tsx`:
  - Fetch and display real unread message count

### 5.2 Client Booking Chat Integration
- [ ] 5.2.1 Update `app/clients/bookings/[id]/page.tsx`:
  - Add chat tab/section to booking detail
- [ ] 5.2.2 Create `src/components/clients/bookings/BookingChat.tsx`:
  - Integrated chat using shared components
  - Shows messaging window status

## 6. Frontend - Contractor Messages Page

### 6.1 Contractor Messages List
- [ ] 6.1.1 Create `app/contractors/messages/page.tsx`:
  - Server component (page currently doesn't exist)
- [ ] 6.1.2 Create `src/components/contractors/messages/ContractorMessagesPage.tsx`:
  - Client component with ConversationList
  - Click to navigate to booking detail with chat
- [ ] 6.1.3 Update `src/components/contractors/MetricsOverview.tsx`:
  - Fetch and display real unread message count

### 6.2 Contractor Booking Chat Integration
- [ ] 6.2.1 Update `app/contractors/bookings/[id]/page.tsx`:
  - Add chat tab/section to booking detail
- [ ] 6.2.2 Create `src/components/contractors/bookings/BookingChat.tsx`:
  - Integrated chat using shared components
  - Shows messaging window status

## 7. Testing

### 7.1 Unit Tests
- [ ] 7.1.1 Test sanitizationService - XSS, HTML stripping, links
- [ ] 7.1.2 Test timeWindowService - All booking states, edge cases
- [ ] 7.1.3 Test messageService - Send, receive, authorization
- [ ] 7.1.4 Test messageRepository - CRUD operations
- [ ] 7.1.5 Verify coverage ≥70% for messaging module

### 7.2 Integration Tests
- [ ] 7.2.1 Test POST /api/bookings/:id/messages - Full flow
- [ ] 7.2.2 Test GET /api/bookings/:id/messages - Pagination
- [ ] 7.2.3 Test authorization - Only participants can access
- [ ] 7.2.4 Test rate limiting - 10 messages/minute
- [ ] 7.2.5 Test time window - Block messages after expiry

### 7.3 Component Tests
- [ ] 7.3.1 Test MessageBubble rendering (sent/received)
- [ ] 7.3.2 Test MessageInput (validation, disabled states)
- [ ] 7.3.3 Test ConversationList (loading, empty, populated)
- [ ] 7.3.4 Test ChatContainer with mocked realtime

### 7.4 E2E Tests (Optional)
- [ ] 7.4.1 Test full messaging flow between client and contractor
- [ ] 7.4.2 Test real-time message delivery

## 8. Documentation

### 8.1 STP Update
- [ ] 8.1.1 Add messaging test cases to `docs/md/STP-ReparaYa.md`:
  - TC-MSG-001 to TC-MSG-030 (see Testing Plan below)

### 8.2 Spec Updates
- [ ] 8.2.1 Update `openspec/specs/reservation-lifecycle-messaging/spec.md`:
  - Add Supabase Realtime implementation details
  - Add time window logic documentation
  - Update API contracts if needed

---

## Testing Plan

### Test Cases for STP-ReparaYa.md

| ID | Description | Type | Requirement | Priority |
|----|-------------|------|-------------|----------|
| TC-MSG-001 | Send message successfully | Integración | RF-008 | Alta |
| TC-MSG-002 | Receive message in real-time via Supabase | E2E | RF-008 | Alta |
| TC-MSG-003 | Message sanitized for XSS (script tags removed) | Unitaria | RNF-3.5.3 | Alta |
| TC-MSG-004 | Message sanitized for XSS (event handlers) | Unitaria | RNF-3.5.3 | Alta |
| TC-MSG-005 | HTML tags stripped from message | Unitaria | RNF-3.5.3 | Alta |
| TC-MSG-006 | Message truncated at 2000 chars | Unitaria | RF-008 | Media |
| TC-MSG-007 | Only https links allowed | Unitaria | RNF-3.5.3 | Media |
| TC-MSG-008 | Rate limit: 10 messages/minute enforced | Integración | RF-008 | Alta |
| TC-MSG-009 | Rate limit returns 429 on exceed | Integración | RF-008 | Alta |
| TC-MSG-010 | Message pagination works correctly | Integración | RF-008 | Media |
| TC-MSG-011 | Supabase subscription receives new messages | Integración | RF-008 | Alta |
| TC-MSG-012 | Subscription cleanup on component unmount | Unitaria | RF-008 | Media |
| TC-MSG-013 | Optimistic UI update on send | Unitaria | RF-008 | Media |
| TC-MSG-014 | Reconnection on WebSocket disconnect | Integración | RF-008 | Media |
| TC-MSG-015 | Message displayed within 500ms of sending | E2E | RNF-3.5.1 | Alta |
| TC-MSG-016 | Only booking participants can send messages | Integración | RF-008 | Alta |
| TC-MSG-017 | Non-participant returns 403 | Integración | RF-008 | Alta |
| TC-MSG-018 | Client can send message to contractor | E2E | RF-008 | Alta |
| TC-MSG-019 | Contractor can send message to client | E2E | RF-008 | Alta |
| TC-MSG-020 | Blocked user cannot send messages | Integración | RF-008 | Media |
| TC-MSG-021 | Messaging available when booking CONFIRMED | Integración | RF-008 | Alta |
| TC-MSG-022 | Messaging available when booking IN_PROGRESS | Integración | RF-008 | Alta |
| TC-MSG-023 | Messaging available 2h after COMPLETED | Integración | RF-008 | Alta |
| TC-MSG-024 | Messaging blocked after 2h post-COMPLETED | Integración | RF-008 | Alta |
| TC-MSG-025 | Messaging blocked for CANCELLED bookings | Integración | RF-008 | Media |
| TC-MSG-026 | Client messages page shows conversations | E2E | RF-008 | Alta |
| TC-MSG-027 | Contractor messages page shows conversations | E2E | RF-008 | Alta |
| TC-MSG-028 | Chat integrated in booking detail | E2E | RF-008 | Alta |
| TC-MSG-029 | Unread count displayed in dashboard | E2E | RF-008 | Media |
| TC-MSG-030 | Expired messaging window shows notice | E2E | RF-008 | Media |

### Acceptance Criteria

- [ ] Cobertura de código ≥ 70% en módulo `src/modules/messaging`
- [ ] Todos los casos de prueba TC-MSG-* pasan
- [ ] Mensajes se entregan en tiempo real (< 500ms latencia)
- [ ] XSS prevention funciona correctamente
- [ ] Rate limiting funciona (10 msg/min)
- [ ] Time window de 2h post-COMPLETED se respeta
- [ ] Autorización verifica participantes en todos los endpoints
- [ ] CI/CD pasa sin errores
- [ ] Dashboard metrics muestran conteo real de mensajes sin leer

---

## Implementation Order

**Recommended parallelization:**

```
Week 1 - Backend Foundation (can be parallelized)
├── 1.1-1.3 Types, Sanitization, Repository
├── 1.4-1.5 Time Window, Message Service
└── 2.1-2.2 API Routes

Week 2 - Realtime + Frontend Foundation
├── 3.1-3.2 Supabase Realtime Setup
├── 4.1-4.3 Shared Components
└── 7.1-7.2 Unit + Integration Tests

Week 3 - UI Integration + Polish
├── 5.1-5.2 Client Messages Page
├── 6.1-6.2 Contractor Messages Page
├── 7.3-7.4 Component + E2E Tests
└── 8.1-8.2 Documentation Updates
```

**Dependencies:**
- Tasks 1.x and 2.x can run in parallel
- Tasks 3.x requires backend to be complete
- Tasks 4.x-6.x require realtime setup
- Tasks 7.x and 8.x run throughout
