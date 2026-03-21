import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, CircleDollarSign, User } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageLoader } from '../../shared/ui/PageLoader';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { useUIStore } from '../../shared/stores/ui';
import { Button } from '../../shared/ui/Button';
import { formatMoney } from '../../shared/utils/format';
import s from './Deals.module.css';

interface DealListItem {
  id: string;
  title: string;
  full_name?: string;
  value?: number | null;
  currency?: string;
  stage?: { name: string; color?: string } | string;
  status?: string;
}

interface DealListResponse {
  count: number;
  results: DealListItem[];
}

function stageName(stage: DealListItem['stage']): string {
  if (!stage) return '';
  if (typeof stage === 'string') return stage;
  return stage.name ?? '';
}

function stageColor(stage: DealListItem['stage']): string {
  if (!stage || typeof stage === 'string') return 'var(--text-tertiary)';
  return stage.color || 'var(--fill-accent)';
}

export default function DealsPage() {
  const navigate = useNavigate();
  const openCreateDeal = useUIStore((state) => state.openCreateDeal);

  useDocumentTitle('Сделки');

  const { data, isLoading } = useQuery<DealListResponse>({
    queryKey: ['deals'],
    queryFn: () => api.get('/deals/'),
  });

  if (isLoading) {
    return <PageLoader />;
  }

  const deals = data?.results ?? [];
  const total = data?.count ?? deals.length;

  return (
    <div className={s.page}>
      <PageHeader
        title="Сделки"
        subtitle={
          total > 0
            ? `В активном контуре ${total} сделок — текущие этапы, ответственные и суммы собраны в одном списке.`
            : 'Соберите первую сделку и сразу переведите входящий интерес в рабочую воронку.'
        }
        actions={<Button onClick={() => openCreateDeal()}>Новая сделка</Button>}
      />

      {deals.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title="Нет сделок"
          description="Создайте первую сделку, чтобы начать работу с pipeline и этапами продаж."
          action={{ label: 'Создать сделку', onClick: () => openCreateDeal() }}
        />
      ) : (
        <div className={s.list}>
          {deals.map((deal) => (
            <button
              key={deal.id}
              type="button"
              className={s.card}
              onClick={() => navigate(`/deals/${deal.id}`)}
            >
              <div className={s.avatar}>
                <Briefcase size={16} />
              </div>

              <div className={s.cardBody}>
                <div className={s.cardHead}>
                  <div className={s.nameBlock}>
                    <div className={s.name}>{deal.title}</div>
                    {deal.full_name && (
                      <div className={s.owner}>
                        <User size={12} />
                        {deal.full_name}
                      </div>
                    )}
                  </div>

                  <div className={s.metaRight}>
                    {stageName(deal.stage) && (
                      <span
                        className={s.stage}
                        style={{ '--stage-color': stageColor(deal.stage) } as CSSProperties}
                      >
                        {stageName(deal.stage)}
                      </span>
                    )}
                    {deal.value != null && (
                      <span className={s.amount}>
                        <CircleDollarSign size={14} />
                        {formatMoney(deal.value, deal.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {deal.status && <div className={s.status}>{deal.status}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
