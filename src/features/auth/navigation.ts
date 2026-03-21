import type { Membership, Org } from '../../shared/stores/auth';

export function resolvePostAuthPath(args: {
  org: Org | null;
  membership: Membership;
}) {
  if (args.membership.status !== 'active' || !args.org) {
    return '/settings/company-access';
  }

  if (
    args.membership.role === 'owner' &&
    !args.org.onboarding_completed
  ) {
    return '/onboarding';
  }

  return '/';
}
