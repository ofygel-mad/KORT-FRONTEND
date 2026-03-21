import { useEffect, useMemo } from 'react';
import { Factory, Lock, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { useResolvedChapanAlias, useResolvedChapanRole } from '../../model/rbac.store';
import { useAuthStore } from '@/shared/stores/auth';
import { ProductionQueue } from '../production/ProductionQueue';
import s from './WorkshopConsole.module.css';

const ROLE_LABEL = {
  manager: 'Менеджер',
  workshop_lead: 'Старший цеха',
  worker: 'Сотрудник цеха',
  viewer: 'Наблюдатель',
} as const;

export function WorkshopConsole() {
  const { loading, load, orders } = useChapanStore();
  const role = useResolvedChapanRole();
  const alias = useResolvedChapanAlias();
  const userName = useAuthStore((state) => state.user?.full_name ?? alias);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const tasks = orders
      .filter((order) => order.status !== 'cancelled' && order.status !== 'completed')
      .flatMap((order) => order.productionTasks);

    const blocked = tasks.filter((task) => task.isBlocked).length;
    const inFlow = tasks.filter((task) => task.status !== 'pending' && task.status !== 'done').length;
    const done = tasks.filter((task) => task.status === 'done').length;

    return { tasks, blocked, inFlow, done };
  }, [orders]);

  if (loading) {
    return (
      <div className={s.loading}>
        <RefreshCw size={18} className={s.spin} />
        <span>Загружаю задачи цеха...</span>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <section className={s.hero}>
        <div className={s.heroMain}>
          <div className={s.identity}>
            <span className={s.iconWrap}>
              <Factory size={18} />
            </span>
            <div className={s.identityCopy}>
              <span className={s.kicker}>Производственный контур</span>
              <h2 className={s.title}>Рабочее пространство цеха</h2>
              <p className={s.description}>
                Очередь, статусы и блокеры собраны в одном экране без клиентских данных
                и лишнего дашборд-шума.
              </p>
            </div>
          </div>

          <div className={s.pills}>
            <span className={s.pill}>
              <ShieldCheck size={14} />
              {ROLE_LABEL[role]}
            </span>
            <span className={s.pill}>
              <Sparkles size={14} />
              {userName}
            </span>
            <span className={s.pill}>
              <Lock size={14} />
              Клиентские данные скрыты
            </span>
          </div>
        </div>

        <div className={s.stats}>
          <div className={s.statCard}>
            <strong>{metrics.tasks.length}</strong>
            <span>всего задач</span>
          </div>
          <div className={s.statCard}>
            <strong>{metrics.inFlow}</strong>
            <span>в работе</span>
          </div>
          <div className={s.statCard}>
            <strong>{metrics.blocked}</strong>
            <span>заблокировано</span>
          </div>
          <div className={s.statCard}>
            <strong>{metrics.done}</strong>
            <span>готово</span>
          </div>
        </div>
      </section>

      <div className={s.boardShell}>
        <ProductionQueue mode={role === 'workshop_lead' ? 'workshop_lead' : 'worker'} />
      </div>
    </div>
  );
}
