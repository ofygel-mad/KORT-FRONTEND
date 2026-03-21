import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || `company-${Date.now()}`;
}

export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new NotFoundError('Organization', orgId);

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    mode: org.mode,
    currency: org.currency,
    industry: org.industry,
    onboarding_completed: org.onboardingCompleted,
  };
}

export async function updateOrganization(orgId: string, data: Record<string, unknown>) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: data.name as string | undefined,
      slug: data.slug ? sanitizeSlug(String(data.slug)) : undefined,
      mode: data.mode as string | undefined,
      currency: data.currency as string | undefined,
      industry: data.industry as string | undefined,
      onboardingCompleted: data.onboarding_completed as boolean | undefined,
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    mode: org.mode,
    currency: org.currency,
    industry: org.industry,
    onboarding_completed: org.onboardingCompleted,
  };
}

export async function searchCompanies(query: string) {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  return prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 20,
    select: {
      id: true,
      name: true,
      slug: true,
      mode: true,
      currency: true,
      industry: true,
      onboardingCompleted: true,
    },
  });
}
