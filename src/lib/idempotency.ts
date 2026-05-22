import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

const TTL_SECONDS = 60 * 60 * 24 // 24 hours

export async function withIdempotency(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = req.headers.get('Idempotency-Key')

  // If no key provided, just run normally
  if (!key) return handler()

  const redisKey = `idempotency:${key}`

  // Check if we already have a cached response for this key
  const cached = await redis.get<{ status: number; body: unknown }>(redisKey)

  if (cached) {
    // Return the exact same response as before
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: { 'X-Idempotent-Replayed': 'true' }
    })
  }

  // Run the actual handler
  const response = await handler()

  // Save the response to Redis
  const body = await response.json()
  await redis.set(
    redisKey,
    { status: response.status, body },
    { ex: TTL_SECONDS }
  )

  // Return the response (re-create since we consumed it above)
  return NextResponse.json(body, { status: response.status })
}