# Demo Simulation Specification Delta

**Capability:** demo-simulation
**Status:** Draft
**Related Change:** 2025-11-24-service-search-booking-demo

## Purpose

Provide a simulation system that automatically progresses bookings through their lifecycle for demonstration purposes, while also supporting simulated payments until Stripe integration is implemented.

## ADDED Requirements

### Requirement: DEMO-001 - Automatic Status Progression
The system SHALL automatically advance booking status through the lifecycle for demo purposes.

#### Scenario: Simulation starts at scheduled time
**Given** a booking is in CONFIRMED status
**And** the booking's scheduledDate has arrived
**When** the simulation check runs
**Then** the system advances the booking to ON_ROUTE
**And** schedules the next status change in 30 seconds

#### Scenario: Full automatic progression
**Given** a booking starts simulation at scheduledDate
**Then** the status progresses as follows:
  - ON_ROUTE (at scheduledDate)
  - ON_SITE (+30 seconds)
  - IN_PROGRESS (+30 seconds)
  - COMPLETED (+30 seconds)
**And** total simulation time is approximately 90 seconds

#### Scenario: Simulation creates state history
**Given** a booking transitions automatically
**Then** each transition creates a BookingStateHistory record
**And** changedBy is set to "SYSTEM" or the system user ID
**And** notes indicate "Automatic demo simulation"

### Requirement: DEMO-002 - Manual Override
The system SHALL allow contractors to manually advance status, overriding automatic simulation.

#### Scenario: Contractor advances status manually
**Given** a booking is being simulated automatically
**And** it's currently in ON_ROUTE status
**When** the contractor manually advances to IN_PROGRESS
**Then** the status changes immediately
**And** the automatic simulation continues from the new state
**And** changedBy reflects the contractor's user ID

#### Scenario: Contractor can skip simulation steps
**Given** a booking is in CONFIRMED status
**When** the contractor manually advances to IN_PROGRESS
**Then** the state machine allows valid skip transitions
**Or** returns error if the transition is invalid

### Requirement: DEMO-003 - Simulated Payment (ANTICIPO)
The system SHALL simulate the advance payment process.

#### Scenario: Simulating anticipo payment
**Given** a booking is in PENDING_PAYMENT status
**When** the client triggers simulated payment
**Then** the system creates a Payment record:
  - type: ANTICIPO
  - amount: booking.anticipoAmount
  - status: PENDING
**And** immediately updates status to SUCCEEDED
**And** transitions booking to CONFIRMED

#### Scenario: Simulated payment failure (optional demo mode)
**Given** demo mode is set to simulate failures
**When** a payment simulation is triggered
**Then** the system creates a Payment with status FAILED
**And** the booking remains in PENDING_PAYMENT
**And** an error message is displayed

### Requirement: DEMO-004 - Simulated Payment (LIQUIDACION)
The system SHALL simulate the final payment when service completes.

#### Scenario: Liquidacion on completion
**Given** a booking transitions to COMPLETED status
**When** the transition completes
**Then** the system creates a Payment record:
  - type: LIQUIDACION
  - amount: booking.liquidacionAmount
  - status: SUCCEEDED
**And** the contractor's payout is recorded (simulated)

### Requirement: DEMO-005 - Simulation Trigger API
The system SHALL provide an API endpoint to trigger simulation.

#### Scenario: Trigger immediate simulation start
**Given** a booking is in CONFIRMED status
**And** the scheduledDate is in the future
**When** a POST request is made to `/api/bookings/[id]/simulate`
**Then** the simulation starts immediately (overriding scheduledDate check)
**And** the response includes the estimated completion time

#### Scenario: Trigger simulation on past-due booking
**Given** a booking's scheduledDate has passed
**And** the booking is still in CONFIRMED status
**When** a GET request checks for pending simulations
**Then** the simulation is automatically triggered

### Requirement: DEMO-006 - Real-time Status Polling
The system SHALL support status polling for UI updates.

