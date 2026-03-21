import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Clock, PackagePlus } from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { useTileChapanUI } from '../../model/tile-ui.store';
import { EmptyState } from '@/shared/ui/EmptyState';
import s from './OverviewDashboard.module.css';

interface Props {
  tileId: string;
}

type StageTone = 'warning' | 'info' | 'accent' | 'success';

const PIPE_STAGES = [
  { status: 'cutting', label: 'Р Р°СЃРєСЂРѕР№', tone: 'warning' as StageTone },
  { status: 'sewing', label: 'РџРѕС€РёРІ', tone: 'info' as StageTone },
  { status: 'finishing', label: 'РћС‚РґРµР»РєР°', tone: 'accent' as StageTone },
  { status: 'quality_check', label: 'РџСЂРѕРІРµСЂРєР°', tone: 'success' as StageTone },
] as const;

function dueDateLabel(dueDate: string): { label: string; urgency: 'overdue' | 'today' | 'tomorrow' | null } {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}Рґ. РїСЂРѕСЃСЂРѕС‡РµРЅ`, urgency: 'overdue' };
  if (days === 0) return { label: 'РЎСЂРѕРє СЃРµРіРѕРґРЅСЏ', urgency: 'today' };
  if (days === 1) return { label: 'РЎСЂРѕРє Р·Р°РІС‚СЂР°', urgency: 'tomorrow' };
  return { label: `${days}Рґ.`, urgency: null };
}

export function OverviewDashboard({ tileId }: Props) {
  const { orders, confirmOrder } = useChapanStore();
  const { openDrawer, openCreateModal, setSection } = useTileChapanUI(tileId);

  const data = useMemo(() => {
    const now = new Date();
    const active = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed');

    const newOrders = active.filter((o) => o.status === 'new');
    const readyOrders = active.filter((o) => o.status === 'ready');
    const awaitingTransfer = readyOrders.filter((o) => !o.transfer);
    const overdueOrders = active.filter((o) => o.dueDate && new Date(o.dueDate) < now);
    const dueTodayOrders = active.filter((o) => {
      if (!o.dueDate) return false;
      const days = Math.ceil((new Date(o.dueDate).getTime() - now.getTime()) / 86_400_000);
      return days === 0 && o.status !== 'ready';
    });
    const unpaidOrders = active.filter(
      (o) => o.paymentStatus === 'not_paid' && o.status !== 'new',
    );

    const allTasks = orders.flatMap((o) =>
      o.status !== 'cancelled' && o.status !== 'completed' ? o.productionTasks : [],
    );
    const blockedTasks = allTasks.filter((t) => t.isBlocked);
    const taskCounts: Record<string, number> = {};
    for (const stage of PIPE_STAGES) {
      taskCounts[stage.status] = allTasks.filter((t) => t.status === stage.status && !t.isBlocked).length;
    }

    const totalRevenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingPayment = active.reduce((sum, o) => sum + (o.totalAmount - o.paidAmount), 0);

    return {
      activeCount: active.length,
      inProdCount: orders.filter((o) => o.status === 'in_production').length,
      readyCount: readyOrders.length,
      overdueCount: overdueOrders.length,
      newOrders,
      readyOrders,
      awaitingTransfer,
      overdueOrders,
      dueTodayOrders,
      unpaidOrders,
      blockedTasks,
      taskCounts,
      totalRevenue,
      pendingPayment,
    };
  }, [orders]);

  const hasAttention =
    data.newOrders.length > 0 ||
    data.awaitingTransfer.length > 0 ||
    data.overdueOrders.length > 0 ||
    data.dueTodayOrders.length > 0;

  if (orders.length === 0) {
    return (
      <div className={s.emptyState}>
        <EmptyState
          icon={<PackagePlus size={26} />}
          title="РќРµС‚ Р°РєС‚РёРІРЅС‹С… Р·Р°РєР°Р·РѕРІ"
          description="РЎРѕР·РґР°Р№С‚Рµ РїРµСЂРІС‹Р№ Р·Р°РєР°Р·, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РѕС‡РµСЂРµРґСЊ С†РµС…Р°, СЃС‚Р°С‚СѓСЃС‹ СЌС‚Р°РїРѕРІ Рё РѕРїР»Р°С‚Сѓ РІ РѕРґРЅРѕРј РїРѕС‚РѕРєРµ."
          action={{ label: 'РЎРѕР·РґР°С‚СЊ Р·Р°РєР°Р·', onClick: openCreateModal }}
          steps={[
            'Р”РѕР±Р°РІСЊС‚Рµ РєР»РёРµРЅС‚Р° Рё РёР·РґРµР»РёРµ РІ РЅРѕРІС‹Р№ Р·Р°РєР°Р·.',
            'РЈРєР°Р¶РёС‚Рµ СЃСЂРѕРє, РїСЂРёРѕСЂРёС‚РµС‚ Рё РїСЂРµРґРѕРїР»Р°С‚Сѓ.',
            'РџРµСЂРµРґР°Р№С‚Рµ Р·Р°РєР°Р· РІ РїСЂРѕРёР·РІРѕРґСЃС‚РІРѕ Рё РѕС‚СЃР»РµР¶РёРІР°Р№С‚Рµ СЌС‚Р°РїС‹.',
          ]}
        />
      </div>
    );
  }

  return (
    <div className={s.dashboard}>
      <div className={s.statsStrip}>
        <div className={s.statChip}>
          <span className={s.statVal}>{data.activeCount}</span>
          <span className={s.statLbl}>Р°РєС‚РёРІРЅС‹С…</span>
        </div>
        <div className={s.sep} />
        <div className={s.statChip}>
          <span className={s.statVal}>{data.inProdCount}</span>
          <span className={s.statLbl}>РІ РїРѕС€РёРІРµ</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.readyCount > 0 ? s.green : ''}`}>
          <span className={s.statVal}>{data.readyCount}</span>
          <span className={s.statLbl}>РіРѕС‚РѕРІРѕ</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.overdueCount > 0 ? s.red : ''}`}>
          <span className={s.statVal}>{data.overdueCount}</span>
          <span className={s.statLbl}>РїСЂРѕСЃСЂРѕС‡РµРЅРѕ</span>
        </div>
        <div className={s.stretchSep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Р–РґС‘С‚ РѕРїР»Р°С‚С‹</span>
          <span className={s.finVal}>{data.pendingPayment.toLocaleString('ru-RU')} в‚ё</span>
        </div>
        <div className={s.sep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Р’С‹СЂСѓС‡РєР°</span>
          <span className={s.finVal}>{data.totalRevenue.toLocaleString('ru-RU')} в‚ё</span>
        </div>
      </div>

      {data.blockedTasks.length > 0 && (
        <div className={s.blockedAlert}>
          <AlertTriangle size={13} className={s.blockedAlertIcon} />
          <span>
            <strong>{data.blockedTasks.length} Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ</strong>
            {' '}РІ РїСЂРѕРёР·РІРѕРґСЃС‚РІРµ, С‚СЂРµР±СѓРµС‚СЃСЏ РІРјРµС€Р°С‚РµР»СЊСЃС‚РІРѕ
          </span>
          <button className={s.blockedAlertLink} onClick={() => setSection('production')}>
            РћС‚РєСЂС‹С‚СЊ
          </button>
        </div>
      )}

      {hasAttention && (
        <div className={s.attentionZone}>
          <div className={s.zoneHeader}>
            <AlertCircle size={13} />
            <span>РўСЂРµР±СѓРµС‚ РґРµР№СЃС‚РІРёСЏ</span>
          </div>

          {data.dueTodayOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelDanger}`}>
                  РЎСЂРѕРє РёСЃС‚РµРєР°РµС‚ СЃРµРіРѕРґРЅСЏ
                </span>
                <span className={s.groupCount}>{data.dueTodayOrders.length}</span>
              </div>
              {data.dueTodayOrders.map((o) => (
                <button key={o.id} className={`${s.overdueRow} ${s.todayRow}`} onClick={() => openDrawer(o.id)}>
                  <span className={s.rowNum}>{o.orderNumber}</span>
                  <span className={s.rowName}>{o.clientName}</span>
                  <span className={s.todayDays}>СЃРµРіРѕРґРЅСЏ</span>
                </button>
              ))}
            </div>
          )}

          {data.newOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel}>РћР¶РёРґР°СЋС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ</span>
                <span className={s.groupCount}>{data.newOrders.length}</span>
              </div>
              {data.newOrders.slice(0, 3).map((o) => {
                const due = o.dueDate ? dueDateLabel(o.dueDate) : null;
                return (
                  <div key={o.id} className={s.actionRow}>
                    <button className={s.rowMain} onClick={() => openDrawer(o.id)}>
                      <span className={s.rowNum}>{o.orderNumber}</span>
                      <span className={s.rowName}>{o.clientName}</span>
                      {due && (
                        <span className={`${s.rowDue} ${due.urgency ? s[`due_${due.urgency}`] : ''}`}>
                          <Clock size={9} />
                          {due.label}
                        </span>
                      )}
                      <span className={s.rowAmt}>{o.totalAmount.toLocaleString('ru-RU')} в‚ё</span>
                    </button>
                    <button className={s.qBtn} onClick={() => confirmOrder(o.id)}>
                      РџРѕРґС‚РІРµСЂРґРёС‚СЊ
                    </button>
                  </div>
                );
              })}
              {data.newOrders.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Р•С‰С‘ {data.newOrders.length - 3}
                </button>
              )}
            </div>
          )}

          {data.awaitingTransfer.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelSuccess}`}>
                  Р“РѕС‚РѕРІС‹ Рє РІС‹РґР°С‡Рµ
                </span>
                <span className={s.groupCount}>{data.awaitingTransfer.length}</span>
              </div>
              {data.awaitingTransfer.slice(0, 3).map((o) => (
                <div key={o.id} className={s.actionRow}>
                  <button className={s.rowMain} onClick={() => openDrawer(o.id)}>
                    <span className={s.rowNum}>{o.orderNumber}</span>
                    <span className={s.rowName}>{o.clientName}</span>
                    <span className={s.rowPhone}>{o.clientPhone}</span>
                  </button>
                  <button className={`${s.qBtn} ${s.qBtnGreen}`} onClick={() => openDrawer(o.id)}>
                    РџРµСЂРµРґР°С‚СЊ
                  </button>
                </div>
              ))}
              {data.awaitingTransfer.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Р•С‰С‘ {data.awaitingTransfer.length - 3}
                </button>
              )}
            </div>
          )}

          {data.overdueOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelDanger}`}>
                  РџСЂРѕСЃСЂРѕС‡РµРЅРѕ
                </span>
                <span className={s.groupCount}>{data.overdueOrders.length}</span>
              </div>
              {data.overdueOrders.slice(0, 3).map((o) => {
                const days = Math.ceil(
                  (Date.now() - new Date(o.dueDate!).getTime()) / 86_400_000,
                );
                return (
                  <button key={o.id} className={s.overdueRow} onClick={() => openDrawer(o.id)}>
                    <span className={s.rowNum}>{o.orderNumber}</span>
                    <span className={s.rowName}>{o.clientName}</span>
                    <span className={s.overdueDays}>{days}Рґ. РїСЂРѕСЃСЂРѕС‡РµРЅ</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={s.pipelineSection}>
        <div className={s.pipelineHead}>
          <span className={s.pipelineTitle}>РџСЂРѕРёР·РІРѕРґСЃС‚РІРѕ</span>
          {data.blockedTasks.length > 0 && (
            <span className={s.pipelineBlocked}>
              <AlertTriangle size={10} />
              {data.blockedTasks.length} Р±Р»РѕРє
            </span>
          )}
          <button className={s.pipelineLink} onClick={() => setSection('production')}>
            РћС‚РєСЂС‹С‚СЊ
          </button>
        </div>
        <div className={s.pipeline}>
          {PIPE_STAGES.map(({ status, label, tone }) => (
            <button
              key={status}
              className={s.pipelineStage}
              data-tone={tone}
              onClick={() => setSection('production')}
            >
              <div className={s.stageDot} />
              <div className={s.stageCount}>{data.taskCounts[status] ?? 0}</div>
              <div className={s.stageLabel}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {data.unpaidOrders.length > 0 && (
        <div className={s.unpaidSection}>
          <div className={s.groupHead}>
            <span className={s.groupLabel}>РќРµ РѕРїР»Р°С‡РµРЅРѕ</span>
            <span className={s.groupCount}>{data.unpaidOrders.length}</span>
          </div>
          {data.unpaidOrders.slice(0, 5).map((o) => (
            <button key={o.id} className={s.unpaidRow} onClick={() => openDrawer(o.id)}>
              <span className={s.rowNum}>{o.orderNumber}</span>
              <span className={s.rowName}>{o.clientName}</span>
              <span className={s.unpaidDebt}>
                {(o.totalAmount - o.paidAmount).toLocaleString('ru-RU')} в‚ё
              </span>
            </button>
          ))}
          {data.unpaidOrders.length > 5 && (
            <button className={s.moreBtn} onClick={() => setSection('orders')}>
              Р•С‰С‘ {data.unpaidOrders.length - 5}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
