import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useChapanStore } from '../../../../chapan-spa/model/chapan.store';
import { useTileProductionShell } from './production-shell.store';
import s from './ProductionHub.module.css';

export function ProductionHub({ tileId }: { tileId: string }) {
  const { loading, load, orders, requests, profile } = useChapanStore();
  const { openWorkspace, templateName } = useTileProductionShell(tileId);
  const hasRequestedInitialLoad = useRef(false);
  const templateTitle = templateName.trim() || 'Новое производство';

  useEffect(() => {
    if (!hasRequestedInitialLoad.current && !loading) {
      hasRequestedInitialLoad.current = true;
      void load();
    }
  }, [load, loading]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== 'cancelled' && order.status !== 'completed');
    const productionTasks = activeOrders.flatMap((order) => order.productionTasks);

    return {
      spaces: 2,
      activeOrders: activeOrders.length,
      activeRequests: requests.filter((request) => request.status === 'new' || request.status === 'reviewed').length,
      blockedTasks: productionTasks.filter((task) => task.isBlocked).length,
      inFlowTasks: productionTasks.filter((task) => task.status !== 'pending' && task.status !== 'done').length,
    };
  }, [orders, requests]);

  if (loading && !orders.length && !requests.length) {
    return (
      <div className={s.loading}>
        <RefreshCw size={20} className={s.spin} />
        <span>Синхронизирую контуры производства...</span>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <section className={s.cardGrid}>
        <article className={s.workspaceCard} data-tone="live">
          <div className={s.cardHead}>
            <span className={s.cardBadge}>Действующее производство</span>
            <h2 className={s.cardTitle}>{profile.displayName}</h2>
          </div>

          <div className={s.metricList}>
            <div className={s.metricRow}>
              <span>Активные заказы</span>
              <strong>{stats.activeOrders}</strong>
            </div>
            <div className={s.metricRow}>
              <span>Входящие заявки</span>
              <strong>{stats.activeRequests}</strong>
            </div>
            <div className={s.metricRow}>
              <span>Блокировки</span>
              <strong>{stats.blockedTasks}</strong>
            </div>
          </div>

          <button className={s.primaryBtn} onClick={() => openWorkspace('chapan')}>
            Открыть {profile.displayName}
            <ArrowRight size={15} />
          </button>
        </article>

        <article className={s.workspaceCard} data-tone="template">
          <div className={s.cardHead}>
            <span className={s.cardBadge}>Шаблон</span>
            <h2 className={s.cardTitle}>{templateTitle}</h2>
          </div>

          <div className={s.metricList}>
            <div className={s.metricRow}>
              <span>Режим</span>
              <strong>Template-first</strong>
            </div>
            <div className={s.metricRow}>
              <span>Подключение</span>
              <strong>без форка SPA</strong>
            </div>
            <div className={s.metricRow}>
              <span>Переименование</span>
              <strong>в настройках</strong>
            </div>
          </div>

          <button className={s.secondaryBtn} onClick={() => openWorkspace('template')}>
            Открыть шаблон
            <ArrowRight size={15} />
          </button>
        </article>
      </section>
    </div>
  );
}
