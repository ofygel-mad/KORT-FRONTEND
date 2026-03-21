# Дизайн-аудит KORT — 2026-03-21

Статус: глобальный аудит дизайна и UX по проекту. Задача — довести продукт до уровня Apple: осмысленная типографика, чистая иерархия, последовательная система токенов, понятные сценарии входа в каждый модуль.

---

## 0. Обзор: где сейчас находится продукт

Проект обладает хорошей технической базой и дизайн-системой с токенами, но на практике эта система **не соблюдается**. Результат — смешение двух стилей:

- один стиль: Lucide-иконки, CSS-переменные, сдержанная тёмная тема, хорошая типографика
- другой стиль: хардкод-rgba(), произвольные радиусы, emoji в B2B-интерфейсе, dev-текст прямо в UI, дублирующиеся UI-компоненты

Это и создаёт ощущение "колхоза": не одна цельная система, а два подхода, живущих рядом.

**Итоговый балл по дизайну: 4.5/10**

Потенциал системы — 8/10. До него нужно дойти.

---

## 1. Auth Modal — 4 критических проблемы

**Файлы:** `src/features/auth/AuthModal.tsx`, `src/features/auth/AuthModal.module.css`

### 1.1 Brand Side — полностью пустой

**Что есть сейчас:**

```tsx
<div className={styles.brandSide}>
  <div className={styles.slideCaption}>
    <div className={styles.slideTitle}>KORT Workspace</div>
    <div className={styles.slideSubtitle}>
      Доступ и роли теперь определяются membership, а не ручным режимом фронта.
    </div>
    <div className={styles.slideSubtitle}>
      Владелец получает активную компанию сразу, сотрудник подключается через заявку или инвайт.
    </div>
  </div>
</div>
```

**Проблема:** левая половина модального окна показывает **внутренние технические заметки разработчиков** как маркетинговый текст. Это видит пользователь при регистрации.

Элементы `.brandOrb1` и `.brandOrb2` скрыты через `display: none` — то есть анимированные или визуальные элементы были убраны, а замена не добавлена. Левая колонка пустая.

**Apple-уровень:** левая колонка должна быть либо убрана (если нет реального контента), либо содержать реальный branded контент: иллюстрацию продукта, короткую ценностную фразу, скриншот одного рабочего состояния. Dev-заметки — не контент.

**Что сделать:**
- Убрать dev-текст из `slideCaption`
- Либо добавить реальную branded иллюстрацию
- Либо перейти к одноколонному layout без brandSide

---

### 1.2 Registration choose-type: оба варианта выглядят одинаково

**Что есть сейчас:** два typeCard с равным весом — "Компания" и "Сотрудник". Никакого визуального приоритета.

**Проблема:** у большинства новых пользователей один сценарий. Интерфейс не помогает выбрать.

**Apple-уровень:** один вариант должен быть primary (визуально выделен), второй — secondary. Или использовать радиокнопки вместо карточек.

---

### 1.3 typeCard: layout-конфликт

В `.typeCard`:
```css
display: flex;
flex-direction: column;
align-items: flex-start;
justify-content: flex-end;
min-height: 155px;
```

Иконка, лейбл, описание — всё прибито к нижнему краю карточки (`justify-content: flex-end`), но иконка должна быть сверху. Это визуально неестественно.

---

### 1.4 Отсутствие интро-анимации на brand side

Первый скриншот в задании помечен: "Здесь должен быть бизнес ERP анимация с подписями в корпоративном стиле". Ни анимации, ни иллюстрации нет.

---

## 2. Onboarding — 5 критических проблем

**Файлы:** `src/pages/onboarding/index.tsx`, `src/pages/onboarding/Onboarding.module.css`

### 2.1 Критический layout-баг: flex-direction: row

```css
.page {
  display: flex;
  flex-direction: row;   /* ← баг */
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
}
```

Три дочерних элемента — `.logoRow`, `.steps`, `.card` — размещены горизонтально: лого слева, steps по центру, карточка справа. Это не вертикальный wizard, это горизонтальный хаос.

Все `margin-bottom` у logoRow и steps предполагают column, а работают как margin-right в row. Карточка лишена контекста над собой.

**Что сделать:** изменить на `flex-direction: column`, выровнять по центру.

