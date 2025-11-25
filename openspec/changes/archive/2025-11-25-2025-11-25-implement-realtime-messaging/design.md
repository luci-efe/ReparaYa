# Design: Real-Time Messaging Architecture

## Overview

This document describes the technical architecture for implementing real-time messaging between clients and contractors within booking contexts using Supabase Realtime and TanStack Query for client-side state management.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Browser                             │
├─────────────────────────────────────────────────────────────────────┤
│  React Components                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │ ChatContainer│  │MessageInput │  │       Custom Hooks          │  │
│  │             │  │             │  │  ┌─────────────────────────┐│  │
│  └──────┬──────┘  └──────┬──────┘  │  │ useBookingMessages     ││  │
│         │                │         │  │ useSendMessage          ││  │
│         │                │         │  └─────────────────────────┘│  │
│         └────────┬───────┘         └───────────┬─────────────────┘  │
│                  │                             │                     │
│                  ▼                             ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    TanStack Query Layer                     │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │              QueryClient (QueryProvider)            │   │    │
│  │  │  • Cache: ['messages', bookingId]                   │   │    │
│  │  │  • staleTime: Infinity                              │   │    │
│  │  │  • useInfiniteQuery (fetch + pagination)            │   │    │
│  │  │  • useMutation (optimistic updates)                 │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Supabase JavaScript Client                     │    │
│  │  ┌─────────────────┐  ┌────────────────────────────────┐   │    │
│  │  │  REST (unused)  │  │  Realtime Client               │   │    │
│  │  │  for messages   │  │  (Subscribe to Channel)        │   │    │
│  │  │                 │  │  → Updates cache on INSERT     │   │    │
│  │  └─────────────────┘  └─────────────┬──────────────────┘   │    │
│  └─────────────────────────────────────┼──────────────────────┘    │
│                                        │                            │
└────────────────────────────────────────┼────────────────────────────┘
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
   │  a. useBookingMessages hook receives Realtime event
   │  b. Calls queryClient.setQueryData to update cache
   │  c. MessageList re-renders with new message (no refetch)
   │
7. (Optional) Notification service:
      a. Checks if recipient is offline
      b. Sends email via AWS SES
```

### Receiving Messages (Initial Load)

```
1. User navigates to chat/booking detail
   │
2. Component mounts, triggers useBookingMessages hook
   │
3. Hook:
   │  a. useInfiniteQuery checks cache for ['messages', bookingId]
   │  b. If no cache: Fetches via GET /api/bookings/:id/messages
   │  c. If cached (staleTime: Infinity): Returns cached data immediately
   │  d. Sets up Supabase Realtime subscription for new messages
   │  e. Returns { data, fetchNextPage, isLoading, error }
   │
4. ChatContainer renders MessageList with messages from query data
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

## TanStack Query Caching Layer

### Overview

TanStack Query acts as a bridge between the Backend API and the Frontend UI, providing:
- Instant feedback via optimistic updates
- Prevention of unnecessary network requests
- Seamless integration with Supabase Realtime events

### Global Configuration

