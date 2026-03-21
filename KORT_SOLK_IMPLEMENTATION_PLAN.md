# KORT × SOLK — План внедрения дизайн-системы
**Версия:** 1.0 | **Дата:** 2026-03-21  
**Основа:** анализ кода Kort-design.zip + аудит DESIGN_AUDIT_2026-03-21.md + разбор solk_design_analysis.md

---

## Статус: что изменилось с последнего аудита

Прежде чем переходить к плану — необходимо зафиксировать **что НЕ было исправлено** из предыдущего аудита (P0-список). Все эти пункты включены в текущий план первыми приоритетами.

| Пункт аудита | Статус | Файл |
|---|---|---|
| P0.1 — `flex-direction: row` в Onboarding | ❌ **Не исправлен** | `Onboarding.module.css:12` |
| P0.2 — убрать `scenarioRail` | ❌ **Не исправлен** | `index.tsx:152` |
| P0.3 — убрать dev-текст из brandSide | ❌ **Не исправлен** | `AuthModal.tsx:372` |
| P0.4 — emoji → Lucide в onboarding | ❌ **Не исправлен** | `index.tsx:250` |
| P0.5 — убрать `SIZE_OPTIONS`, зафиксировать wide | ❌ **Не исправлен** | `WorkspaceTileModal.tsx:18` |
| P0.6 — Chapan default section `orders` | неизвестно | `tile-ui.store.ts:72` |

---

## Контекст: что solk даёт KORT, а что — нет

KORT и solk — принципиально разные продукты. Прямой перенос невозможен и вреден. Нужна **адаптация**, а не копирование.

### Брать у solk ✅

| Принцип solk | Адаптация для KORT |
|---|---|
| Floating pill nav | Topbar → плавающий блок внутри контентной зоны (не весь хедер) |
| Tight letter-spacing на заголовках | Уже частично есть в токенах, нужно применить везде |
| Mask reveal при скролле | В онбординге и брендовых блоках AuthModal |
| Однородный hover: инверт цвета | Primary кнопки: сейчас gradient, hover — тёмный фон |
| Scroll reveal (IntersectionObserver) | Страницы модулей, карточки в дашборде, empty states |
| Marquee-лента | В onboarding success step и branded панели AuthModal |
| Lenis smooth scroll | В main content scroll (`.app-main`), НЕ в workspace |
| `dvh` вместо `vh` | Онбординг, AuthModal overlay |
| `prefers-reduced-motion` соблюдение | Уже есть в globals.css — проверить покрытие |
| Кнопки-пилюли только для CTA | Только primary action, outline вторичные остаются |
| Отрицательный трекинг | Применить к `font-size >= 22px` везде |
| Image hover scale 1.02–1.04 | Workspace tiles превью, медиа-карточки |

### НЕ брать у solk ❌

| Принцип solk | Почему не подходит |
|---|---|
| Единственный font-weight: 400 | B2B ERP требует иерархию через вес (600/700 критично для таблиц, лейблов) |
| 80–240px вертикальные отступы секций | Слишком расточительно для плотного SaaS-интерфейса |
| 16px body everywhere | KORT использует 13–14px — стандарт для desktop SaaS |
| Hover scale на карточках | НЕ применять к workspace tiles — есть sceneRuntime |
| Lottie-анимации | Избыточная зависимость; framer-motion уже есть |
| Полное отключение bold | Нарушит читаемость таблиц, форм, nav-лейблов |
| Lenis в workspace canvas | **ЗАПРЕЩЕНО** — конфликтует с sceneInputController |

### Ключевое ограничение workspace
**Не трогать:** `sceneRuntime.ts`, `sceneCamera.ts`, `sceneInputController.ts`, `sceneTerrain*.ts`, `WorkspaceCanvas.tsx` и всё в `/workspace/scene/`. Любые изменения scroll/wheel в `.app-main` должны проверяться на конфликт с `sceneInputController`.

---

## ФАЗА 0 — Технический долг (P0 из предыдущего аудита)
> **Срок: 1 день. Блокирует всё остальное.**

### 0.1 — Исправить layout Onboarding: `flex-direction: row` → `column`

**Файл:** `src/pages/onboarding/Onboarding.module.css:12`

```css
/* БЫЛО */
.page {
  display: flex;
  flex-direction: row;  /* ← БАГ */
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
}

/* СТАЛО */
.page {
  min-height: 100dvh;   /* dvh вместо vh — solk-принцип */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 40px 24px;
  gap: 0;
}
```

---

### 0.2 — Удалить `scenarioRail` из Onboarding

