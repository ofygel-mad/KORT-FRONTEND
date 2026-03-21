/**
 * features/summary-spa/components/widgets/DealsWidget.tsx
 * Deals funnel breakdown, lost reasons, and win/loss stats.
 */
import { useSummaryStore } from '../../model/summary.store';
import s from './Widgets.module.css';

type Tone = 'info' | 'violet' | 'warning' | 'magenta' | 'accent' | 'muted';

const STAGE_LABEL: Record<string, string> = {
  awaiting_meeting: 'РћР¶РёРґР°РµС‚ РІСЃС‚СЂРµС‡Рё',
  meeting_done: 'Р’СЃС‚СЂРµС‡Р°',
  proposal: 'РљРџ',
  contract: 'Р”РѕРіРѕРІРѕСЂ',
  awaiting_payment: 'РћРїР»Р°С‚Р°',
};

const STAGE_TONES: Record<string, Tone> = {
  awaiting_meeting: 'info',
  meeting_done: 'violet',
  proposal: 'warning',
  contract: 'magenta',
  awaiting_payment: 'accent',
};

const TONE_CLASS: Record<Tone, string> = {
  info: s.toneInfo,
  violet: s.toneViolet,
  warning: s.toneWarning,
  magenta: s.toneMagenta,
  accent: s.toneAccent,
  muted: s.toneMuted,
};

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'Рњ в‚ё';
  if (n >= 1_000) return Math.round(n / 1_000) + 'Рє в‚ё';
  return n + ' в‚ё';
}

export function DealsFunnelWidget() {
  const dealsSnap = useSummaryStore((state) => state.dealsSnap);

  if (!dealsSnap) {
    return (
      <div className={s.chartCard}>
        <div className={s.chartTitle}>Р’РѕСЂРѕРЅРєР° СЃРґРµР»РѕРє</div>
        <div className={s.emptyFeed}>РћР¶РёРґР°РЅРёРµ РґР°РЅРЅС‹С… РѕС‚ Deals SPAвЂ¦</div>
      </div>
    );
  }

  const stages = Object.entries(dealsSnap.byStage)
    .filter(([key]) => !['won', 'lost'].includes(key))
    .sort(([a], [b]) => {
      const order = ['awaiting_meeting', 'meeting_done', 'proposal', 'contract', 'awaiting_payment'];
      return order.indexOf(a) - order.indexOf(b);
    });

  const maxCount = Math.max(...stages.map(([, value]) => value.count), 1);

  return (
    <div className={s.chartCard}>
      <div className={s.chartHeader}>
        <div>
          <div className={s.chartTitle}>Р’РѕСЂРѕРЅРєР° СЃРґРµР»РѕРє</div>
          <div className={s.chartSubtitle}>{dealsSnap.totalActive} Р°РєС‚РёРІРЅС‹С… СЃРґРµР»РѕРє</div>
        </div>
        <div className={s.chartStatGroup}>
          <div className={`${s.chartStat} ${s.tonePositive}`}>
            <div className={s.chartStatValue}>{dealsSnap.totalWon}</div>
            <div className={s.chartStatLabel}>РІС‹РёРіСЂР°РЅРѕ</div>
          </div>
          <div className={`${s.chartStat} ${s.toneDanger}`}>
            <div className={s.chartStatValue}>{dealsSnap.totalLost}</div>
            <div className={s.chartStatLabel}>РїСЂРѕРёРіСЂР°РЅРѕ</div>
          </div>
        </div>
      </div>

      <div className={s.funnelList}>
        {stages.map(([stage, { count, value }]) => (
          <div key={stage} className={s.funnelRow}>
            <div className={s.funnelRowHeader}>
              <span className={s.funnelLabel}>{STAGE_LABEL[stage] ?? stage}</span>
              <span className={s.funnelValue}>
                {count} В· {fmtMoney(value)}
              </span>
            </div>
            <div className={s.funnelTrack}>
              <div
                className={`${s.funnelFill} ${TONE_CLASS[STAGE_TONES[stage] ?? 'muted']}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LostReasonsWidget() {
  const dealsSnap = useSummaryStore((state) => state.dealsSnap);

  if (!dealsSnap || Object.keys(dealsSnap.lostReasonBreakdown).length === 0) {
    return (
      <div className={s.chartCard}>
        <div className={s.sectionTitle}>РџСЂРёС‡РёРЅС‹ СЃР»РёРІР°</div>
        <div className={s.emptyFeed}>РќРµС‚ РґР°РЅРЅС‹С…</div>
      </div>
    );
  }

  const reasons = Object.entries(dealsSnap.lostReasonBreakdown).sort(([, a], [, b]) => b - a);
  const maxCount = Math.max(...reasons.map(([, count]) => count), 1);

  return (
    <div className={s.chartCard}>
      <div className={s.sectionTitle}>РџСЂРёС‡РёРЅС‹ СЃР»РёРІР°</div>
      <div className={s.reasonList}>
        {reasons.map(([reason, count]) => (
          <div key={reason} className={s.reasonRow}>
            <span className={s.reasonLabel}>{reason}</span>
            <div className={s.reasonTrack}>
              <div className={s.reasonFill} style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className={s.reasonCount}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
