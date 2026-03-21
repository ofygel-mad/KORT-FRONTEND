# Критик-аудит: Производство / Чапан / Workzone Request

Дата: 2026-03-21
Статус: подтвержденный UI/UX-аудит по жалобам на последние доработки
Зона проверки: `src/features/chapan-spa`, `src/features/workspace/widgets/chapan/spa`, `src/pages/workzone-request`

## 1. Короткий вердикт

Жалоба в целом подтверждается.

- Плитка `Производство` действительно открывается не как рабочий инструмент, а как промежуточный лендинг-хаб. Корень проблемы не в `ChapanSPA`, а выше: `src/features/workspace/widgets/chapan/spa/production-shell.store.ts:33` задает `activeWorkspace: 'hub'`, из-за чего первым экраном становится `ProductionHub`.
- Внутри производственного контура реально размножены лендинговые и дэшбордовые паттерны: `hero`, `lead`, `stat cards`, `principles`, `preview`, `metric strips`, `attention zones`.
- Отдельная страница заявок сейчас уже не содержит буквального `#fff` на `#fff`, поэтому конкретный баг "белый текст на белом фоне" в текущем коде напрямую не подтверждается. Но визуальная проблема осталась: страница собрана на чрезмерно высветленных `color-mix(..., white ...)`, на самописных полях и на отдельной визуальной логике, из-за чего выглядит чужой, слишком белой и хрупкой по контрасту.
- Дополнительный мусор найден не только в `ProductionHub`, но и в `ProductionTemplateSPA`, `OverviewDashboard`, `RequestInbox`, `WorkshopSettings`, `WorkshopConsole`, а также в оболочке `ProductionWorkspaceShell`.

Итоговая оценка по проблемной зоне: 3.5/10.

Проблема не в отсутствии дизайн-системы. Проблема в том, что поверх уже существующей системы налеплен второй слой "эффектного" UI, который ломает утилитарность продукта.

## 2. Что именно хотел пользователь продукта и где это сломалось

Целевой сценарий KORT для производственного модуля:

1. Зашел.
2. Увидел список работы.
3. Выполнил действие.
4. Вышел.

Текущая реализация подменяет этот сценарий другим:

1. Зашел.
2. Прочитал манифест.
3. Посмотрел счетчики.
4. Посмотрел еще один счетчик.
5. Нажал в нужный продукт.
6. Внутри продукта снова увидел обзорную зону, метрики, статусы, поясняющий текст.

Для production-SPA это архитектурно неверно.

## 3. Ключевое уточнение по маршрутам

Важно зафиксировать технически точную причину.

`ChapanSPA` уже не открывается по умолчанию на `overview`. В `src/features/chapan-spa/model/tile-ui.store.ts:72` дефолтная секция уже `section: 'orders'`.

То есть корневая ошибка сейчас такая:

- не `ChapanSPA` кидает человека в обзор;
- это `production-shell.store.ts:33` сначала отправляет пользователя в `hub`;
- а `hub` уже работает как внутренний лендинг/дэшборд перед доступом к работе.

Это важная разница, потому что рефакторинг надо начинать не с табов `ChapanSPA`, а с удаления промежуточного "презентационного" входного слоя.

## 4. P0: критические нарушения

### 4.1. Плитка "Производство" открывает лендинг, а не рабочий контур

Файлы:

- `src/features/workspace/widgets/chapan/spa/production-shell.store.ts:33-36`
- `src/features/workspace/widgets/chapan/spa/ChapanEntry.tsx:17-18`
- `src/features/workspace/widgets/chapan/spa/ProductionHub.tsx:43-143`

Что происходит:

- `activeWorkspace` по умолчанию равен `hub`.
- `ChapanEntry` при `hub` рендерит `ProductionHub`.
- `ProductionHub` построен как презентационный экран с большим `hero`, `lead`, тегами, KPI-блоками, двумя рекламными карточками и блоком "principles".

Почему это плохо:

- Это лишний шаг между пользователем и работой.
- Это искусственно увеличивает когнитивную нагрузку.
- Это ломает "information scent": пользователь видит много контекста, но не видит очередь работы сразу.
- Это типичный anti-pattern для операционных интерфейсов: вход через narrative вместо task list.

Отдельно критично:

- `src/features/workspace/widgets/chapan/spa/ProductionHub.tsx:24` содержит хардкод `spaces: 2`. Это фейковая метрика, не привязанная к данным.

