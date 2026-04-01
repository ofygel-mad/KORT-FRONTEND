# AUTHORIZATION_FEATURES

## 1. Документ и источники анализа

Этот документ собран по двум актуальным кодовым базам:

- Frontend: `C:\Users\user\Documents\KORT-DEV-MODE`
- Backend: `C:\Users\user\Documents\KORT-BACKEND`

Цель документа: дать команде разработки готовое техническое ТЗ по доработке авторизации, смены owner-учётных данных, входа сотрудников по номеру телефона, модели прав, разделения чапанского блока и защите от обхода ограничений через прямые маршруты, canvas и ярлыки.

Документ не описывает абстрактную архитектуру "с нуля". Он опирается на уже существующий код, фиксирует текущее состояние, указывает реальные несовместимости и даёт рекомендуемые патчи по конкретным файлам.

## 2. Краткий вывод

Система уже частично поддерживает почти весь нужный сценарий, но она собрана не до конца и сейчас ломается на трёх уровнях:

1. Логика доступа не централизована.
2. Frontend и backend уже расходятся по словарю employee permissions.
3. Owner/email/password flow и employee first-login flow реализованы фрагментарно и в разных местах.

Что уже есть в текущем коде:

- На backend уже есть phone-based login сотрудников.
- На backend уже есть `pending_first_login`, `dismissed`, `active`.
- На backend уже есть short-lived first-login token и endpoint установки пароля.
- На backend уже есть self-service смена email и пароля.
- На frontend уже есть `AuthModal`, `SetPasswordStep`, employee panel, хуки прав и часть Chapan access-layer.

Что критично не готово:

- Нет точного двухэтапного UX "Войти как сотрудник".
- Смена owner password не выбрасывает owner из системы гарантированно.
- Права на frontend и backend не совпадают по enum-ключам.
- Backend почти не ограничивает доступ сотрудников по module/capability.
- Frontend router/canvas/sidebar/workspace shortcuts позволяют визуально и навигационно проскочить в недоступные разделы.
- В Chapan settings owner-only зона сейчас привязана к `isAbsolute`, а не к реальному `isOwner`.

## 3. Целевые требования из бизнеса

Ниже сформулированы целевые правила в техническом виде.

### 3.1. Смена email и пароля владельца

- Владелец меняет email и/или пароль в главных настройках.
- Сессии работников не должны сбрасываться.
- Сессии других сотрудников внутри этой же организации не должны отзываться.
- Сам владелец после успешной смены email и/или пароля должен быть отправлен на повторную авторизацию.
- Повторный вход owner выполняет уже по новым данным.

### 3.2. Авторизация сотрудников

- В окне входа должна быть явная галочка или переключатель "Войти как сотрудник".
- Если включён режим сотрудника, первичным идентификатором становится номер телефона.
- На первом шаге сотрудник вводит только номер телефона.
- Если сотрудник существует и уже активирован, интерфейс показывает поле пароля.
- Если сотрудник существует и находится в `pending_first_login`, интерфейс сразу ведёт его в сценарий установки пароля.
- После установки первого пароля сотрудник не должен автоматически попадать внутрь системы.
- После установки первого пароля сотрудник должен быть возвращён на экран логина и зайти повторно уже по телефону и новому паролю.

### 3.3. Права сотрудника

- Права сотрудника должны одинаково работать в API, router layer, навигации, canvas shortcuts и внутри экранов.
- Скрытие кнопки в UI не считается защитой.
- Любой route и любой action endpoint должны отдельно проверять право доступа.

### 3.4. Чапанский блок

- Чапанские права нужно визуально вынести вниз отдельным блоком.
- Название блока: `Дополнительный модуль`.
- Внутри него должны лежать чапановские права и ограничения.

### 3.5. Защита от обхода

- Сотрудник без доступа к модулю не должен попадать в него:
- через прямой URL;
- через sidebar/mobile nav;
- через canvas;
- через кнопку `Создать ярлык`;
- через уже созданный старый shortcut;
- через внутренние переходы между связанными модулями.

## 4. Карта текущей реализации

### 4.1. Frontend

Ключевые файлы:

- `src/features/auth/AuthModal.tsx`
- `src/features/auth/SetPasswordStep.tsx`
- `src/features/auth/ChangeCredentialsPanel.tsx`
- `src/features/auth/AddEmployeeModal.tsx`
- `src/features/auth/EmployeeDetailModal.tsx`
- `src/features/auth/employeePermissionOptions.ts`
- `src/shared/hooks/useEmployeePermissions.ts`
- `src/shared/hooks/useChapanPermissions.ts`
- `src/shared/hooks/useCapabilities.ts`
- `src/shared/hooks/useRole.ts`
- `src/app/router/index.tsx`
- `src/pages/canvas/index.tsx`
- `src/features/workspace/components/WorkspaceAddMenu.tsx`
- `src/features/workspace/components/WorkspaceTile.tsx`
- `src/shared/navigation/appNavigation.ts`
- `src/pages/workzone/chapan/settings/ChapanSettings.tsx`

### 4.2. Backend

Ключевые файлы:

- `src/modules/auth/auth.routes.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.schemas.ts`
- `src/modules/employees/employees.routes.ts`
- `src/modules/employees/employees.service.ts`
- `src/modules/users/users.routes.ts`
- `src/modules/users/users.service.ts`
- `src/plugins/auth.ts`
- `src/plugins/org-scope.ts`
- `src/lib/jwt.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`