---

### 2.2 scenarioRail — дублирующий UI-элемент

```tsx
<div className={s.scenarioRail}>
  <div className={s.scenarioCopy}>
    <span className={s.scenarioEyebrow}><Sparkles size={12} /> Сценарий запуска</span>
    <div className={s.scenarioText}>Заполняем контекст бизнеса, выбираем режим и сразу ведём в первый полезный шаг...</div>
  </div>
  <div className={s.scenarioChips}>
    <span className={s.scenarioChip}>Контекст</span>
    <span className={s.scenarioChip}>Режим</span>
    <span className={s.scenarioChip}>Первое действие</span>
  </div>
</div>
```

Этот rail повторяет то, что уже показывает steps-индикатор над карточкой. Он занимает место внутри каждого шага, не даёт новой информации и создаёт визуальный шум. На каждом шаге пользователь видит две навигационные системы одновременно.

**Что сделать:** убрать scenarioRail полностью.

---

### 2.3 Emoji в B2B-интерфейсе

- Шаг успеха: `<div className={s.successEmoji}>🎉</div>` — 44px emoji в бизнес-продукте
- Quick links: `{ icon: '👤' }`, `{ icon: '💼' }`, `{ icon: '📥' }` — emoji как иконки в action-списке

Весь остальной продукт использует Lucide-иконки. Emoji разрывает визуальную систему и выглядит как Consumer-приложение, не как B2B ERP.

**Что сделать:** заменить все emoji на Lucide-иконки. Для success-шага: `CheckCircle2` или `Sparkles` из Lucide, размер 48px, цвет `var(--fill-positive)`.

---

### 2.4 CSS-баг: двойное объявление color

В `Onboarding.module.css`:

```css
/* строка 126 */
.subLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);        /* ← объявлено */
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--plan-color) 16%, transparent);
  color: var(--plan-color);          /* ← переопределено ниже, первое бесполезно */
}

/* строки 252-257 */
.planSubtitle {
  font-size: 12px;
  color: var(--text-tertiary);       /* ← объявлено */
  margin-bottom: 12px;
  background: color-mix(in srgb, var(--plan-color) 16%, transparent);
  color: var(--plan-color);          /* ← переопределено */
}
```

Первое `color:` в обоих случаях мертво — его немедленно переопределяет второе. Это не работает как задумано и вводит в заблуждение при чтении кода.

---

### 2.5 Hover-стили задвоены

В одном файле есть два определения hover для одних и тех же классов:

```css
/* строка 411 */
.industryBtn:hover, .sizeBtn:hover, .planCard:hover {
  transform: var(--feedback-raise-hover);
  box-shadow: var(--shadow-sm);
}

/* строка 437 */
.industryBtn:hover, .sizeBtn:hover, .planCard:hover {
  transform: translateY(-1px);     /* перезаписывает первое */
  box-shadow: var(--shadow-md);    /* перезаписывает первое */
}
```

Также transition задвоен: один раз inline внутри каждого класса `.industryBtn`, `.sizeBtn`, `.planCard`, и второй раз в общем блоке (строки 441-451). Этот дубль увеличивает размер CSS и создаёт путаницу при изменении.

---

## 3. Chapan SPA — 4 критических проблемы

**Файлы:** `src/features/chapan-spa/components/workshop/WorkshopConsole.tsx`, `WorkshopConsole.module.css`, `src/features/chapan-spa/model/tile-ui.store.ts`

### 3.1 Chapan открывается как массивный дашборд

**Что происходит:**

1. Пользователь открывает плитку Чапан
2. Рендерится `WorkshopConsole` — огромный hero-блок:
   - Заголовок "Рабочее пространство цеха" шрифтом `clamp(26px, 3vw, 36px)`
   - Pills с ролью, именем, "Клиентские данные скрыты"
   - 4 stat-карточки с числами
3. Ниже — `ProductionQueue`

Пользователь **не понимает, что делать**. Нет призыва к действию. Нет понятной точки входа. Stat-карточки показывают абстрактные числа без контекста ("всего задач: 0").

**Apple-уровень:** при первом открытии SPA должен показывать **конкретное действие** или **список объектов для работы**. Дашборд — это вторичный экран, не первый.

