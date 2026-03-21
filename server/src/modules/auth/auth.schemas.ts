import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  invite_token: z.string().optional(),
});

export const registerEmployeeSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  invite_token: z.string().optional(),
});

export const registerCompanySchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  company_name: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refresh: z.string().min(1),
});