**Файл:** `src/pages/onboarding/index.tsx`, строки 152–162

Удалить блок полностью. Прогресс wizard уже отображается в `steps`. Дублирование навигационных систем создаёт когнитивный шум.

---

### 0.3 — Убрать dev-текст из AuthModal brandSide

**Файл:** `src/features/auth/AuthModal.tsx`, строки ~372–380

```tsx
// БЫЛО — dev-текст как маркетинговый контент
<div className={styles.slideCaption}>
  <div className={styles.slideTitle}>KORT Workspace</div>
  <div className={styles.slideSubtitle}>
    Доступ и роли теперь определяются membership, а не ручным режимом фронта...
  </div>
</div>

// СТАЛО — заглушка до реального branded контента (Phase 2.1)
<div className={styles.brandPlaceholder}>
  <div className={styles.brandTagline}>Бизнес под контролем</div>
</div>
```

---

### 0.4 — Emoji → Lucide в Onboarding

**Файл:** `src/pages/onboarding/index.tsx`

```tsx
// БЫЛО
const QUICK_LINKS = [
  { icon: '👤', title: 'Добавьте первого клиента', ... },
  { icon: '💼', title: 'Создайте первую сделку', ... },
  { icon: '📥', title: 'Импорт из Excel', ... },
];
// Success step:
<div className={s.successEmoji}>🎉</div>

// СТАЛО
import { UserPlus, Briefcase, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

const QUICK_LINKS = [
  { icon: UserPlus,         title: 'Добавьте первого клиента', ... },
  { icon: Briefcase,        title: 'Создайте первую сделку', ... },
  { icon: FileSpreadsheet,  title: 'Импорт из Excel', ... },
];
// Success step:
<CheckCircle2 size={48} color="var(--fill-positive)" />
```

---

### 0.5 — Убрать `SIZE_OPTIONS`, зафиксировать `tileModalWide`

**Файл:** `src/features/workspace/components/WorkspaceTileModal.tsx`

```tsx
// Удалить полностью:
const SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное' },
  { value: 'default', label: 'Стандартное' },
  { value: 'wide',    label: 'Широкое' },
] as const;

// В JSX — удалить segmented control с SIZE_OPTIONS
// Заменить динамический className на статический:
// БЫЛО: className={`${styles.tileModal} ${styles[tileModalSizeClass]}`}
// СТАЛО:
className={`${styles.tileModal} ${styles.tileModalWide}`}

// resizeModal из store оставить для backward compat, UI не показывать
```

---

### 0.6 — Chapan default section

**Файл:** `src/features/chapan-spa/model/tile-ui.store.ts:72`  
Проверить и установить: `section: 'orders'` (или `'requests'` — зависит от бизнес-логики).

---

## ФАЗА 1 — Типографика и токены (Solk-принципы, уровень 1)
> **Срок: 2–3 дня.**

Solk строит весь визуальный язык на **tight letter-spacing** и **строгой весовой дисциплине**. KORT уже имеет всё необходимое в токенах — нужно только применить.

### 1.1 — Применить отрицательный трекинг ко всем крупным текстам

**Файл:** `src/shared/design/globals.css`

В KORT уже есть `-0.03em` для `.text-display-xl` и `-0.025em` для `.text-display-lg`. Нужно распространить на весь масштаб >= 22px:

```css
/* В globals.css — усилить существующие преsets */
.text-heading-1  { letter-spacing: -0.02em; }   /* 22px — было тоже -0.02em ✓ */
.text-heading-2  { letter-spacing: -0.018em; }  /* 18px — было -0.015em */
.text-heading-3  { letter-spacing: -0.014em; }  /* 16px — было -0.01em */

/* Новый класс для модальных контекстов */
.text-modal-title {
  font-family: var(--font-display);
  font-size: var(--text-size-2xl);   /* 22px */
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.022em;
  color: var(--text-primary);
}

/* Для SPA/drawer заголовков — max 18–20px, solk-правило */
.text-spa-title {
  font-size: var(--text-size-xl);   /* 18px */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.016em;
  color: var(--text-primary);
}
```

**Применить во всех компонентах:** везде, где сейчас используется `clamp(26px, 3vw, 36px)` — заменить на `text-modal-title` или `text-spa-title`.

---

### 1.2 — Исправить WorkshopConsole: `clamp(26px, 3vw, 36px)` → `text-spa-title`

**Файл:** `src/features/chapan-spa/components/workshop/WorkshopConsole.module.css`

