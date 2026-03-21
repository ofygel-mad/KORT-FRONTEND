import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Factory, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useChapanStore } from '../../../../chapan-spa/model/chapan.store';
import { useTileProductionShell } from './production-shell.store';
import s from './ProductionHub.module.css';

export function ProductionHub({ tileId }: { tileId: string }) {
  const { loading, load, orders, requests, profile } = useChapanStore();
  const { openWorkspace, templateName } = useTileProductionShell(tileId);
  const hasRequestedInitialLoad = useRef(false);

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
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>Производственный модуль</span>
          <h1 className={s.title}>Производство</h1>
          <p className={s.lead}>
            Чапан больше не выглядит центром всего ERP. Теперь это одно из производственных пространств,
            а рядом живёт шаблон для быстрого запуска следующего клиента без отдельной ветки проекта.
          </p>

          <div className={s.heroTags}>
            <span><ShieldCheck size={13} /> Изоляция данных по tenant</span>
            <span><Sparkles size={13} /> Общий код, разные производства</span>
            <span><Factory size={13} /> Один модуль вместо SPA под одного клиента</span>
          </div>
        </div>

        <div className={s.statGrid}>
          <div className={s.statCard}>
            <strong>{stats.spaces}</strong>
            <span>пространства внутри модуля</span>
          </div>
          <div className={s.statCard}>
            <strong>{stats.activeOrders}</strong>
            <span>активных заказов в Чапан</span>
          </div>
          <div className={s.statCard}>
            <strong>{stats.activeRequests}</strong>
            <span>входящих заявок</span>
          </div>
          <div className={s.statCard}>
            <strong>{stats.inFlowTasks}</strong>
            <span>задач в потоке</span>
          </div>
        </div>
      </section>

      <section className={s.cardGrid}>
        <article className={s.workspaceCard} data-tone="live">
          <div className={s.cardHead}>
            <span className={s.cardBadge}>Действующее производство</span>
            <h2 className={s.cardTitle}>{profile.displayName}</h2>
            <p className={s.cardText}>
              Уже работающий контур. Открывается в существующую логику без переезда данных и без изменений
              в процессах для текущей компании.
            </p>
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
            Открыть Чапан
            <ArrowRight size={15} />
          </button>
        </article>

        <article className={s.workspaceCard} data-tone="template">
          <div className={s.cardHead}>
            <span className={s.cardBadge}>Шаблон</span>
            <h2 className={s.cardTitle}>{templateName}</h2>
            <p className={s.cardText}>
              Новый универсальный контур для следующего производства. Название и параметры меняются через настройки,
              а код и структура остаются едиными.
            </p>
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

      <section className={s.principles}>
        <div className={s.principleCard}>
          <strong>1. Один модуль, много производств</strong>
          <span>Новый клиент подключается как отдельное пространство, а не как новая ветка интерфейса.</span>
        </div>
        <div className={s.principleCard}>
          <strong>2. Различия через настройки</strong>
          <span>Название, префиксы, роли и каталоги должны жить в конфиге, а не в отдельном коде под клиента.</span>
        </div>
        <div className={s.principleCard}>
          <strong>3. Данные не смешиваются</strong>
          <span>Следующий шаг для backend-модели: tenant/company scope для заказов, склада, сотрудников и аналитики.</span>
        </div>
      </section>
    </div>
  );
}
