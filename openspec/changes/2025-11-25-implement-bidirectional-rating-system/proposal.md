# Proposal: Implement Bidirectional Rating System

## Why

The current ReparaYa platform has database schema for client→contractor ratings but no implementation. Trust and accountability are critical for a service marketplace:
- Clients need to evaluate contractor reliability and quality
- Contractors need to identify problematic clients
- Double-blind mechanism prevents retaliation ratings

## What Changes

Implement a complete bidirectional rating system where clients rate contractors AND contractors rate clients after a service is completed. The system uses double-blind visibility - neither party sees the other's rating until both have submitted or after a 7-day deadline expires.

### Key Components
1. **Bidirectional Ratings**: Both clients and contractors can rate each other
2. **Double-Blind Visibility**: Ratings hidden until both parties submit or deadline expires
3. **Rating Statistics**: Aggregate ratings displayed on profiles and dashboards
4. **Moderation Support**: Basic moderation for comments with inappropriate content
5. **Seamless UX Integration**: Rating prompts integrated into existing booking flows

## Impact

- **Database**: New ClientRating and ContractorRating tables with migration
- **API**: New rating submission and retrieval endpoints
- **UI**: Rating prompts in booking flow, profile rating display
- **Performance**: Cached rating statistics for dashboard queries

## Non-Goals

- Complex dispute resolution for ratings (out of scope)
- Photo/video attachments in reviews (future enhancement)
- Tip integration with ratings (separate feature)
- AI-based sentiment analysis (future enhancement)

## Design Overview

### Database Schema Changes

**Option A: Separate Rating Tables (Recommended)**
- `ClientRating` (client rates contractor/service)
- `ContractorRating` (contractor rates client)
- Clear separation of concerns, easier querying

**Option B: Single Polymorphic Rating Table**
- Single `Rating` table with `raterType` and `rateeType` fields
- More complex queries, but single source of truth

**Decision**: Option A - Separate tables for clarity and performance optimization.

### New Tables

```prisma
model ClientRating {
  id               String           @id @default(uuid())
  bookingId        String           @unique
  serviceId        String
  contractorId     String
  clientId         String           // Who submitted the rating
  stars            Int              // 1-5
  comment          String?          @db.VarChar(500)
  moderationStatus ModerationStatus @default(PENDING)
  moderationNotes  String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // Relations
  booking          Booking          @relation("ClientRatingBooking", ...)
  contractor       User             @relation("ContractorRatings", ...)
  client           User             @relation("ClientGivenRatings", ...)
  service          Service          @relation(...)
}

model ContractorRating {
  id               String           @id @default(uuid())
  bookingId        String           @unique
  contractorId     String           // Who submitted the rating
  clientId         String           // Who is being rated
  stars            Int              // 1-5
  comment          String?          @db.VarChar(500)
  moderationStatus ModerationStatus @default(PENDING)
  moderationNotes  String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // Relations
  booking          Booking          @relation("ContractorRatingBooking", ...)
  contractor       User             @relation("ContractorGivenRatings", ...)
  client           User             @relation("ClientReceivedRatings", ...)
}

model UserRatingStats {
  userId       String   @id
  role         UserRole // CLIENT or CONTRACTOR
  average      Decimal  @db.Decimal(3, 2)
  totalRatings Int      @default(0)
  updatedAt    DateTime @updatedAt
  user         User     @relation(...)
}
```

### Double-Blind Logic