```css
/* БЫЛО */
.title {
  margin: 2px 0 0;
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.05;
  color: rgba(255, 255, 255, 0.96);
}

/* СТАЛО */
.title {
  margin: 2px 0 0;
  font-size: var(--text-size-xl);   /* 18px — solk-правило: max 20px внутри SPA */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.016em;
  color: var(--text-primary);       /* токен вместо хардкода */
}
```

---

### 1.3 — Перевести AuthModal.module.css на токены

**Файл:** `src/features/auth/AuthModal.module.css`

Массовая замена хардкодов на семантические токены:

```css
/* Таблица замен */

/* БЫЛО → СТАЛО */
rgba(4, 6, 10, 0.76)                   → var(--bg-overlay)
rgba(14, 18, 26, 0.98)                 → var(--bg-surface)
rgba(0, 0, 0, 0.55)                    → (удалить, использовать var(--shadow-xl))
rgba(238, 243, 250, 0.95)              → var(--text-primary)
rgba(155, 168, 186, 0.7)               → var(--text-secondary)
rgba(120, 130, 146, 0.18)              → var(--border-subtle)
28px (border-radius хардкод)           → var(--radius-2xl)
16px (typeCard radius)                 → var(--radius-lg)

/* Панель */
.panel {
  background: var(--brand-auth-card-bg);    /* уже есть токен! */
  border: 1px solid var(--brand-auth-card-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--brand-panel-shadow-strong);
}

/* Overlay */
.overlay {
  background: var(--bg-overlay);
  backdrop-filter: blur(6px);
}
```

---

### 1.4 — Перевести WorkshopConsole.module.css на токены

**Файл:** `src/features/chapan-spa/components/workshop/WorkshopConsole.module.css`

```css
/* Все замены */
rgba(255, 255, 255, 0.6)   → var(--text-tertiary)
rgba(255, 255, 255, 0.08)  → var(--border-subtle)
rgba(255, 255, 255, 0.06)  → var(--bg-surface-inset)
rgba(255, 255, 255, 0.96)  → var(--text-primary)
rgba(255, 255, 255, 0.05)  → var(--bg-muted)
26px                       → var(--radius-2xl)
20px (statCard)            → var(--radius-xl)
16px (iconWrap)            → var(--radius-lg)

/* Hero — убрать хардкод-градиенты, использовать brand-систему */
.hero {
  background: var(--brand-surface-2);   /* уже настроен для dark/light/packs */
  border: var(--surface-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--brand-panel-shadow);
}
```

---

### 1.5 — Стандартизировать размеры иконок

Таблица обязательных размеров:

| Контекст | Размер | Применение |
|---|---|---|
| Sidebar nav | `size={16}` | Навигационные иконки |
| Body / table | `size={16}` | Основной контент |
| Compact controls | `size={14}` | Compact pills, chips |
| Section header | `size={18}` | Заголовки секций |
| Modal / Drawer title | `size={20}` | Крупные заголовки |
| Empty state | `size={40}` | Иллюстративные |
| Success/error feedback | `size={48}` | Замена emoji |

Файлы для исправления: `WorkshopConsole.tsx` (pills `size={12}` → `size={14}`), `AuthModal.tsx` (typeIcon `size={18}` ✓).

---

### 1.6 — Исправить CSS-баги в Onboarding (из прошлого аудита)

**Файл:** `src/pages/onboarding/Onboarding.module.css`

