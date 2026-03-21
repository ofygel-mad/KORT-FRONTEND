/**
 * features/summary-spa/components/widgets/KpiCards.tsx
 * Top row of metric cards вЂ” revenue, leads, tasks, funnel.
 */
import { TrendingUp, TrendingDown, Users, CheckSquare, Briefcase } from 'lucide-react';
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

type Tone = 'positive' | 'info' | 'warning' | 'violet' | 'magenta';

const TONE_CLASS: Record<Tone, string> = {
  positive: s.tonePositive,
  info: s.toneInfo,
  warning: s.toneWarning,
  violet: s.toneViolet,
  magenta: s.toneMagenta,
};

function delta(curr: number, prev: number): { pct: number; positive: boolean } | null {
  if (prev === 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct, positive: pct >= 0 };
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'Рњ в‚ё';
  if (n >= 1_000) return Math.round(n / 1_000) + 'Рє в‚ё';
  return n + ' в‚ё';
}

export function KpiCards() {
  const { dealsSnap, leadsSnap, tasksSnap, getPeriodAggregates, period } = useSummaryStore();
  const agg = getPeriodAggregates();

  const PERIOD_LABEL = { '7d': '7 РґРЅРµР№', '14d': '14 РґРЅРµР№', '30d': '30 РґРЅРµР№' };
  const pLabel = PERIOD_LABEL[period];

  const cards = [
    {
      id: 'revenue',
      title: 'Р’С‹СЂСѓС‡РєР°',
      subtitle: `Р·Р° ${pLabel}`,
      value: fmtMoney(agg.wonValue),
      delta: delta(agg.wonValue, agg.prev.wonValue),
      tone: 'positive' as const,
      icon: <TrendingUp size={18} />,
    },
    {
      id: 'deals_won',
      title: 'Р—Р°РєСЂС‹С‚Рѕ СЃРґРµР»РѕРє',
      subtitle: `Р·Р° ${pLabel}`,
      value: String(agg.wonCount),
      subValue: dealsSnap ? `${dealsSnap.totalActive} Р°РєС‚РёРІРЅС‹С…` : undefined,
      delta: delta(agg.wonCount, agg.prev.wonCount),
      tone: 'info' as const,
      icon: <Briefcase size={18} />,
    },
    {
      id: 'leads',
      title: 'РќРѕРІС‹С… Р»РёРґРѕРІ',
      subtitle: `Р·Р° ${pLabel}`,
      value: String(agg.newLeads),
      subValue: leadsSnap ? `${leadsSnap.totalLeads} РІСЃРµРіРѕ` : undefined,
      delta: delta(agg.newLeads, agg.prev.newLeads),
      tone: 'warning' as const,
      icon: <Users size={18} />,
    },
    {
      id: 'tasks',
      title: 'Р—Р°РґР°С‡ РІС‹РїРѕР»РЅРµРЅРѕ',
      subtitle: `Р·Р° ${pLabel}`,
      value: String(agg.tasksDone),
      subValue: tasksSnap ? `${tasksSnap.overdueCount} РїСЂРѕСЃСЂРѕС‡РµРЅРѕ` : undefined,
      delta: delta(agg.tasksDone, agg.prev.tasksDone),
      tone: 'violet' as const,
      icon: <CheckSquare size={18} />,
    },
  ];

  const pipelineCard = dealsSnap
    ? {
        id: 'pipeline',
        title: 'Р’РѕСЂРѕРЅРєР°',
        subtitle: 'РІР·РІРµС€РµРЅРЅР°СЏ СЃСѓРјРјР°',
        value: fmtMoney(dealsSnap.weightedValue),
        subValue: `${fmtMoney(dealsSnap.pipelineValue)} РѕР±С‰Р°СЏ`,
        tone: 'magenta' as const,
        icon: <TrendingUp size={18} />,
      }
    : null;

  return (
    <div className={s.kpiRow}>
      {cards.map((card) => (
        <div key={card.id} className={`${s.kpiCard} ${TONE_CLASS[card.tone]}`}>
          <div className={s.kpiCardTop}>
            <div className={s.kpiIconWrap}>
              {card.icon}
            </div>
            {card.delta && (
              <div className={`${s.kpiDelta} ${card.delta.positive ? s.kpiDeltaPos : s.kpiDeltaNeg}`}>
                {card.delta.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(card.delta.pct)}%
              </div>
            )}
          </div>
          <div className={s.kpiValue}>{card.value}</div>
          <div className={s.kpiTitle}>{card.title}</div>
          <div className={s.kpiSubtitle}>{card.subtitle}</div>
          {card.subValue && <div className={s.kpiSubValue}>{card.subValue}</div>}
        </div>
      ))}

      {pipelineCard && (
        <div className={`${s.kpiCard} ${TONE_CLASS[pipelineCard.tone]}`}>
          <div className={s.kpiCardTop}>
            <div className={s.kpiIconWrap}>
              {pipelineCard.icon}
            </div>
          </div>
          <div className={s.kpiValue}>{pipelineCard.value}</div>
          <div className={s.kpiTitle}>{pipelineCard.title}</div>
          <div className={s.kpiSubtitle}>{pipelineCard.subtitle}</div>
          <div className={s.kpiSubValue}>{pipelineCard.subValue}</div>
        </div>
      )}
    </div>
  );
}
