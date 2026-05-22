# Allo Inventory

A production-grade inventory management system demonstrating race-condition-free reservation logic with automatic expiry and idempotent operations. Built with Next.js, Prisma, PostgreSQL, and Redis.

## Features

- **Concurrent Reservation System** - Thread-safe product reservations with distributed locking
- **Automatic Expiry** - Lazy cleanup of expired reservations on read operations
- **Idempotent Operations** - Duplicate requests safely return cached responses (24-hour TTL)
- **Warehouse Tracking** - Real-time stock level updates across multiple warehouses
- **20-Second Reservation Window** - Fixed TTL for reservation confirmation


## Tech Stack

- **Frontend**: Next.js 16.2.6, React 19.2.4, TypeScript
- **Backend**: Next.js API Routes with idempotency middleware
- **Database**: PostgreSQL with Prisma ORM
- **Caching/Locking**: Redis (Upstash) for distributed locks and response caching
- **UI Framework**: shadcn/ui, TailwindCSS 4, Radix UI
- **Validation**: Zod (shared between frontend and API)
- **Linting**: ESLint 9

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (e.g., Supabase, Neon, Railway)
- Redis instance (e.g., Upstash)

### Local Setup

#### 1. Clone & Install
```bash
git clone <repo-url>
cd allo-inventory
npm install
```

#### 2. Environment Variables
Create a `.env` file with:
```env
# Database
DIRECT_URL=postgresql://user:password@host:5432/allo_inventory
DATABASE_URL=postgresql://user:password@host:5432/allo_inventory

# Redis
REDIS_URL=redis://username:password@host:port
```

**For Vercel deployment**, add these same variables to your project settings.

#### 3. Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Seed with sample data
npm run seed

# Generate Prisma Client
npx prisma generate
```

#### 4. Start Development
```bash
npm run dev
```

Open [http://localhost:3000]

#### Testing Locally
- Create a product and warehouse
- Reserve stock (20-second window)
- Confirm or wait for automatic release
- Retry requests with `Idempotency-Key` header to test idempotency

## Expiry Mechanism

### How It Works (Production)

Reservations expire after **20 seconds** if not confirmed. The system uses **lazy cleanup on read** — expired reservations are automatically released when:

1. A product inventory is queried (`GET /api/products`)
2. A reservation details are checked (`GET /api/reservations/[id]/details`)
3. A reservation confirmation is attempted (`POST /api/reservations/[id]/confirm`)

#### Lazy Cleanup Logic
```typescript
// When fetching products, expired PENDING reservations are auto-released
const expiredReservations = await prisma.reservation.findMany({
  where: {
    status: 'PENDING',
    expiresAt: { lt: new Date() }
  }
})

// For each expired reservation, decrement the reserved count
for (const reservation of expiredReservations) {
  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'RELEASED' }
    }),
    prisma.stock.update({
      where: { productId_warehouseId: { ... } },
      data: { reserved: { decrement: reservation.quantity } }
    })
  ])
}
```

### Why Lazy Cleanup?

- **No background worker needed** - simpler deployment (no cron jobs or separate services)
- **Vercel-compatible** - no serverless cold-start issues
- **Efficient** - only processes expired records when accessed
- **Guaranteed consistency** - cleanup happens in a transaction with stock updates

### Trade-offs
- Expired reservations may linger briefly in the database (cosmetic only, doesn't affect stock)
- Cleanup adds slight latency to product queries (O(n) for expired count)
- Better alternative with more time: **Vercel Cron jobs** (`/api/cron/cleanup`) for scheduled cleanup

## Idempotency Implementation

### How It Works

Both `/api/reservations` (reserve) and `/api/reservations/[id]/confirm` endpoints support idempotent requests via the `Idempotency-Key` header.

#### Request Format
```bash
POST /api/reservations
Idempotency-Key: my-unique-key-12345
Content-Type: application/json

