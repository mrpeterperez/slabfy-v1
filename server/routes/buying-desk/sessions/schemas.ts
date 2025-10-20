// 🤖 INTERNAL NOTE:
// Purpose: Validation schemas for buying desk session CRUD payloads
// Exports: createSessionSchema, updateSessionSchema, CreateSessionInput, UpdateSessionInput
// Feature: buying-desk
// Dependencies: zod, @shared/schema

import { buyOfferStatusOptions } from "@shared/schema";
import { z } from "zod";

const optionalIdSchema = z.union([z.string().trim().min(1), z.literal(null)]).optional();
const optionalNoteSchema = z.union([z.string().trim().max(1000), z.literal(null)]).optional();

export const createSessionSchema = z.object({
  notes: optionalNoteSchema,
  sellerId: optionalIdSchema,
  contactId: optionalIdSchema,
  eventId: optionalIdSchema,
});

export const updateSessionSchema = z
  .object({
    notes: optionalNoteSchema,
    status: z.enum(buyOfferStatusOptions).optional(),
    sellerId: optionalIdSchema,
    eventId: optionalIdSchema,
  })
  .refine(
    (value) => Object.values(value).some((val) => val !== undefined),
    { message: "At least one field must be provided" }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