```typescript
// Rating visibility rules:
// 1. A rating is VISIBLE to the rated party if:
//    a) Both parties have submitted their ratings, OR
//    b) 7 days have passed since booking completion

function canSeeRating(booking: Booking, viewerId: string): boolean {
  const isClient = viewerId === booking.clientId;
  const isContractor = viewerId === booking.contractorId;

  const clientRating = await getClientRating(booking.id);
  const contractorRating = await getContractorRating(booking.id);

  const bothSubmitted = clientRating && contractorRating;
  const deadlineExpired = daysSince(booking.completedAt) >= 7;

  return bothSubmitted || deadlineExpired;
}
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/bookings/[id]/ratings/client` | Client rates contractor | CLIENT |
| POST | `/api/bookings/[id]/ratings/contractor` | Contractor rates client | CONTRACTOR |
| GET | `/api/bookings/[id]/ratings` | Get ratings for booking (respects visibility) | CLIENT/CONTRACTOR |
| GET | `/api/users/[id]/ratings` | Get public rating stats | PUBLIC |
| GET | `/api/services/[id]/ratings` | Get service ratings (paginated) | PUBLIC |
| GET | `/api/contractors/me/ratings` | Get contractor's received ratings | CONTRACTOR |
| GET | `/api/clients/me/ratings` | Get client's received ratings | CLIENT |

### UI Integration Points

1. **Dashboard Metrics**: Update "Calif. Promedio" card with real data
2. **Booking Detail Page**: Add rating submission form when booking is COMPLETED
3. **Rating Modal**: Modal component for submitting star rating + optional comment
4. **Ratings List**: Display received ratings on profile pages
5. **Rating Prompt**: Show banner/notification prompting rating after service completion

## Impact Analysis

### High Impact Areas
- Database schema modification (new tables, migrations)
- Booking module (rating triggers on COMPLETED status)
- Dashboard components (metrics display)
- User/contractor profiles (rating display)

### Medium Impact Areas
- API routes (new endpoints)
- Notification system (rating reminders)
- Admin moderation (comment review)

### Low Impact Areas
- Service catalog (display average ratings)
- Search results (rating filters - future)

## Dependencies

- **Booking Module**: Must have COMPLETED status working
- **User Auth**: Clerk authentication for role-based access
- **Notification System**: For rating reminders (can be deferred)

## Testing Strategy

See `tasks.md` for detailed test cases.

### Coverage Requirements
- Unit tests: 70%+ on ratings module
- Integration tests: All API endpoints
- E2E tests: Critical flows (submit rating, view ratings)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration on existing bookings | Medium | Migration handles NULL ratings gracefully |
| Double-blind logic edge cases | High | Comprehensive unit tests for visibility logic |
| Rating spam/abuse | Medium | Rate limiting + moderation queue |
| Performance on stats calculation | Low | Cached stats tables + async updates |

## Timeline Considerations

This proposal does not include timeline estimates. Implementation should be prioritized based on:
1. Schema migration (blocking)
2. Core rating submission APIs
3. Basic UI for rating submission
4. Dashboard integration
5. Profile/listing integration
6. Moderation features

## Open Questions

1. ~~Should ratings be bidirectional?~~ **Answered: Yes**
2. ~~Should visibility be double-blind?~~ **Answered: Yes**
3. Should there be a minimum character count for comments? (Suggestion: No, optional comments)
4. Should contractors be notified immediately when they receive a rating? (Suggestion: Yes, but content hidden until revealed)

## Testing Plan

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| TC-RF-RT-001-01 | Client can submit rating after booking COMPLETED | RF | High | rating-system |
| TC-RF-RT-002-01 | Contractor can submit rating after booking COMPLETED | RF | High | rating-system |
| TC-RF-RT-003-01 | Double-blind hides ratings until both submitted | RF | High | rating-visibility |
| TC-RF-RT-004-01 | Ratings revealed after 7-day deadline | RF | High | rating-visibility |
| TC-RF-RT-005-01 | Rating stats are aggregated correctly | RF | Medium | rating-statistics |
| TC-RF-RT-006-01 | Rating appears on contractor profile | RF | Medium | rating-display |
| TC-RF-RT-007-01 | Rating appears on client profile | RF | Medium | rating-display |
| TC-BR-RT-008-01 | Stars must be between 1 and 5 | BR | High | rating-validation |
| TC-BR-RT-009-01 | Comment limited to 500 characters | BR | Medium | rating-validation |
| TC-RNF-RT-010-01 | Stats query response < 200ms p95 | RNF | Medium | rating-performance |

**Coverage target:** ≥70% for rating module
