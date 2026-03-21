import { useChapanStore } from '../../../chapan-spa/model/chapan.store';
import { useTileProductionShell } from './spa/production-shell.store';
import styles from '../../components/Workspace.module.css';

export function ChapanTilePreview({ tileId }: { tileId: string }) {
  const { orders, requests, profile } = useChapanStore();
  const { templateName } = useTileProductionShell(tileId);

  const active = orders.filter((order) => order.status !== 'cancelled' && order.status !== 'completed');
  const blockedTasks = active.flatMap((order) => order.productionTasks).filter((task) => task.isBlocked).length;
  const activeRequests = requests.filter((request) => request.status === 'new' || request.status === 'reviewed').length;

  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Производство</span>
        <span>Статус</span>
        <span>Контур</span>
      </div>

      <div className={styles.previewBody}>
        <div className={styles.tableRow3}>
          <strong>{profile.displayName}</strong>
          <span>{active.length} активных, {activeRequests} заявок</span>
          <span>{blockedTasks > 0 ? `${blockedTasks} блок.` : 'действует'}</span>
        </div>
        <div className={styles.tableRow3}>
          <strong>{templateName}</strong>
          <span>Шаблон нового клиента</span>
          <span>готово</span>
        </div>
      </div>
    </div>
  );
}