**Что сделать:**
- По умолчанию открывать секцию `orders` или `requests`, а не WorkshopConsole
- Либо полностью переработать WorkshopConsole как опциональный secondary экран
- Hero с заголовком 36px внутри modal-плитки неоправданно громоздкий

---

### 3.2 Хардкод-стили вместо дизайн-токенов

В `WorkshopConsole.module.css` токены не используются:

```css
/* Хардкод цветов */
.loading { color: rgba(255, 255, 255, 0.6); }         /* должно быть var(--text-tertiary) */
.hero { border: 1px solid rgba(255, 255, 255, 0.08); } /* var(--border-subtle) */
.iconWrap { background: rgba(255, 255, 255, 0.06); }   /* var(--bg-surface) */
.title { color: rgba(255, 255, 255, 0.96); }           /* var(--text-primary) */
.pill { border: 1px solid rgba(255, 255, 255, 0.08); } /* var(--border-subtle) */
.statCard { background: rgba(255, 255, 255, 0.05); }   /* var(--bg-surface) */

/* Хардкод радиусов */
.hero { border-radius: 26px; }                         /* var(--radius-2xl) */
.statCard { border-radius: 20px; }                     /* var(--radius-xl) */
.iconWrap { border-radius: 16px; }                     /* var(--radius-lg) */

/* Хардкод теней */
.hero { box-shadow: 0 22px 48px -34px rgba(0, 0, 0, 0.44); } /* var(--shadow-lg) */

/* Хардкод accent-градиентов */
background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.14), ...);
background: radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), ...);
```

Это нарушает тему. Переключение на dark/light тему не будет работать в Chapan.

---

### 3.3 Oversized hero внутри ограниченного SPA

Title в `WorkshopConsole`:
```css
.title { font-size: clamp(26px, 3vw, 36px); }
```

36px-заголовок внутри modal-плитки, которая сама максимум 940px по высоте — занимает критически много места. Это уместно для landing page, не для рабочего инструмента.

**Apple-уровень:** заголовок внутри рабочей панели — максимум 18-20px, с подтекстом 13px.

---

### 3.4 Title в WorkshopConsole не адаптирован к SPA-контексту

Заголовок "Рабочее пространство цеха" (3vw) + pills + stats — занимает ~25-30% высоты плитки, оставляя мало места для реального контента (ProductionQueue).

---

## 4. SPA-модальное окно: размер и настройки

**Файлы:** `src/features/workspace/components/WorkspaceTileModal.tsx`, `src/features/workspace/components/Workspace.module.css`

### 4.1 Переключатель размера — лишний контрол

В настройках плитки (popover при клике на шестерёнку):
```tsx
const SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное' },
  { value: 'default', label: 'Стандартное' },
  { value: 'wide', label: 'Широкое' },
];
```

Пользователю не нужно управлять шириной SPA. Продукт должен решать за него — и открывать максимально широко.

**Текущие размеры:**
```css
.tileModalCompact { width: min(70vw, 940px);  height: min(76vh, 660px); }
.tileModalDefault { width: min(88vw, 1200px); height: min(86vh, 820px); }
.tileModalWide    { width: min(97vw, 1540px); height: min(94vh, 940px); }
```

**Что сделать:**
1. Удалить `SIZE_OPTIONS` и segmented control из settings popover
2. Зафиксировать один размер: `min(97vw, 1540px)` / `min(94vh, 940px)` — или близко к нему
3. Убрать `WorkspaceModalSize` из типов и стора (или оставить для совместимости, но не показывать UI)

---

### 4.2 Дублирование логики размера в типах и сторе

`WorkspaceModalSize = 'compact' | 'default' | 'wide'` в `types.ts`, `resizeModal` в `store.ts` — вся эта логика бесполезна после удаления UI.

---

## 5. Дизайн-система: системные нарушения

### 5.1 Несогласованные border-radius

