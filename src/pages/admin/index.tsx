import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart2,
  CheckCircle2,
  Copy,
  Send,
  Settings2,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../shared/api/client';
import type { InviteRecord, MembershipRequestRecord, TeamMemberResponse } from '../../shared/api/contracts';
import { useCapabilities } from '../../shared/hooks/useCapabilities';
import { useRole } from '../../shared/hooks/useRole';
import { useTabsKeyboardNav } from '../../shared/hooks/useTabsKeyboardNav';
import { copyToClipboard, reloadWindow } from '../../shared/lib/browser';
import { useAuthStore } from '../../shared/stores/auth';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import styles from './Admin.module.css';

type Tab = 'overview' | 'team' | 'requests' | 'settings';

interface DashboardStats {
  customers_count: number;
  active_deals_count: number;
  revenue_month: number;
  tasks_today: number;
  overdue_tasks: number;
}

type StatToneClass = 'statToneInfo' | 'statTonePositive' | 'statToneWarning' | 'statToneViolet';
type PlanToneClass = 'planToneInfo' | 'planToneWarning' | 'planToneViolet';

const MODE_LABELS: Record<string, string> = {
  basic: 'Р‘Р°Р·РѕРІС‹Р№',
  advanced: 'РџСЂРѕРґРІРёРЅСѓС‚С‹Р№',
  industrial: 'РџСЂРѕРјС‹С€Р»РµРЅРЅС‹Р№',
};