```css
/* БЫЛО — двойной color, первый мёртв */
.subLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);       /* ← удалить эту строку */
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--plan-color) 16%, transparent);
  color: var(--plan-color);
}

/* БЫЛО — задвоенные hover */
/* строка 411 */
.industryBtn:hover, .sizeBtn:hover, .planCard:hover {
  transform: var(--feedback-raise-hover);
  box-shadow: var(--shadow-sm);
}
/* строка 437 — удалить, оставить только одно определение */
.industryBtn:hover, .sizeBtn:hover, .planCard:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

---

## ФАЗА 2 — Анимации и появление (Solk-принципы, уровень 2)
> **Срок: 3–4 дня.**

### 2.1 — Branded AuthModal: левая колонка с Mask Reveal

Это главный визуальный апгрейд. Левая колонка AuthModal сейчас пуста. Применяем solk-принцип маски-шторы для демонстрации продукта.

**Файл:** `src/features/auth/AuthModal.tsx`

```tsx
// Новый компонент для brandSide
function BrandCarousel() {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.brandSide}>
      {/* Tagline */}
      <div className={styles.brandTagline}>
        <span className={styles.brandTaglineText}>Бизнес под контролем</span>
      </div>

      {/* Animated product preview с mask reveal */}
      <div className={styles.brandPreview}>
        <div className={`${styles.brandMask} ${revealed ? styles.brandMaskRevealed : ''}`} />
        <div className={styles.brandContent}>
          {/* Статичный SVG или PNG скриншот интерфейса */}
          <img
            src="/assets/brand/product-preview.png"
            alt="KORT interface"
            className={styles.brandPreviewImg}
          />
        </div>
      </div>

      {/* Marquee: ключевые возможности */}
      <div className={styles.brandMarqueeWrapper}>
        <div className={styles.brandMarqueeTrack}>
          {['CRM', 'Склад', 'Производство', 'Отчёты', 'Команда', 'Задачи'].map(f => (
            <span key={f} className={styles.brandMarqueeChip}>{f}</span>
          ))}
          {/* Дублируем для бесконечного скролла */}
          {['CRM', 'Склад', 'Производство', 'Отчёты', 'Команда', 'Задачи'].map(f => (
            <span key={`${f}-2`} className={styles.brandMarqueeChip}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**CSS для brandSide:**

```css
/* AuthModal.module.css — новые классы */

.brandTagline {
  text-align: center;
  margin-bottom: var(--space-6);
}

.brandTaglineText {
  font-family: var(--font-display);
  font-size: var(--text-size-xl);   /* 18px */
  font-weight: 700;
  letter-spacing: -0.018em;
  color: var(--text-primary);
  opacity: 0.9;
}

/* Solk-маска */
.brandPreview {
  position: relative;
  width: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--space-5);
  flex: 1;
}

.brandMask {
  position: absolute;
  inset: -1%;
  background: var(--bg-surface);
  transform-origin: top center;
  transform: scaleY(1);
  transition: transform 1.8s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
  z-index: 2;
}

.brandMaskRevealed {
  transform: scaleY(0);   /* штора поднимается */
}

.brandPreviewImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  border-radius: var(--radius-lg);
}

/* Marquee */
.brandMarqueeWrapper {
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 4px 0;
}

.brandMarqueeWrapper::before,
.brandMarqueeWrapper::after {
  content: "";
  position: absolute;
  top: 0; bottom: 0;
  width: 40px;
  z-index: 1;
  pointer-events: none;
}
.brandMarqueeWrapper::before {
  left: 0;
  background: linear-gradient(to right, var(--bg-surface), transparent);
}
.brandMarqueeWrapper::after {
  right: 0;
  background: linear-gradient(to left, var(--bg-surface), transparent);
}

.brandMarqueeTrack {
  display: flex;
  gap: 8px;
  width: fit-content;
  animation: kortMarquee 14s linear infinite;
}

.brandMarqueeChip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--brand-panel-border);
  background: var(--fill-accent-subtle);
  color: var(--text-secondary);
  font-size: var(--text-size-sm);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

@keyframes kortMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .brandMarqueeTrack { animation: none; }
  .brandMask { transition: none !important; }
}
```

---

### 2.2 — Scroll Reveal для страниц модулей

Добавить универсальный хук для IntersectionObserver — адаптация solk's lazy reveal под framer-motion, который уже есть в KORT.

**Новый файл:** `src/shared/hooks/useScrollReveal.ts`

```typescript
import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);   // однократно
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
```

**Использование с framer-motion presets (уже есть `fadeUp`):**

```tsx
import { motion } from 'framer-motion';
import { fadeUp } from '../../shared/motion/presets';
import { useScrollReveal } from '../../shared/hooks/useScrollReveal';

function MetricCard({ children }: { children: React.ReactNode }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <motion.div
      ref={ref as React.Ref<HTMLDivElement>}
      variants={fadeUp}
      initial="hidden"
      animate={isVisible ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}
```

**Применить в:** `OverviewDashboard.tsx`, страницы CRM/Deals, empty states.

---

### 2.3 — Hover scale на Workspace Tiles (превью-карточках, не canvas)

**ВАЖНО:** Применять только к `.tileCard` (превью до открытия), НЕ к canvas-элементам.

**Файл:** `src/features/workspace/components/WorkspaceTile.tsx`

```tsx
// В motion.div wrapper для tile-карточки
<motion.div
  className={styles.tile}
  whileHover={{
    // НЕ scale — solk использует scale(1.03), но для workspace tiles
    // это конфликтует с ощущением "тяжёлого" инструмента.
    // Используем border + shadow (из cardHover preset в motion/presets.ts)
    boxShadow: 'var(--shadow-md)',
    borderColor: 'var(--brand-panel-border)',
    transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
  }}
  whileTap={{ scale: 0.985 }}  /* лёгкий тактильный press */
>
```

> Примечание: для workspace tiles solk-scale 1.03 намеренно НЕ используется — карточки рабочего пространства должны ощущаться стабильными инструментами, а не потребительскими блоками.

---

### 2.4 — Page transition для всех роутов

В KORT уже есть `pageTransition` preset в `motion/presets.ts` и `AppShell.tsx` использует `AnimatePresence`. Нужно проверить, применяется ли он ко всем страницам.

**Файл:** `src/app/layout/AppShell.tsx`

```tsx
// Проверить — должен выглядеть примерно так:
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    {...pageTransition}
    className={styles.pageWrapper}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Если `pageTransition` не применяется — добавить. Preset уже оптимален: `opacity 0→1`, `y 10→0`, `220ms`, без театральности.

---

### 2.5 — Onboarding: анимация шагов с stagger

Заменить статичное появление шагов на stagger из `listContainer` / `listItem` presets.

**Файл:** `src/pages/onboarding/index.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { listContainer, listItem, pageTransition } from '../../shared/motion/presets';

// Карточка шага
<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}      // смена ключа = новая анимация
    {...pageTransition}
    className={s.card}
  >
    {/* Содержимое текущего шага */}
  </motion.div>
</AnimatePresence>

// Список элементов внутри шага (industry, plan cards и т.д.)
<motion.div
  variants={listContainer}
  initial="hidden"
  animate="show"
  className={s.optionGrid}
>
  {options.map(opt => (
    <motion.div key={opt.id} variants={listItem}>
      <OptionCard {...opt} />
    </motion.div>
  ))}
</motion.div>
```

---

## ФАЗА 3 — Floating Header и навигация (Solk-принципы, уровень 2)
> **Срок: 2–3 дня.**

### 3.1 — Topbar: усиление glassmorphism

Topbar уже использует `backdrop-filter: blur(8px)`. Применяем solk-принцип более выраженного стекломорфизма с hover-эффектом и плавным переходом при скролле.

**Файл:** `src/app/layout/Topbar.module.css`

```css
/* Текущее состояние — уже хорошо, усилить: */
.topbar {
  height: var(--topbar-height);
  background: var(--brand-topbar-bg);
  backdrop-filter: blur(12px);           /* было 8px → 12px */
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--nav-border);
  box-shadow:
    inset 0 -1px 0 color-mix(in srgb, var(--fill-accent) 8%, transparent),
    var(--shadow-xs);                    /* добавить лёгкую тень */
  transition:
    background var(--motion-fast) var(--motion-ease),
    box-shadow var(--motion-fast) var(--motion-ease);
}

/* При прокрутке — JS добавляет класс .scrolled */
.topbar.scrolled {
  background: color-mix(in srgb, var(--brand-topbar-bg) 94%, var(--bg-surface-elevated) 6%);
  box-shadow:
    inset 0 -1px 0 color-mix(in srgb, var(--fill-accent) 12%, transparent),
    var(--shadow-sm);
}
```

**JS для `scrolled` класса:**

```typescript
// В AppShell.tsx или Topbar.tsx
useEffect(() => {
  const mainEl = document.querySelector('.app-main');
  if (!mainEl) return;
  const handler = () => {
    setScrolled(mainEl.scrollTop > 8);
  };
  mainEl.addEventListener('scroll', handler, { passive: true });
  return () => mainEl.removeEventListener('scroll', handler);
}, []);
```

---

### 3.2 — Sidebar: hover translateX микро-анимация (solk-принцип)

Sidebar уже имеет `transform: translateX(1px)` при hover — это solk-принцип направленного движения. Убедиться, что применяется ко всем nav items.

**Файл:** `src/app/layout/Sidebar.module.css`

```css
/* Уже есть в коде — проверить transition: */
.navItem {
  transition:
    background-color var(--motion-fast) var(--motion-ease),
    color var(--motion-fast) var(--motion-ease),
    transform var(--motion-fast) var(--motion-ease);  /* добавить если нет */
}

.navItem:hover {
  transform: translateX(1px);   /* уже есть ✓ */
}
```

---

### 3.3 — Кнопки: pill для primary CTA, solk-инверт при hover

Solk использует border-radius: 30px для всех кнопок. В KORT это слишком мягко для B2B. Компромисс: только primary action кнопки получают `radius-full`, остальные остаются с `radius-md`.

**Файл:** `src/shared/design/globals.css` — добавить класс:

```css
/* Primary CTA — Solk-pill style (только для главных призывов к действию) */
.btn-kort-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 20px;
  border-radius: var(--radius-full);        /* пилюля */
  background: var(--fill-accent-gradient);  /* amber gradient */
  color: var(--text-on-accent);
  font-size: var(--text-size-md);
  font-weight: 600;
  letter-spacing: -0.01em;
  border: none;
  cursor: pointer;
  transition:
    background var(--motion-fast) var(--motion-ease),
    box-shadow var(--motion-fast) var(--motion-ease),
    transform var(--motion-fast) var(--motion-ease);
  box-shadow: var(--shadow-accent);
}

