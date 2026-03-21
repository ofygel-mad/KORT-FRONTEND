import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../lib/errors.js';

const SHARED_CAPS = [
  'customers:read', 'customers:write',
  'deals:read', 'deals:write',
  'tasks:read', 'tasks:write',
  'reports.basic', 'customers.import',
];

const DUPLICATE_EMAIL_MESSAGE = 'Этот email уже привязан к существующему аккаунту. Один email можно использовать только для одного пользователя.';

function buildCapabilities(role: string, active: boolean): string[] {
  if (!active) {
    return [];
  }

  if (role === 'owner') {
    return [...SHARED_CAPS, 'billing.manage', 'integrations.manage', 'audit.read', 'team.manage', 'automations.manage'];
  }

  if (role === 'admin') {
    return [...SHARED_CAPS, 'integrations.manage', 'audit.read', 'team.manage', 'automations.manage'];
  }

  if (role === 'manager') {
    return SHARED_CAPS;
  }

  return ['reports.basic'];
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || `company-${Date.now()}`;
}

function appendSlugSuffix(base: string, suffix: number) {
  const suffixLabel = `-${suffix}`;
  return `${base.slice(0, Math.max(1, 48 - suffixLabel.length))}${suffixLabel}`;
}

function isUniqueConstraint(error: unknown, field: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes(field);
  }

  return typeof target === 'string' ? target.includes(field) : false;
}

async function generateUniqueOrganizationSlug(companyName: string, tx: Prisma.TransactionClient) {
  const base = sanitizeSlug(companyName);
  const existing = await tx.organization.findMany({
    where: {
      OR: [
        { slug: base },
        { slug: { startsWith: `${base}-` } },
      ],
    },
    select: { slug: true },
  });

  const usedSlugs = new Set(existing.map((item) => item.slug));
  if (!usedSlugs.has(base)) {
    return base;
  }

  let suffix = 2;
  let nextSlug = appendSlugSuffix(base, suffix);

  while (usedSlugs.has(nextSlug)) {
    suffix += 1;
    nextSlug = appendSlugSuffix(base, suffix);
  }

  return nextSlug;
}

async function createTokenPair(userId: string, email: string) {
  const jti = nanoid();
  const access = signAccessToken({ sub: userId, email });
  const refresh = signRefreshToken({ sub: userId, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      token: refresh,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { access, refresh };
}

function buildSessionResponse(
  user: { id: string; email: string; fullName: string; phone: string | null; avatarUrl: string | null; status: string },
  tokens: { access: string; refresh: string },
  membership: {
    orgId: string | null;
    role: string;
    status: string;
    source: string | null;
    joinedAt?: Date | null;
    updatedAt?: Date;
  } | null,
  org: { id: string; name: string; slug: string; mode: string; currency: string; onboardingCompleted: boolean } | null,
) {
  const role = membership?.status === 'active' ? membership.role : 'viewer';

  return {
    access: tokens.access,
    refresh: tokens.refresh,
    user: {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatarUrl,
      status: user.status,
    },
    org: org ? {
      id: org.id,
      name: org.name,
      slug: org.slug,
      mode: org.mode,
      currency: org.currency,
      onboarding_completed: org.onboardingCompleted,
    } : null,
    role,
    capabilities: buildCapabilities(role, membership?.status === 'active'),
    membership: {
      companyId: membership?.orgId ?? null,
      companyName: org?.name ?? null,
      companySlug: org?.slug ?? null,
      status: membership?.status ?? 'none',
      role: membership?.status === 'active' ? membership.role : null,
      source: membership?.source ?? null,
      requestId: null,
      inviteToken: null,
      joinedAt: membership?.joinedAt?.toISOString() ?? null,
      updatedAt: membership?.updatedAt?.toISOString() ?? new Date().toISOString(),
    },
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) {
    throw new UnauthorizedError('Аккаунт с таким email не найден. Проверьте адрес или зарегистрируйтесь.');
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Пароль неверный. Проверьте раскладку и попробуйте ещё раз.');
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'active' },
    include: { org: true },
    orderBy: { joinedAt: 'desc' },
  });

  const tokens = await createTokenPair(user.id, user.email);
  return buildSessionResponse(user, tokens, membership, membership?.org ?? null);
}

export async function registerEmployee(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  invite_token?: string;
}) {
  const email = normalizeEmail(data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        fullName: data.full_name.trim(),
        email,
        password: await hashPassword(data.password),
        phone: data.phone?.trim(),
        status: 'pending',
      },
    });
  } catch (error) {
    if (isUniqueConstraint(error, 'email')) {
      throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
    }
    throw error;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'active' },
    include: { org: true },
    orderBy: { joinedAt: 'desc' },
  });

  const tokens = await createTokenPair(user.id, user.email);
  return buildSessionResponse(user, tokens, membership, membership?.org ?? null);
}