#### Scenario: Client polls for status updates
**Given** a client is viewing their booking detail page
**When** the page polls GET `/api/bookings/[id]` every 30 seconds
**Then** the latest booking status is returned
**And** the UI updates to reflect any status changes

#### Scenario: Polling includes state history
**Given** a booking has had multiple state transitions
**When** the detail endpoint is called
**Then** the response includes the full BookingStateHistory array
**And** entries are sorted by createdAt ascending

## Data Model

### Payment Table
Uses existing `Payment` table with fields:
- id, bookingId
- type (PaymentType: ANTICIPO, LIQUIDACION, REEMBOLSO)
- amount, currency (MXN)
- status (PaymentStatus: PENDING, SUCCEEDED, FAILED, REFUNDED)
- stripePaymentIntentId (null for simulated)
- stripeCheckoutSessionId (null for simulated)
- metadata (JSON for simulation flags)
- createdAt, updatedAt

### Simulation Metadata
Booking metadata can include:
```json
{
  "simulationEnabled": true,
  "simulationStartedAt": "2025-11-24T10:00:00Z",
  "nextTransitionAt": "2025-11-24T10:00:30Z",
  "simulationType": "AUTO" | "MANUAL"
}
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/bookings/[id]/simulate | Start/trigger simulation | CONTRACTOR, ADMIN |
| POST | /api/payments/simulate | Simulate payment | CLIENT |
| GET | /api/bookings/[id] | Get booking with history | Owner |

## Technical Implementation

### Simulation Service

```typescript
class DemoSimulationService {
  // Check for bookings ready to advance
  async checkPendingSimulations(): Promise<void>;

  // Advance a single booking to next state
  async advanceBookingState(bookingId: string): Promise<Booking>;

  // Schedule next state transition
  async scheduleNextTransition(bookingId: string, delayMs: number): Promise<void>;

  // Get next valid state for demo progression
  getNextDemoState(currentState: BookingStatus): BookingStatus | null;
}
```

### Simulation Flow

```
1. Booking created → PENDING_PAYMENT
2. Client simulates ANTICIPO payment
3. Payment SUCCEEDED → Booking transitions to CONFIRMED
4. Wait for scheduledDate OR manual trigger
5. Start simulation:
   - CONFIRMED → ON_ROUTE (immediate)
   - Wait 30s
   - ON_ROUTE → ON_SITE
   - Wait 30s
   - ON_SITE → IN_PROGRESS
   - Wait 30s
   - IN_PROGRESS → COMPLETED
6. On COMPLETED: Create LIQUIDACION payment
7. Simulation complete
```

### Cron/Scheduled Check (Implementation Option)

For serverless (Vercel), options include:
1. **Vercel Cron Jobs**: Schedule check every minute
2. **On-demand trigger**: Call endpoint when viewing booking
3. **Edge Function polling**: Background check on page load

Recommended: On-demand with cron backup for reliability.

## Business Rules

- **BR-DEMO-001**: Simulation only runs for CONFIRMED bookings
- **BR-DEMO-002**: Simulation respects 30-second intervals
- **BR-DEMO-003**: Manual override does not disable future auto-transitions
- **BR-DEMO-004**: All transitions (auto or manual) create state history
- **BR-DEMO-005**: Simulated payments have null Stripe IDs
- **BR-DEMO-006**: LIQUIDACION is auto-created on COMPLETED

## Security Considerations

- Only CONTRACTOR or ADMIN can trigger simulation manually
- Simulated payments are flagged in metadata
- Production flag should disable simulation endpoints
- Rate limiting on simulation trigger (1 per booking per minute)

## Configuration

```typescript
const DEMO_CONFIG = {
  TRANSITION_INTERVAL_MS: 30000, // 30 seconds
  ANTICIPO_PERCENTAGE: 0.30,    // 30%
  PLATFORM_COMMISSION: 0.10,    // 10%
  POLLING_INTERVAL_MS: 30000,   // 30 seconds
  SIMULATION_ENABLED: true,     // Feature flag
};
```