| Место | Значение | Должно быть |
|---|---|---|
| Auth modal panel | `28px` хардкод | `var(--radius-2xl)` → 24px |
| Auth typeCard | `16px` хардкод | `var(--radius-lg)` |
| Auth inputs/buttons | `12-14px` хардкод | `var(--radius-md)` |
| Onboarding card | `var(--surface-radius)` ✓ | — |
| Onboarding planCard | `var(--radius-lg)` ✓ | — |
| Chapan hero | `26px` хардкод | `var(--radius-2xl)` |
| Chapan statCard | `20px` хардкод | `var(--radius-xl)` |
| Chapan iconWrap | `16px` хардкод | `var(--radius-lg)` |

Дизайн-токены радиусов существуют. Применяются не везде. Нужна единая инвентаризация и замена всех хардкодов.

---

### 5.2 Несогласованные размеры иконок

| Место | Иконки |
|---|---|
| Sidebar | `size={17}` |
| Auth modal typeIcon | `size={18}` |
| Auth modal button icons | `size={16}` |
| WorkshopConsole Factory | `size={18}` |
| WorkshopConsole pills | `size={12}` |
| WorkshopConsole loading | `size={18}` |

Нет таблицы согласованных размеров. Иконки в одном контексте должны быть одного размера. Рекомендация: 16px для body, 14px для compact, 18-20px для section icons.

---

### 5.3 Auth modal не использует дизайн-токены

`AuthModal.module.css` использует исключительно хардкод:
- `rgba(4, 6, 10, 0.76)` вместо токена overlay
- `rgba(14, 18, 26, 0.98)` вместо `var(--bg-canvas)`
- `rgba(0, 0, 0, 0.55)` в box-shadow вместо `var(--shadow-xl)`
- `rgba(238, 243, 250, 0.95)` вместо `var(--text-primary)`
- `rgba(155, 168, 186, 0.7)` вместо `var(--text-secondary)`

AuthModal написан как изолированный компонент с собственной цветовой системой, поэтому он выглядит иначе, чем остальной продукт. При смене темы — AuthModal не обновится.

---

### 5.4 Типографика: нет системы

| Элемент | Текущий размер | Комментарий |
|---|---|---|
| Auth title | `clamp(24px, 3.5vw, 32px)` | — |
| Chapan hero title | `clamp(26px, 3vw, 36px)` | 36px в modal — избыточно |
| Onboarding sectionTitle | `22px` | — |
| Onboarding successTitle | `22px` | — |
| Sidebar nav | нет явного размера | унаследован |

Нет единого масштаба заголовков для модальных/SPA контекстов. Дизайн-система определяет `--text-size-*` токены, но они применяются непоследовательно.

Предложение:
- SPA/modal h1: `--text-size-2xl` (22px)
- SPA/modal h2: `--text-size-xl` (18px)
- Section label: `--text-size-lg` (16px)
- Body: `--text-size-base` (13px)

---

## 6. UX-сценарии: что работает не так

### 6.1 Onboarding: нет явного визуального flow

Пользователь видит:
1. Непонятно где лого/steps (из-за flex-row)
2. `scenarioRail` с описанием процесса (дублирует steps)
3. Контент шага

Трёхуровневая навигационная система в одном wizard — перебор.

**Apple-уровень:** один progress indicator, никаких дополнительных "объясняющих блоков". Контент шага говорит сам за себя.

---

### 6.2 Registration: flow начинается не с того

`initialStep="choose-type"` — регистрация начинается сразу с выбора типа (Компания / Сотрудник). Но пользователь ещё не понимает, что это за продукт.

Нет:
- экрана "что это за продукт"
- экрана с ценностным предложением
- даже короткого заголовка "Добро пожаловать в Kort"

AuthModal открывается и сразу спрашивает "Вы Компания или Сотрудник?" — без контекста.

---

### 6.3 Chapan: нет zero-state

Если в workshop нет заказов — `OverviewDashboard` покажет пустые числа. Нет empty state, нет призыва к действию "Создайте первый заказ". Пользователь видит нули и не понимает, что делать.

---

### 6.4 Quick links на шаге 3: emoji-иконки + text иконки одновременно

```tsx
const QUICK_LINKS = [
  { icon: '👤', title: 'Добавьте первого клиента', ... },
  { icon: '💼', title: 'Создайте первую сделку', ... },
  { icon: '📥', title: 'Импорт из Excel', ... },
];
```

Emoji здесь — визуальный шум. Весь продукт использует Lucide. Эти три элемента — исключение и сразу бросаются в глаза.