```typescript
// src/lib/query/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute default
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Message Fetching with Infinite Query

```typescript
// src/hooks/useBookingMessages.ts
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useBookingMessages(bookingId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', bookingId];
  const supabase = createClient();

  // 1. FETCH: Infinite scroll support
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }): Promise<MessagePage> => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);

      const response = await fetch(
        `/api/bookings/${bookingId}/messages?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: Infinity, // Only update via Realtime or manual invalidation
    initialPageParam: undefined as string | undefined,
  });

  // 2. REALTIME: Push new messages to cache
  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `bookingId=eq.${bookingId}`,
        },
        (payload) => {
          queryClient.setQueryData(queryKey, (oldData: InfiniteData<MessagePage> | undefined) => {
            if (!oldData) return oldData;
            return updateCacheWithNewMessage(oldData, payload.new as Message);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient, supabase]);

  return query;
}

// Helper to append new message to latest page
function updateCacheWithNewMessage(
  oldData: InfiniteData<MessagePage>,
  newMessage: Message
): InfiniteData<MessagePage> {
  const newPages = [...oldData.pages];
  const lastPageIndex = newPages.length - 1;

  // Check if message already exists (deduplication)
  const messageExists = newPages.some(page =>
    page.messages.some(m => m.id === newMessage.id)
  );
  if (messageExists) return oldData;

  // Append to last page
  newPages[lastPageIndex] = {
    ...newPages[lastPageIndex],
    messages: [...newPages[lastPageIndex].messages, newMessage],
  };

  return { ...oldData, pages: newPages };
}
```

### Optimistic Mutations for Sending

```typescript
// src/hooks/useSendMessage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OptimisticMessage extends Message {
  isSending: boolean;
  tempId: string;
}

export function useSendMessage(bookingId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', bookingId];

  return useMutation({
    mutationFn: async (text: string): Promise<Message> => {
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      return response.json();
    },

    // Optimistic update: Show message immediately
    onMutate: async (text) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Create optimistic message
      const tempId = `temp_${Date.now()}`;
      const optimisticMessage: OptimisticMessage = {
        id: tempId,
        tempId,
        bookingId,
        senderId: currentUserId,
        text,
        createdAt: new Date().toISOString(),
        isSending: true,
      };

      // Optimistically update cache
      queryClient.setQueryData(queryKey, (old: InfiniteData<MessagePage> | undefined) => {
        if (!old) return old;
        return updateCacheWithNewMessage(old, optimisticMessage);
      });

      return { previousData, tempId };
    },

    // Rollback on error
    onError: (err, text, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    // Replace optimistic message with real one
    onSuccess: (savedMessage, text, context) => {
      if (!context?.tempId) return;

      queryClient.setQueryData(queryKey, (old: InfiniteData<MessagePage> | undefined) => {
        if (!old) return old;
        return replaceOptimisticMessage(old, context.tempId, savedMessage);
      });
    },
  });
}

function replaceOptimisticMessage(
  data: InfiniteData<MessagePage>,
  tempId: string,
  realMessage: Message
): InfiniteData<MessagePage> {
  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      messages: page.messages.map(m =>
        (m as OptimisticMessage).tempId === tempId
          ? { ...realMessage, isSending: false }
          : m
      ),
    })),
  };
}
```

### Cache Key Strategy

| Query Key | Purpose | staleTime |
|-----------|---------|-----------|
| `['messages', bookingId]` | Message history per booking | `Infinity` |
| `['conversations', userId]` | Conversation list | `60000` (1 min) |
| `['unread-count', userId]` | Unread message count | `30000` (30 sec) |

### Integration with UI Components

```typescript
// In ChatContainer.tsx
function ChatContainer({ bookingId }: { bookingId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    error
  } = useBookingMessages(bookingId);

  const messages = data?.pages.flatMap(page => page.messages) ?? [];

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <MessageList
      messages={messages}
      onLoadMore={() => hasNextPage && fetchNextPage()}
    />
  );
}

// In MessageInput.tsx
function MessageInput({ bookingId, currentUserId }: Props) {
  const { mutateAsync, isPending } = useSendMessage(bookingId, currentUserId);
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim() || isPending) return;
    await mutateAsync(text);
    setText('');
  };

  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleSend} disabled={isPending || !text.trim()}>
        {isPending ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

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

**Important:** For deployments with multiple instances (Vercel, Kubernetes, etc.), a distributed store like Redis is REQUIRED. The in-memory implementation above is only suitable for development with a single instance. For production multi-replica deployments, use Redis with a sliding window algorithm:

```typescript
// Redis-based rate limiter (production)
// Uses ZREMRANGEBYSCORE + ZCARD + ZADD for atomic sliding window
const RATE_LIMIT_KEY = (userId: string) => `ratelimit:msg:${userId}`;

export async function checkRateLimitRedis(
  redis: Redis,
  userId: string, 
  limit = 10, 
  windowMs = 60000
): Promise<boolean> {
  const key = RATE_LIMIT_KEY(userId);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Atomic operation via Lua script
  const script = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
    local count = redis.call('ZCARD', KEYS[1])
    if count < tonumber(ARGV[2]) then
      redis.call('ZADD', KEYS[1], ARGV[3], ARGV[3])
      redis.call('EXPIRE', KEYS[1], ARGV[4])
      return 1
    end
    return 0
  `;
  
  const result = await redis.eval(script, 1, key, windowStart, limit, now, Math.ceil(windowMs / 1000));
  return result === 1;
}
```

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

Optimistic updates are handled by TanStack Query's `useMutation` with `onMutate`, `onError`, and `onSuccess` callbacks. See the **TanStack Query Caching Layer** section above for the complete implementation using `useSendMessage` hook.

Key benefits:
- Automatic rollback on error via cached `previousData`
- Visual feedback via `isSending` state on optimistic messages
- Deduplication when Realtime event arrives for the same message

## Migration Plan

1. **Phase 0**: Prerequisites
   - Install `@tanstack/react-query` package
   - Create `QueryProvider` component
   - Wrap `app/layout.tsx` with `QueryProvider`

2. **Phase 1**: Backend (no breaking changes)
   - Implement services, repository, API routes
   - Add RLS policies to Supabase
   - All behind feature flag initially

3. **Phase 2**: Caching + Realtime Layer
   - Create `useBookingMessages` hook with `useInfiniteQuery`
   - Create `useSendMessage` hook with optimistic mutations
   - Integrate Supabase Realtime with cache updates
   - Write unit tests for hooks

4. **Phase 3**: Frontend (gradual rollout)
   - Deploy shared components using the hooks
   - Replace client messages placeholder
   - Create contractor messages page

5. **Phase 4**: Integration
   - Add chat to booking details
   - Update dashboard metrics
   - Enable for all users

6. **Phase 5**: Polish
   - Add email notifications
   - Performance optimization
   - Monitoring and logging
