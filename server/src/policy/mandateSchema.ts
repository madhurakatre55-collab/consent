import { z } from 'zod';

export const ReleaseConditionSchema = z.object({
  type: z.enum(['manual_approval', 'price_target', 'stock_available', 'delivery_date']),
  target_amount: z.number().positive().optional(),
  merchant_id: z.string().optional(),
  date: z.string().optional(),
});

export type ReleaseCondition = z.infer<typeof ReleaseConditionSchema>;

export const RequiredApproversSchema = z.object({
  mode: z.enum(['quorum', 'unanimous', 'guardian_required']),
  count: z.number().int().min(1).optional(),
  roles: z.array(z.string()).optional(),
});

export type RequiredApprovers = z.infer<typeof RequiredApproversSchema>;

export const MandateSchema = z.object({
  monthly_budget: z.object({
    amount: z.number().positive('Monthly budget amount must be positive'),
    currency: z.string().min(1).default('INR'),
  }),
  per_purchase_auto_approve_limit: z.number().min(0, 'Auto-approve limit must be non-negative'),
  required_approvers: RequiredApproversSchema,
  allowed_categories: z.array(z.string()).default([]),
  blocked_categories: z.array(z.string()).default([]),
  blocked_merchants: z.array(z.string()).default([]),
  max_price_deviation_percent: z.number().min(0).default(20),
  cooling_off_minutes: z.number().min(0).default(1),
  release_condition: ReleaseConditionSchema.default({ type: 'manual_approval' }),
  expires_at: z.string().optional().nullable(),
});

export type MandateCompiled = z.infer<typeof MandateSchema>;

export function validateMandate(data: unknown) {
  return MandateSchema.safeParse(data);
}
