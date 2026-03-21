import {
  BarChart3,
  Box,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Users,
  Wallet,
} from 'lucide-react';
import type { ProductionTemplateSection } from './production-shell.store';
import { useTileProductionShell } from './production-shell.store';
import s from './ProductionTemplateSPA.module.css';

const SECTIONS: Array<{
  id: ProductionTemplateSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Каркас', icon: LayoutDashboard },
  { id: 'operations', label: 'Модули', icon: Factory },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

const MODULES = [
  { icon: ClipboardList, title: 'Заявки и intake', text: 'Публичные входы, квалификация, конверсия в заказ и привязка к tenant.' },
  { icon: Factory, title: 'Производственная очередь', text: 'Очереди, статусы, блокировки, назначения и контроль этапов по изделиям.' },
  { icon: Box, title: 'Склад и материалы', text: 'Ткани, комплектующие, резервирование, списания и остатки по производству.' },
  { icon: Users, title: 'Команда и роли', text: 'Ролевые экраны, доступы, исполнительские контуры и локальные справочники.' },
  { icon: Wallet, title: 'Финансы и оплаты', text: 'Платежи, частичная оплата, долги, выдача и закрытие заказов.' },
  { icon: BarChart3, title: 'Аналитика и SLA', text: 'Мощность цеха, просрочки, блокировки, загрузка команды и unit-экономика.' },
] as const;

const ROLLOUT = [
  'Создаётся как отдельное пространство, а не как новая версия ERP под клиента.',
  'Отличия клиента выносятся в настройки, каталоги и права доступа.',
  'Следующий backend-этап: company_id / tenant_id на все сущности производства.',
] as const;

export function ProductionTemplateSPA({ tileId }: { tileId: string }) {
  const {
    templateSection,
    templateName,
    templateDescriptor,
    templateOrderPrefix,
    setTemplateSection,
    setTemplateName,
    setTemplateDescriptor,
    setTemplateOrderPrefix,
    resetTemplate,
  } = useTileProductionShell(tileId);

  return (
    <div className={s.root}>
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>Template workspace</span>
          <h2 className={s.title}>{templateName}</h2>
          <p className={s.lead}>{templateDescriptor}</p>
        </div>

        <div className={s.previewCard}>
          <div className={s.previewLabel}>Live preview</div>
          <div className={s.previewName}>{templateName}</div>
          <div className={s.previewMeta}>Префикс заказов: {templateOrderPrefix}</div>
          <div className={s.previewHint}>Это пространство должно стать базой для нового клиента без форка интерфейса.</div>
        </div>
      </section>

      <nav className={s.nav}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`${s.navItem} ${templateSection === section.id ? s.navItemActive : ''}`}
            onClick={() => setTemplateSection(section.id)}
          >
            <section.icon size={14} />
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      {templateSection === 'overview' && (
        <div className={s.contentGrid}>
          <section className={s.panel}>
            <div className={s.panelTitle}>Зачем этот контур</div>
            <div className={s.copyStack}>
              {ROLLOUT.map((item) => (
                <div key={item} className={s.noteRow}>
                  <span className={s.noteDot} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={s.panel}>
            <div className={s.panelTitle}>Что должно меняться по клиенту</div>
            <div className={s.kpiGrid}>
              <div className={s.kpiCard}>
                <strong>Имя</strong>
                <span>Название производства и витрина в UI</span>
              </div>
              <div className={s.kpiCard}>
                <strong>Права</strong>
                <span>Роли, команды, видимость разделов</span>
              </div>
              <div className={s.kpiCard}>
                <strong>Каталоги</strong>
                <span>Изделия, материалы, размеры, этапы</span>
              </div>
              <div className={s.kpiCard}>
                <strong>Префиксы</strong>
                <span>Документы, заказы, заявки, SLA</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {templateSection === 'operations' && (
        <section className={s.moduleGrid}>
          {MODULES.map((module) => (
            <article key={module.title} className={s.moduleCard}>
              <div className={s.moduleIcon}><module.icon size={18} /></div>
              <div className={s.moduleTitle}>{module.title}</div>
              <div className={s.moduleText}>{module.text}</div>
            </article>
          ))}
        </section>
      )}

      {templateSection === 'settings' && (
        <section className={s.settingsGrid}>
          <div className={s.panel}>
            <div className={s.panelTitle}>Идентичность шаблона</div>

            <label className={s.field}>
              <span>Название плитки</span>
              <input
                className={s.input}
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </label>

            <label className={s.field}>
              <span>Описание</span>
              <textarea
                className={s.textarea}
                value={templateDescriptor}
                onChange={(event) => setTemplateDescriptor(event.target.value)}
              />
            </label>

            <label className={s.field}>
              <span>Префикс заказов</span>
              <input
                className={s.input}
                value={templateOrderPrefix}
                onChange={(event) => setTemplateOrderPrefix(event.target.value)}
              />
            </label>

            <div className={s.actions}>
              <button className={s.resetBtn} onClick={resetTemplate}>
                <SlidersHorizontal size={14} />
                Сбросить к шаблону
              </button>
            </div>
          </div>

          <div className={s.panel}>
            <div className={s.panelTitle}>Правило масштабирования</div>
            <div className={s.copyStack}>
              <div className={s.noteRow}>
                <span className={s.noteDot} />
                <span>Дальше этот шаблон должен клонироваться в новое tenant-пространство, а не жить одной вечной плиткой.</span>
              </div>
              <div className={s.noteRow}>
                <span className={s.noteDot} />
                <span>Верхний модуль остаётся общим `Производством`, а конкретные компании появляются внутри как записи и конфиги.</span>
              </div>
              <div className={s.noteRow}>
                <span className={s.noteDot} />
                <span>Для backend это значит отдельные фильтры, права и аналитика по `company_id` / `tenant_id`.</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