## 5. Что уже реализовано правильно

### 5.1. Employee first-login уже есть на backend

На сервере уже присутствует нужный базовый каркас:

- `Membership.employeeAccountStatus` в `prisma/schema.prisma`
- значения `active | pending_first_login | dismissed`
- вход сотрудника по телефону в `auth.service.ts`
- выдача temp token через `signFirstLoginToken`
- ручная верификация этого токена в `POST /api/v1/auth/set-password`
- возврат `requires_password_setup: true`

Это значит, что дорабатывать нужно не идею, а UX, контракты и access control.

### 5.2. Owner email change уже есть на backend

В `src/modules/users/users.service.ts` уже есть `changeEmail(...)`:

- проверка текущего пароля;
- проверка уникальности email;
- обновление email;
- отзыв refresh tokens только для `userId` владельца.

Это правильно по бизнес-смыслу: чужие сотрудники не вылетают, потому что удаляются refresh-токены только одного пользователя.

### 5.3. Employee management уже есть на backend

В `src/modules/employees/employees.service.ts` уже реализованы:

- создание сотрудника;
- `pending_first_login`;
- reset employee password;
- dismiss employee;
- отзыв refresh tokens сотрудника при reset/dismiss.

### 5.4. Frontend уже умеет принимать first-login response

Во frontend уже есть:

- `isFirstLoginResponse(...)` в `src/shared/api/contracts.ts`;
- ветка `set-password` в `AuthModal.tsx`;
- отдельный `SetPasswordStep.tsx`.

То есть сценарий первой установки пароля не нужно изобретать с нуля.

## 6. Критические расхождения и дефекты

### 6.1. Самое опасное: frontend и backend расходятся по permission keys

Backend принимает только:

- `full_access`
- `financial_report`
- `sales`
- `production`
- `observer`

Это видно в `src/modules/employees/employees.service.ts`:

```ts
const VALID_PERMISSIONS = [
  'full_access',
  'financial_report',
  'sales',
  'production',
  'observer',
] as const;
```

Но frontend уже использует более широкий словарь:

- `warehouse_manager`
- `chapan_full_access`
- `chapan_access_orders`
- `chapan_access_production`
- `chapan_access_ready`
- `chapan_access_archive`
- `chapan_access_warehouse_nav`
- `chapan_manage_production`
- `chapan_confirm_invoice`
- `chapan_manage_settings`

Это видно в `src/shared/api/contracts.ts`, `AddEmployeeModal.tsx`, `EmployeeDetailModal.tsx`, `useChapanPermissions.ts`.

Практическое следствие:

- UI показывает чекбоксы, которые backend не валидирует;
- frontend строит доступ на основе ключей, которые backend не считает;
- при частичных правках возможны скрытые несоответствия "галочка есть, права реально не работают" или "модуль открылся визуально, но сервер не понимает доступ".

### 6.2. Owner-only зона в Chapan settings завязана не на owner, а на full_access

В `src/pages/workzone/chapan/settings/ChapanSettings.tsx` используется:

```ts
const { isAbsolute } = useEmployeePermissions();
const visibleTabs = allTabs.filter(t => !t.ownerOnly || isAbsolute);
...
{activeTab === 'account' && <AccountTab isOwner={isAbsolute} />}
```

`isAbsolute = isOwner || has('full_access')`.

Следствие:

- сотрудник с `full_access` может попасть в owner-only блок account tab;
- внутри account tab уже есть операции смены email владельца;
- это прямое нарушение модели "владелец != сотрудник с полным доступом".

### 6.3. Owner password change сейчас не завершает сценарий корректно

Backend endpoint `POST /api/v1/auth/change-password` уже существует.

Но `auth.service.ts` сейчас делает только:

```ts
await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
return { ok: true };
```

Проблема:

- refresh tokens не удаляются;
- access token остаётся валидным до TTL;
- owner не выбрасывается из системы гарантированно;
- бизнес-правило из задачи не выполняется полностью.

### 6.4. Валидация длины пароля уже расходится между экранами и backend

Сейчас в проекте есть минимум три разных правила:

- `SetPasswordStep.tsx` требует минимум 6 символов.
- `POST /auth/change-password` в `auth.routes.ts` требует минимум 6 символов.
- `setPasswordSchema` и `resetPasswordSchema` в `auth.schemas.ts` требуют минимум 8 символов.

Это приведёт к ложным ошибкам и нестабильному UX.

Бизнес-требование пользователя: `6 символов достаточно`.

### 6.5. Двухэтапный employee UX на frontend не доведён

Текущий `AuthModal.tsx` уже умеет:

- логин по email;
- логин по телефону;
- переход в `SetPasswordStep`.

Но он не реализует точный сценарий:

- чекбокс `Войти как сотрудник`;
- первичный ввод только номера телефона;
- серверная проверка статуса сотрудника до показа поля пароля;
- отдельный UX для `pending_first_login`.

Сейчас это скорее техническая поддержка двух типов идентификаторов, а не законченный employee login journey.

### 6.6. Backend route protection почти не проверяет employee permissions

Сейчас backend в основном использует:

- `app.authenticate`
- `app.resolveOrg`
- иногда `app.requireRole('admin', 'owner')`

Но для обычных модулей нет capability checks по employee permissions.

