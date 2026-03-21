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
  { status: 'cutting', label: 'Раскрой', tone: 'warning' as StageTone },
  { status: 'sewing', label: 'Пошив', tone: 'info' as StageTone },
  { status: 'finishing', label: 'Отделка', tone: 'accent' as StageTone },
  { status: 'quality_check', label: 'Проверка', tone: 'success' as StageTone },
] as const;

function dueDateLabel(dueDate: string): { label: string; urgency: 'overdue' | 'today' | 'tomorrow' | null } {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}д. просрочен`, urgency: 'overdue' };
  if (days === 0) return { label: 'Срок сегодня', urgency: 'today' };
  if (days === 1) return { label: 'Срок завтра', urgency: 'tomorrow' };
  return { label: `${days}д.`, urgency: null };
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
          title="Нет активных заказов"
          description="Создайте первый заказ, чтобы открыть очередь цеха, статусы этапов и оплату в одном потоке."
          action={{ label: 'Создать заказ', onClick: openCreateModal }}
          steps={[
            'Добавьте клиента и изделие в новый заказ.',
            'Укажите срок, приоритет и предоплату.',
            'Передайте заказ в производство и отслеживайте этапы.',
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
          <span className={s.statLbl}>активных</span>
        </div>
        <div className={s.sep} />
        <div className={s.statChip}>
          <span className={s.statVal}>{data.inProdCount}</span>
          <span className={s.statLbl}>в пошиве</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.readyCount > 0 ? s.green : ''}`}>
          <span className={s.statVal}>{data.readyCount}</span>
          <span className={s.statLbl}>готово</span>
        </div>
        <div className={s.sep} />
        <div className={`${s.statChip} ${data.overdueCount > 0 ? s.red : ''}`}>
          <span className={s.statVal}>{data.overdueCount}</span>
          <span className={s.statLbl}>просрочено</span>
        </div>
        <div className={s.stretchSep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Ждёт оплаты</span>
          <span className={s.finVal}>{data.pendingPayment.toLocaleString('ru-RU')} ₸</span>
        </div>
        <div className={s.sep} />
        <div className={s.finItem}>
          <span className={s.finLbl}>Выручка</span>
          <span className={s.finVal}>{data.totalRevenue.toLocaleString('ru-RU')} ₸</span>
        </div>
      </div>

      {data.blockedTasks.length > 0 && (
        <div className={s.blockedAlert}>
          <AlertTriangle size={13} className={s.blockedAlertIcon} />
          <span>
            <strong>{data.blockedTasks.length} заблокировано</strong>
            {' '}в производстве, требуется вмешательство
          </span>
          <button className={s.blockedAlertLink} onClick={() => setSection('production')}>
            Открыть
          </button>
        </div>
      )}

      {hasAttention && (
        <div className={s.attentionZone}>
          <div className={s.zoneHeader}>
            <AlertCircle size={13} />
            <span>Требует действия</span>
          </div>

          {data.dueTodayOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelDanger}`}>
                  Срок истекает сегодня
                </span>
                <span className={s.groupCount}>{data.dueTodayOrders.length}</span>
              </div>
              {data.dueTodayOrders.map((o) => (
                <button key={o.id} className={`${s.overdueRow} ${s.todayRow}`} onClick={() => openDrawer(o.id)}>
                  <span className={s.rowNum}>{o.orderNumber}</span>
                  <span className={s.rowName}>{o.clientName}</span>
                  <span className={s.todayDays}>сегодня</span>
                </button>
              ))}
            </div>
          )}

          {data.newOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={s.groupLabel}>Ожидают подтверждения</span>
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
                      <span className={s.rowAmt}>{o.totalAmount.toLocaleString('ru-RU')} ₸</span>
                    </button>
                    <button className={s.qBtn} onClick={() => confirmOrder(o.id)}>
                      Подтвердить
                    </button>
                  </div>
                );
              })}
              {data.newOrders.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Ещё {data.newOrders.length - 3}
                </button>
              )}
            </div>
          )}

          {data.awaitingTransfer.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelSuccess}`}>
                  Готовы к выдаче
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
                    Передать
                  </button>
                </div>
              ))}
              {data.awaitingTransfer.length > 3 && (
                <button className={s.moreBtn} onClick={() => setSection('orders')}>
                  Ещё {data.awaitingTransfer.length - 3}
                </button>
              )}
            </div>
          )}

          {data.overdueOrders.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <span className={`${s.groupLabel} ${s.groupLabelDanger}`}>
                  Просрочено
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
                    <span className={s.overdueDays}>{days}д. просрочен</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={s.pipelineSection}>
        <div className={s.pipelineHead}>
          <span className={s.pipelineTitle}>Производство</span>
          {data.blockedTasks.length > 0 && (
            <span className={s.pipelineBlocked}>
              <AlertTriangle size={10} />
              {data.blockedTasks.length} блок
            </span>
          )}
          <button className={s.pipelineLink} onClick={() => setSection('production')}>
            Открыть
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
            <span className={s.groupLabel}>Не оплачено</span>
            <span className={s.groupCount}>{data.unpaidOrders.length}</span>
          </div>
          {data.unpaidOrders.slice(0, 5).map((o) => (
            <button key={o.id} className={s.unpaidRow} onClick={() => openDrawer(o.id)}>
              <span className={s.rowNum}>{o.orderNumber}</span>
              <span className={s.rowName}>{o.clientName}</span>
              <span className={s.unpaidDebt}>
                {(o.totalAmount - o.paidAmount).toLocaleString('ru-RU')} ₸
              </span>
            </button>
          ))}
          {data.unpaidOrders.length > 5 && (
            <button className={s.moreBtn} onClick={() => setSection('orders')}>
              Ещё {data.unpaidOrders.length - 5}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