const MODE_OPTIONS: Array<{
  key: 'basic' | 'advanced' | 'industrial';
  title: string;
  eyebrow: string;
  description: string;
  toneClass: PlanToneClass;
  features: string[];
}> = [
  {
    key: 'basic',
    title: 'Р‘Р°Р·РѕРІС‹Р№',
    eyebrow: 'Core workspace',
    description: 'РЎС‚Р°СЂС‚РѕРІС‹Р№ СЂР°Р±РѕС‡РёР№ РєРѕРЅС‚СѓСЂ РґР»СЏ РїСЂРѕРґР°Р¶, РєР»РёРµРЅС‚РѕРІ Рё Р±Р°Р·РѕРІРѕРіРѕ РґРѕСЃС‚СѓРїР°.',
    toneClass: 'planToneInfo',
    features: [
      'Р•РґРёРЅР°СЏ Р±Р°Р·Р° РєР»РёРµРЅС‚РѕРІ Рё СЃРґРµР»РѕРє',
      'РЎС‚Р°РЅРґР°СЂС‚РЅС‹Рµ СЂРѕР»Рё РєРѕРјР°РЅРґС‹',
      'Р§РёСЃС‚С‹Р№ onboarding РґР»СЏ РЅРѕРІС‹С… СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ',
    ],
  },
  {
    key: 'advanced',
    title: 'РџСЂРѕРґРІРёРЅСѓС‚С‹Р№',
    eyebrow: 'Team operations',
    description: 'Р РµР¶РёРј РґР»СЏ РєРѕРјР°РЅРґС‹, РєРѕС‚РѕСЂР°СЏ СѓР¶Рµ Р¶РёРІС‘С‚ РІ РёРЅРІР°Р№С‚Р°С…, Р·Р°СЏРІРєР°С… Рё СЂРѕР»СЏС….',
    toneClass: 'planToneWarning',
    features: [
      'Р РµС„РµСЂР°Р»СЊРЅС‹Рµ СЃСЃС‹Р»РєРё Рё СѓРїСЂР°РІР»РµРЅРёРµ membership',
      'Р“РёР±РєРѕРµ СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ СЂРѕР»РµР№ РІРЅСѓС‚СЂРё РєРѕРјР°РЅРґС‹',
      'РџРѕРґРіРѕС‚РѕРІР»РµРЅРЅС‹Р№ СЃР»РѕР№ РїРѕРґ backend-РїСЂР°РІРёР»Р°',
    ],
  },
  {
    key: 'industrial',
    title: 'РџСЂРѕРјС‹С€Р»РµРЅРЅС‹Р№',
    eyebrow: 'Scale and governance',
    description: 'РўСЏР¶С‘Р»С‹Р№ РєРѕРЅС‚СѓСЂ РґР»СЏ РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅРёСЏ, СЃР»РѕР¶РЅС‹С… РїСЂРѕС†РµСЃСЃРѕРІ Рё РіР»СѓР±РѕРєРёС… СЃС†РµРЅР°СЂРёРµРІ.',
    toneClass: 'planToneViolet',
    features: [
      'Р”Р»РёРЅРЅС‹Рµ РѕРїРµСЂР°С†РёРѕРЅРЅС‹Рµ С†РµРїРѕС‡РєРё Рё РјРѕРґСѓР»Рё',
      'РЎС‚СЂРѕРіР°СЏ РјРѕРґРµР»СЊ РїСЂР°РІ Рё РІРЅСѓС‚СЂРµРЅРЅРёС… СЂРѕР»РµР№',
      'Р“РѕС‚РѕРІРЅРѕСЃС‚СЊ Рє РјР°СЃС€С‚Р°Р±Сѓ Рё СЂР°СЃС€РёСЂРµРЅРёСЋ СЃС‚РµРєР°',
    ],
  },
];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ section?: string }>();
  const { isOwner } = useRole();
  const { canManageBilling } = useCapabilities();
  const org = useAuthStore((state) => state.org);
  const [inviteRole, setInviteRole] = useState('manager');

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/reports/dashboard/'),
  });
  const teamQuery = useQuery<{ results: TeamMemberResponse[]; count: number }>({
    queryKey: ['team'],
    queryFn: () => api.get('/users/team/'),
  });
  const requestsQuery = useQuery<{ results: MembershipRequestRecord[] }>({
    queryKey: ['admin-membership-requests'],
    queryFn: () => api.get('/admin/membership-requests/'),
  });
  const invitesQuery = useQuery<{ results: InviteRecord[] }>({
    queryKey: ['admin-invites'],
    queryFn: () => api.get('/admin/invites/'),
  });

  const createInvite = useMutation({
    mutationFn: () => api.post<InviteRecord>('/admin/invites/', { role: inviteRole, kind: 'referral' }),
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success(`РЎСЃС‹Р»РєР° РґР»СЏ СЂРѕР»Рё ${invite.role} СЃРѕР·РґР°РЅР°`);
    },
  });

  const approveRequest = useMutation({
    mutationFn: (requestId: string) => api.post(`/admin/membership-requests/${requestId}/approve/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Р—Р°СЏРІРєР° РїРѕРґС‚РІРµСЂР¶РґРµРЅР°');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) => api.post(`/admin/membership-requests/${requestId}/reject/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-requests'] });
      toast.success('Р—Р°СЏРІРєР° РѕС‚РєР»РѕРЅРµРЅР°');
    },
  });

  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.patch(`/users/${userId}/role/`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Р РѕР»СЊ РѕР±РЅРѕРІР»РµРЅР°');
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) => api.post(`/users/${userId}/${active ? 'deactivate' : 'activate'}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('РЎС‚Р°С‚СѓСЃ СЃРѕС‚СЂСѓРґРЅРёРєР° РѕР±РЅРѕРІР»С‘РЅ');
    },
  });

  const upgradeMode = useMutation({
    mutationFn: (mode: string) => api.patch('/organization/', { mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Р РµР¶РёРј РєРѕРјРїР°РЅРёРё РѕР±РЅРѕРІР»С‘РЅ');
      reloadWindow();
    },
  });

  const tabs = useMemo(
    () => [
      { key: 'overview' as const, label: 'РћР±Р·РѕСЂ', icon: <BarChart2 size={15} /> },
      { key: 'team' as const, label: 'РљРѕРјР°РЅРґР°', icon: <Users size={15} /> },
      { key: 'requests' as const, label: 'Р—Р°СЏРІРєРё', icon: <Activity size={15} /> },
      { key: 'settings' as const, label: 'Р РµР¶РёРј', icon: <Settings2 size={15} /> },
    ],
    [],
  );

  const requestedTab = (params.section as Tab | undefined) ?? 'overview';
  const activeTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'overview';
  const tabKeys = tabs.map((tab) => tab.key);
  const onTabKeyDown = useTabsKeyboardNav(tabKeys, activeTab, (next) => navigate(next === 'overview' ? '/admin' : `/admin/${next}`));

  const recentInvite = invitesQuery.data?.results?.[0] ?? null;
  const requests = requestsQuery.data?.results ?? [];
  const team = teamQuery.data?.results ?? [];

  const overviewCards: Array<{
    label: string;
    value: number | undefined;
    icon: JSX.Element;
    toneClass: StatToneClass;
  }> = [
    { label: 'РљР»РёРµРЅС‚РѕРІ', value: statsQuery.data?.customers_count, icon: <Users size={20} />, toneClass: 'statToneInfo' },
    { label: 'РђРєС‚РёРІРЅС‹С… СЃРґРµР»РѕРє', value: statsQuery.data?.active_deals_count, icon: <TrendingUp size={20} />, toneClass: 'statTonePositive' },
    { label: 'Р—Р°РґР°С‡ СЃРµРіРѕРґРЅСЏ', value: statsQuery.data?.tasks_today, icon: <UserCheck size={20} />, toneClass: 'statToneWarning' },
    { label: 'РџСЂРѕСЃСЂРѕС‡РµРЅРѕ', value: statsQuery.data?.overdue_tasks, icon: <Activity size={20} />, toneClass: 'statToneViolet' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="РџР°РЅРµР»СЊ СѓРїСЂР°РІР»РµРЅРёСЏ"
        subtitle={`РћСЂРіР°РЅРёР·Р°С†РёСЏ: ${org?.name ?? 'вЂ”'} вЂў Р РµР¶РёРј: ${MODE_LABELS[org?.mode ?? 'basic']}`}
      />

      <div className={styles.tabs} role="tablist" aria-label="Р Р°Р·РґРµР»С‹ РїР°РЅРµР»Рё" onKeyDown={onTabKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => navigate(tab.key === 'overview' ? '/admin' : `/admin/${tab.key}`)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabPanel}>
            <div className={styles.panelGrid}>
              {overviewCards.map((card) => (
                <div key={card.label} className={`${styles.statCard} ${styles[card.toneClass]}`}>
                  <div className={styles.statIcon}>{card.icon}</div>
                  <div className={styles.statValue}>
                    {statsQuery.isLoading ? <Skeleton height={28} width={60} /> : (card.value ?? 'вЂ”')}
                  </div>
                  <div className={styles.statLabel}>{card.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.surfaceCard}>
              <h3 className={styles.surfaceTitle}>РљР°Рє С‚РµРїРµСЂСЊ СѓСЃС‚СЂРѕРµРЅ РґРѕСЃС‚СѓРї</h3>
              <div className={styles.helperText}>
                Р’Р»Р°РґРµР»РµС† Р±РёР·РЅРµСЃР° СЂР°Р±РѕС‚Р°РµС‚ РєР°Рє owner/admin СЃ СЂР°Р·Сѓ Р°РєС‚РёРІРЅРѕР№ РєРѕРјРїР°РЅРёРµР№.
                РЎРѕС‚СЂСѓРґРЅРёРєРё РїРѕРґРєР»СЋС‡Р°СЋС‚СЃСЏ С‡РµСЂРµР· Р·Р°СЏРІРєСѓ РёР»Рё РёРЅРІР°Р№С‚, Р° РґРѕСЃС‚СѓРї Рє РІРЅСѓС‚СЂРµРЅРЅРµРјСѓ РєРѕРЅС‚СѓСЂСѓ РѕС‚РєСЂС‹РІР°РµС‚СЃСЏ
                С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ Р°РєС‚РёРІРЅРѕРіРѕ membership. Р­С‚РѕС‚ СЌРєСЂР°РЅ РґР°С‘С‚ owner-СЃР»РѕР№ Р±РµР· Р»РёС€РЅРµР№ РЅР°РІРёРіР°С†РёРѕРЅРЅРѕР№ С€СѓРјРёС…Рё.
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabPanel}>
            <div className={styles.teamHeader}>
              <span className={styles.memberCount}>{team.length} СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ</span>
            </div>

            <div className={styles.inviteWrap}>
              <div className={styles.inviteCard}>
                <div className={styles.inviteMeta}>
                  <div className={styles.inviteTitle}>Р РµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР° РєРѕРјР°РЅРґС‹</div>
                  <div className={styles.inviteSubtitle}>
                    Р’С‹Р±РµСЂРёС‚Рµ СЂРѕР»СЊ Рё СЃРѕР·РґР°Р№С‚Рµ СѓРїСЂР°РІР»СЏРµРјСѓСЋ СЃСЃС‹Р»РєСѓ РґР»СЏ Р±С‹СЃС‚СЂРѕРіРѕ РїРѕРґРєР»СЋС‡РµРЅРёСЏ СЃРѕС‚СЂСѓРґРЅРёРєР°.
                  </div>
                </div>

                <div className={styles.inviteForm}>
                  <select className={styles.inviteSelect} value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                    <option value="admin">РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</option>
                    <option value="manager">РњРµРЅРµРґР¶РµСЂ</option>
                    <option value="viewer">РќР°Р±Р»СЋРґР°С‚РµР»СЊ</option>
                  </select>
                  <Button size="sm" loading={createInvite.isPending} icon={<Send size={13} />} onClick={() => createInvite.mutate()}>
                    РЎРѕР·РґР°С‚СЊ СЃСЃС‹Р»РєСѓ
                  </Button>
                </div>

                {recentInvite && (
                  <div className={`${styles.inviteForm} ${styles.inviteFormSecondary}`}>
                    <input className={`kort-input ${styles.inviteLinkField}`} value={recentInvite.share_url} readOnly />
                    <Button
                      size="sm"
                      icon={<Copy size={13} />}
                      onClick={async () => {
                        const copied = await copyToClipboard(recentInvite.share_url);
                        toast[copied ? 'success' : 'error'](copied ? 'РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°' : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ');
                      }}
                    >
                      РљРѕРїРёСЂРѕРІР°С‚СЊ
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.teamCard}>
              {teamQuery.isLoading
                ? [1, 2, 3].map((item) => (
                  <div key={item} className={styles.skeletonRow}>
                    <Skeleton height={16} width="70%" />
                  </div>
                ))
                : team.map((member) => (
                  <div key={member.id} className={styles.memberRow}>
                    <div className={styles.memberIdentity}>
                      <div className={styles.memberAvatar}>{member.full_name.charAt(0)}</div>
                      <div>
                        <div className={styles.memberName}>{member.full_name}</div>
                        <div className={styles.memberEmail}>{member.email}</div>
                      </div>
                    </div>
                    <div className={styles.memberActions}>
                      <Badge
                        bg={member.status === 'active' ? 'var(--fill-positive-soft)' : 'var(--bg-surface-inset)'}
                        color={member.status === 'active' ? 'var(--fill-positive-text)' : 'var(--text-secondary)'}
                      >
                        {member.status}
                      </Badge>
                      {member.role === 'owner' ? (
                        <span className={styles.memberCount}>owner</span>
                      ) : (
                        <select
                          className={styles.inlineSelect}
                          value={member.role ?? 'viewer'}
                          onChange={(event) => setRole.mutate({ userId: member.id, role: event.target.value })}
                        >
                          <option value="admin">admin</option>
                          <option value="manager">manager</option>
                          <option value="viewer">viewer</option>
                        </select>
                      )}
                      {member.role !== 'owner' && (
                        <button
                          className={styles.iconButton}
                          onClick={() => toggleUserStatus.mutate({ userId: member.id, active: member.status === 'active' })}
                        >
                          {member.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabPanel}>
            <div className={styles.teamCard}>
              {requestsQuery.isLoading && [1, 2].map((item) => (
                <div key={item} className={styles.skeletonRow}>
                  <Skeleton height={16} width="60%" />
                </div>
              ))}
              {!requestsQuery.isLoading && !requests.length && (
                <EmptyState
                  icon={<Activity size={18} />}
                  title="РќРѕРІС‹С… Р·Р°СЏРІРѕРє РЅРµС‚"
                  description="РљРѕРіРґР° СЃРѕС‚СЂСѓРґРЅРёРє РІС‹Р±РµСЂРµС‚ РєРѕРјРїР°РЅРёСЋ РІ РЅР°СЃС‚СЂРѕР№РєР°С…, Р·Р°СЏРІРєР° РїРѕСЏРІРёС‚СЃСЏ Р·РґРµСЃСЊ."
                />
              )}
              {requests.map((request) => (
                <div key={request.id} className={styles.memberRow}>
                  <div className={styles.memberIdentity}>
                    <div className={styles.memberAvatar}>{request.full_name.charAt(0)}</div>
                    <div>
                      <div className={styles.memberName}>{request.full_name}</div>
                      <div className={styles.memberEmail}>{request.email}</div>
                    </div>
                  </div>
                  <div className={styles.memberActions}>
                    <span className={styles.memberCount}>{request.company_name}</span>
                    <Button size="sm" onClick={() => approveRequest.mutate(request.id)}>РџРѕРґС‚РІРµСЂРґРёС‚СЊ</Button>
                    <Button size="sm" variant="secondary" onClick={() => rejectRequest.mutate(request.id)}>РћС‚РєР»РѕРЅРёС‚СЊ</Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tabPanel}>
            {!isOwner && !canManageBilling && (
              <div className={styles.warningBanner}>
                <span className={styles.warningText}>РўРѕР»СЊРєРѕ РІР»Р°РґРµР»РµС† Р±РёР·РЅРµСЃР° РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ СЂРµР¶РёРј РєРѕРјРїР°РЅРёРё.</span>
              </div>
            )}

            <p className={styles.modeDescription}>
              РўРµРєСѓС‰РёР№ СЂРµР¶РёРј: <strong>{MODE_LABELS[org?.mode ?? 'basic']}</strong>. Р­С‚Рѕ С‚РѕС‡РєР° СѓРїСЂР°РІР»РµРЅРёСЏ РґРѕСЃС‚СѓРїРѕРј, СЂРѕР»СЏРјРё Рё С‚РµРј,
              РєР°РєРѕР№ СЃР»РѕР¶РЅРѕСЃС‚Рё РѕРїРµСЂР°С†РёРѕРЅРЅС‹Р№ РєРѕРЅС‚СѓСЂ СЃРµР№С‡Р°СЃ РѕС‚РєСЂС‹С‚ РґР»СЏ РєРѕРјР°РЅРґС‹.
            </p>

            <div className={styles.planGrid}>
              {MODE_OPTIONS.map((mode) => {
                const isCurrent = org?.mode === mode.key;

                return (
                  <div
                    key={mode.key}
                    className={`${styles.planCard} ${styles[mode.toneClass]} ${isCurrent ? styles.planCurrent : ''}`}
                  >
                    <div className={styles.planEyebrow}>{mode.eyebrow}</div>
                    <div className={styles.planTitle}>{mode.title}</div>
                    <div className={styles.planDescription}>{mode.description}</div>

                    {mode.features.map((feature) => (
                      <div key={feature} className={styles.planFeatureRow}>
                        <CheckCircle2 size={12} />
                        <span className={styles.planFeature}>{feature}</span>
                      </div>
                    ))}

                    {isCurrent ? (
                      <div className={styles.planCurrentBadge}>
                        <CheckCircle2 size={13} />
                        РўРµРєСѓС‰РёР№ СЂРµР¶РёРј
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className={styles.planButton}
                        disabled={!isOwner || upgradeMode.isPending}
                        onClick={() => upgradeMode.mutate(mode.key)}
                      >
                        РџРµСЂРµРєР»СЋС‡РёС‚СЊ
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