Примеры:

- `customers.routes.ts`
- `deals.routes.ts`
- `warehouse.routes.ts`
- `tasks.routes.ts`
- большая часть chapan routes

Следствие:

- любой активный сотрудник организации может ходить в защищённые module endpoints, если знает URL;
- защита держится в основном на frontend UI и plan visibility;
- это не защита, а косметика.

### 6.7. Frontend route layer тоже не знает про employee module access

В `src/app/router/index.tsx` есть:

- `RequireAuth`
- `RequireOrg`
- `RequirePlan`

Но нет:

- `RequireCapability`
- `RequireEmployeePermission`
- `RequireModuleAccess`

Следствие:

- сотрудник без прав может открыть route напрямую;
- canvas shortcuts и сохранённые ярлыки продолжают быть точкой обхода.

### 6.8. Canvas и shortcuts ограничены только тарифом, но не employee permissions

Сейчас:

- `WorkspaceAddMenu.tsx` фильтрует только по `planTier`;
- `CanvasPage` собирает видимые разделы только по `planIncludes(plan, item.planTier)`;
- `WorkspaceTile.tsx` просто делает `navigate(definition.navTo)`;
- `appNavigation.ts` не знает про employee rights.

Следствие:

- сотрудник может увидеть и открыть ярлык недоступного раздела;
- старые сохранённые tiles тоже продолжают вести в route;
- прямой переход из canvas никак не фильтруется.

### 6.9. Источник прав на frontend продублирован

Сейчас permission definitions живут минимум в трёх местах:

- `src/features/auth/AddEmployeeModal.tsx`
- `src/features/auth/EmployeeDetailModal.tsx`
- `src/features/auth/employeePermissionOptions.ts`

Это уже привело к расхождению между UI слоями и затрудняет перенос чапанского блока в отдельный раздел.

### 6.10. Multi-org edge case на backend уже небезопасен

Архитектура backend поддерживает membership по нескольким организациям.

Но:

- `resetEmployeePassword(...)` сбрасывает глобальный `user.password`;
- `dismissEmployee(...)` удаляет все refresh tokens по `userId`;
- `pending_first_login` хранится на membership, а пароль хранится на user.

Следствие:

- сотрудник, состоящий в нескольких организациях, может неожиданно потерять доступ в других организациях;
- смена состояния в одной компании затрагивает глобальный user account.

Для текущей задачи это не основной сценарий, но технически это уже архитектурный риск, и его надо зафиксировать.

## 7. Целевая техническая модель

### 7.1. Главный принцип

Нужен единый access-layer, который одинаково работает:

- на backend для API;
- на frontend для router;
- на frontend для навигации;
- на frontend для canvas и shortcuts;
- внутри модулей для action-level permissions.

### 7.2. Каноническая модель доступа

Рекомендуется перестать мыслить только "ролью" и перейти к двум уровням:

1. Membership role:
   - `owner`
   - `admin`
   - `manager`
   - `viewer`

2. Employee permissions:
   - общесистемные;
   - модульные;
   - action-level.

Рекомендуемый канонический словарь employee permissions:

```ts
type EmployeePermission =
  | 'full_access'
  | 'financial_report'
  | 'sales'
  | 'production'
  | 'warehouse_manager'
  | 'observer'
  | 'chapan_full_access'
  | 'chapan_access_orders'
  | 'chapan_access_production'
  | 'chapan_access_ready'
  | 'chapan_access_archive'
  | 'chapan_access_warehouse_nav'
  | 'chapan_manage_production'
  | 'chapan_confirm_invoice'
  | 'chapan_manage_settings';
```

Это уже фактический frontend-словарь. Проще и дешевле привести backend к нему, чем урезать фронт назад.

### 7.3. Разделение owner и full_access

Нужно жёстко разделить:

- `isOwner` = только membership role `owner`
- `full_access` = сотрудник с максимальным operational access

`full_access` не должен автоматически открывать:

- смену owner email;
- передачу ownership;
- owner-only security controls;
- потенциально billing/ownership действия, если это не одобрено отдельно.

### 7.4. Единая парольная политика

Для данной задачи следует принять единое правило:

- минимальная длина пароля: `6`

И привести к этому правилу:

- `SetPasswordStep.tsx`
- `auth.routes.ts` change-password validation
- `auth.schemas.ts` setPasswordSchema
- `auth.schemas.ts` resetPasswordSchema
- любые дополнительные owner credential forms

## 8. Рекомендуемые изменения по задаче 1.1

### 8.1. Текущее состояние

Backend:

- `POST /api/v1/users/me/change-email` уже обновляет email и отзывает refresh tokens владельца.
- `POST /api/v1/auth/change-password` меняет пароль, но не отзывает refresh tokens.

Frontend:

- фактический owner account flow живёт в `src/pages/workzone/chapan/settings/ChapanSettings.tsx`;
- старый `ChangeCredentialsPanel.tsx` использует несуществующий endpoint `/auth/change-credentials/` и должен считаться legacy/dead UI;
- owner-only отображение в Chapan settings сейчас завязано на `isAbsolute`, что опасно.

### 8.2. Что должно быть после исправления

- Email owner меняется только после проверки текущего пароля.
- Password owner меняется только после проверки текущего пароля.
- После любой успешной смены owner credentials frontend очищает локальную сессию и перекидывает owner на `/auth/login`.
- Backend отзывает refresh tokens только owner userId.
- Работники не вылетают, потому что их userId не затрагиваются.

