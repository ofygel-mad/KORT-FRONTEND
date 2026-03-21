import { useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { Button } from '@/shared/ui/Button';
import { Input, Textarea } from '@/shared/ui/Input';
import { useTileProductionShell } from './production-shell.store';
import s from './ProductionTemplateSPA.module.css';

interface Props {
  tileId: string;
  onBack: () => void;
}

function normalizeWorkspaceName(value: string) {
  return value.trim();
}

function normalizeWorkspaceDescription(value: string) {
  return value.trim();
}

function normalizeWorkspacePrefix(value: string) {
  return value.replace(/\s+/g, '').toUpperCase().slice(0, 4);
}

export function ProductionTemplateSPA({ tileId, onBack }: Props) {
  const {
    templateName,
    templateDescriptor,
    templateOrderPrefix,
    setTemplateName,
    setTemplateDescriptor,
    setTemplateOrderPrefix,
    openWorkspace,
  } = useTileProductionShell(tileId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderPreview = useMemo(() => {
    const prefix = normalizeWorkspacePrefix(templateOrderPrefix);
    return `${prefix || 'ЦЕХ'}-0001`;
  }, [templateOrderPrefix]);

  const handleSubmit = async () => {
    const name = normalizeWorkspaceName(templateName);
    const description = normalizeWorkspaceDescription(templateDescriptor);
    const prefix = normalizeWorkspacePrefix(templateOrderPrefix);

    if (!name || !prefix) {
      toast.error('Заполните название и префикс заказов.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/workspaces', {
        name,
        description,
        prefix,
      });
      openWorkspace('chapan');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать производство.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.layout}>
        <aside className={s.aside}>
          <Button
            variant="ghost"
            size="md"
            icon={<ArrowLeft size={15} />}
            onClick={onBack}
            className={s.backBtn}
          >
            К производствам
          </Button>

          <div className={s.copy}>
            <span className={s.eyebrow}>Новое производство</span>
            <h1 className={s.title}>Новое производственное пространство</h1>
            <p className={s.lead}>
              Создайте новый цех на отдельном экране без лишних переходов. После сохранения вы сразу попадёте в рабочее пространство.
            </p>
          </div>

          <div className={s.summary}>
            <div className={s.summaryLabel}>Номер первого заказа</div>
            <div className={s.summaryValue}>{orderPreview}</div>
            <div className={s.summaryText}>Префикс можно задать сразу и изменить позже в настройках производства.</div>
          </div>
        </aside>

        <section className={s.card}>
          <div className={s.form}>
            <Input
              label="Название"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Новое производство"
              autoComplete="off"
            />

            <Textarea
              label="Описание"
              value={templateDescriptor}
              onChange={(event) => setTemplateDescriptor(event.target.value)}
              placeholder="Краткое описание нового пространства"
              rows={5}
            />

            <Input
              label="Префикс заказов"
              value={templateOrderPrefix}
              onChange={(event) => setTemplateOrderPrefix(event.target.value)}
              placeholder="ЦЕХ"
              autoComplete="off"
            />

            <div className={s.preview}>
              Пример номера заказа: {orderPreview}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isSubmitting}
              onClick={handleSubmit}
              iconRight={isSubmitting ? <RefreshCw size={14} className={s.spin} /> : undefined}
            >
              Создать производство
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
