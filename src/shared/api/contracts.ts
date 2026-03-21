import type { InviteContext, Membership, MembershipRole, Org, OrgSummary, User } from '../stores/auth';

export interface AuthSessionResponse {
  access: string;
  refresh: string;
  user: User;
  org: Org | null;
  capabilities: string[];
  role: MembershipRole | 'viewer';
  membership: Membership;
  onboarding_completed?: boolean;
  orgs?: OrgSummary[];
}

export interface CompanyDirectoryItem extends Org {
  industry?: string;
}

export interface TeamMemberResponse {
  id: string;
  full_name: string;
  email: string;
  status: string;
  role?: MembershipRole | 'viewer';
}

export interface InviteRecord extends InviteContext {
  created_at: string;
  created_by: string;
  share_url: string;
  status: 'valid' | 'used' | 'expired';
}

export interface MembershipRequestRecord {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  company_id: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_role: MembershipRole;
  created_at: string;
}

export interface MembershipRequestSubmissionResponse {
  request: MembershipRequestRecord;
  membership: Membership;
}