### 8.3. Обязательные backend-патчи

#### Патч A. Отзывать refresh tokens при смене пароля

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.service.ts`

```ts
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('Пользователь не найден.');

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) throw new ForbiddenError('Неверный текущий пароль.');

  if (newPassword.length < 6) {
    throw new ValidationError('Новый пароль должен содержать не менее 6 символов.');
  }

  const hashed = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await tx.refreshToken.deleteMany({
      where: { userId },
    });
  });

  return { ok: true, requires_relogin: true };
}
```

Причина:

- это выполняет требование "owner выкидывает на повторную авторизацию";
- это не затрагивает другие userId;
- это не выбивает работников.

#### Патч B. Разрешить frontend опираться на `requires_relogin`

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.routes.ts`

```ts
app.post('/change-password', {
  preHandler: [app.authenticate],
}, async (request, reply) => {
  const { current_password, new_password } = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(6),
  }).parse(request.body);

  const result = await authService.changePassword(
    request.userId,
    current_password,
    new_password,
  );

  return reply.send(result);
});
```

### 8.4. Обязательные frontend-патчи

#### Патч C. Закрыть legacy `ChangeCredentialsPanel`

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\ChangeCredentialsPanel.tsx`

Рекомендация:

- не реанимировать этот компонент;
- либо удалить;
- либо оставить как deprecated wrapper, который вообще не рендерится;
- owner security flow централизовать в одном месте, а не размазывать.

Причина:

- компонент ходит в `/auth/change-credentials/`, которого нет в актуальном backend;
- это ложная точка поддержки.

#### Патч D. Исправить owner-only проверку в Chapan settings

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\pages\workzone\chapan\settings\ChapanSettings.tsx`

```tsx
import { useRole } from '../../../../shared/hooks/useRole';
import { useEmployeePermissions } from '../../../../shared/hooks/useEmployeePermissions';

export default function ChapanSettingsPage() {
  const { isOwner } = useRole();
  const { isAbsolute } = useEmployeePermissions();
  const canAccessOperationalTabs = isAbsolute;
  const defaultTab = canAccessOperationalTabs ? 'catalogs' : 'account';

  const allTabs = [
    { key: 'catalogs' as const, label: 'Каталоги', ownerOnly: false, requiresOperational: true },
    { key: 'profile' as const, label: 'Профиль', ownerOnly: false, requiresOperational: true },
    { key: 'clients' as const, label: 'Клиенты', ownerOnly: false, requiresOperational: true },
    { key: 'account' as const, label: 'Аккаунт', ownerOnly: true, requiresOperational: false },
  ];

  const visibleTabs = allTabs.filter((tab) => {
    if (tab.ownerOnly) return isOwner;
    if (tab.requiresOperational) return canAccessOperationalTabs;
    return true;
  });

  ...
  {activeTab === 'account' && <AccountTab isOwner={isOwner} />}
}
```

Ключевая идея:

- `isOwner` отвечает за owner identity controls;
- `isAbsolute` отвечает только за operational super access.

#### Патч E. После owner email/password change принудительно чистить клиентскую сессию

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\pages\workzone\chapan\settings\ChapanSettings.tsx`

Рекомендованный сценарий в UI:

```tsx
const clearAuth = useAuthStore((s) => s.clearAuth);
const clearPin = usePinStore((s) => s.clearPin);
const navigate = useNavigate();

async function handleOwnerPasswordChange() {
  const response = await api.post<{ ok: boolean; requires_relogin?: boolean }>(
    '/auth/change-password',
    { current_password: pwCurrent, new_password: pwNew },
  );

  if (response.data.requires_relogin) {
    clearPin();
    clearAuth();
    navigate('/auth/login', { replace: true });
    return;
  }
}
```

Аналогично для `/users/me/change-email`.

## 9. Рекомендуемые изменения по задаче 1.2

### 9.1. Текущее состояние

Backend уже умеет:

- логин по `{ phone, password }`
- если membership `pending_first_login`, возвращать:

```json
{
  "requires_password_setup": true,
  "temp_token": "...",
  "user": {
    "id": "...",
    "full_name": "...",
    "phone": "+7701..."
  }
}
```

Frontend уже умеет:

- распознать `FirstLoginResponse`;
- открыть `SetPasswordStep`.

Но текущий UX не соответствует точному сценарию из задачи.

### 9.2. Рекомендуемая целевая схема employee login

#### Вариант, который лучше всего соответствует бизнес-требованию

Добавить backend endpoint предварительной проверки телефона сотрудника:

- `POST /api/v1/auth/employee/lookup`

Запрос:

```json
{
  "phone": "+77010000003"
}
```

Ответ:

```json
{
  "found": true,
  "account_status": "pending_first_login",
  "requires_password": false,
  "requires_password_setup": true,
  "display_name": "Айдана Бекова"
}
```

или

```json
{
  "found": true,
  "account_status": "active",
  "requires_password": true,
  "requires_password_setup": false,
  "display_name": "Айдана Бекова"
}
```

или

```json
{
  "found": false
}
```

### 9.3. Почему lookup endpoint нужен

Без lookup endpoint невозможно чисто реализовать UX:

- сначала ввёл телефон;
- только потом система решила, показывать ли пароль;
- либо вести на first-login.

Текущий `POST /auth/login` требует пароль всегда и не подходит как чистый probe endpoint.

### 9.4. Рекомендуемый backend-патч для employee lookup

#### Патч F. Добавить lookup schema

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.schemas.ts`

