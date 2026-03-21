import { useAuthStore } from '../stores/auth';
import { useRole } from './useRole';

export type CompanyAccessState = 'anonymous' | 'no_company' | 'pending' | 'active' | 'rejected';

export function useCompanyAccess() {
  const user = useAuthStore((s) => s.user);
  const membership = useAuthStore((s) => s.membership);
  const inviteContext = useAuthStore((s) => s.inviteContext);
  const { isAdmin, isOwner, isManager, role } = useRole();

  const state: CompanyAccessState = !user
    ? 'anonymous'
    : membership.status === 'active'
      ? 'active'
      : membership.status === 'pending'
        ? 'pending'
        : membership.status === 'rejected'
          ? 'rejected'
          : 'no_company';

  const companyName = membership.companyName ?? inviteContext?.companyName ?? null;

  return {
    state,
    role,
    companyName,
    membership,
    inviteContext,
    isOwner,
    isAdmin,
    isManager,
    isAuthenticated: Boolean(user),
    hasCompanyAccess: state === 'active',
    needsApproval: state === 'pending',
    hasNoCompany: state === 'no_company',
    wasRejected: state === 'rejected',
  };
}