.btn-kort-cta:hover {
  background: var(--brand-accent-strong);   /* инверт в тёмный amber */
  box-shadow: var(--shadow-md), var(--shadow-accent);
  transform: translateY(-1px);
}

.btn-kort-cta:active {
  transform: scale(0.985);
  box-shadow: var(--shadow-xs);
}
```

**Применить в:** кнопки "Создать", "Сохранить" в формах, CTA в onboarding, основные действия в Drawer footer.

---

### 3.4 — Underline-анимация ссылок (solk-принцип, инвертированный)

Solk использует underline, который уже нарисован и исчезает при hover. Для KORT — применить в nav-ссылках вне Sidebar (breadcrumb, внешние ссылки).

**Файл:** `src/app/layout/Topbar.module.css`

```css
/* Breadcrumb hover — подчёркивание нарастает */
.crumbParent {
  position: relative;
}

.crumbParent::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0%;
  height: 1px;
  background: var(--text-tertiary);
  transition: width var(--motion-fast) var(--motion-ease);
}

.crumbParent:hover::after {
  width: 100%;
}
```

---

## ФАЗА 4 — UX-сценарии и пустые состояния
> **Срок: 3–4 дня.**

### 4.1 — Chapan: Empty State для OverviewDashboard

Solk-принцип: при нулевых данных показывать **конкретное действие**, а не нули.

**Файл:** `src/features/chapan-spa/components/overview/OverviewDashboard.tsx`

```tsx
import { PackagePlus } from 'lucide-react';