Как должно быть:

- Если у пользователя один рабочий production-space, плитка должна открывать сразу `ChapanSPA`.
- Если production-spaces реально несколько, нужен не лендинг, а компактный launcher: список пространств с названием, статусом и кнопкой открытия. Без манифестов, принципов и feature-copy.

Техническая реализация:

- В `production-shell.store.ts` сменить дефолт с `activeWorkspace: 'hub'` на `activeWorkspace: 'chapan'`.
- `ProductionHub.tsx` либо удалить полностью, либо ужать до минимального launcher-screen.
- `template` не должен конкурировать с живым производством в первом экране. Его место в настройках/админке, а не во входе в рабочий модуль.

Стандарт:

- Task-first entrypoint.
- Progressive disclosure.
- No dashboard before work.

### 4.2. Оболочка `ProductionWorkspaceShell` продолжает шуметь даже после очистки внутреннего контента

Файлы:

- `src/features/workspace/widgets/chapan/spa/ChapanEntry.tsx:23-26`
- `src/features/workspace/widgets/chapan/spa/ChapanEntry.tsx:37-40`
- `src/features/workspace/widgets/chapan/spa/ChapanEntry.tsx:51-54`
- `src/features/workspace/widgets/chapan/spa/ProductionWorkspaceShell.tsx:24-33`
- `src/features/workspace/widgets/chapan/spa/ProductionWorkspaceShell.module.css:12-100`

Что происходит:

- Даже если внутренний экран очистить, shell все равно добавляет лейбл, титул и длинный подзаголовок.
- Подзаголовки по сути повторяют контекст, который пользователь уже и так знает из названия плитки.

Почему это плохо:

- Это тот самый "семантический мусор" из жалобы, только вынесенный на уровень shell.
- Операционный экран не должен встречать пользователя объяснением "что это за пространство". Он должен встречать состоянием работы.

Как должно быть:

- Shell = кнопка назад + название пространства.
- Статусный badge показывать только если он реально влияет на работу: `Доступ ограничен`, `Только просмотр`, `Форма отключена`.
- Подзаголовок использовать только для состояния блокировки/ошибки, а не как постоянный descriptive paragraph.

Стандарт:

- One screen, one job.
- Минимум постоянного explanatory copy внутри tool-screen.

### 4.3. `ProductionHub` и `ProductionTemplateSPA` построены как внутренние лендинги, а не как инструменты

Файлы:

- `src/features/workspace/widgets/chapan/spa/ProductionHub.tsx:43-143`
- `src/features/workspace/widgets/chapan/spa/ProductionHub.module.css:31-289`
- `src/features/workspace/widgets/chapan/spa/ProductionTemplateSPA.tsx:16-175`
- `src/features/workspace/widgets/chapan/spa/ProductionTemplateSPA.module.css:12-314`

Подтвержденный мусор:

- `ProductionHub`:
  - `lead`-параграф: `ProductionHub.tsx:47`
  - набор хештегоподобных feature-pill: `ProductionHub.tsx:52`
  - дублирующий KPI-блок: `ProductionHub.tsx:59-76`
  - длинные описания на карточках production/template: `ProductionHub.tsx:84`, `115`
  - блок "principles": `ProductionHub.tsx:143`
- `ProductionTemplateSPA`:
  - `SECTIONS`, `MODULES`, `ROLLOUT`: `ProductionTemplateSPA.tsx:16-35`
  - `Template workspace` + `Live preview`: `ProductionTemplateSPA.tsx:58-64`
  - секция "Зачем этот контур": `ProductionTemplateSPA.tsx:87-95`
  - секция "Что должно меняться по клиенту": `ProductionTemplateSPA.tsx:99-117`
  - секция "Правило масштабирования": `ProductionTemplateSPA.tsx:175-186`

Почему это плохо:

- Это документация о продуктовой архитектуре, замаскированная под экран продукта.
- Production template не дает выполнять рабочую задачу. Он объясняет, как устроен rollout. Это знание для разработчика/админа, а не для оператора.
- Внутренний инструмент не должен объяснять "зачем существует контур" прямо в runtime UI.

Как должно быть:

- `ProductionHub` удалить из runtime-пути обычного пользователя.
- `ProductionTemplateSPA` либо вынести в отдельный admin/setup-flow, либо оставить только реально редактируемые настройки шаблона.
- Если экран не позволяет выполнить действие, его нельзя ставить в основную навигационную цепочку production.

