import { z } from 'zod';

export const countLineItemSchema = z.object({
  product_id: z.string().uuid(),
  full_bottles: z.number().int().nonnegative(),
  leftover_ml: z.number().int().nonnegative(),
});

export const upsertCountsSchema = z.object({
  location_id: z.string().uuid(),
  lines: z.array(countLineItemSchema).nonempty(),
});

export const submitSchema = z.object({
  location_id: z.string().uuid(),
});