function EmptyWorkshopState({ onCreateOrder }: { onCreateOrder: () => void }) {
  return (
    <motion.div
      className={styles.emptyState}
      variants={fadeUp}
      initial="hidden"
      animate="show"
    >
      <div className={styles.emptyIcon}>
        <PackagePlus size={40} color="var(--text-tertiary)" />
      </div>
      <h3 className={styles.emptyTitle}>Нет активных заказов</h3>
      <p className={styles.emptyDesc}>
        Создайте первый заказ, чтобы начать работу в цеху
      </p>
      <button className="btn-kort-cta" onClick={onCreateOrder}>
        Создать заказ
      </button>
    </motion.div>
  );
}

// Использование в OverviewDashboard:
{orders.length === 0 && <EmptyWorkshopState onCreateOrder={handleCreateOrder} />}
```

```css
/* OverviewDashboard.module.css */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-9);
  text-align: center;
  min-height: 300px;
}

.emptyIcon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-xl);
  background: var(--bg-surface-inset);
  border: 1px solid var(--border-subtle);
  display: grid;
  place-items: center;
}

.emptyTitle {
  font-size: var(--text-size-lg);   /* 16px */
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  margin: 0;
}

.emptyDesc {
  font-size: var(--text-size-base); /* 13px */
  color: var(--text-secondary);
  max-width: 280px;
  line-height: 1.5;
  margin: 0;
}
```

---

### 4.2 — AuthModal: typeCard layout-исправление

Solk-принцип: иконка сверху, контент снизу, чёткая иерархия.

**Файл:** `src/features/auth/AuthModal.module.css`

```css
/* БЫЛО */
.typeCard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;   /* ← всё прибито к низу */
  min-height: 155px;
}

/* СТАЛО */
.typeCard {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;   /* иконка сверху, лейбл снизу */
  min-height: 140px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--motion-ease),
    box-shadow var(--motion-fast) var(--motion-ease),
    background var(--motion-fast) var(--motion-ease);
}

.typeCard:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.typeCardSelected {
  border-color: var(--fill-accent);
  background: var(--fill-accent-subtle);
  box-shadow: var(--shadow-focus);
}
```

---

### 4.3 — Onboarding: visual priority в choose-type

**Файл:** `src/features/auth/AuthModal.tsx`

Вариант "Компания" → primary (выделен), "Сотрудник" → secondary (менее prominent). Не менять логику — только визуальный вес.

```tsx
// Добавить className в зависимости от типа
<div
  className={`
    ${styles.typeCard}
    ${selectedType === type.id ? styles.typeCardSelected : ''}
    ${type.id === 'company' ? styles.typeCardPrimary : styles.typeCardSecondary}
  `}