```ts
export const employeeLookupSchema = z.object({
  phone: z.string().min(7, 'Некорректный телефон'),
});
```

#### Патч G. Добавить lookup service

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.service.ts`

```ts
export async function lookupEmployeeByPhone(phone: string) {
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    return { found: false as const };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      status: 'active',
    },
    orderBy: { joinedAt: 'desc' },
  });

  if (!membership || membership.employeeAccountStatus === 'dismissed') {
    return { found: false as const };
  }

  return {
    found: true as const,
    account_status: membership.employeeAccountStatus,
    requires_password: membership.employeeAccountStatus === 'active',
    requires_password_setup: membership.employeeAccountStatus === 'pending_first_login',
    display_name: user.fullName,
  };
}
```

#### Патч H. Добавить новый route

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.routes.ts`

```ts
app.post('/employee/lookup', async (request, reply) => {
  const { phone } = employeeLookupSchema.parse(request.body);
  const result = await authService.lookupEmployeeByPhone(phone);
  return reply.send(result);
});
```

### 9.5. Рекомендуемый frontend flow

Состояния employee auth modal:

- `employee_phone_entry`
- `employee_password_entry`
- `employee_first_login_password_setup`

Логика:

1. Пользователь ставит галочку `Войти как сотрудник`.
2. Поле email превращается в поле телефона.
3. Поле пароля скрыто.
4. После ввода валидного телефона frontend вызывает `/auth/employee/lookup`.
5. Если `requires_password === true`, показывается поле пароля.
6. Если `requires_password_setup === true`, frontend делает hidden-login через `POST /auth/login` с `{ phone, password: phone }` или получает temp token через отдельный endpoint и открывает `SetPasswordStep`.
7. После успешного set-password frontend очищает шаг и возвращает пользователя на employee login.

### 9.6. Рекомендуемый frontend-патч для AuthModal

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\AuthModal.tsx`

Опорная схема состояния:

```tsx
const [employeeMode, setEmployeeMode] = useState(false);
const [employeePhone, setEmployeePhone] = useState('');
const [employeeLookup, setEmployeeLookup] = useState<
  null | { requiresPassword: boolean; requiresPasswordSetup: boolean; displayName?: string }
>(null);

async function handleEmployeePhoneContinue() {
  const phone = normalizeKazakhPhone(employeePhone);
  if (!phone) return;

  const { data } = await api.post('/auth/employee/lookup', { phone });

  if (!data.found) {
    setError('Сотрудник с таким номером не найден.');
    return;
  }

  if (data.requires_password_setup) {
    const loginResp = await api.post<LoginApiResponse>('/auth/login', {
      phone,
      password: phone,
    });

    if (isFirstLoginResponse(loginResp.data)) {
      setTempToken(loginResp.data.temp_token);
      setStep('set-password');
      return;
    }
  }

  if (data.requires_password) {
    setEmployeeLookup({
      requiresPassword: true,
      requiresPasswordSetup: false,
      displayName: data.display_name,
    });
  }
}
```

### 9.7. Обязательная правка длины пароля

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.schemas.ts`

```ts
export const setPasswordSchema = z
  .object({
    new_password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirm_password: z.string().min(1),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Пароли не совпадают',
    path: ['confirm_password'],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    new_password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirm_password: z.string().min(1),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Пароли не совпадают',
    path: ['confirm_password'],
  });
```

Это нужно синхронизировать с `SetPasswordStep.tsx`.

## 10. Рекомендуемые изменения по задачам 1.3, 1.4 и 1.5

### 10.1. Единый словарь прав должен жить в одном месте

Сейчас definitions размазаны по компонентам.

Нужно оставить один источник истины на frontend:

- `src/features/auth/employeePermissionOptions.ts`

И уже его импортировать в:

- `AddEmployeeModal.tsx`
- `EmployeeDetailModal.tsx`
- любые permission summary components

### 10.2. Рекомендуемая структура permission groups на frontend

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\employeePermissionOptions.ts`

```ts
export const EMPLOYEE_PERMISSION_GROUPS = [
  {
    id: 'core',
    title: 'Основной доступ',
    items: [
      'full_access',
      'financial_report',
      'sales',
      'production',
      'warehouse_manager',
      'observer',
    ],
  },
  {
    id: 'additional_module',
    title: 'Дополнительный модуль',
    description: 'Права для модуля Чапан и связанных переходов.',
    items: [
      'chapan_full_access',
      'chapan_access_orders',
      'chapan_access_production',
      'chapan_access_ready',
      'chapan_access_archive',
      'chapan_access_warehouse_nav',
      'chapan_manage_production',
      'chapan_confirm_invoice',
      'chapan_manage_settings',
    ],
  },
] as const;
```

Это напрямую покрывает требование:

- "весь чапанский блок вывести вниз отдельно";
- "назвать Дополнительный модуль";
- "внутри чапановские права и ограничения".

### 10.3. Backend надо привести к тому же permission dictionary

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\employees\employees.service.ts`

Рекомендуемый `VALID_PERMISSIONS`:

