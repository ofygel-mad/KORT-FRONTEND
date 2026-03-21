import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import s from './ProductionWorkspaceShell.module.css';

interface Props {
  label?: string;
  title: string;
  onBack: () => void;
  tone?: 'live' | 'template' | 'locked';
  children: ReactNode;
}

export function ProductionWorkspaceShell({
  title,
  onBack,
  children,
}: Props) {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <button className={s.backBtn} onClick={onBack}>
          <ArrowLeft size={15} />
          <span>К производствам</span>
        </button>

        <div className={s.meta}>
          <div className={s.title}>{title}</div>
        </div>
      </header>

      <div className={s.body}>
        {children}
      </div>
    </div>
  );
}
