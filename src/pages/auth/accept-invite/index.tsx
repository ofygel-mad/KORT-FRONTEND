import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthModal } from '../../../features/auth/AuthModal';
import { AuthRouteLayout, AuthRouteStatusCard } from '../../../features/auth/AuthRouteLayout';
import { resolvePostAuthPath } from '../../../features/auth/navigation';
import { api } from '../../../shared/api/client';
import { readApiErrorMessage } from '../../../shared/api/errors';
import type { AuthSessionResponse, InviteRecord } from '../../../shared/api/contracts';
import { useAuthStore } from '../../../shared/stores/auth';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';
  const user = useAuthStore((state) => state.user);
  const unlock = useAuthStore((state) => state.unlock);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setInviteContext = useAuthStore((state) => state.setInviteContext);

  const inviteQuery = useQuery({
    queryKey: ['invite', token],
    enabled: Boolean(token),
    queryFn: () => api.get<InviteRecord | null>(`/invites/${encodeURIComponent(token)}/`),
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.post<AuthSessionResponse | null>(`/invites/${encodeURIComponent(token)}/accept/`),
    onSuccess: (session) => {
      if (!session) return;
      setAuth(session.user, session.org, session.access, session.refresh, session.capabilities, session.role, {
        membership: session.membership,
        inviteContext: null,
        orgs: session.orgs,
      });
      unlock();
      navigate(resolvePostAuthPath({ org: session.org, membership: session.membership }), { replace: true });
    },
    onError: () => {},
  });

  useEffect(() => {
    if (!inviteQuery.data) return;
    setInviteContext(inviteQuery.data);
    return () => setInviteContext(null);
  }, [inviteQuery.data, setInviteContext]);

  useEffect(() => {
    if (!user || !inviteQuery.data || acceptMutation.isPending || acceptMutation.isSuccess) return;
    acceptMutation.mutate();
  }, [acceptMutation, inviteQuery.data, user]);

  if (!token) {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Ссылка не найдена"
          subtitle="В URL отсутствует token приглашения."
          actionLabel="Открыть вход"
          action={() => navigate('/auth/login', { replace: true })}
        />
      </AuthRouteLayout>
    );
  }

  if (inviteQuery.isLoading) {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Проверяем приглашение"
          subtitle="Секунду, загружаем данные компании и роли."
        />
      </AuthRouteLayout>
    );
  }

  if (!inviteQuery.data) {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Приглашение недоступно"
          subtitle="Ссылка устарела или не найдена."
          actionLabel="Открыть вход"
          action={() => navigate('/auth/login', { replace: true })}
        />
      </AuthRouteLayout>
    );
  }

  const inviteStatus = inviteQuery.data.status;

  if (inviteStatus === 'used') {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Приглашение уже использовано"
          subtitle="Эта ссылка была активирована ранее. Войдите в аккаунт напрямую."
          actionLabel="Войти"
          action={() => navigate('/auth/login', { replace: true })}
        />
      </AuthRouteLayout>
    );
  }

  if (inviteStatus === 'expired') {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Срок действия истёк"
          subtitle="Попросите администратора выслать новое приглашение."
          actionLabel="Открыть вход"
          action={() => navigate('/auth/login', { replace: true })}
        />
      </AuthRouteLayout>
    );
  }

  if (acceptMutation.isError) {
    const errorMessage = readApiErrorMessage(acceptMutation.error, 'Не удалось применить приглашение.');
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Не удалось принять приглашение"
          subtitle={errorMessage}
          actionLabel="Войти без приглашения"
          action={() => navigate('/auth/login', { replace: true })}
        />
      </AuthRouteLayout>
    );
  }

  if (user && acceptMutation.isPending) {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title="Подключаем к компании..."
          subtitle="Применяем приглашение, это займёт секунду."
        />
      </AuthRouteLayout>
    );
  }

  if (user) {
    return (
      <AuthRouteLayout>
        <AuthRouteStatusCard
          eyebrow="Invite"
          title={`Подключаем к компании «${inviteQuery.data.companyName}»`}
          subtitle={`Роль ${inviteQuery.data.role} будет активирована автоматически.`}
        />
      </AuthRouteLayout>
    );
  }

  return (
    <AuthRouteLayout>
      <AuthModal
        open
        initialStep="login"
        onClose={() => navigate('/', { replace: true })}
        onAuthSuccess={() => {
          unlock();
        }}
      />
    </AuthRouteLayout>
  );
}