```ts
const VALID_PERMISSIONS = [
  'full_access',
  'financial_report',
  'sales',
  'production',
  'warehouse_manager',
  'observer',
  'chapan_full_access',
  'chapan_access_orders',
  'chapan_access_production',
  'chapan_access_ready',
  'chapan_access_archive',
  'chapan_access_warehouse_nav',
  'chapan_manage_production',
  'chapan_confirm_invoice',
  'chapan_manage_settings',
] as const;
```

Без этого фронт и сервер так и останутся несовместимыми.

### 10.4. Backend capability map нужно расширить

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.service.ts`

Сейчас `buildCapabilities(...)` знает только:

- sales
- financial_report
- production
- observer

Но не знает:

- warehouse_manager
- granular chapan permissions

Рекомендуется заменить каскад `if` на карту:

```ts
const PERMISSION_TO_CAPS: Record<string, string[]> = {
  full_access: [
    'customers:read',
    'customers:write',
    'deals:read',
    'deals:write',
    'tasks:read',
    'tasks:write',
    'reports.basic',
    'reports.financial',
    'customers.import',
    'warehouse:read',
    'warehouse:write',
    'chapan:read',
    'chapan:write',
    'chapan.orders',
    'chapan.production',
    'chapan.ready',
    'chapan.archive',
    'chapan.settings',
    'team.manage',
    'integrations.manage',
    'audit.read',
    'automations.manage',
    'billing.manage',
  ],
  sales: ['customers:read', 'customers:write', 'deals:read', 'deals:write', 'tasks:read', 'tasks:write'],
  financial_report: ['reports.basic', 'reports.financial', 'customers.import'],
  production: ['tasks:read', 'tasks:write'],
  warehouse_manager: ['warehouse:read', 'warehouse:write'],
  observer: ['read.only'],
  chapan_full_access: ['chapan:read', 'chapan:write', 'chapan.orders', 'chapan.production', 'chapan.ready', 'chapan.archive', 'chapan.settings'],
  chapan_access_orders: ['chapan:read', 'chapan.orders'],
  chapan_access_production: ['chapan:read', 'chapan.production'],
  chapan_access_ready: ['chapan:read', 'chapan.ready'],
  chapan_access_archive: ['chapan:read', 'chapan.archive'],
  chapan_access_warehouse_nav: ['chapan.warehouse_nav'],
  chapan_manage_production: ['chapan.production.manage'],
  chapan_confirm_invoice: ['chapan.invoice.confirm'],
  chapan_manage_settings: ['chapan.settings'],
};
```

### 10.5. Нужен frontend access layer уровня "module access"

Сейчас есть:

- `useEmployeePermissions`
- `useChapanPermissions`
- `useCapabilities`

Но нет единой карты для route/nav/canvas.

Рекомендуется добавить:

- `src/shared/hooks/useModuleAccess.ts`

Пример:

```ts
export function useModuleAccess() {
  const employee = useEmployeePermissions();
  const chapan = useChapanPermissions();
  const caps = useCapabilities();

  return {
    leads: employee.isAbsolute || employee.canAccessSales,
    deals: employee.isAbsolute || employee.canAccessSales,
    customers: employee.isAbsolute || employee.canAccessSales,
    tasks: employee.isAbsolute || employee.canAccessSales || employee.canAccessProduction,
    warehouse: employee.isAbsolute || employee.canAccessWarehouse,
    finance: employee.isAbsolute || employee.canAccessFinancial,
    employees: employee.canManageTeam,
    reports: employee.isAbsolute || employee.canAccessFinancial || employee.canAccessSales,
    documents: employee.isAbsolute || employee.canAccessFinancial || employee.canAccessSales,
    chapan: chapan.hasAnyAccess,
    chapanOrders: chapan.canAccessOrders,
    chapanProduction: chapan.canAccessProduction,
    chapanReady: chapan.canAccessReady,
    chapanArchive: chapan.canAccessArchive,
    chapanSettings: chapan.canManageSettings,
    ownerAccount: caps.role === 'owner',
  };
}
```

## 11. Защита API: backend обязан проверять capability/module access

### 11.1. Минимально достаточный middleware слой

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\plugins\org-scope.ts`

Рекомендуется добавить capability guard:

```ts
fastify.decorate('requireCapability', (...required: string[]) => {
  return async (request: FastifyRequest) => {
    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId: request.userId, orgId: request.orgId } },
    });

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('No active organization membership');
    }

    if (membership.employeeAccountStatus === 'dismissed') {
      throw new ForbiddenError('Employee account dismissed');
    }

    const caps = buildCapabilities(
      membership.role,
      true,
      membership.employeePermissions,
    );

    const hasAll = required.every((cap) => caps.includes(cap));
    if (!hasAll) {
      throw new ForbiddenError(`Missing capabilities: ${required.join(', ')}`);
    }
  };
});
```

### 11.2. Пример реального применения к маршрутам

#### Customers

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\customers\customers.routes.ts`

```ts
app.addHook('preHandler', app.authenticate);
app.addHook('preHandler', app.resolveOrg);
app.addHook('preHandler', app.requireCapability('customers:read'));

app.post('/', {
  preHandler: [app.authenticate, app.resolveOrg, app.requireCapability('customers:write')],
}, async (...) => { ... });
```

#### Deals

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\deals\deals.routes.ts`

