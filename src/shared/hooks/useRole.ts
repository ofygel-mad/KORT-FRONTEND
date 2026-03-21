import { useAuthStore, type MembershipRole } from '../stores/auth';

type Role = MembershipRole;

export function useRole() {
  const membershipStatus = useAuthStore((state) => state.membership.status);
  const membershipRole = useAuthStore((state) => state.membership.role);
  const fallbackRole = useAuthStore((state) => state.role) as Role;
  const role = (membershipStatus === 'active' ? (membershipRole ?? fallbackRole) : 'viewer') as Role;

  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';
  const isManager = isAdmin || role === 'manager';
  const isViewer = role === 'viewer';

  return { role, isOwner, isAdmin, isManager, isViewer };
}