export async function registerCompany(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  company_name: string;
}) {
  const email = normalizeEmail(data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName: data.full_name.trim(),
            email,
            password: await hashPassword(data.password),
            phone: data.phone?.trim(),
            status: 'active',
          },
        });

        const slug = await generateUniqueOrganizationSlug(data.company_name, tx);
        const org = await tx.organization.create({
          data: {
            name: data.company_name.trim(),
            slug,
            currency: 'KZT',
          },
        });

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            orgId: org.id,
            role: 'owner',
            status: 'active',
            source: 'company_registration',
            joinedAt: new Date(),
          },
        });

        await tx.chapanProfile.create({
          data: { orgId: org.id },
        });

        return { user, org, membership };
      });

      const tokens = await createTokenPair(result.user.id, result.user.email);
      return buildSessionResponse(result.user, tokens, result.membership, result.org);
    } catch (error) {
      if (isUniqueConstraint(error, 'email')) {
        throw new ConflictError(DUPLICATE_EMAIL_MESSAGE);
      }

      if (isUniqueConstraint(error, 'slug') && attempt < 3) {
        continue;
      }

      throw error;
    }
  }

  throw new ConflictError('Не удалось создать компанию. Попробуйте ещё раз.');
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Недействительный refresh-токен.');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new UnauthorizedError('Refresh-токен истёк или был отозван.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new UnauthorizedError('Пользователь не найден.');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await createTokenPair(user.id, user.email);
  return { access: tokens.access, refresh: tokens.refresh };
}

export async function bootstrap(userId: string, selectedOrgId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }

  const memberships = await prisma.membership.findMany({
    where: { userId, status: 'active' },
    include: { org: true },
    orderBy: { joinedAt: 'desc' },
  });

  let activeMembership = memberships[0] ?? null;
  if (selectedOrgId) {
    const found = memberships.find((m) => m.orgId === selectedOrgId);
    if (found) {
      activeMembership = found;
    }
  }

  const role = activeMembership ? activeMembership.role : 'viewer';

  return {
    user: {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatarUrl,
      status: user.status,
    },
    org: activeMembership?.org ? {
      id: activeMembership.org.id,
      name: activeMembership.org.name,
      slug: activeMembership.org.slug,
      mode: activeMembership.org.mode,
      currency: activeMembership.org.currency,
      onboarding_completed: activeMembership.org.onboardingCompleted,
    } : null,
    role,
    capabilities: buildCapabilities(role, activeMembership !== null),
    membership: {
      companyId: activeMembership?.orgId ?? null,
      companyName: activeMembership?.org?.name ?? null,
      companySlug: activeMembership?.org?.slug ?? null,
      status: activeMembership?.status ?? 'none',
      role: activeMembership ? activeMembership.role : null,
      source: activeMembership?.source ?? null,
      requestId: null,
      inviteToken: null,
      joinedAt: activeMembership?.joinedAt?.toISOString() ?? null,
      updatedAt: activeMembership?.updatedAt?.toISOString() ?? null,
    },
    orgs: memberships.map((m) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      mode: m.org.mode,
      currency: m.org.currency,
      onboarding_completed: m.org.onboardingCompleted,
      role: m.role,
    })),
  };
}

export async function acceptInviteAndBuildSession(userId: string, token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    throw new NotFoundError('Invite');
  }
  if (invite.usedAt) {
    throw new ValidationError('Это приглашение уже было использовано.');
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new ValidationError('Срок действия приглашения истёк.');
  }

  let membership: Awaited<ReturnType<typeof prisma.membership.upsert>>;

  await prisma.$transaction(async (tx) => {
    await tx.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedBy: userId },
    });

    membership = await tx.membership.upsert({
      where: { userId_orgId: { userId, orgId: invite.orgId } },
      create: {
        userId,
        orgId: invite.orgId,
        role: invite.role,
        status: invite.autoApprove ? 'active' : 'pending',
        source: 'invite',
        joinedAt: invite.autoApprove ? new Date() : null,
      },
      update: {
        role: invite.role,
        status: invite.autoApprove ? 'active' : 'pending',
        source: 'invite',
        joinedAt: invite.autoApprove ? new Date() : undefined,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { status: invite.autoApprove ? 'active' : 'pending' },
    });
  });

  const [user, org] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.organization.findUniqueOrThrow({ where: { id: invite.orgId } }),
  ]);

  const tokens = await createTokenPair(user.id, user.email);
  return buildSessionResponse(user, tokens, membership!, org);
}