```ts
app.addHook('preHandler', app.authenticate);
app.addHook('preHandler', app.resolveOrg);
app.addHook('preHandler', app.requireCapability('deals:read'));
```

#### Warehouse

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\warehouse\warehouse.routes.ts`

```ts
app.addHook('preHandler', app.authenticate);
app.addHook('preHandler', app.resolveOrg);
app.addHook('preHandler', app.requireCapability('warehouse:read'));
```

#### Chapan

Для чапанских маршрутов лучше использовать не только роль, но и отдельные caps:

- `chapan.orders`
- `chapan.production`
- `chapan.ready`
- `chapan.archive`
- `chapan.settings`
- `chapan.invoice.confirm`

Иначе сотрудник без чапанских прав сможет попасть в модуль через прямой URL.

## 12. Защита frontend: router, nav, canvas, shortcuts

### 12.1. Router-level guard

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\app\router\index.tsx`

Нужно добавить отдельный guard:

```tsx
function RequireModuleAccess({
  allowed,
  fallback = '/settings',
  children,
}: {
  allowed: boolean;
  fallback?: string;
  children: ReactNode;
}) {
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
```

Применение:

```tsx
function AppRoutes() {
  const access = useModuleAccess();

  ...
  {
    path: 'warehouse',
    element: (
      <RequireAuth>
        <RequireOrg>
          <RequireModuleAccess allowed={access.warehouse}>
            <WarehousePage />
          </RequireModuleAccess>
        </RequireOrg>
      </RequireAuth>
    ),
  }
}
```

То же самое нужно сделать для:

- `/crm/leads`
- `/crm/deals`
- `/crm/customers`
- `/crm/tasks`
- `/warehouse`
- `/finance`
- `/employees`
- `/reports`
- `/documents`
- `/workzone/chapan/*`

### 12.2. Sidebar и mobile nav

Файл: `C:\Users\user\Documents\KORT-DEV-MODE\src\shared\navigation\appNavigation.ts`

Нужно перестать хранить только `planTier`.

Рекомендуемая модель nav item:

```ts
export interface ShortcutNavItem {
  id: ShortcutNavItemId;
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  planTier: OrgMode;
  accessKey:
    | 'leads'
    | 'deals'
    | 'customers'
    | 'tasks'
    | 'warehouse'
    | 'finance'
    | 'employees'
    | 'reports'
    | 'documents'
    | 'chapan';
}
```

А фильтрацию строить на `planIncludes(...) && access[item.accessKey]`.

### 12.3. Canvas и кнопка "Создать ярлык"

Файлы:

- `src/pages/canvas/index.tsx`
- `src/features/workspace/components/WorkspaceAddMenu.tsx`
- `src/features/workspace/components/WorkspaceTile.tsx`
- `src/features/workspace/registry.tsx`

Что обязательно сделать:

1. Не показывать недоступные ярлыки в `WorkspaceAddMenu`.
2. При рендере mobile canvas cards фильтровать по `useModuleAccess`.
3. При клике по tile выполнять не просто `navigate(...)`, а сначала проверку доступа.
4. При гидрации старых tiles удалять или скрывать те, к которым больше нет доступа.

Пример патча для `WorkspaceTile.tsx`:

```tsx
const access = useModuleAccess();
const canOpen = access[definition.accessKey];

function onPointerUp(e: React.PointerEvent) {
  ...
  if (!wasDragging) {
    if (!canOpen) {
      toast.error('У вас нет доступа к этому разделу.');
      return;
    }
    navigate(definition.navTo);
  }
}
```

### 12.4. Старые сохранённые shortcuts

Даже после фильтрации menu остаётся проблема legacy tiles.

Поэтому в store hydration нужен prune step:

- если tile указывает на модуль без доступа;
- tile не рендерится и удаляется из persisted workspace state.

Иначе пользователь, который когда-то имел доступ, сможет продолжать кликать по старой плитке после снятия прав.

## 13. Особое замечание по Chapan

### 13.1. Сейчас frontend уже пытается жить в более детальной модели, чем backend

`useChapanPermissions.ts` уже строит granular access:

- доступ к orders;
- доступ к production;
- доступ к ready;
- доступ к archive;
- доступ к warehouse nav;
- action gates на confirm/manage settings/manage production.

Это правильное направление.

Но backend этого уровня детализации пока не проверяет.

Именно поэтому сейчас у проекта есть иллюзия разграничения, но не настоящая защита.

### 13.2. Что рекомендовано по Chapan

- сохранить granular frontend permission model;
- расширить backend permission validation до тех же ключей;
- в routes добавить capability checks;
- визуально вынести группу в `Дополнительный модуль`;
- owner-only account/security действия не смешивать с operational chapan tabs.

## 14. Отдельные архитектурные замечания для backend

### 14.1. User password хранится глобально, а first-login хранится на membership

Это уже сейчас создаёт неоднозначность для multi-org.

Если продукт реально будет поддерживать одного пользователя в нескольких организациях, то текущая модель требует отдельного решения:

- либо user credential глобальная и тогда `pending_first_login` не должен сбрасывать global password для already-active user;
- либо credential становится membership-scoped, что сильно дороже.

Для текущей задачи можно принять временное правило:

- employee create/reset flows запрещены для пользователей, у которых уже есть active membership в другой организации;
- либо разрешены, но без перевода в `pending_first_login`, если user уже активен глобально.

### 14.2. Рекомендуемый безопасный минимум для multi-org edge case