Стандарт:

- Runtime UI не должен содержать internal architecture storytelling.
- Documentation belongs to docs/admin, not to operator path.

### 4.4. Дэшбордовый мусор размазан по всему Чапану, не только в одном overview

Файлы:

- `src/features/chapan-spa/components/overview/OverviewDashboard.tsx:108-296`
- `src/features/chapan-spa/components/overview/OverviewDashboard.module.css:13-450`
- `src/features/chapan-spa/components/requests/RequestInbox.tsx:89-98`
- `src/features/chapan-spa/components/requests/RequestInbox.module.css:7-62`
- `src/features/chapan-spa/components/settings/WorkshopSettings.tsx:121-126`
- `src/features/chapan-spa/components/settings/WorkshopSettings.module.css:22-46`
- `src/features/chapan-spa/components/workshop/WorkshopConsole.tsx:58-95`
- `src/features/chapan-spa/components/workshop/WorkshopConsole.module.css:27-148`

Подтвержденные симптомы:

- `OverviewDashboard` состоит из пяти обзорных зон подряд:
  - `statsStrip`: `OverviewDashboard.module.css:13`
  - `blockedAlert`: `OverviewDashboard.module.css:89`
  - `attentionZone`: `OverviewDashboard.module.css:119`
  - `pipelineSection`: `OverviewDashboard.module.css:351`
  - `unpaidSection`: `OverviewDashboard.module.css:450`
- `RequestInbox` начинается с hero+stats вместо списка заявок: `RequestInbox.tsx:89-98`
- `WorkshopSettings` начинается с большого `metricStrip`, хотя экран называется "Настройки": `WorkshopSettings.tsx:121-126`
- `WorkshopConsole` сам заявляет "без лишнего дэшборд-шума", но при этом содержит `description`, `pills` и 4 `statCard`: `WorkshopConsole.tsx:58-95`

Почему это плохо:

- Аналитика дублируется между разделами.
- Пользователь каждый раз платит вниманием за одни и те же цифры.
- Настройки перестают быть настройками, заявки перестают быть inbox, цех перестает быть очередью.

Как должно быть:

- Аналитика живет в `src/features/summary-spa/components/widgets`.
- Внутри рабочих модулей оставить только локально полезные сигналы:
  - badge на табе;
  - один alert о блокировке;
  - короткий статус-фильтр;
  - счетчик рядом с заголовком списка.

Что переносить:

- revenue / unpaid / stage funnel / aggregate pipeline metrics из `OverviewDashboard` в `Summary`.
- summary-плашки из `RequestInbox`, `WorkshopSettings`, `WorkshopConsole` удалить.

Стандарт:

- Dashboards belong to Summary.
- Operational screens should expose queues, cards, tables, kanban.

### 4.5. Zero-state дисциплина не соблюдена

Файлы:

- `src/features/chapan-spa/components/overview/OverviewDashboard.tsx:91-100`
- `src/features/chapan-spa/components/production/ProductionQueue.tsx:128-133`
- `src/shared/ui/EmptyState.tsx:28-67`

Что происходит:

- `OverviewDashboard` уже использует `EmptyState`, но перегружает его длинным `description` и `steps`.
- `ProductionQueue` вообще рисует свой отдельный пустой экран, хотя в проекте уже есть shared `EmptyState`.

Почему это плохо:

- Пустое состояние снова превращается в обучающий экран.
- Нет единого стандарта для empty state.

Как должно быть:

- Для operator UI использовать только компактный `EmptyState`:
  - icon
  - короткий title
  - короткий description
  - одна primary action
- Без `steps`, без микро-инструкций, без "потому что система вот так работает".

Нормальный вариант для производства:

- title: `Нет активных производственных задач`
- description: `Подтвердите заказ или создайте новый`
- action: `Создать заказ`

Стандарт:

- Zero-state must trigger action, not reading.

### 4.6. Внешняя страница заявок выглядит как отдельный светлый микросайт, а не как часть KORT

Файлы:

- `src/pages/workzone-request/index.tsx:312-333`
- `src/pages/workzone-request/index.tsx:338-677`
- `src/pages/workzone-request/WorkzoneRequest.module.css:1-645`

Подтвержденные проблемы:

- Двухколоночный layout с narrative aside:
  - `.stage`: `WorkzoneRequest.module.css:63-65`
  - `.story` sticky: `WorkzoneRequest.module.css:78-79`
