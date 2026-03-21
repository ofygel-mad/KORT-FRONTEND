import { Lock } from 'lucide-react';
import { ChapanSPA } from './ChapanSPA';
import { WorkshopConsole } from '../../../../chapan-spa/components/workshop/WorkshopConsole';
import { useChapanStore } from '../../../../chapan-spa/model/chapan.store';
import { canSeeManagerConsole, canSeeWorkshopConsole, useResolvedChapanRole } from '../../../../chapan-spa/model/rbac.store';
import { ProductionHub } from './ProductionHub';
import { ProductionTemplateSPA } from './ProductionTemplateSPA';
import { ProductionWorkspaceShell } from './ProductionWorkspaceShell';
import { useTileProductionShell } from './production-shell.store';
import s from './ChapanEntry.module.css';

export function ChapanEntry({ tileId }: { tileId: string }) {
  const role = useResolvedChapanRole();
  const { activeWorkspace, goHome, templateName } = useTileProductionShell(tileId);
  const profileName = useChapanStore((state) => state.profile.displayName);

  if (activeWorkspace === 'hub') {
    return <ProductionHub tileId={tileId} />;
  }

  if (activeWorkspace === 'template') {
    return (
      <ProductionWorkspaceShell
        label="Шаблон"
        title={templateName}
        subtitle="Типовой production-space для подключения нового производства без переписывания ядра."
        tone="template"
        onBack={goHome}
      >
        <ProductionTemplateSPA tileId={tileId} />
      </ProductionWorkspaceShell>
    );
  }

  if (canSeeManagerConsole(role)) {
    return (
      <ProductionWorkspaceShell
        label="Действующее"
        title={profileName}
        subtitle="Текущий производственный контур компании на существующей логике."
        tone="live"
        onBack={goHome}
      >
        <ChapanSPA tileId={tileId} />
      </ProductionWorkspaceShell>
    );
  }

  if (canSeeWorkshopConsole(role)) {
    return (
      <ProductionWorkspaceShell
        label="Контур цеха"
        title={profileName}
        subtitle="Операционный экран для роли цеха без клиентских данных."
        tone="live"
        onBack={goHome}
      >
        <WorkshopConsole />
      </ProductionWorkspaceShell>
    );
  }

  return (
    <ProductionWorkspaceShell
      label="Ограничено"
      title={profileName}
      subtitle="Роль внутри производственного пространства ещё не назначена."
      tone="locked"
      onBack={goHome}
    >
      <div className={s.denied}>
        <div className={s.iconWrap}>
          <Lock size={20} />
        </div>
        <div className={s.title}>Доступ к производственному пространству ограничен</div>
        <div className={s.text}>
          Обратитесь к администратору компании и назначьте роль внутри выбранного производства.
        </div>
      </div>
    </ProductionWorkspaceShell>
  );
}