Файл: `C:\Users\user\Documents\KORT-BACKEND\src\modules\employees\employees.service.ts`

При `createEmployee(...)` для уже существующего `User`:

- не ставить автоматически `pending_first_login`, если у пользователя уже есть реальный активный аккаунт;
- не трогать его global password;
- не использовать сценарий "phone = temporary password" повторно.

Иначе администратор одной компании сможет поломать global login пользователя, который уже состоит в другой компании.

## 15. Тестовый план

### 15.1. Backend tests

Нужно покрыть минимум следующие кейсы:

1. `users/me/change-email`
   - email меняется;
   - удаляются refresh tokens только owner userId;
   - refresh tokens других сотрудников не затрагиваются.

2. `auth/change-password`
   - пароль меняется;
   - refresh tokens owner удаляются;
   - следующий refresh невозможен;
   - сотрудники остаются в системе.

3. `auth/employee/lookup`
   - найден active employee;
   - найден pending_first_login employee;
   - dismissed employee не раскрывается;
   - неизвестный телефон возвращает `found: false`.

4. `company/employees`
   - backend принимает весь канонический permission enum;
   - owner нельзя редактировать через employee endpoints.

5. capability guards
   - сотрудник без warehouse access получает `403` на warehouse endpoints;
   - сотрудник без chapan access получает `403` на chapan endpoints;
   - observer не может делать write-actions.

### 15.2. Frontend / E2E tests

Нужно покрыть минимум:

1. Owner меняет email
   - успешный submit;
   - local session очищается;
   - редирект на `/auth/login`;
   - повторный вход проходит только по новому email.

2. Owner меняет пароль
   - успешный submit;
   - local session очищается;
   - повторный вход по старому паролю не проходит;
   - по новому проходит.

3. Employee active login
   - включается режим `Войти как сотрудник`;
   - сначала вводится только телефон;
   - после lookup появляется password field;
   - вход успешен только после ввода пароля.

4. Employee first login
   - по телефону определяется `pending_first_login`;
   - открывается screen set-password;
   - после сохранения происходит возврат на login;
   - вход возможен только по новому паролю.

5. Permission isolation
   - сотрудник без доступа не видит модуль в nav;
   - не видит модуль в canvas add menu;
   - не может открыть сохранённый shortcut;
   - прямой URL возвращает redirect на safe page;
   - прямой API call получает `403`.

## 16. Порядок внедрения

Рекомендуемый порядок, чтобы не застрять в частично совместимом состоянии:

1. Сначала унифицировать словарь permissions между frontend и backend.
2. Затем добавить backend capability guards на критичные модули.
3. Затем исправить owner credential flows и logout-after-change.
4. Затем добавить `employee/lookup` и новый employee login UX.
5. Затем внедрить frontend `useModuleAccess` и route guards.
6. Затем закрыть обходы через canvas, shortcuts, sidebar и mobile nav.
7. Затем перенести чапанский блок в `Дополнительный модуль`.
8. В конце обновить e2e и backend tests.

## 17. Практический итог для команды разработки

Если делать только минимально необходимый набор, без архитектурного раздувания, то обязательный scope такой:

1. Исправить owner logout flow после change email/password.
2. Привести парольную политику к `min = 6`.
3. Добавить employee phone lookup endpoint.
4. Перестроить `AuthModal` под двухэтапный employee login UX.
5. Привести backend `VALID_PERMISSIONS` к frontend словарю.
6. Вынести permission definitions в один frontend source of truth.
7. Добавить backend capability guards хотя бы на warehouse, finance, employees и chapan routes.
8. Добавить frontend route/nav/canvas gating через единый `useModuleAccess`.
9. Заменить owner-only проверки с `isAbsolute` на `isOwner`.
10. Вынести чапанские права в блок `Дополнительный модуль`.

Без пунктов 5, 7 и 8 задача будет выглядеть завершённой только визуально, но сотрудник всё ещё сможет проскочить в недоступные разделы через URL, старые shortcuts или прямые API вызовы.

## 18. Ключевые файлы для изменения

Frontend:

- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\AuthModal.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\SetPasswordStep.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\employeePermissionOptions.ts`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\AddEmployeeModal.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\auth\EmployeeDetailModal.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\shared\hooks\useModuleAccess.ts`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\app\router\index.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\pages\canvas\index.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\workspace\components\WorkspaceAddMenu.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\features\workspace\components\WorkspaceTile.tsx`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\shared\navigation\appNavigation.ts`
- `C:\Users\user\Documents\KORT-DEV-MODE\src\pages\workzone\chapan\settings\ChapanSettings.tsx`

Backend:

- `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.routes.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.service.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\auth\auth.schemas.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\employees\employees.service.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\users\users.service.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\plugins\org-scope.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\customers\customers.routes.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\deals\deals.routes.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\warehouse\warehouse.routes.ts`
- `C:\Users\user\Documents\KORT-BACKEND\src\modules\chapan\*.routes.ts`

## 19. Финальная рекомендация

Эта задача не должна делаться как "подкрутить только форму логина".

Правильный объём работ:

- credential flows;
- unified permission model;
- server-side enforcement;
- route/nav/canvas hardening;
- cleanup legacy owner UI;
- tests.

Именно такой объём нужен, чтобы после выдачи прав сотруднику система работала корректно без лагов, падений и обходов доступа.