- Две отдельные storytelling-карточки перед формой:
  - `index.tsx:315-333`
  - `.storyCard`, `.storyCardAccent`: `WorkzoneRequest.module.css:127-168`
- Светлая палитра собрана на множестве `white`-mix:
  - токены intake surface: `WorkzoneRequest.module.css:8-10`
  - page background: `WorkzoneRequest.module.css:18-26`
  - story/form backgrounds: `WorkzoneRequest.module.css:87`, `140`, `196`
  - field background: `WorkzoneRequest.module.css:289`
  - toggle / button / calendar surfaces: `WorkzoneRequest.module.css:393`, `456`, `540`, `568`, `598`

Что важно технически:

- В текущем коде текст полей не задан белым. Напротив, `.input/.select/.textarea` используют `color: var(--intake-ink)` (`WorkzoneRequest.module.css:281-290`), а `--intake-ink` = `var(--text-primary)` (`WorkzoneRequest.module.css:2`, `globals.css:67`).
- Значит, literal-баг "white on white" по текущему состоянию репозитория не воспроизводится как прямой CSS-факт.
- Но репозиторий подтверждает более глубокую проблему: визуальная система страницы построена на постоянном осветлении через `white`, а не на базовых токенах поверх общего KORT-окружения. Отсюда и ощущение "ослепительно белой" страницы.

Почему это плохо:

- Narrative aside крадет ширину у формы.
- Пользователь приходит оставить заявку, а не читать "что будет дальше".
- Палитра разъезжается с основным продуктом.
- Контраст становится зависимым от случайного сочетания `white`-mix и текущей темы.

Как должно быть:

- Один главный объект на экране: форма.
- Визуальный wow-слой оставить в фоне, не в контенте.
- Слева не нужен sticky-лендинг. Максимум один компактный intro-block над формой.
- Основной контейнер формы должен быть glass/token-based surface, а не белая карточка, высветленная десятью `color-mix(..., white ...)`.

Минимальный стандартный CSS-подход:

```css
.requestShell {
  background: color-mix(in srgb, var(--bg-surface) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--fill-accent) 14%, var(--border-subtle));
  box-shadow: var(--brand-panel-shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
```

Стандарт:

- Wow lives in atmosphere, not in form chrome.
- Conversion pages must start with action, not with manifesto.

## 5. P1: системные нарушения, которые поддерживают мусор

### 5.1. Shared UI обходится вручную, из-за этого плодятся кастомные поля и стили

Файлы:

- `src/shared/ui/Input.tsx:38-148`
- `src/shared/ui/SearchInput.tsx:10-19`
- `src/pages/workzone-request/index.tsx:346-658`
- `src/features/chapan-spa/components/settings/WorkshopSettings.tsx:137-248`
- `src/features/workspace/widgets/chapan/spa/ProductionTemplateSPA.tsx:141-160`
- `src/features/workspace/widgets/chapan/spa/ChapanSPA.tsx:150-195`

Что подтверждено:

- В проекте уже есть `Input`, `Textarea`, `Button`, `Badge`, `SearchInput`.
- Но:
  - `workzone-request` рисует собственные `input/select/textarea`;
  - `WorkshopSettings` рисует собственные `input/select`;
  - `ProductionTemplateSPA` рисует собственные `input/textarea`;
  - `ChapanSPA` руками дублирует поисковое поле вместо `SearchInput`.

Почему это плохо:

- Состояния `focus/hover/error` живут в нескольких реализациях.
- Контраст и отступы начинают расходиться.
- Баги вроде "поле похоже на кнопку" или "селект не читается" становятся неизбежными.

Как должно быть:

- Вынести правило: сначала shared primitive, потом локальная стилизация.
- Если нужен селект, а shared `Select` пока нет, надо сделать `src/shared/ui/Select.tsx`, а не размножать локальные `select` по модулю.

Стандарт:

- Shared primitive first.

### 5.2. На странице заявок интерактивные choice/toggle-группы реализованы как кнопки, а не как формы

Файлы:

- `src/pages/workzone-request/index.tsx:373-410`
- `src/pages/workzone-request/WorkzoneRequest.module.css:362-406`

Что происходит:

- Наличие WhatsApp/Telegram переключается кнопками.
- Предпочтительный способ ответа тоже переключается кнопками.

Почему это плохо:

