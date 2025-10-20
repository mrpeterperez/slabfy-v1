// 🤖 INTERNAL NOTE:
// Purpose: Validation utilities for collection data
// Exports: validateCollection function
// Feature: collections
// Dependencies: zod

import { z } from 'zod';

// Collection validation schema
const CollectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  isPublic: z.boolean(),
  isFavorite: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  userId: z.string(),
});

export function validateCollection(collection: any) {
  try {
    CollectionSchema.parse(collection);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof z.ZodError ? error.issues : error 
    };
  }
}