>
```

```css
/* Первичная карточка — чуть более выраженная */
.typeCardPrimary {
  border-color: var(--border-default);
}

/* Вторичная карточка — чуть тусклее */
.typeCardSecondary {
  opacity: 0.85;
  border-color: var(--border-subtle);
}

.typeCardSecondary:hover {
  opacity: 1;
}
```

---

## ФАЗА 5 — Smooth Scroll (Lenis) — ограниченное применение
> **Срок: 1–2 дня. Требует тестирования.**

### 5.1 — Lenis только для `.app-main`

**КРИТИЧЕСКИ ВАЖНО:** Lenis НЕ должен перехватывать события в workspace canvas. Установить с ограничением на конкретный контейнер.

**Файл:** `src/app/layout/AppShell.tsx`

```tsx
import Lenis from '@studio-freight/lenis';

useEffect(() => {
  // Инициализировать ТОЛЬКО если НЕ в workspace
  const isWorkspace = location.pathname.startsWith('/workspace');
  if (isWorkspace) return;  // workspace управляет scroll через sceneInputController

  const mainEl = document.querySelector<HTMLElement>('.app-main');
  if (!mainEl) return;

  const lenis = new Lenis({
    wrapper: mainEl,           // только этот контейнер
    content: mainEl.firstElementChild as HTMLElement,
    duration: 0.9,             // короче чем у solk (1.2) — B2B требует отзывчивости
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  return () => lenis.destroy();
}, [location.pathname]);
```

**Зависимость:**
```bash
npm install @studio-freight/lenis
```

**Тестирование:** После установки проверить, что:
1. Скролл в workspace canvas не изменился
2. `sceneInputController.ts` — wheel events работают штатно
3. Модальные окна, Drawers — скролл внутри работает

---

## ФАЗА 6 — Полировка и системные улучшения
> **Срок: 2–3 дня.**

### 6.1 — `dvh` вместо `vh` для полноэкранных элементов

Solk-принцип: мобильный Safari и Chrome уменьшают viewport при появлении адресной строки.

**Файлы для исправления:**

```css
/* AuthModal.module.css */
.overlay {
  min-height: 100vh;
  min-height: 100dvh;    /* добавить */
}

/* Onboarding.module.css */
.page {
  min-height: 100vh;
  min-height: 100dvh;    /* добавить */
}

/* WorkspaceTileModal — уже использует min(94vh) */
/* Заменить на dvh там, где применимо */
```

---

### 6.2 — Workspace tile settings: убрать WorkspaceModalSize из типов

После исправления 0.5 — провести clean-up.

**Файл:** `src/features/workspace/model/types.ts`

```typescript
// Если WorkspaceModalSize используется только в UI — можно удалить из типов
// Если используется в store/API — оставить в типах, только убрать из UI
```

**Файл:** `src/features/workspace/model/store.ts`

```typescript
// resizeModal — оставить для backward compat, просто не показывать UI
// ИЛИ пометить как @deprecated
```

---

### 6.3 — Sidebar collapsed: polish микро-анимации

Solk-принцип hover с translateX уже есть. Добавить к коллапсированному состоянию sidebar.

**Файл:** `src/app/layout/Sidebar.module.css`

```css
/* Tooltip для collapsed state */
.navItemCollapsedTooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 4px 10px;
  font-size: var(--text-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--motion-fast) var(--motion-ease);
  z-index: var(--z-dropdown);
}

.navItem:hover .navItemCollapsedTooltip {
  opacity: 1;
}
```

---

### 6.4 — Chapan WorkshopConsole: hero proportions

После замены токенов — исправить пропорции hero-блока.

**Файл:** `src/features/chapan-spa/components/workshop/WorkshopConsole.module.css`

```css
/* Hero занимает слишком много места — ограничить */
.hero {
  /* Убрать grid с фиксированными колонками, сделать компактнее */
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-card-padding);
  border-radius: var(--radius-2xl);
  border: var(--surface-border);
  background: var(--brand-surface-2);
  box-shadow: var(--brand-panel-shadow);
  flex-shrink: 0;
  /* max-height чтобы не съедал экран */
  max-height: 120px;
}
```

---

### 6.5 — Добавить `data-cursor-label` для key элементов

EditorialCursor уже реализован и активен (AppShell.tsx импортирует). Solk-принцип: курсор показывает контекстный лейбл. Добавить аттрибуты:

```tsx
// WorkspaceTile — превью тайла
<div data-cursor-label="Открыть">