- Это по смыслу checkbox/radio группы, а не произвольные buttons.
- Потеряна семантика формы.
- Нет встроенного поведения для accessibility и клавиатурной навигации.

Как должно быть:

- `hasWhatsApp` / `hasTelegram` = checkbox group.
- `preferredContact` = radio group.
- Если визуально нужны pills/cards, стилизовать реальные `input[type=checkbox]` и `input[type=radio]`, а не заменять их на обычные кнопки.

Стандарт:

- Semantic controls before visual treatment.

### 5.3. У селекта убран системный affordance, но не добавлен свой

Файлы:

- `src/pages/workzone-request/WorkzoneRequest.module.css:323-324`

Что происходит:

- `select` имеет `appearance: none`.
- Собственный chevron или indicator рядом не добавлен.

Почему это плохо:

- Пользователь теряет визуальный сигнал, что поле выпадающее.
- Это особенно плохо на светлом фоне и на мобильных.

Как должно быть:

- Либо использовать shared `Select`,
- либо добавить свою иконку раскрытия и корректные `padding-right`.

### 5.4. В модели профиля уже есть поля для тонкой настройки public page, но UI их игнорирует

Файлы:

- `src/features/chapan-spa/api/types.ts:256-261`
- `src/features/chapan-spa/model/chapan.store.ts:102-107`
- `src/pages/workzone-request/index.tsx:68-73`
- `src/features/chapan-spa/components/settings/WorkshopSettings.tsx:144-174`

Что видно:

- В модели есть `descriptor`, `publicIntakeDescription`, `supportLabel`.
- В публичной странице и в настройках эти поля фактически не используются.
- Вместо этого форма получает захардкоженные storytelling-блоки.

Почему это плохо:

- Конфигурация обещает кастомизируемый intake, но UI его не реализует.
- Код начинает врать о своих возможностях.

Что делать:

- Либо реально подключить `publicIntakeDescription` и `supportLabel` в публичную страницу,
- либо удалить их из модели до момента, когда они действительно нужны.

Стандарт:

- No dead configuration in runtime model.

## 6. Дополнительный UI/UX мусор, найденный сверх жалобы

### 6.1. `WorkshopSettings` визуально оформлен как обзорная панель, а не как settings-screen

Файлы:

- `src/features/chapan-spa/components/settings/WorkshopSettings.tsx:121-126`
- `src/features/chapan-spa/components/settings/WorkshopSettings.module.css:22-46`

Проблема:

- Большой `metricStrip` в настройках не помогает настроить модуль.
- Это еще одна инъекция dashboard-thinking в экран, где должен быть form + sections.

Решение:

- Убрать metric strip полностью.
- Начинать экран сразу с групп настроек.

### 6.2. `RequestInbox` вместо inbox начинает с hero-блока

Файлы:

- `src/features/chapan-spa/components/requests/RequestInbox.tsx:89-98`
- `src/features/chapan-spa/components/requests/RequestInbox.module.css:7-62`

Проблема:

- Перед списком заявок пользователь снова получает промо-блок и summary-cards.

Решение:

- Оставить только фильтры и список.
- Числа перенести в badge фильтров.

### 6.3. `ProductionQueue` все еще частично живет на локальных примитивах

Файлы:

- `src/features/chapan-spa/components/production/ProductionQueue.tsx:128-133`
- `src/features/chapan-spa/components/production/ProductionQueue.tsx:230-329`
- `src/features/chapan-spa/components/production/ProductionQueue.module.css:230-260`, `408-429`

Проблема:

- Custom empty state.
- Custom select/input для назначений и блокировок.
- Это увеличивает divergence от shared UI.

Решение:

- Empty state перевести на shared `EmptyState`.
- Для простых input/select сценариев использовать shared primitives после появления `Select`.

### 6.4. Публичный success-screen красиво анимирован, но продуктово вторичен

Файлы:

- `src/pages/workzone-request/index.tsx:687-725`
- `src/pages/workzone-request/WorkzoneRequest.module.css:645-756`

Проблема:

- В success-state много визуальной постановки и мало продуктовой пользы.
- Для формы заявок важнее подтверждение отправки, номер обращения, ожидаемое время ответа и понятный следующий шаг.

Решение:

- Сохранить motion, но упростить сцену.
- Сократить слой спецэффектов и усилить полезные метаданные.

## 7. Стандарты, которыми надо руководствоваться при рефакторинге

### 7.1. Task-first navigation