{
  "productId": "prod-1",
  "warehouseId": "wh-1",
  "quantity": 5
}
```

#### Response Caching
1. **First request**: Executes the operation, caches response in Redis (24-hour TTL)
2. **Duplicate requests**: Returns cached response without side effects
3. **Cache key**: `idempotency:{endpoint}:{idempotency-key}`

#### Implementation Details

**Idempotency Middleware** (`src/lib/idempotency.ts`):
```typescript
export async function getCachedResponse(idempotencyKey, endpoint) {
  const key = `idempotency:${endpoint}:${idempotencyKey}`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export async function cacheResponse(idempotencyKey, endpoint, response) {
  const key = `idempotency:${endpoint}:${idempotencyKey}`
  await redis.set(key, JSON.stringify(response), { ex: 86400 }) // 24 hours
}
```

**Endpoint Integration** (`src/app/api/reservations/route.ts`):
```typescript
export async function POST(req: NextRequest) {
  return withIdempotency(req, async () => {
    // Execute reservation logic
    // Response is automatically cached
  })
}
```

### Why 24-Hour Cache?
- Prevents duplicate reservations for the same `Idempotency-Key`
- Long enough for client retry scenarios (network failures, timeouts)
- Redis cost is negligible for typical workloads
- Clients must use unique keys for new operations

### Testing Idempotency
```bash
# First call - creates reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Idempotency-Key: test-key-1" \
  -H "Content-Type: application/json" \
  -d '{"productId": "1", "warehouseId": "1", "quantity": 5}'

# Second call with same key - returns cached response
curl -X POST http://localhost:3000/api/reservations \
  -H "Idempotency-Key: test-key-1" \
  -H "Content-Type: application/json" \
  -d '{"productId": "1", "warehouseId": "1", "quantity": 5}'
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── products/     # Product management endpoints
│   │   ├── warehouses/   # Warehouse endpoints
│   │   └── reservations/ # Reservation management endpoints
│   ├── reservation/      # Reservation UI pages
│   └── page.tsx          # Home page
├── components/
│   ├── layout/          # Layout components
│   ├── product/         # Product-related components
│   └── ui/              # Reusable UI components
└── lib/
    ├── prisma.ts        # Prisma client
    ├── redis.ts         # Redis client
    ├── idempotency.ts   # Idempotency utilities
    └── utils.ts         # Utility functions

prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Database seed script
```

## Concurrency & Race Conditions

### Problem Statement
Multiple concurrent requests could:
1. Oversell inventory (two requests reserve the same units)
2. Double-confirm the same reservation
3. Leave inconsistent stock levels

### Solution: Distributed Locking

**Reserve Endpoint** uses Redis-based locks:
```typescript
const lockKey = `lock:${productId}:${warehouseId}`
const lockValue = crypto.randomUUID()

// Try to acquire lock (expires in 10 seconds)
const acquired = await redis.set(lockKey, lockValue, {
  nx: true,    // only set if not exists
  ex: 10,      // expire in 10 seconds
})

if (!acquired) {
  return NextResponse.json(
    { error: 'Another reservation is in progress, please retry' },
    { status: 429 }
  )
}

// Lock acquired - now safe to read and update stock
try {
  // Check available stock
  const stock = await prisma.stock.findUnique({ ... })
  
  // Update in a transaction
  await prisma.$transaction([
    prisma.reservation.create({ ... }),
    prisma.stock.update({ ... })
  ])
} finally {
  // Always release the lock
  await redis.del(lockKey)
}
```

### Why This Works
- **Atomic lock acquisition** - Redis `SET NX` is atomic
- **Transaction isolation** - Prisma transactions prevent race conditions on update
- **Fallback handling** - Returns 429 if lock can't be acquired, client can retry
- **Lock expiry** - 10-second TTL prevents deadlocks if process crashes

### Confirm Endpoint Safety
```typescript
// Check reservation status is still PENDING
if (reservation.status !== 'PENDING') {
  return error('Reservation is no longer pending') // Idempotent safety
}

// Atomic transaction prevents double-confirmation
await prisma.$transaction([
  prisma.reservation.update({ data: { status: 'CONFIRMED' } }),
  prisma.stock.update({ data: { total: { decrement }, reserved: { decrement } } })
])
```

## API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create a new product

### Warehouses
- `GET /api/warehouses` - List all warehouses
- `POST /api/warehouses` - Create a new warehouse

### Reservations
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create a new reservation (with `Idempotency-Key` support)
- `GET /api/reservations/[id]/details` - Get reservation details
- `POST /api/reservations/[id]/confirm` - Confirm a reservation (with `Idempotency-Key` support)
- `POST /api/reservations/[id]/release` - Release a reservation

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run seed       # Seed the database
```

## Trade-offs & Future Improvements

### Current Approach Trade-offs

| Aspect | Current | Alternative | Trade-off |
|--------|---------|-------------|-----------|
| **Expiry** | Lazy cleanup on read | Vercel Cron job | Simplicity vs. guaranteed cleanup timing |
| **Locking** | Redis-based | Database-based (SELECT FOR UPDATE) | Performance vs. no external dependency |
| **Idempotency** | 24-hour Redis cache | Event sourcing | Simplicity vs. audit trail |
| **Concurrency** | Optimistic locking + transactions | Pessimistic locking | Throughput vs. consistency guarantees |

### Things to Do With More Time

1. **Add Monitoring & Observability**
   - Track lock contention rates
   - Monitor expired reservation counts
   - Alert on idempotency cache misses

2. **Implement Scheduled Cleanup**
   ```bash
   # Vercel Cron Job at /api/cron/cleanup
   CRON_SECRET=... 
   Runs every 5 minutes to batch-cleanup expired reservations
   ```

3. **Add Distributed Tracing**
   - OpenTelemetry for request tracing
   - Correlate lock acquisitions with reservations

4. **Implement Event Sourcing**
   - Audit trail of all reservation state changes
   - Easier debugging of concurrency issues

5. **Add Rate Limiting**
   - Per-user request rate limits
   - Prevent lock exhaustion attacks

6. **Improve Lock Strategy**
   - Implement exponential backoff for failed lock acquisition
   - Add metrics for lock wait times

### Known Limitations

- **No authentication** - Anyone can make reservations (add NextAuth.js for production)
- **No audit logging** - Can't trace who made changes (add event sourcing)
- **Single Redis instance** - No replication (use Upstash Redis with replication)
- **In-memory product stock** - No snapshot history (archive old records periodically)

## Development

- The app uses **TypeScript end-to-end** for type safety
- Database migrations are managed with **Prisma**
- UI components follow **shadcn/ui** patterns with **TailwindCSS v4**
- Distributed locking handled by **Redis**
- Validation with **Zod** (shared schemas)

### Testing the Full Flow

1. **Create a Warehouse & Product** via UI
2. **Reserve Stock**
   - Open browser DevTools
   - Create reservation with `Idempotency-Key` header
   - Observe 20-second countdown
3. **Test Concurrency**
   - Open two browser tabs
   - Attempt simultaneous reservations
   - See one fail with "Another reservation is in progress" (429)
4. **Test Idempotency**
   - Retry same request with same `Idempotency-Key`
   - Verify cached response is returned
5. **Test Expiry**
   - Create reservation, wait 20+ seconds
   - Fetch products endpoint
   - Observe reservation auto-released and stock returned
6. **Test Confirm**
   - Create and confirm reservation within 20 seconds
   - Stock should decrement (not returned)






