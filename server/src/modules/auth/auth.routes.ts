import type { FastifyInstance } from 'fastify';
import { loginSchema, registerEmployeeSchema, registerCompanySchema, refreshSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body.email, body.password);
    return reply.send(result);
  });

  // POST /api/v1/auth/register/employee
  app.post('/register/employee', async (request, reply) => {
    const body = registerEmployeeSchema.parse(request.body);
    const result = await authService.registerEmployee(body);
    return reply.status(201).send(result);
  });

  // POST /api/v1/auth/register/company
  app.post('/register/company', async (request, reply) => {
    const body = registerCompanySchema.parse(request.body);
    const result = await authService.registerCompany(body);
    return reply.status(201).send(result);
  });

  // POST /api/v1/auth/token/refresh
  app.post('/token/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const result = await authService.refreshTokens(body.refresh);
    return reply.send(result);
  });

  // GET /api/v1/auth/bootstrap  (aliased as /me, /bootstrap)
  app.get('/bootstrap', { preHandler: [app.optionalAuth] }, async (request, reply) => {
    if (!request.userId) return reply.send(null);
    const xOrgId = typeof request.headers['x-org-id'] === 'string' ? request.headers['x-org-id'] : undefined;
    const result = await authService.bootstrap(request.userId, xOrgId);
    return reply.send(result);
  });

  app.get('/me', { preHandler: [app.optionalAuth] }, async (request, reply) => {
    if (!request.userId) return reply.send(null);
    const xOrgId = typeof request.headers['x-org-id'] === 'string' ? request.headers['x-org-id'] : undefined;
    const result = await authService.bootstrap(request.userId, xOrgId);
    return reply.send(result);
  });
}