Первый экран рабочего модуля обязан открывать:

- очередь;
- список;
- канбан;
- карточки задач;
- пустое состояние с одним действием.

Не обязан открывать:

- манифест;
- обзор пространства;
- архитектурное объяснение;
- KPI-дашборд.

### 7.2. Progressive disclosure

Сначала действие, потом подробности.

- user-facing runtime screen: минимум контекста;
- admin/setup screen: конфигурация;
- summary screen: аналитика.

Нельзя смешивать все три слоя в одной точке входа.

### 7.3. Semantic token discipline

Разрешено:

- `var(--bg-surface)`
- `var(--text-primary)`
- `var(--text-secondary)`
- `var(--border-subtle)`
- `var(--brand-panel-shadow)`

Нежелательно для product UI:

- постоянные `color-mix(..., white ...)` как основной способ построения surfaces;
- локальная палитра, которая живет отдельно от общей темы.

### 7.4. Shared primitive discipline

Если в `src/shared/ui` есть примитив, локальная реализация должна быть исключением, а не правилом.

### 7.5. WCAG AA как минимум

Для рабочего B2B-интерфейса:

- текст на поле и подписи должны стабильно держать контраст;
- селекты и переключатели должны быть явно распознаваемы;
- кликабельные состояния не должны зависеть только от цвета.

## 8. План рефакторинга

### P0

1. Убрать `hub` как дефолтный entrypoint production-модуля.
2. Упростить `ProductionWorkspaceShell` до back + title + status-only badge.
3. Вынести `ProductionTemplateSPA` из основного рабочего пути или сократить до settings-only режима.
4. Удалить из runtime-пути `ProductionHub` как лендинговую прокладку.
5. Пересобрать `workzone-request` в форму-first layout без story aside.

### P1

1. Срезать dashboard-блоки из `OverviewDashboard`, `RequestInbox`, `WorkshopSettings`, `WorkshopConsole`.
2. Перенести аналитические агрегаты в `src/features/summary-spa/components/widgets`.
3. Перевести page/forms на shared `Input`, `Textarea`, `Button`, `Badge`, `SearchInput`.
4. Добавить shared `Select` и перестать размножать локальные `select`.
5. Привести empty states к одному стандарту.

### P2

1. Либо подключить `descriptor/publicIntakeDescription/supportLabel`, либо удалить их из модели.
2. Упростить success-screen формы до полезного product feedback.
3. Свести wow-эффект к атмосфере фона, а не к перегрузке поверхностей.

## 9. Чек-лист приемки после рефакторинга

- [ ] Открытие плитки `Производство` сразу ведет в рабочий контур, а не в `hub`.
- [ ] В runtime-пути production нет блоков вида `lead`, `principles`, `rollout`, `why this contour`.
- [ ] `ProductionHub` либо удален, либо превращен в компактный launcher без маркетингового copy.
- [ ] `ProductionTemplateSPA` не выглядит как внутренний лендинг/документация.
- [ ] `OverviewDashboard` либо удален, либо сведён к узкому operational summary без revenue/pipeline sections.
- [ ] `RequestInbox` начинается со списка и фильтров, а не с hero/stats.
- [ ] `WorkshopSettings` начинается с настроек, а не со сводки.
- [ ] `workzone-request` начинается с формы, а не с двух storytelling-карточек.
- [ ] На `workzone-request` больше нет `appearance: none` у select без собственного chevron.
- [ ] На `workzone-request` нет кнопочных суррогатов для checkbox/radio сценариев.
- [ ] Для форм используются shared primitives или новый shared `Select`.
- [ ] Empty states в production-модуле короткие и action-first.
- [ ] В production UI нет фейковых KPI вроде `spaces: 2`.

## 10. Финальный вывод

Проблемная зона сломана не одной ошибкой, а одной неправильной парадигмой: автор доработок пытался сделать из рабочего B2B-инструмента красивый внутренний лендинг с обзорными карточками и псевдо-аналитикой.

Для KORT это неверный вектор.

Правильный вектор такой:

- `Сводка` = место для dashboards.
- `Производство` = место для работы.
- `Чапан` = место для очередей, заказов, заявок и производства.
- `Форма клиента` = место для конверсии, а не для рассказа о продукте.

Рефакторинг надо делать не косметически, а через смену entrypoint, вычищение narrative-copy, перенос аналитики в Summary и возврат к shared UI-примитивам.
