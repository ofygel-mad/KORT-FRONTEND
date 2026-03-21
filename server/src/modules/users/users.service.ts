import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User', userId);

  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatarUrl,
    status: user.status,
  };
}

export async function getTeam(orgId: string) {
  const members = await prisma.membership.findMany({
    where: { orgId, status: 'active' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.user.id,
    full_name: m.user.fullName,
    email: m.user.email,
    status: m.user.status,
    role: m.role,
  }));
}

export async function updateUserRole(userId: string, orgId: string, role: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new NotFoundError('Membership');

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role },
  });
}

export async function activateUser(userId: string, orgId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new ForbiddenError('Пользователь не является членом текущей организации.');

  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: 'active', joinedAt: membership.joinedAt ?? new Date() },
  });
}

export async function deactivateUser(userId: string, orgId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  if (!membership) throw new ForbiddenError('Пользователь не является членом текущей организации.');

  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: 'inactive' },
  });
}
