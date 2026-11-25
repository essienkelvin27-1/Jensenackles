import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
});

export const eventSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  venue: z.string().trim().min(2).max(200),
  starts_at: z.string().datetime(),
  price_cents: z.number().int().positive(),
  capacity: z.number().int().positive(),
  image_url: z.string().url().refine((value) => new URL(value).protocol === "https:", "Use an HTTPS image URL.")
    .optional().or(z.literal("")),
  published: z.boolean(),
});

export const supportSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(4000),
});

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
