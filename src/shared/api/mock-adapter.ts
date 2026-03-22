import { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import {
  buildConsoleMockSession,
  LOCAL_CONSOLE_ACCESS_TOKEN,
  LOCAL_CONSOLE_REFRESH_TOKEN,
} from '../../console/devSession';
import type {
  AuthSessionResponse,
  CompanyDirectoryItem,
  InviteRecord,
  MembershipRequestRecord,
  MembershipRequestSubmissionResponse,
  TeamMemberResponse,
} from './contracts';
import type {
  Membership,
  MembershipRole,
  MembershipSource,
  MembershipStatus,
  Org,
  OrgSummary,
} from '../stores/auth';
import {
  attachInviteToSession,
  cloneSession,
  MOCK_AUTH_SESSIONS,
  MOCK_COMPANIES,
  MOCK_CUSTOMERS,
  MOCK_DASHBOARD,
  MOCK_DEALS,
  MOCK_INVITES,
  MOCK_MEMBERSHIP_REQUESTS,
  MOCK_PIPELINE,
  MOCK_TASKS,
  type MockAuthSession,
} from './mock-data';

type AnyRecord = Record<string, any>;

const companies = structuredClone(MOCK_COMPANIES) as CompanyDirectoryItem[];
const sessions = structuredClone(MOCK_AUTH_SESSIONS) as MockAuthSession[];
const invites = structuredClone(MOCK_INVITES) as InviteRecord[];
const membershipRequests = structuredClone(MOCK_MEMBERSHIP_REQUESTS) as MembershipRequestRecord[];
let mockCustomers = structuredClone(MOCK_CUSTOMERS);
let mockDeals = structuredClone(MOCK_DEALS);
let mockTasks = structuredClone(MOCK_TASKS);
let mockPipeline = structuredClone(MOCK_PIPELINE);

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function parseBody(config: InternalAxiosRequestConfig<any>) {
  if (!config.data) return {};
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data as AnyRecord;
}

function withResponse(config: InternalAxiosRequestConfig<any>, data: unknown, status = 200) {
  config.adapter = async () => {
    const response = {
      data,
      status,
      statusText: status >= 400 ? 'ERROR' : 'OK',
      headers: {},
      config,
    };

    if (status >= 400) {
      throw new AxiosError(
        typeof data === 'object' && data && 'message' in (data as AnyRecord)
          ? String((data as AnyRecord).message)
          : `Mock request failed with status ${status}`,
        undefined,
        config,
        undefined,
        response,
      );
    }

    return response;
  };
  return config;
}

function extractBearerToken(config: InternalAxiosRequestConfig<any>) {
  const raw = config.headers?.Authorization ?? config.headers?.authorization;
  if (!raw || typeof raw !== 'string' || !raw.startsWith('Bearer ')) return null;
  return raw.slice('Bearer '.length).trim();
}

function buildCapabilities(role: MembershipRole | 'viewer', active: boolean) {
  if (!active) return [];

  const shared = [
    'customers:read',
    'customers:write',
    'deals:read',
    'deals:write',
    'tasks:read',
    'tasks:write',
    'reports.basic',
    'customers.import',
  ];

  if (role === 'owner') {
    return [
      ...shared,
      'billing.manage',
      'integrations.manage',
      'audit.read',
      'team.manage',
      'automations.manage',
    ];
  }

  if (role === 'admin') {
    return [
      ...shared,
      'integrations.manage',
      'audit.read',
      'team.manage',
      'automations.manage',
    ];
  }

  if (role === 'manager') {
    return shared;
  }

  return ['reports.basic'];
}

function buildMembership(
  company: CompanyDirectoryItem | Org | null,
  role: MembershipRole | null,
  status: MembershipStatus,
  source: MembershipSource | null,
  overrides: Partial<Membership> = {},
): Membership {
  return {
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    companySlug: company?.slug ?? null,
    status,
    role,
    source,
    requestId: null,
    inviteToken: null,
    joinedAt: status === 'active' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || `company-${Date.now()}`;
}

function findSessionByToken(token: string | null) {
  if (!token) return null;
  if (token === LOCAL_CONSOLE_ACCESS_TOKEN || token === LOCAL_CONSOLE_REFRESH_TOKEN) {
    return buildConsoleMockSession();
  }
  return sessions.find((session) => session.access === token || session.refresh === token) ?? null;
}

function getSession(config: InternalAxiosRequestConfig<any>) {
  return findSessionByToken(extractBearerToken(config));
}

function toAuthSession(session: MockAuthSession): AuthSessionResponse {
  const { password: _password, ...rest } = cloneSession(session);
  return rest;
}

function updateSession(nextSession: MockAuthSession) {
  const index = sessions.findIndex((session) => session.user.id === nextSession.user.id);
  if (index >= 0) {
    sessions[index] = nextSession;
  } else {
    sessions.unshift(nextSession);
  }
  return nextSession;
}

function getCompanyIdForSession(session: MockAuthSession | null) {
  return session?.membership.companyId ?? session?.org?.id ?? null;
}

function applyInviteToSession(session: MockAuthSession, token: string) {
  const invite = invites.find((item) => item.token === token);
  if (!invite) return null;
  const nextSession = attachInviteToSession(session, invite);
  updateSession(nextSession);
  return nextSession;
}

function buildTeam(companyId: string | null): TeamMemberResponse[] {
  if (!companyId) return [];
  return sessions
    .filter((session) => session.membership.companyId === companyId && session.membership.status === 'active')
    .map((session) => ({
      id: session.user.id,
      full_name: session.user.full_name,
      email: session.user.email,
      status: session.user.status ?? 'active',
      role: session.membership.role ?? session.role,
    }));
}

function getMockUserOrgs(session: MockAuthSession): OrgSummary[] {
  const primary: OrgSummary[] = session.org && session.membership.status === 'active'
    ? [{
        id: session.org.id,
        name: session.org.name,
        slug: session.org.slug,
        mode: session.org.mode as OrgSummary['mode'],
        currency: session.org.currency,
        onboarding_completed: session.org.onboarding_completed,
        role: (session.membership.role ?? session.role) as OrgSummary['role'],
      }]
    : [];

  // u-001 (Demo Company owner) also has manager access to Northwind in the demo
  if (session.user.id === 'u-001') {
    const northwind = companies.find((c) => c.id === 'org-002');
    if (northwind && !primary.find((o) => o.id === northwind.id)) {
      primary.push({
        id: northwind.id,
        name: northwind.name,
        slug: northwind.slug,
        mode: northwind.mode as OrgSummary['mode'],
        currency: northwind.currency,
        onboarding_completed: northwind.onboarding_completed,
        role: 'manager',
      });
    }
  }

  return primary;
}

function updateCompanyAcrossSessions(company: CompanyDirectoryItem) {
  sessions.forEach((session, index) => {
    if (session.membership.companyId !== company.id) return;
    sessions[index] = {
      ...session,
      org: session.membership.status === 'active' ? company : session.org,
      membership: {
        ...session.membership,
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
        updatedAt: new Date().toISOString(),
      },
    };
  });
}

function createEmployeeSession(args: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const id = `u-${Date.now()}`;
  const session: MockAuthSession = {
    access: `mock_access_${id}`,
    refresh: `mock_refresh_${id}`,
    user: {
      id,
      full_name: args.full_name,
      email: args.email,
      phone: args.phone,
      avatar_url: null,
      status: 'pending',
    },
    org: null,
    capabilities: [],
    role: 'viewer',
    membership: buildMembership(null, null, 'none', 'employee_registration'),
    password: args.password,
  };
  return updateSession(session);
}

function createCompanySession(args: {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  company_name: string;
}) {
  const company: CompanyDirectoryItem = {
    id: `org-${Date.now()}`,
    name: args.company_name,
    slug: sanitizeSlug(args.company_name),
    mode: 'basic',
    currency: 'KZT',
    onboarding_completed: false,
    industry: 'Новая компания',
  };
  companies.unshift(company);

  const id = `u-${Date.now()}`;
  const session: MockAuthSession = {
    access: `mock_access_${id}`,
    refresh: `mock_refresh_${id}`,
    user: {
      id,
      full_name: args.full_name,
      email: args.email,
      phone: args.phone,
      avatar_url: null,
      status: 'active',
    },
    org: company,
    capabilities: buildCapabilities('owner', true),
    role: 'owner',
    membership: buildMembership(company, 'owner', 'active', 'company_registration'),
    password: args.password,
  };
  return updateSession(session);
}

function searchResults(query: string) {
  const q = query.toLowerCase();
  const results = [
    ...mockCustomers
      .filter((customer) => customer.full_name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((customer) => ({
        id: customer.id,
        type: 'customer',
        label: customer.full_name,
        sublabel: customer.company_name || customer.phone,
        path: `/customers/${customer.id}/`,
      })),
    ...mockDeals
      .filter((deal) => deal.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((deal) => ({
        id: deal.id,
        type: 'deal',
        label: deal.title,
        sublabel: deal.customer_name,
        path: `/deals/${deal.id}/`,
      })),
    ...mockTasks
      .filter((task) => task.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((task) => ({
        id: task.id,
        type: 'task',
        label: task.title,
        sublabel: task.priority,
        path: '/tasks',
      })),
  ];
  return { count: results.length, results };
}

function toPipelineStage(stage: typeof mockPipeline.stages[number]) {
  return {
    id: stage.id,
    name: stage.name,
    position: stage.position,
    type: stage.stage_type,
    color: stage.color,
  };
}

function buildCustomerDetail(customerId: string) {
  const customer = mockCustomers.find((item) => item.id === customerId) ?? mockCustomers[0];
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    full_name: customer.full_name,
    company_name: customer.company_name,
    phone: customer.phone,
    email: customer.email,
    source: customer.source ?? 'Ручное добавление',
    status: customer.status ?? 'new',
    owner: null,
    tags: [],
    notes: '',
    created_at: customer.created_at ?? new Date().toISOString(),
    updated_at: customer.created_at ?? new Date().toISOString(),
    last_contact_at: null,
    follow_up_due_at: null,
    response_state: null,
    next_action_note: null,
  };
}

function buildDealDetail(dealId: string) {
  const deal = mockDeals.find((item) => item.id === dealId) ?? mockDeals[0];
  if (!deal) {
    return null;
  }

  const stage = mockPipeline.stages.find((item) => item.id === deal.stage_id) ?? mockPipeline.stages[0];
  const customer = mockCustomers.find((item) => item.id === deal.customer_id)
    ?? (deal.customer?.id ? mockCustomers.find((item) => item.id === deal.customer.id) : null)
    ?? null;
  const owner = sessions[0]?.user ?? null;

  return {
    id: deal.id,
    title: deal.title,
    amount: deal.amount ?? null,
    currency: deal.currency ?? 'KZT',
    status: deal.status ?? 'open',
    created_at: deal.created_at ?? new Date().toISOString(),
    expected_close_date: null,
    next_step: '',
    customer: customer ? {
      id: customer.id,
      full_name: customer.full_name,
      company_name: customer.company_name,
      phone: customer.phone,
      email: customer.email,
    } : null,
    owner: owner ? { id: owner.id, full_name: owner.full_name } : null,
    stage: stage ? toPipelineStage(stage) : null,
    pipeline: {
      id: mockPipeline.id,
      name: mockPipeline.name,
      stages: mockPipeline.stages.map(toPipelineStage),
    },
  };
}

export function installMockAdapter(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    await delay();

    const url = (config.url ?? '').replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
    const method = (config.method ?? 'get').toLowerCase();
    const body = parseBody(config);
    const params = (config.params ?? {}) as AnyRecord;
    const session = getSession(config);

    if (url === '/auth/login' && method === 'post') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const phone = String(body.phone ?? '').trim();
      const password = String(body.password ?? '');
      const found = email
        ? sessions.find((item) => item.user.email.toLowerCase() === email) ?? null
        : null;
      const byPhone = !found && phone
        ? sessions.find((item) => item.user.phone === phone) ?? null
        : null;
      const matched = found ?? byPhone;
      if (!matched) return withResponse(config, null);
      if (matched.password !== password) {
        return withResponse(config, {
          code: 'UNAUTHORIZED',
          error: 'UNAUTHORIZED',
          message: 'Неверный пароль.',
          detail: 'Неверный пароль.',
        }, 401);
      }
      const nextSession = cloneSession(matched);
      updateSession(nextSession);
      const orgs = getMockUserOrgs(nextSession);
      return withResponse(config, { ...toAuthSession(nextSession), orgs });
    }

    if (url === '/auth/register/employee' && method === 'post') {
      const nextSession = createEmployeeSession({
        full_name: String(body.full_name ?? '').trim() || 'Новый сотрудник',
        email: String(body.email ?? '').trim().toLowerCase(),
        password: String(body.password ?? '').trim() || 'demo',
        phone: String(body.phone ?? '').trim() || undefined,
      });
      return withResponse(config, { ...toAuthSession(nextSession), orgs: getMockUserOrgs(nextSession) });
    }

    if (url === '/auth/register/company' && method === 'post') {
      const nextSession = createCompanySession({
        full_name: String(body.full_name ?? '').trim() || 'Владелец компании',
        email: String(body.email ?? '').trim().toLowerCase(),
        password: String(body.password ?? '').trim() || 'demo',
        phone: String(body.phone ?? '').trim() || undefined,
        company_name: String(body.company_name ?? '').trim() || 'Новая компания',
      });
      return withResponse(config, { ...toAuthSession(nextSession), orgs: getMockUserOrgs(nextSession) });
    }

    // ── First-login: set password ──────────────────────────────────────────────
    // Called by SetPasswordStep with a temp_token — returns full AuthSessionResponse.
    if ((url === '/auth/set-password' || url === '/auth/set-password/') && method === 'post') {
      const token = extractBearerToken(config);
      // In mock mode the temp_token equals the session access token,
      // so we can resolve the user from it.
      const found = token ? sessions.find(
        (s) => s.access === token || s.user.id === token,
      ) ?? sessions[0] : sessions[0];
      const nextSession = cloneSession(found);
      // Update the stored password so subsequent logins work.
      const password = String(body.new_password ?? '').trim();
      if (password) {
        const target = sessions.find((s) => s.user.id === found.user.id);
        if (target) target.password = password;
      }
      return withResponse(config, { ...toAuthSession(nextSession), orgs: getMockUserOrgs(nextSession) });
    }

    if (url === '/auth/token/refresh' && method === 'post') {
      const refresh = String(body.refresh ?? '').trim();
      const found = findSessionByToken(refresh);
      if (!found) return withResponse(config, { detail: 'Invalid refresh token' }, 401);
      return withResponse(config, { access: found.access, refresh: found.refresh });
    }

    if ((url === '/bootstrap' || url === '/auth/bootstrap' || url === '/me' || url === '/auth/me') && method === 'get') {
      if (!session) return withResponse(config, null);

      const xOrgId = String(
        config.headers?.['x-org-id'] ?? config.headers?.['X-Org-Id'] ?? '',
      ).trim();

      let activeSession = session;
      if (xOrgId && xOrgId !== session.org?.id) {
        const targetCompany = companies.find((c) => c.id === xOrgId);
        const userOrgs = getMockUserOrgs(session);
        const targetOrgEntry = userOrgs.find((o) => o.id === xOrgId);
        if (targetCompany && targetOrgEntry) {
          const role = targetOrgEntry.role as MembershipRole;
          activeSession = {
            ...session,
            org: targetCompany,
            role,
            capabilities: buildCapabilities(role, true),
            membership: buildMembership(targetCompany, role, 'active', 'manual'),
          };
        }
      }

      const orgs = getMockUserOrgs(session);
      return withResponse(config, { ...toAuthSession(activeSession), orgs });
    }

    if (url === '/companies/search' && method === 'get') {
      const q = String(params.q ?? '').trim().toLowerCase();
      const results = !q ? [] : companies.filter((company) => company.name.toLowerCase().includes(q) || company.slug.includes(q));
      return withResponse(config, { count: results.length, results: clone(results) });
    }

    if (url === '/membership-requests' && method === 'post') {
      if (!session) return withResponse(config, null, 401);
      const companyId = String(body.company_id ?? '').trim();
      const company = companies.find((item) => item.id === companyId);
      if (!company) return withResponse(config, null);

      const existing = membershipRequests.find(
        (item) => item.user_id === session.user.id && item.company_id === companyId && item.status === 'pending',
      );

      const request = existing ?? {
        id: `req-${Date.now()}`,
        user_id: session.user.id,
        full_name: session.user.full_name,
        email: session.user.email,
        company_id: company.id,
        company_name: company.name,
        status: 'pending',
        requested_role: 'viewer',
        created_at: new Date().toISOString(),
      };

      if (!existing) membershipRequests.unshift(request);

      const membership = buildMembership(company, 'viewer', 'pending', 'request', { requestId: request.id });
      updateSession({
        ...session,
        membership,
        org: null,
        role: 'viewer',
        capabilities: [],
      });

      const payload: MembershipRequestSubmissionResponse = {
        request: clone(request),
        membership,
      };
      return withResponse(config, payload);
    }

    if (url === '/membership-requests/me' && method === 'get') {
      const results = membershipRequests.filter((item) => item.user_id === session?.user.id);
      return withResponse(config, { count: results.length, results: clone(results) });
    }

    if (url === '/admin/invites' && method === 'post') {
      if (!session) return withResponse(config, null, 401);
      const companyId = getCompanyIdForSession(session);
      const company = companies.find((item) => item.id === companyId);
      if (!company) return withResponse(config, null);

      const token = `invite-${Date.now()}`;
      const invite: InviteRecord = {
        token,
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
        role: (body.role as MembershipRole) ?? 'manager',
        autoApprove: true,
        kind: (body.kind as 'invite' | 'referral') ?? 'referral',
        created_at: new Date().toISOString(),
        created_by: session.user.id,
        share_url: `https://kort.local/auth/accept-invite?token=${token}`,
        expiresAt: null,
        status: 'valid',
      };
      invites.unshift(invite);
      return withResponse(config, clone(invite));
    }

    if (url === '/admin/invites' && method === 'get') {
      const companyId = getCompanyIdForSession(session);
      const results = invites.filter((invite) => !companyId || invite.companyId === companyId);
      return withResponse(config, { count: results.length, results: clone(results) });
    }

    if (url === '/admin/membership-requests' && method === 'get') {
      const companyId = getCompanyIdForSession(session);
      const results = membershipRequests.filter((item) => !companyId || item.company_id === companyId);
      return withResponse(config, { count: results.length, results: clone(results) });
    }

    if (/^\/admin\/membership-requests\/[^/]+\/approve$/.test(url) && method === 'post') {
      const requestId = url.split('/')[3];
      const request = membershipRequests.find((item) => item.id === requestId);
      if (!request) return withResponse(config, null);
      request.status = 'approved';

      const target = sessions.find((item) => item.user.id === request.user_id);
      const company = companies.find((item) => item.id === request.company_id);
      if (target && company) {
        const nextRole = request.requested_role;
        updateSession({
          ...target,
          user: { ...target.user, status: 'active' },
          org: company,
          role: nextRole,
          capabilities: buildCapabilities(nextRole, true),
          membership: buildMembership(company, nextRole, 'active', 'request', { requestId: request.id }),
        });
      }
      return withResponse(config, { ok: true });
    }

    if (/^\/admin\/membership-requests\/[^/]+\/reject$/.test(url) && method === 'post') {
      const requestId = url.split('/')[3];
      const request = membershipRequests.find((item) => item.id === requestId);
      if (!request) return withResponse(config, null);
      request.status = 'rejected';

      const target = sessions.find((item) => item.user.id === request.user_id);
      const company = companies.find((item) => item.id === request.company_id) ?? null;
      if (target) {
        updateSession({
          ...target,
          user: { ...target.user, status: 'pending' },
          org: null,
          role: 'viewer',
          capabilities: [],
          membership: buildMembership(company, 'viewer', 'rejected', 'request', { requestId: request.id }),
        });
      }
      return withResponse(config, { ok: true });
    }

    if (/^\/invites\/[^/]+\/accept$/.test(url) && method === 'post') {
      if (!session) return withResponse(config, { code: 'UNAUTHORIZED', message: 'Требуется авторизация.' }, 401);
      const token = decodeURIComponent(url.split('/')[2]);
      const invite = invites.find((item) => item.token === token);
      if (!invite) return withResponse(config, { code: 'NOT_FOUND', message: 'Приглашение не найдено.' }, 404);
      if (invite.status === 'used') return withResponse(config, { code: 'VALIDATION', message: 'Это приглашение уже было использовано.' }, 400);
      if (invite.status === 'expired') return withResponse(config, { code: 'VALIDATION', message: 'Срок действия приглашения истёк.' }, 400);
      invite.status = 'used';
      const nextSession = applyInviteToSession(session, token);
      return withResponse(config, nextSession ? toAuthSession(nextSession) : null);
    }

    if (/^\/invites\/[^/]+$/.test(url) && method === 'get') {
      const token = decodeURIComponent(url.split('/')[2]);
      return withResponse(config, clone(invites.find((invite) => invite.token === token) ?? null));
    }

    if (url === '/organization' && method === 'get') {
      return withResponse(config, clone(session?.org ?? companies[0]));
    }

    if (url === '/organization' && (method === 'patch' || method === 'put')) {
      const companyId = getCompanyIdForSession(session);
      const company = companies.find((item) => item.id === companyId);
      if (!company) return withResponse(config, null);
      Object.assign(company, {
        ...body,
        slug: body.slug ? sanitizeSlug(String(body.slug)) : company.slug,
      });
      updateCompanyAcrossSessions(company);
      return withResponse(config, clone(company));
    }

    if (url === '/workspaces' && method === 'post') {
      if (!session) return withResponse(config, null, 401);

      const workspace = {
        id: `ws-${Date.now()}`,
        name: String(body.name ?? '').trim() || 'Новое производство',
        description: String(body.description ?? '').trim(),
        prefix: String(body.prefix ?? '').trim().toUpperCase(),
        status: 'created',
        created_at: new Date().toISOString(),
      };

      return withResponse(config, workspace);
    }

    if (url === '/users/team' && method === 'get') {
      const results = buildTeam(getCompanyIdForSession(session));
      return withResponse(config, { count: results.length, results });
    }

    if (/^\/users\/[^/]+\/role$/.test(url) && method === 'patch') {
      const userId = url.split('/')[2];
      const target = sessions.find((item) => item.user.id === userId);
      if (!target) return withResponse(config, null);
      const nextRole = (body.role as MembershipRole) ?? 'viewer';
      const active = target.membership.status === 'active';
      updateSession({
        ...target,
        role: active ? nextRole : 'viewer',
        capabilities: buildCapabilities(nextRole, active),
        membership: {
          ...target.membership,
          role: active ? nextRole : target.membership.role,
          updatedAt: new Date().toISOString(),
        },
      });
      return withResponse(config, { ok: true });
    }

    if (/^\/users\/[^/]+\/activate$/.test(url) && method === 'post') {
      const userId = url.split('/')[2];
      const target = sessions.find((item) => item.user.id === userId);
      if (!target) return withResponse(config, null);
      updateSession({
        ...target,
        user: { ...target.user, status: 'active' },
        membership: {
          ...target.membership,
          status: 'active',
          joinedAt: target.membership.joinedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      return withResponse(config, { ok: true });
    }

    if (/^\/users\/[^/]+\/deactivate$/.test(url) && method === 'post') {
      const userId = url.split('/')[2];
      const target = sessions.find((item) => item.user.id === userId);
      if (!target) return withResponse(config, null);
      updateSession({
        ...target,
        user: { ...target.user, status: 'inactive' },
        membership: {
          ...target.membership,
          updatedAt: new Date().toISOString(),
        },
      });
      return withResponse(config, { ok: true });
    }

    if (url === '/users/me' && method === 'get') {
      return withResponse(config, clone(session?.user ?? null));
    }

    if (url === '/reports/dashboard' && method === 'get') {
      return withResponse(config, clone(MOCK_DASHBOARD));
    }

    if (url === '/customers' && method === 'get') {
      return withResponse(config, { count: mockCustomers.length, results: clone(mockCustomers) });
    }

    if (url === '/customers' && method === 'post') {
      const created = {
        id: `c-${Date.now()}`,
        ...body,
        status: 'new',
        created_at: new Date().toISOString(),
        health: { score: 50, band: 'at_risk' },
        notes: '',
        tags: [],
      };
      mockCustomers = [created, ...mockCustomers];
      return withResponse(config, created);
    }

    if (/^\/customers\/[^/]+$/.test(url)) {
      const id = url.split('/')[2];
      if (method === 'patch' || method === 'put') {
        mockCustomers = mockCustomers.map((customer) => customer.id === id ? { ...customer, ...body } : customer);
      }
      return withResponse(config, clone(buildCustomerDetail(id)));
    }

    if (url === '/deals/board' && method === 'get') {
      return withResponse(config, {
        pipeline: clone(mockPipeline),
        deals: clone(mockDeals),
        total_open: mockDeals.filter((deal) => deal.status === 'open').length,
        total_amount: mockDeals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0),
      });
    }

    if (url === '/deals' && method === 'get') {
      return withResponse(config, { count: mockDeals.length, results: clone(mockDeals) });
    }

    if (url === '/deals' && method === 'post') {
      const stage = mockPipeline.stages.find((item) => item.id === body.stage_id) ?? mockPipeline.stages[0];
      const customer = mockCustomers.find((item) => item.id === body.customer_id) ?? null;
      const created = {
        id: `d-${Date.now()}`,
        title: String(body.title ?? '').trim(),
        amount: body.amount == null || body.amount === '' ? 0 : Number(body.amount),
        currency: String(body.currency ?? 'KZT'),
        customer_id: String(body.customer_id ?? ''),
        customer_name: customer?.full_name ?? 'Без клиента',
        customer: customer
          ? { id: customer.id, full_name: customer.full_name }
          : { id: 'c-unknown', full_name: 'Без клиента' },
        pipeline_id: mockPipeline.id,
        stage_id: stage?.id ?? '',
        stage: stage?.name ?? 'Новый этап',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        days_silent: 0,
      };
      mockDeals = [created, ...mockDeals];
      return withResponse(config, created);
    }

    if (/^\/deals\/[^/]+$/.test(url)) {
      const id = url.split('/')[2];
      if (method === 'patch' || method === 'put') {
        mockDeals = mockDeals.map((deal) => {
          if (deal.id !== id) {
            return deal;
          }

          const nextStage = body.stage_id
            ? mockPipeline.stages.find((item) => item.id === body.stage_id) ?? null
            : null;

          return {
            ...deal,
            ...body,
            stage_id: nextStage?.id ?? deal.stage_id,
            stage: nextStage?.name ?? deal.stage,
            updated_at: new Date().toISOString(),
          };
        });
      }
      return withResponse(config, clone(buildDealDetail(id)));
    }

    if (url.startsWith('/pipelines') && method === 'get') {
      return withResponse(config, { count: 1, results: [clone(mockPipeline)] });
    }

    if (/^\/pipelines\/[^/]+\/stages\/reorder$/.test(url) && method === 'post') {
      const order = Array.isArray(body.order) ? body.order : [];
      mockPipeline.stages = order
        .map((id: string, index: number) => {
          const stage = mockPipeline.stages.find((item) => item.id === id);
          return stage ? { ...stage, position: index + 1 } : null;
        })
        .filter(Boolean) as typeof mockPipeline.stages;
      return withResponse(config, { ok: true });
    }

    if (/^\/pipelines\/[^/]+\/stages$/.test(url) && method === 'post') {
      const stage = {
        id: `s-${Date.now()}`,
        name: String(body.name ?? 'Новый этап'),
        position: mockPipeline.stages.length + 1,
        stage_type: 'open',
        color: '#6B7280',
        deals: [],
      };
      mockPipeline.stages.push(stage);
      return withResponse(config, stage);
    }

    if (/^\/pipelines\/[^/]+\/stages\/[^/]+$/.test(url) && (method === 'patch' || method === 'put')) {
      const stageId = url.split('/')[4];
      mockPipeline.stages = mockPipeline.stages.map((stage) => stage.id === stageId ? { ...stage, ...body } : stage);
      return withResponse(config, clone(mockPipeline.stages.find((stage) => stage.id === stageId) ?? null));
    }

    if (/^\/pipelines\/[^/]+\/stages\/[^/]+$/.test(url) && method === 'delete') {
      const stageId = url.split('/')[4];
      mockPipeline.stages = mockPipeline.stages.filter((stage) => stage.id !== stageId);
      return withResponse(config, { ok: true });
    }

    if (url === '/tasks' && method === 'get') {
      return withResponse(config, { count: mockTasks.length, results: clone(mockTasks) });
    }

    if (url === '/tasks' && method === 'post') {
      const created = {
        id: `t-${Date.now()}`,
        ...body,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      mockTasks = [created, ...mockTasks];
      return withResponse(config, created);
    }

    if (url === '/search' && method === 'get') {
      return withResponse(config, searchResults(String(params.q ?? '')));
    }

    if (url.startsWith('/notifications') || url.startsWith('/activities') || url.startsWith('/feed') || url.startsWith('/automations')) {
      return withResponse(config, { count: 0, results: [] });
    }

    if (url.startsWith('/audit')) {
      return withResponse(config, { count: 0, results: [] });
    }

    // ── Leads SPA ─────────────────────────────────────────────────────────────

    const MOCK_LEADS = [
      { id:'l1', fullName:'Айгерим Сейткали', phone:'+77001112233', source:'instagram', stage:'new', pipeline:'qualifier', createdAt:new Date(Date.now()-3600000).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), history:[] },
      { id:'l2', fullName:'Данияр Аубаков', phone:'+77012223344', source:'site', stage:'in_progress', pipeline:'qualifier', assignedName:'Акбар А.', createdAt:new Date(Date.now()-7200000).toISOString(), updatedAt:new Date(Date.now()-1800000).toISOString(), history:[] },
      { id:'l3', fullName:'Мадина Нурланова', phone:'+77023334455', source:'ad', stage:'thinking', pipeline:'qualifier', callbackAt:new Date(Date.now()+86400000).toISOString(), budget:500000, createdAt:new Date(Date.now()-172800000).toISOString(), updatedAt:new Date(Date.now()-90000000).toISOString(), history:[] },
      { id:'l4', fullName:'Ерлан Жумабеков', phone:'+77034445566', source:'referral', stage:'no_answer', pipeline:'qualifier', createdAt:new Date(Date.now()-86400000).toISOString(), updatedAt:new Date(Date.now()-86400000).toISOString(), history:[] },
      { id:'l5', fullName:'Нурлан Касымов', phone:'+77056667788', source:'instagram', stage:'awaiting_meeting', pipeline:'closer', assignedName:'Сауле М.', meetingAt:new Date(Date.now()+86400000).toISOString(), budget:800000, createdAt:new Date(Date.now()-172800000).toISOString(), updatedAt:new Date(Date.now()-3600000).toISOString(), history:[] },
      { id:'l6', fullName:'Гульнара Бекова', phone:'+77067778899', source:'ad', stage:'contract', pipeline:'closer', assignedName:'Сауле М.', budget:1200000, createdAt:new Date(Date.now()-604800000).toISOString(), updatedAt:new Date(Date.now()-7200000).toISOString(), history:[] },
    ];

    if (url === '/leads' && method === 'get') {
      return withResponse(config, { count: MOCK_LEADS.length, results: clone(MOCK_LEADS) });
    }

    if (/^\/leads\/[^/]+$/.test(url)) {
      const leadId = url.split('/')[2];
      if (method === 'patch' || method === 'put') {
        return withResponse(config, clone({ ...MOCK_LEADS.find(l => l.id === leadId) ?? MOCK_LEADS[0], ...body, updatedAt: new Date().toISOString() }));
      }
      return withResponse(config, clone(MOCK_LEADS.find(l => l.id === leadId) ?? null));
    }

    if (/^\/leads\/[^/]+\/history$/.test(url) && method === 'post') {
      return withResponse(config, { id: `h-${Date.now()}`, ...body, createdAt: new Date().toISOString() });
    }

    if (/^\/leads\/[^/]+\/checklist$/.test(url) && method === 'patch') {
      return withResponse(config, { ok: true });
    }

    if (url === '/leads' && method === 'post') {
      const created = { id: `l-${Date.now()}`, stage: 'new', pipeline: 'qualifier', history: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...body };
      return withResponse(config, created);
    }

    // ── Employees (Settings → Команда) ────────────────────────────────────────

    const MOCK_EMPLOYEES = [
      { id:'emp-1', full_name:'Алибек Сейткали', phone:'+77001112233', department:'Продажи', permissions:['sales'], account_status:'active', added_by_id:'u-001', added_by_name:'Владелец', created_at:new Date(Date.now()-2592000000).toISOString() },
      { id:'emp-2', full_name:'Айгерим Касымова', phone:'+77012223344', department:'Бухгалтерия', permissions:['financial_report'], account_status:'active', added_by_id:'u-001', added_by_name:'Владелец', created_at:new Date(Date.now()-1296000000).toISOString() },
      { id:'emp-3', full_name:'Ержан Тулеубаев', phone:'+77023334455', department:'Производство', permissions:['production'], account_status:'pending_first_login', added_by_id:'u-001', added_by_name:'Владелец', created_at:new Date(Date.now()-86400000).toISOString() },
    ];

    if (url === '/company/employees' || url === '/company/employees/') {
      if (method === 'get') {
        return withResponse(config, clone(MOCK_EMPLOYEES));
      }
      if (method === 'post') {
        const emp = { id: `emp-${Date.now()}`, account_status: 'pending_first_login', added_by_id: session?.user?.id ?? 'u-001', added_by_name: session?.user?.full_name ?? 'Администратор', created_at: new Date().toISOString(), ...body };
        return withResponse(config, emp);
      }
    }

    if (/^\/company\/employees\/[^/]+(\/)?$/.test(url) && !url.includes('/reset-password') && !url.includes('/dismiss')) {
      const empId = url.replace(/\//g, ' ').trim().split(' ')[2];
      if (method === 'patch' || method === 'put') {
        const emp = MOCK_EMPLOYEES.find(e => e.id === empId) ?? MOCK_EMPLOYEES[0];
        return withResponse(config, clone({ ...emp, ...body }));
      }
      return withResponse(config, clone(MOCK_EMPLOYEES.find(e => e.id === empId) ?? null));
    }

    if (/^\/company\/employees\/[^/]+\/reset-password(\/)?$/.test(url) && method === 'post') {
      return withResponse(config, { ok: true });
    }

    if (/^\/company\/employees\/[^/]+\/dismiss(\/)?$/.test(url) && method === 'post') {
      return withResponse(config, { ok: true });
    }

    // ── Exchange Rates ────────────────────────────────────────────────────────

    if (url.startsWith('/exchange-rates')) {
      return withResponse(config, {
        base: 'KZT',
        date: new Date().toISOString().slice(0, 10),
        rates: { KZT: 1, USD: 0.00221, EUR: 0.00204, RUB: 0.2, CNY: 0.016 },
      });
    }

    // ── Team Presence ─────────────────────────────────────────────────────────

    if (url.startsWith('/team/presence')) {
      const users = session ? [
        { id: session.user.id, full_name: session.user.full_name, presence_state: 'online', last_seen: new Date().toISOString() },
      ] : [];
      return withResponse(config, users);
    }

    // ── Reports / Dashboard extras ────────────────────────────────────────────

    if (url === '/reports/daily-focus' || url === '/reports/daily-focus/') {
      return withResponse(config, {
        start_day: { overdue_tasks: 3, tasks_due_today: 7, deals_without_touch: 2 },
        generated_at: new Date().toISOString(),
      });
    }

    if (url.startsWith('/reports/summary')) {
      return withResponse(config, {
        period: 'month',
        revenue: 12400000, revenue_delta: 8.4,
        deals_won: 5, deals_won_delta: 2,
        new_leads: 18, new_leads_delta: -3,
        tasks_done: 24, tasks_done_delta: 6,
      });
    }

    // ── Accounting SPA ────────────────────────────────────────────────────────

    if (url === '/accounting/summary') {
      return withResponse(config, {
        period: params.period ?? 'month',
        income: 8400000, expense: 3200000, net: 5200000,
        income_delta: 12.4, expense_delta: -3.1, net_delta: 22.6,
        accounts: [
          { id:'acc-1', name:'Основной счёт', balance: 14200000, currency:'KZT' },
          { id:'acc-2', name:'Касса', balance: 850000, currency:'KZT' },
        ],
      });
    }

    if (url === '/accounting/entries' || url === '/accounting/entries/') {
      if (method === 'get') {
        const entries = Array.from({ length: 8 }, (_, i) => ({
          id: `e-${i+1}`, seq: i+1,
          type: i % 3 === 0 ? 'income' : i % 3 === 1 ? 'expense' : 'transfer',
          amount: (i + 1) * 150000, currency: 'KZT',
          category: i % 2 === 0 ? 'Продажи' : 'Закупки',
          account: 'Основной счёт', counterparty: `ТОО Контрагент ${i+1}`,
          period: new Date(Date.now() - i * 86400000).toISOString().slice(0, 7),
          author: 'Владелец', hash: `hash-${i+1}`, isReconciled: i < 4,
          tags: [], createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        }));
        return withResponse(config, { results: entries, total: entries.length, page: 1, limit: 20 });
      }
      if (method === 'post') {
        return withResponse(config, { id: `e-${Date.now()}`, seq: 100, hash: `hash-new`, isReconciled: false, tags: [], createdAt: new Date().toISOString(), ...body });
      }
    }

    if (/^\/accounting\/entries\/[^/]+\/reconcile$/.test(url) && method === 'patch') {
      return withResponse(config, { ok: true });
    }

    if (url === '/accounting/pnl') {
      return withResponse(config, {
        period: params.period ?? 'month',
        rows: [
          { category:'Выручка от продаж', amount: 8400000, pct: 100 },
          { category:'Себестоимость', amount: -3100000, pct: -36.9 },
          { category:'Валовая прибыль', amount: 5300000, pct: 63.1 },
          { category:'Операционные расходы', amount: -1200000, pct: -14.3 },
          { category:'Чистая прибыль', amount: 4100000, pct: 48.8 },
        ],
        totals: { revenue: 8400000, gross: 5300000, net: 4100000 },
      });
    }

    if (url === '/accounting/cashflow') {
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000);
        return { date: d.toISOString().slice(0, 10), income: Math.round(Math.random() * 800000), expense: Math.round(Math.random() * 400000), net: 0 };
      }).map(d => ({ ...d, net: d.income - d.expense }));
      return withResponse(config, days);
    }

    if (url === '/accounting/inventory-value') {
      return withResponse(config, {
        rows: [
          { sku:'MAT-001', name:'Ткань шёлк', qty: 120, unit:'м', unitCost: 4500, totalCost: 540000 },
          { sku:'MAT-002', name:'Подкладка', qty: 80, unit:'м', unitCost: 1800, totalCost: 144000 },
          { sku:'PROD-001', name:'Платье', qty: 15, unit:'шт', unitCost: 12000, totalCost: 180000 },
        ],
        grandTotal: 864000, itemCount: 3,
      });
    }

    if (url === '/accounting/debts') {
      return withResponse(config, {
        receivable: [{ id:'d1', counterparty:'ТОО Алем', amount:250000, currency:'KZT', dueAt: new Date(Date.now()+604800000).toISOString(), overdue:false }],
        payable: [{ id:'d2', counterparty:'ИП Аманов', amount:120000, currency:'KZT', dueAt: new Date(Date.now()-86400000).toISOString(), overdue:true }],
        totalReceivable: 250000, totalPayable: 120000,
      });
    }

    if (url === '/accounting/gaps') {
      return withResponse(config, []);
    }

    if (/^\/accounting\/gaps\/[^/]+$/.test(url) && method === 'patch') {
      return withResponse(config, { ok: true });
    }

    if (url === '/accounting/integrity') {
      return withResponse(config, { valid: true });
    }

    // ── Chapan SPA (швейный цех) ──────────────────────────────────────────────

    if (url === '/chapan/settings/profile' || url === '/chapan/settings/profile/') {
      if (method === 'get') {
        return withResponse(config, {
          id: 'ws-1', name: 'Швейный цех №1', orderPrefix: 'ЧП',
          phone: '+7 701 000 00 00', address: 'г. Алматы, ул. Абая 10',
          workers: ['Айгуль', 'Мадина', 'Зарина', 'Бахыт'],
          catalogItems: [], fabricItems: [], sizeOptions: ['XS','S','M','L','XL'],
        });
      }
      return withResponse(config, { ok: true, ...body });
    }

    if (url.startsWith('/chapan/settings/')) {
      if (method === 'get') return withResponse(config, { items: [], count: 0 });
      return withResponse(config, { ok: true });
    }

    if (url === '/chapan/requests' || url === '/chapan/requests/') {
      if (method === 'get') return withResponse(config, { count: 0, results: [] });
      return withResponse(config, { id: `rq-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString(), ...body });
    }

    if (/^\/chapan\/requests\/[^/]+(\/status)?(\/)?$/.test(url) && method === 'patch') {
      return withResponse(config, { ok: true });
    }

    if (url === '/chapan/orders' || url === '/chapan/orders/') {
      if (method === 'get') return withResponse(config, { count: 0, results: [] });
      return withResponse(config, { id: `ord-${Date.now()}`, status: 'new', activities: [], createdAt: new Date().toISOString(), ...body });
    }

    if (/^\/chapan\/orders\/[^/]+(\/)?$/.test(url) && !url.includes('/confirm') && !url.includes('/status') && !url.includes('/payment') && !url.includes('/transfer') && !url.includes('/activities')) {
      return withResponse(config, { id: url.split('/')[3], status: 'new', activities: [], ...body });
    }

    if (url.includes('/chapan/') && (method === 'post' || method === 'patch')) {
      return withResponse(config, { ok: true });
    }

    // ── Production / Workshops ────────────────────────────────────────────────

    if (url === '/workshops' || url === '/workshops/') {
      if (method === 'get') return withResponse(config, { count: 0, results: [] });
      return withResponse(config, { id: `ws-${Date.now()}`, orders: [], workers: [], equipment: [], stages: [], ...body });
    }

    if (url.startsWith('/workshops/')) {
      return withResponse(config, { count: 0, results: [], ok: true });
    }

    if (url.startsWith('/chapan/production/')) {
      return withResponse(config, { ok: true });
    }

    // ── Warehouse SPA ─────────────────────────────────────────────────────────

    if (url === '/warehouse/summary') {
      return withResponse(config, {
        totalItems: 0, totalValue: 0, currency: 'KZT',
        lowStockCount: 0, categoriesCount: 0, locationsCount: 0,
      });
    }

    if (url.startsWith('/warehouse/')) {
      if (method === 'get') return withResponse(config, { count: 0, results: [], items: [], rows: [] });
      return withResponse(config, { id: `wh-${Date.now()}`, ...body, createdAt: new Date().toISOString() });
    }

    // ── AI Assistant ──────────────────────────────────────────────────────────

    if (url === '/ai/chat' || url === '/ai/chat/') {
      return withResponse(config, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Я ваш AI-ассистент KORT. В данный момент работаю в демо-режиме без подключения к бэкенду.',
        createdAt: new Date().toISOString(),
      });
    }

    // ── Imports ───────────────────────────────────────────────────────────────

    if (url.startsWith('/imports')) {
      if (method === 'get') return withResponse(config, { count: 0, results: [] });
      return withResponse(config, { id: `imp-${Date.now()}`, status: 'queued', ...body });
    }

    // ── Reports / Summary catch-all ───────────────────────────────────────────

    if (url.startsWith('/reports/')) {
      return withResponse(config, { count: 0, results: [], data: [] });
    }

    return withResponse(config, { count: 0, results: [] });
  });
}
