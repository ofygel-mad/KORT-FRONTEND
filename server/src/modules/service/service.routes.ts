import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { config } from '../../config.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { signAccessToken, signRefreshToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';

const OWNER_CAPS = [
  'customers:read', 'customers:write',
  'deals:read', 'deals:write',
  'tasks:read', 'tasks:write',
  'reports.basic', 'customers.import',
  'billing.manage', 'integrations.manage',
  'audit.read', 'team.manage', 'automations.manage',
];

function safeCompare(provided: string, expected: string): boolean {
  // Constant-length buffers prevent timing attacks on length differences
  const pa = Buffer.allocUnsafe(128);
  const pb = Buffer.allocUnsafe(128);
  pa.fill(0);
  pb.fill(0);
  Buffer.from(provided).copy(pa);
  Buffer.from(expected).copy(pb);
  return timingSafeEqual(pa, pb) && provided === expected;
}

const accessSchema = z.object({
  password: z.string().min(1),
});

export async function serviceRoutes(app: FastifyInstance) {
  // Service console is disabled in production
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // POST /api/v1/service/access
  // Verifies the service password and returns a real owner session
  app.post('/access', async (request, reply) => {
    const body = accessSchema.parse(request.body);

    const expected = config.CONSOLE_SERVICE_PASSWORD;
    if (!expected || !safeCompare(body.password, expected)) {
      throw new UnauthorizedError('Access denied.');
    }

    // Find first active owner in the database
    const membership = await prisma.membership.findFirst({
      where: { role: 'owner', status: 'active' },
      include: { user: true, org: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!membership) {
      throw new UnauthorizedError('No active owner found. Run the seed script first.');
    }

    const { user, org } = membership;
    const jti = nanoid();
    const access = signAccessToken({ sub: user.id, email: user.email });
    const refresh = signRefreshToken({ sub: user.id, jti });

    await prisma.refreshToken.create({
      data: {
        id: jti,
        token: refresh,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({
      access,
      refresh,
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatarUrl,
        status: user.status,
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        mode: org.mode,
        currency: org.currency,
        onboarding_completed: org.onboardingCompleted,
      },
      role: 'owner',
      capabilities: OWNER_CAPS,
      membership: {
        companyId: org.id,
        companyName: org.name,
        companySlug: org.slug,
        status: 'active',
        role: 'owner',
        source: 'manual',
        requestId: null,
        inviteToken: null,
        joinedAt: membership.joinedAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
      },
    });
  });
}
