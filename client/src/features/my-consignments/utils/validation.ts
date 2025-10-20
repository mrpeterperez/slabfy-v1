// 🤖 INTERNAL NOTE:
// Purpose: Data validation utilities for consignment components
// Exports: validation functions and schemas
// Feature: my-consignments
// Dependencies: zod for runtime validation

import { z } from 'zod';

// Validation schemas for component props
export const consignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  // defaultCommissionRate removed
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

// Consignor schema matches backend ConsignorWithContact type
// Structure: { id, contact: { id, name, email?, phone?, companyName? } }
// Only name is required - all other contact fields are optional
export const consignorSchema = z.object({
  id: z.string().uuid(),
  contact: z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Consignor name is required'),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
  })
});

export const consignmentFormDataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  contactName: z.string().min(1, 'Contact name is required').max(100, 'Name too long'),
  company: z.string().max(100, 'Company name too long').optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number too long').optional(),
  // commissionRate removed
});

// Validation functions
export const validateConsignment = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: consignmentSchema.parse(data),
      error: null,
    };
  } catch (error) {
    return {
      success: false as const,
      data: null,
      error: error instanceof z.ZodError ? error.format() : 'Invalid consignment data',
    };
  }
};

export const validateConsignor = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: consignorSchema.parse(data),
      error: null,
    };
  } catch (error) {
    return {
      success: false as const,
      data: null,
      error: error instanceof z.ZodError ? error.format() : 'Invalid consignor data',
    };
  }
};

export const validateFormData = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: consignmentFormDataSchema.parse(data),
      error: null,
    };
  } catch (error) {
    return {
      success: false as const,
      data: null,
      error: error instanceof z.ZodError ? error.format() : 'Invalid form data',
    };
  }
};

// Utility functions for safe data access
// Commission utilities removed; use splitPercentage where applicable

export const safeFormatCurrency = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const safeFormatDate = (date: string | null | undefined): string => {
  if (!date) return 'No date';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};