---

## 7. Приоритизация

### P0 — Делать первым (влияет на первое впечатление)

| # | Проблема | Файл | Сложность |
|---|---|---|---|
| P0.1 | Исправить `flex-direction: row` на `column` в Onboarding | `Onboarding.module.css:12` | XS |
| P0.2 | Убрать scenarioRail из onboarding | `index.tsx:152-162` | XS |
| P0.3 | Убрать dev-текст из brandSide в AuthModal | `AuthModal.tsx:372-380` | XS |
| P0.4 | Заменить emoji в onboarding на Lucide-иконки | `index.tsx:57-61` | S |
| P0.5 | Убрать переключатель размера SPA, зафиксировать wide | `WorkspaceTileModal.tsx:18-22, 214-226` | S |
| P0.6 | Исправить Chapan default section на `orders` | `tile-ui.store.ts:72` | XS |

---

### P1 — Делать вторым (системные нарушения)

| # | Проблема | Файл | Сложность |
|---|---|---|---|
| P1.1 | Исправить CSS-баг двойного `color:` в subLabel/planSubtitle | `Onboarding.module.css:126-129, 252-257` | XS |
| P1.2 | Убрать дублированные hover-стили в Onboarding.module.css | `Onboarding.module.css:411-412, 434-450` | XS |
| P1.3 | Перевести Chapan CSS на дизайн-токены (цвета, радиусы, тени) | `WorkshopConsole.module.css` | M |
| P1.4 | Перевести AuthModal CSS на дизайн-токены | `AuthModal.module.css` | M |
| P1.5 | Уменьшить h1 в WorkshopConsole с 36px до ≤20px | `WorkshopConsole.module.css:62-64` | XS |
| P1.6 | Унифицировать border-radius по всему проекту | Все компоненты | M |
| P1.7 | Стандартизировать размеры иконок (таблица) | Все компоненты | M |

---

### P2 — Делать третьим (UX-углубление)

| # | Проблема | Файл | Сложность |
|---|---|---|---|
| P2.1 | Добавить branded контент в brandSide AuthModal | `AuthModal.tsx` | L |
| P2.2 | Добавить empty state для Chapan OverviewDashboard | `OverviewDashboard.tsx` | M |
| P2.3 | Переработать typeCard layout (icon top, content bottom) | `AuthModal.module.css` | S |
| P2.4 | Добавить visual hierarchy в choose-type (primary/secondary) | `AuthModal.tsx, .module.css` | S |
| P2.5 | Типографическая система для SPA/modal контекстов | globals.css + компоненты | L |
| P2.6 | Убрать WorkspaceModalSize из типов и store | `types.ts, store.ts` | S |

---

## 8. Что делать прямо сейчас

Порядок без распыления:

1. `Onboarding.module.css` строка 12: `flex-direction: row` → `column` — 1 строка
2. Убрать весь блок `scenarioRail` из `index.tsx` — ~10 строк
3. Убрать dev-текст из `AuthModal.tsx` brandSide — 4 строки
4. Заменить emoji в QUICK_LINKS на Lucide-иконки — 3 строки
5. `tile-ui.store.ts` строка 72: `section: 'requests'` → `section: 'orders'`
6. `WorkspaceTileModal.tsx`: убрать `SIZE_OPTIONS` и segmented control, зафиксировать класс `tileModalWide`

Это P0-список. Все пункты — правки менее чем на 50 строк суммарно. После них первое впечатление от продукта станет принципиально другим.

После P0 — системная работа по P1 (токены, радиусы, иконки).

---

## 9. Итог

Дизайн-система в KORT **существует и хорошо структурирована**. Токены, шрифты, motion-presets, иерархия z-index — всё есть. Проблема не в отсутствии системы, а в **несоблюдении её собственных правил**.

Три главных нарушителя:

1. **AuthModal** — написан как отдельный мир с хардкодом, не интегрирован в токены
2. **Chapan SPA** — написан в том же стиле хардкода, hero-блок неуместен в modal
3. **Onboarding** — layout-баг + дублирующие UI-элементы + emoji

Устранение этих трёх — уже 70% пути к Apple-уровню. Остаток — типографическая система и финальная полировка border-radius/icon-sizes.