// Кнопки создания
<button data-cursor-label="Создать">

// Изображения-ссылки
<a data-cursor-label="Подробнее">
```

---

## Итоговая карта приоритетов

```
НЕДЕЛЯ 1
├── Фаза 0: Технический долг (P0)          ← 1 день, ~50 строк кода
│   ├── flex-direction: column
│   ├── удалить scenarioRail
│   ├── убрать dev-текст
│   ├── emoji → Lucide
│   ├── SIZE_OPTIONS → зафиксировать wide
│   └── Chapan default section
│
├── Фаза 1: Токены и типографика           ← 2–3 дня
│   ├── tight letter-spacing на >= 22px
│   ├── WorkshopConsole: title 36px → 18px
│   ├── AuthModal → design tokens
│   ├── WorkshopConsole → design tokens
│   ├── Иконки: таблица размеров
│   └── CSS-баги Onboarding (дубли)

НЕДЕЛЯ 2
├── Фаза 2: Анимации и reveal              ← 3–4 дня
│   ├── AuthModal brandSide: mask reveal + marquee
│   ├── useScrollReveal hook
│   ├── Workspace tiles: cardHover
│   ├── Page transitions (проверить/применить)
│   └── Onboarding: stagger анимация шагов
│
├── Фаза 3: Navigation polish              ← 2–3 дня
│   ├── Topbar: glassmorphism + scrolled state
│   ├── Sidebar: transition на transform
│   ├── btn-kort-cta: pill CTA buttons
│   └── Breadcrumb: underline reveal

НЕДЕЛЯ 3
├── Фаза 4: UX-сценарии                   ← 3–4 дня
│   ├── Chapan: EmptyState
│   ├── typeCard: icon top layout
│   └── choose-type: visual priority
│
├── Фаза 5: Lenis                          ← 1–2 дня (с тестами)
│   └── Smooth scroll в .app-main (не workspace)
│
└── Фаза 6: Полировка                     ← 2–3 дня
    ├── dvh вместо vh
    ├── WorkspaceModalSize clean-up
    ├── Sidebar collapsed tooltips
    ├── Chapan hero proportions
    └── data-cursor-label везде
```

---

## Что ЗАПРЕЩЕНО изменять

| Файл / Директория | Причина |
|---|---|
| `src/features/workspace/scene/*` | sceneRuntime управляет canvas render loop |
| `src/features/workspace/scene/sceneRuntime.ts` | RAF loop, нельзя вмешиваться в timing |
| `src/features/workspace/scene/sceneInputController.ts` | Wheel/scroll events для camera zoom |
| `src/features/workspace/components/WorkspaceCanvas.tsx` | Canvas rendering |
| `src/features/workspace/scene/sceneCamera.ts` | Camera state machine |
| `src/features/workspace/scene/sceneTerrainController.ts` | Terrain generation |

---

## Метрика успеха

После полного внедрения ожидаемый результат:

| Метрика | До | После |
|---|---|---|
| Дизайн-балл (аудит) | 4.5/10 | 7.5–8/10 |
| Хардкод rgba() в компонентах | ~40 вхождений | 0 |
| Emoji в UI | 4 | 0 |
| P0-проблем | 6 | 0 |
| Компоненты без token coverage | AuthModal, Chapan | 0 |
| Анимации при scroll reveal | 0 | 3+ (onboarding, chapan, pages) |
| Branded AuthModal | пустая колонка | mask reveal + marquee |
| Floating header сignal | частичный | полный |

---

## Примечания по совместимости

1. **framer-motion** — уже в зависимостях ✓. Все новые анимации через framer-motion, не через raw CSS transitions (кроме hover micro-interactions).

2. **Lenis** — новая зависимость. Устанавливать только после тестирования на workspace.

3. **CSS custom properties** — все новые стили ДОЛЖНЫ использовать существующие токены из `globals.css`. Не добавлять новые raw-цвета.

4. **Theme packs** — все изменения должны корректно работать в dark/light и в 5 theme packs (graphite, sand, obsidian, enterprise, neutral). Проверять в `[data-theme="dark"]` после каждой правки.

5. **sceneRuntime isolation** — Lenis и все scroll-related изменения должны быть изолированы от workspace route через `if (isWorkspace) return;` паттерн.

---

*Документ составлен на основе:*  
*— Анализа исходного кода KORT (PROJECT/src/, март 2026)*  
*— Дизайн-аудита DESIGN_AUDIT_2026-03-21.md*  
*— Разбора дизайн-системы solk.com (solk_design_analysis.md)*
