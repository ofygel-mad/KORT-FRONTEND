/**
 * prisma/seed.ts
 * Seeds the database with demo data matching the current frontend mock.
 *
 * Usage: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HASH = await bcrypt.hash('demo1234', 10);

function ago(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
}
function later(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

async function main() {
  console.log('Seeding database...');

  // ── Users ───────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: 'admin@kort.local' },
    update: {},
    create: {
      id: 'u-owner',
      email: 'admin@kort.local',
      fullName: 'Арман Калиев',
      phone: '+7 701 000 0001',
      password: HASH,
      status: 'active',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@kort.local' },
    update: {},
    create: {
      id: 'u-manager',
      email: 'manager@kort.local',
      fullName: 'Дана Оспанова',
      phone: '+7 701 000 0002',
      password: HASH,
      status: 'active',
    },
  });

  const workshopLead = await prisma.user.upsert({
    where: { email: 'lead@kort.local' },
    update: {},
    create: {
      id: 'u-lead',
      email: 'lead@kort.local',
      fullName: 'Нурлан Сериков',
      phone: '+7 701 000 0003',
      password: HASH,
      status: 'active',
    },
  });

  const worker = await prisma.user.upsert({
    where: { email: 'worker@kort.local' },
    update: {},
    create: {
      id: 'u-worker',
      email: 'worker@kort.local',
      fullName: 'Айгуль Муканова',
      phone: '+7 701 000 0004',
      password: HASH,
      status: 'active',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@kort.local' },
    update: {},
    create: {
      id: 'u-viewer',
      email: 'viewer@kort.local',
      fullName: 'Бахыт Токаев',
      phone: '+7 701 000 0005',
      password: HASH,
      status: 'active',
    },
  });

  // ── Organization ────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      id: 'org-demo',
      name: 'Demo Company',
      slug: 'demo-company',
      mode: 'industrial',
      currency: 'KZT',
      industry: 'Пошив национальной одежды',
      onboardingCompleted: true,
    },
  });

  // ── Memberships ─────────────────────────────────────
  const membershipData = [
    { userId: owner.id, role: 'owner', source: 'company_registration' },
    { userId: manager.id, role: 'admin', source: 'invite' },
    { userId: workshopLead.id, role: 'manager', source: 'invite' },
    { userId: worker.id, role: 'manager', source: 'invite' },
    { userId: viewer.id, role: 'viewer', source: 'request' },
  ] as const;

  for (const m of membershipData) {
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: m.userId, orgId: org.id } },
      update: {},
      create: {
        userId: m.userId,
        orgId: org.id,
        role: m.role,
        status: 'active',
        source: m.source,
        joinedAt: ago(30),
      },
    });
  }

  // ── Chapan Profile ──────────────────────────────────
  await prisma.chapanProfile.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      displayName: 'Чапан',
      orderPrefix: 'ЧП',
      orderCounter: 8,
      requestCounter: 2,
      publicIntakeTitle: 'Оставьте заявку на пошив',
      publicIntakeEnabled: true,
    },
  });

  // ── Chapan Catalogs ─────────────────────────────────
  const products = [
    'Чапан классический', 'Чапан праздничный', 'Тон (национальное платье)',
    'Камзол', 'Жилет мужской', 'Койлек (рубашка)', 'Саукеле', 'Другое',
  ];
  const fabrics = [
    'Бархат синий', 'Бархат бордовый', 'Бархат зелёный',
    'Атлас красный', 'Атлас золотой', 'Атлас белый',
    'Шёлк натуральный', 'Хлопок плотный', 'Парча золотая', 'Парча серебряная',
  ];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'На заказ'];
  const workers = ['Айгуль М.', 'Жанна К.', 'Бахыт Т.', 'Нурлан С.', 'Камила А.'];

  // Clear and recreate catalogs
  await prisma.chapanCatalogProduct.deleteMany({ where: { orgId: org.id } });
  await prisma.chapanCatalogFabric.deleteMany({ where: { orgId: org.id } });
  await prisma.chapanCatalogSize.deleteMany({ where: { orgId: org.id } });
  await prisma.chapanWorker.deleteMany({ where: { orgId: org.id } });

  await prisma.chapanCatalogProduct.createMany({ data: products.map((name) => ({ orgId: org.id, name })) });
  await prisma.chapanCatalogFabric.createMany({ data: fabrics.map((name) => ({ orgId: org.id, name })) });
  await prisma.chapanCatalogSize.createMany({ data: sizes.map((name) => ({ orgId: org.id, name })) });
  await prisma.chapanWorker.createMany({ data: workers.map((name) => ({ orgId: org.id, name })) });

  // ── Chapan Clients ──────────────────────────────────
  const clients = [
    { id: 'cc-1', fullName: 'Алмас Бекмуратов', phone: '+7 701 111 2233', company: 'ТОО "Алтын Той"' },
    { id: 'cc-2', fullName: 'Гульнара Сагиндыкова', phone: '+7 702 444 5566', email: 'gulnara@mail.kz' },
    { id: 'cc-3', fullName: 'Ерлан Нурпеисов', phone: '+7 705 777 8899', company: 'ИП Нурпеисов' },
    { id: 'cc-4', fullName: 'Айжан Тлеубаева', phone: '+7 707 222 3344', email: 'aizhan.t@gmail.com' },
    { id: 'cc-5', fullName: 'Берик Жумабеков', phone: '+7 700 555 6677' },
    { id: 'cc-6', fullName: 'Жарасов', phone: '+7 701 999 0011' },
  ];

  for (const c of clients) {
    await prisma.chapanClient.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, orgId: org.id, createdAt: ago(60) },
    });
  }

  // ── Chapan Orders ───────────────────────────────────
  // Clean existing orders to avoid duplicates
  await prisma.chapanActivity.deleteMany({ where: { order: { orgId: org.id } } });
  await prisma.chapanPayment.deleteMany({ where: { order: { orgId: org.id } } });
  await prisma.chapanTransfer.deleteMany({ where: { order: { orgId: org.id } } });
  await prisma.chapanProductionTask.deleteMany({ where: { order: { orgId: org.id } } });
  await prisma.chapanOrderItem.deleteMany({ where: { order: { orgId: org.id } } });
  await prisma.chapanOrder.deleteMany({ where: { orgId: org.id } });

  // Order 1: In production, partial payment, urgent
  const o1 = await prisma.chapanOrder.create({
    data: {
      id: 'co-1', orgId: org.id, orderNumber: 'ЧП-001',
      clientId: 'cc-1', clientName: 'Алмас Бекмуратов', clientPhone: '+7 701 111 2233',
      status: 'in_production', paymentStatus: 'partial', priority: 'urgent',
      totalAmount: 215000, paidAmount: 100000,
      dueDate: later(4), createdAt: ago(6), updatedAt: ago(1),
      items: {
        create: [
          { id: 'ci-1', productName: 'Чапан праздничный', fabric: 'Бархат бордовый', size: 'L', quantity: 2, unitPrice: 85000 },
          { id: 'ci-2', productName: 'Камзол', fabric: 'Парча золотая', size: 'M', quantity: 1, unitPrice: 45000 },
        ],
      },
      productionTasks: {
        create: [
          { id: 'cpt-1', orderItemId: 'ci-1', productName: 'Чапан праздничный', fabric: 'Бархат бордовый', size: 'L', quantity: 2, status: 'sewing', assignedTo: 'Айгуль М.', startedAt: ago(3), isBlocked: false },
          { id: 'cpt-2', orderItemId: 'ci-2', productName: 'Камзол', fabric: 'Парча золотая', size: 'M', quantity: 1, status: 'cutting', assignedTo: 'Жанна К.', startedAt: ago(1), isBlocked: true, blockReason: 'Нет нужной ткани на складе — парча золотая закончилась' },
        ],
      },
      payments: {
        create: [
          { amount: 100000, method: 'cash', paidAt: ago(5), notes: 'Предоплата 50%' },
        ],
      },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(6) },
          { type: 'status_change', content: 'Новый → Подтверждён', authorId: manager.id, authorName: manager.fullName, createdAt: ago(5) },
          { type: 'payment', content: 'Оплата 100 000 ₸ (наличные) — предоплата', authorId: manager.id, authorName: manager.fullName, createdAt: ago(5) },
          { type: 'status_change', content: 'Подтверждён → В производстве', authorId: manager.id, authorName: manager.fullName, createdAt: ago(4) },
        ],
      },
    },
  });

  // Order 2: Ready, fully paid
  await prisma.chapanOrder.create({
    data: {
      id: 'co-2', orgId: org.id, orderNumber: 'ЧП-002',
      clientId: 'cc-2', clientName: 'Гульнара Сагиндыкова', clientPhone: '+7 702 444 5566',
      status: 'ready', paymentStatus: 'paid', priority: 'normal',
      totalAmount: 65000, paidAmount: 65000,
      dueDate: later(1), createdAt: ago(12), updatedAt: ago(1),
      items: {
        create: [
          { id: 'ci-3', productName: 'Тон (национальное платье)', fabric: 'Атлас красный', size: 'S', quantity: 1, unitPrice: 65000 },
        ],
      },
      productionTasks: {
        create: [
          { id: 'cpt-3', orderItemId: 'ci-3', productName: 'Тон (национальное платье)', fabric: 'Атлас красный', size: 'S', quantity: 1, status: 'done', assignedTo: 'Бахыт Т.', startedAt: ago(8), completedAt: ago(2), isBlocked: false },
        ],
      },
      payments: { create: [{ amount: 65000, method: 'card', paidAt: ago(10) }] },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(12) },
          { type: 'status_change', content: 'В производстве → Готов', authorId: manager.id, authorName: 'Система', createdAt: ago(2) },
        ],
      },
    },
  });

  // Order 3: New, unpaid
  await prisma.chapanOrder.create({
    data: {
      id: 'co-3', orgId: org.id, orderNumber: 'ЧП-003',
      clientId: 'cc-3', clientName: 'Ерлан Нурпеисов', clientPhone: '+7 705 777 8899',
      status: 'new', paymentStatus: 'not_paid', priority: 'normal',
      totalAmount: 300000, paidAmount: 0,
      dueDate: later(14), createdAt: ago(1), updatedAt: ago(0, 3),
      items: {
        create: [
          { id: 'ci-4', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'XL', quantity: 3, unitPrice: 72000 },
          { id: 'ci-5', productName: 'Жилет мужской', fabric: 'Хлопок плотный', size: 'L', quantity: 3, unitPrice: 28000 },
        ],
      },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(1) },
          { type: 'comment', content: 'Клиент запросил скидку на партию. Ждём подтверждения.', authorId: manager.id, authorName: manager.fullName, createdAt: ago(0, 3) },
        ],
      },
    },
  });

  // Order 4: Completed, VIP
  await prisma.chapanOrder.create({
    data: {
      id: 'co-4', orgId: org.id, orderNumber: 'ЧП-004',
      clientId: 'cc-4', clientName: 'Айжан Тлеубаева', clientPhone: '+7 707 222 3344',
      status: 'completed', paymentStatus: 'paid', priority: 'vip',
      totalAmount: 255000, paidAmount: 255000,
      createdAt: ago(30), updatedAt: ago(5), completedAt: ago(5),
      items: {
        create: [
          { id: 'ci-6', productName: 'Саукеле', fabric: 'Парча серебряная', size: 'На заказ', quantity: 1, unitPrice: 180000 },
          { id: 'ci-7', productName: 'Тон (национальное платье)', fabric: 'Атлас белый', size: 'M', quantity: 1, unitPrice: 75000 },
        ],
      },
      productionTasks: {
        create: [
          { id: 'cpt-4', orderItemId: 'ci-6', productName: 'Саукеле', fabric: 'Парча серебряная', size: 'На заказ', quantity: 1, status: 'done', assignedTo: 'Камила А.', startedAt: ago(25), completedAt: ago(8), isBlocked: false },
          { id: 'cpt-5', orderItemId: 'ci-7', productName: 'Тон (национальное платье)', fabric: 'Атлас белый', size: 'M', quantity: 1, status: 'done', assignedTo: 'Айгуль М.', startedAt: ago(22), completedAt: ago(10), isBlocked: false },
        ],
      },
      payments: {
        create: [
          { amount: 127500, method: 'transfer', paidAt: ago(28), notes: 'Предоплата 50%' },
          { amount: 127500, method: 'transfer', paidAt: ago(6), notes: 'Остаток' },
        ],
      },
      transfer: {
        create: { confirmedByManager: true, confirmedByClient: true, transferredAt: ago(5), notes: 'Передано в офисе' },
      },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(30) },
          { type: 'transfer', content: 'Передача подтверждена', authorId: manager.id, authorName: manager.fullName, createdAt: ago(5) },
          { type: 'status_change', content: 'Готов → Передан → Завершён', authorId: manager.id, authorName: 'Система', createdAt: ago(5) },
        ],
      },
    },
  });

  // Order 5: Confirmed, partial payment
  await prisma.chapanOrder.create({
    data: {
      id: 'co-5', orgId: org.id, orderNumber: 'ЧП-005',
      clientId: 'cc-5', clientName: 'Берик Жумабеков', clientPhone: '+7 700 555 6677',
      status: 'confirmed', paymentStatus: 'partial', priority: 'normal',
      totalAmount: 72000, paidAmount: 36000,
      dueDate: later(10), createdAt: ago(3), updatedAt: ago(2),
      items: {
        create: [
          { id: 'ci-8', productName: 'Чапан классический', fabric: 'Бархат зелёный', size: 'XXL', quantity: 1, unitPrice: 72000 },
        ],
      },
      payments: { create: [{ amount: 36000, method: 'cash', paidAt: ago(2), notes: 'Предоплата 50%' }] },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(3) },
          { type: 'status_change', content: 'Новый → Подтверждён', authorId: manager.id, authorName: manager.fullName, createdAt: ago(2) },
        ],
      },
    },
  });

  // Order 6: In production, VIP, fully paid
  await prisma.chapanOrder.create({
    data: {
      id: 'co-6', orgId: org.id, orderNumber: 'ЧП-006',
      clientId: 'cc-1', clientName: 'Алмас Бекмуратов', clientPhone: '+7 701 111 2233',
      status: 'in_production', paymentStatus: 'paid', priority: 'vip',
      totalAmount: 239000, paidAmount: 239000,
      dueDate: later(3), createdAt: ago(10), updatedAt: ago(1),
      items: {
        create: [
          { id: 'ci-9', productName: 'Чапан праздничный', fabric: 'Парча золотая', size: 'L', quantity: 1, unitPrice: 120000 },
          { id: 'ci-10', productName: 'Камзол', fabric: 'Бархат бордовый', size: 'L', quantity: 1, unitPrice: 55000 },
          { id: 'ci-11', productName: 'Койлек (рубашка)', fabric: 'Шёлк натуральный', size: 'L', quantity: 2, unitPrice: 32000 },
        ],
      },
      productionTasks: {
        create: [
          { id: 'cpt-6', orderItemId: 'ci-9', productName: 'Чапан праздничный', fabric: 'Парча золотая', size: 'L', quantity: 1, status: 'finishing', assignedTo: 'Камила А.', startedAt: ago(6), isBlocked: false },
          { id: 'cpt-7', orderItemId: 'ci-10', productName: 'Камзол', fabric: 'Бархат бордовый', size: 'L', quantity: 1, status: 'sewing', assignedTo: 'Жанна К.', startedAt: ago(4), isBlocked: false },
          { id: 'cpt-8', orderItemId: 'ci-11', productName: 'Койлек (рубашка)', fabric: 'Шёлк натуральный', size: 'L', quantity: 2, status: 'quality_check', assignedTo: 'Нурлан С.', startedAt: ago(5), isBlocked: false },
        ],
      },
      payments: { create: [{ amount: 239000, method: 'transfer', paidAt: ago(8), notes: 'Полная оплата' }] },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(10) },
          { type: 'payment', content: 'Полная оплата 239 000 ₸ (перевод)', authorId: manager.id, authorName: manager.fullName, createdAt: ago(8) },
        ],
      },
    },
  });

  // Order 7: Cancelled
  await prisma.chapanOrder.create({
    data: {
      id: 'co-7', orgId: org.id, orderNumber: 'ЧП-007',
      clientId: 'cc-2', clientName: 'Гульнара Сагиндыкова', clientPhone: '+7 702 444 5566',
      status: 'cancelled', paymentStatus: 'not_paid', priority: 'normal',
      totalAmount: 56000, paidAmount: 0,
      createdAt: ago(15), updatedAt: ago(14),
      cancelledAt: ago(14), cancelReason: 'Не подошёл срок изготовления',
      items: {
        create: [
          { id: 'ci-12', productName: 'Жилет мужской', fabric: 'Хлопок плотный', size: 'M', quantity: 2, unitPrice: 28000 },
        ],
      },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(15) },
          { type: 'status_change', content: 'Новый → Отменён', authorId: manager.id, authorName: manager.fullName, createdAt: ago(14) },
        ],
      },
    },
  });

  // Order 8: Ready, unpaid
  await prisma.chapanOrder.create({
    data: {
      id: 'co-8', orgId: org.id, orderNumber: 'ЧП-008',
      clientId: 'cc-6', clientName: 'Жарасов', clientPhone: '+7 701 999 0011',
      status: 'ready', paymentStatus: 'not_paid', priority: 'normal',
      totalAmount: 12333, paidAmount: 0,
      dueDate: later(1), createdAt: ago(4), updatedAt: ago(1),
      items: {
        create: [
          { id: 'ci-13', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'L', quantity: 1, unitPrice: 12333, workshopNotes: 'Особый воротник, уточнить у клиента' },
        ],
      },
      productionTasks: {
        create: [
          { id: 'cpt-9', orderItemId: 'ci-13', productName: 'Чапан классический', fabric: 'Бархат синий', size: 'L', quantity: 1, status: 'done', assignedTo: 'Бахыт Т.', startedAt: ago(3), completedAt: ago(1), isBlocked: false },
        ],
      },
      activities: {
        create: [
          { type: 'system', content: 'Заказ создан', authorId: manager.id, authorName: manager.fullName, createdAt: ago(4) },
          { type: 'comment', content: 'Клиент ещё не оплатил, ждём звонка', authorId: manager.id, authorName: manager.fullName, createdAt: ago(0) },
        ],
      },
    },
  });

  // ── Chapan Requests ─────────────────────────────────
  await prisma.chapanRequestItem.deleteMany({ where: { request: { orgId: org.id } } });
  await prisma.chapanRequest.deleteMany({ where: { orgId: org.id } });

  await prisma.chapanRequest.create({
    data: {
      orgId: org.id, requestNumber: 'RQ-001',
      customerName: 'Салтанат Есимова', phone: '+7 707 321 1122',
      messengers: ['whatsapp'], city: 'Шымкент',
      deliveryMethod: 'Доставка по Казахстану', leadSource: 'Instagram',
      preferredContact: 'whatsapp', desiredDate: later(12),
      notes: 'Нужен комплект к семейному мероприятию, важна мягкая посадка и быстрая обратная связь.',
      source: 'public_form', status: 'new',
      createdAt: ago(0, 8), updatedAt: ago(0, 8),
      items: {
        create: [
          { productName: 'Чапан праздничный', fabricPreference: 'Бархат бордовый', size: 'L', quantity: 1, notes: 'Сделать богаче отделку по вороту' },
          { productName: 'Камзол', fabricPreference: 'Парча золотая', size: 'M', quantity: 1 },
        ],
      },
    },
  });

  await prisma.chapanRequest.create({
    data: {
      orgId: org.id, requestNumber: 'RQ-002',
      customerName: 'Ермек Шынгысов', phone: '+7 701 444 8899',
      messengers: ['telegram'], city: 'Астана',
      deliveryMethod: 'Самовывоз', leadSource: 'WhatsApp',
      preferredContact: 'telegram', desiredDate: later(20),
      notes: 'Хочет базовый вариант без спешки, но просит заранее согласовать цену.',
      source: 'whatsapp', status: 'reviewed',
      createdAt: ago(1, 6), updatedAt: ago(0, 14),
      items: {
        create: [
          { productName: 'Чапан классический', fabricPreference: 'Бархат синий', size: 'XL', quantity: 2 },
        ],
      },
    },
  });

  // ── CRM: Sample customers ──────────────────────────
  const crmCustomers = [
    { id: 'crm-c1', fullName: 'Алмас Бекмуратов', phone: '+7 701 111 2233', companyName: 'ТОО "Алтын Той"' },
    { id: 'crm-c2', fullName: 'Гульнара Сагиндыкова', phone: '+7 702 444 5566', email: 'gulnara@mail.kz' },
    { id: 'crm-c3', fullName: 'Ерлан Нурпеисов', phone: '+7 705 777 8899', companyName: 'ИП Нурпеисов' },
  ];

  for (const c of crmCustomers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, orgId: org.id },
    });
  }

  // ── CRM: Leads ────────────────────────────────────
  await prisma.leadHistory.deleteMany({ where: { lead: { orgId: org.id } } });
  await prisma.lead.deleteMany({ where: { orgId: org.id } });

  const leadsData = [
    { id: 'l1', fullName: 'Айгерим Сейткали', phone: '+77001112233', source: 'instagram', stage: 'new', pipeline: 'qualifier', createdAt: ago(0, 1), updatedAt: ago(0, 1) },
    { id: 'l2', fullName: 'Данияр Аубаков', phone: '+77012223344', source: 'site', stage: 'in_progress', pipeline: 'qualifier', assignedName: 'Акбар А.', createdAt: ago(0, 2), updatedAt: ago(0, 0.5) },
    { id: 'l3', fullName: 'Мадина Нурланова', phone: '+77023334455', source: 'ad', stage: 'thinking', pipeline: 'qualifier', callbackAt: later(1), createdAt: ago(2), updatedAt: ago(1) },
    { id: 'l4', fullName: 'Ерлан Жумабеков', phone: '+77034445566', source: 'referral', stage: 'no_answer', pipeline: 'qualifier', createdAt: ago(1), updatedAt: ago(1) },
    { id: 'l5', fullName: 'Алия Тасбулатова', phone: '+77045556677', source: 'site', stage: 'meeting_set', pipeline: 'qualifier', meetingAt: later(2), budget: 500000, comment: 'Интересует квартира 3-комнатная', createdAt: ago(1), updatedAt: ago(0, 1) },
    { id: 'l6', fullName: 'Нурлан Касымов', phone: '+77056667788', source: 'instagram', stage: 'awaiting_meeting', pipeline: 'closer', assignedName: 'Сауле М.', meetingAt: later(1), budget: 800000, comment: 'Клиент из Астаны, бюджет 800к', createdAt: ago(2), updatedAt: ago(0, 1) },
    { id: 'l7', fullName: 'Гульнара Бекова', phone: '+77067778899', source: 'ad', stage: 'contract', pipeline: 'closer', assignedName: 'Сауле М.', budget: 1200000, checklistDone: ['req'], createdAt: ago(7), updatedAt: ago(0, 2) },
    { id: 'l8', fullName: 'Тимур Смагулов', phone: '+77078889900', source: 'referral', stage: 'meeting_done', pipeline: 'closer', assignedName: 'Алибек Н.', budget: 650000, createdAt: ago(3), updatedAt: ago(0, 4) },
  ];

  for (const l of leadsData) {
    await prisma.lead.create({
      data: {
        id: l.id,
        orgId: org.id,
        fullName: l.fullName,
        phone: l.phone,
        source: l.source,
        stage: l.stage,
        pipeline: l.pipeline,
        assignedName: l.assignedName,
        callbackAt: l.callbackAt,
        meetingAt: l.meetingAt,
        budget: l.budget,
        comment: l.comment,
        checklistDone: l.checklistDone ?? [],
        createdAt: l.createdAt,
        history: {
          create: [
            { type: 'system', content: 'Лид создан', author: 'Система', createdAt: l.createdAt },
            ...(l.stage !== 'new' ? [{ type: 'stage_change', content: `new → ${l.stage}`, author: l.assignedName ?? 'Менеджер', createdAt: l.updatedAt }] : []),
          ],
        },
      },
    });
  }

  // ── CRM: Deals ────────────────────────────────────
  await prisma.dealActivity.deleteMany({ where: { deal: { orgId: org.id } } });
  await prisma.deal.deleteMany({ where: { orgId: org.id } });

  const dealsData = [
    { id: 'd1', leadId: 'l6', fullName: 'Нурлан Касымов', phone: '+77056667788', source: 'instagram', stage: 'awaiting_meeting', title: 'Недвижимость — Нурлан', value: 800000, assignedName: 'Сауле М.', qualifierName: 'Акбар А.', meetingAt: later(1), expectedCloseAt: later(14), createdAt: ago(3) },
    { id: 'd2', leadId: 'l8', fullName: 'Тимур Смагулов', phone: '+77078889900', source: 'referral', stage: 'meeting_done', title: 'Недвижимость — Тимур', value: 650000, probability: 45, assignedName: 'Алибек Н.', qualifierName: 'Акбар А.', expectedCloseAt: later(10), createdAt: ago(5) },
    { id: 'd3', leadId: 'l7', fullName: 'Гульнара Бекова', phone: '+77067778899', source: 'ad', stage: 'contract', title: 'Недвижимость — Гульнара', value: 1200000, probability: 80, assignedName: 'Сауле М.', qualifierName: 'Акбар А.', expectedCloseAt: later(5), checklistDone: ['kp_sent', 'kp_agreed', 'req_rcvd'], createdAt: ago(10) },
    { id: 'd4', leadId: 'l9-seed', fullName: 'Дамир Ахметов', phone: '+77011223344', source: 'site', stage: 'proposal', title: 'Недвижимость — Дамир', value: 950000, probability: 55, assignedName: 'Алибек Н.', qualifierName: 'Акбар А.', expectedCloseAt: later(8), stageEnteredAt: ago(6), createdAt: ago(8) },
    { id: 'd5', leadId: 'l10-seed', fullName: 'Жанна Сейткали', phone: '+77022334455', source: 'referral', stage: 'awaiting_payment', title: 'Недвижимость — Жанна', value: 1500000, probability: 92, assignedName: 'Сауле М.', qualifierName: 'Акбар А.', expectedCloseAt: later(3), checklistDone: ['kp_sent', 'kp_agreed', 'req_rcvd', 'contract_signed'], createdAt: ago(14) },
  ];

  for (const d of dealsData) {
    await prisma.deal.create({
      data: {
        id: d.id,
        orgId: org.id,
        leadId: d.leadId,
        fullName: d.fullName,
        phone: d.phone,
        source: d.source,
        stage: d.stage,
        title: d.title,
        value: d.value,
        probability: d.probability ?? 20,
        assignedName: d.assignedName,
        qualifierName: d.qualifierName,
        meetingAt: d.meetingAt,
        expectedCloseAt: d.expectedCloseAt,
        stageEnteredAt: d.stageEnteredAt ?? ago(2),
        checklistDone: d.checklistDone ?? [],
        createdAt: d.createdAt,
        activities: {
          create: [
            { type: 'system', content: 'Сделка создана из воронки лидов', author: 'Система', createdAt: d.createdAt },
          ],
        },
      },
    });
  }

  // ── CRM: Tasks ────────────────────────────────────
  await prisma.taskActivity.deleteMany({ where: { task: { orgId: org.id } } });
  await prisma.taskSubtask.deleteMany({ where: { task: { orgId: org.id } } });
  await prisma.task.deleteMany({ where: { orgId: org.id } });

  const tasksData = [
    {
      id: 'tk-1', title: 'Отправить КП Нурлану Касымову', description: 'Подготовить и отправить КП на 2-комнатную квартиру в ЖК «Алатау».', status: 'in_progress', priority: 'high', assignedName: 'Сауле М.', createdBy: 'Менеджер', taskType: 'manual', dueDate: later(1), dealId: 'd1', linkedEntityType: 'deal', linkedEntityId: 'd1', linkedEntityTitle: 'Нурлан Касымов — 800 000 ₸', tags: ['docs', 'followup'], createdAt: ago(2),
      subtasks: [
        { title: 'Собрать планировки', done: true },
        { title: 'Рассчитать стоимость', done: true },
        { title: 'Оформить PDF', done: false },
      ],
    },
    {
      id: 'tk-2', title: 'Перезвонить Мадине Нурлановой', description: 'Клиент просил перезвонить после 14:00. Уточнить актуальность заявки.', status: 'todo', priority: 'critical', assignedName: 'Акбар А.', createdBy: 'Менеджер', taskType: 'manual', dueDate: later(0), linkedEntityType: 'lead', linkedEntityId: 'l3', linkedEntityTitle: 'Мадина Нурланова', tags: ['call', 'urgent'], createdAt: ago(1),
      subtasks: [],
    },
    {
      id: 'tk-3', title: 'Подписать договор с Гульнарой Бековой', description: 'Согласовать время встречи, распечатать 2 экземпляра договора.', status: 'review', priority: 'high', assignedName: 'Алибек Н.', createdBy: 'Сауле М.', taskType: 'manual', dueDate: later(2), dealId: 'd3', linkedEntityType: 'deal', linkedEntityId: 'd3', linkedEntityTitle: 'Гульнара Бекова — 1 200 000 ₸', tags: ['meeting', 'docs'], createdAt: ago(3),
      subtasks: [
        { title: 'Распечатать договор ×2', done: true },
        { title: 'Согласовать время', done: true },
        { title: 'Получить подпись клиента', done: false },
      ],
    },
    {
      id: 'tk-4', title: 'Отчёт по сделкам за март', description: 'Подготовить итоговый отчёт: выигранные, проигранные, в воронке.', status: 'todo', priority: 'medium', assignedName: 'Камила Р.', createdBy: 'Камила Р.', taskType: 'manual', dueDate: later(5), tags: ['docs'], createdAt: ago(1),
      subtasks: [],
    },
    {
      id: 'tk-5', title: 'Провести встречу с Ерланом Жумабековым', description: 'Показ объекта.', status: 'done', priority: 'high', assignedName: 'Акбар А.', createdBy: 'Менеджер', taskType: 'manual', dueDate: ago(1), completedAt: ago(0, 8), linkedEntityType: 'lead', linkedEntityId: 'l4', linkedEntityTitle: 'Ерлан Жумабеков', tags: ['meeting'], createdAt: ago(4),
      subtasks: [
        { title: 'Подтвердить время', done: true },
        { title: 'Подготовить маршрут', done: true },
        { title: 'Провести показ', done: true },
      ],
    },
    {
      id: 'tk-6', title: 'Выставить счёт Тимуру Смагулову', description: 'После согласования — выставить счёт на предоплату 30%.', status: 'todo', priority: 'high', assignedName: 'Алибек Н.', createdBy: 'Сауле М.', taskType: 'manual', dueDate: later(3), dealId: 'd4', linkedEntityType: 'deal', linkedEntityId: 'd4', linkedEntityTitle: 'Тимур Смагулов — 650 000 ₸', tags: ['payment', 'docs'], createdAt: ago(2),
      subtasks: [],
    },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        id: t.id,
        orgId: org.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedName: t.assignedName,
        createdBy: t.createdBy,
        taskType: t.taskType,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        dealId: t.dealId,
        linkedEntityType: t.linkedEntityType,
        linkedEntityId: t.linkedEntityId,
        linkedEntityTitle: t.linkedEntityTitle,
        tags: t.tags ?? [],
        createdAt: t.createdAt,
        subtasks: t.subtasks.length > 0 ? {
          create: t.subtasks.map(s => ({ title: s.title, done: s.done })),
        } : undefined,
        activities: {
          create: { type: 'system', content: 'Задача создана', author: 'Система' },
        },
      },
    });
  }

  console.log('Seed complete!');
  console.log('');
  console.log('Demo accounts (password: demo1234):');
  console.log('  Owner:    admin@kort.local');
  console.log('  Admin:    manager@kort.local');
  console.log('  Lead:     lead@kort.local');
  console.log('  Worker:   worker@kort.local');
  console.log('  Viewer:   viewer@kort.local');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
