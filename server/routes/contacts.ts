// 🤖 INTERNAL NOTE:
// Purpose: Express router handling contacts CRUD, archival, and reference lookups
// Exports: default router instance with contacts routes
// Feature: contacts
// Dependencies: express Router, zod, ../storage-mod/registry, ../supabase, @shared/schema

import { Router, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage-mod/registry";
import { insertContactSchema, updateContactSchema } from "@shared/schema";
import { authenticateUser, type AuthenticatedRequest } from "../supabase";

const router = Router();

// Apply authentication to all routes using Supabase JWT validation
router.use(authenticateUser);

const requireUserId = (req: AuthenticatedRequest, res: Response): string | undefined => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }
  return userId;
};

const parseArchivedQuery = (value: string | undefined): boolean | undefined => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

/**
 * @swagger
 * /api/contacts/summary:
 *   get:
 *     summary: Get contacts summary statistics
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Filter by archived status (true for archived only, false for active only, omit for all)
 *     responses:
 *       200:
 *         description: Contacts summary retrieved successfully
 */
router.get("/summary", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const archived = parseArchivedQuery(req.query.archived as string | undefined);
    const summary = await storage.getContactsSummary(userId, archived);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching contacts summary:", error);
    res.status(500).json({ error: "Failed to fetch contacts summary" });
  }
});

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get all contacts for current user
 *     tags: [Contacts]
 *     responses:
 *       200:
 *         description: List of user contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contact'
 */
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const archived = parseArchivedQuery(req.query.archived as string | undefined);
    const contacts = await storage.getContactsByUserId(userId, archived);
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Create a new contact
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InsertContact'
 *     responses:
 *       201:
 *         description: Contact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 */
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactData = insertContactSchema.parse(req.body);
    const contact = await storage.createContact({
      ...contactData,
      userId,
    });

    // Business-grade response: Include phone warning if present
    const response: any = { contact };
    if ((contact as any)._phoneWarning) {
      response.phoneWarning = (contact as any)._phoneWarning;
      // Remove internal property from contact object
      delete (contact as any)._phoneWarning;
    }

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    
    // Business-grade error handling: Handle duplicate email gracefully
    if (error instanceof Error && error.message === "DUPLICATE_EMAIL") {
      return res.status(409).json({
        error: "EMAIL_ALREADY_EXISTS",
        message: "A contact with this email address already exists",
        email: (error as any).email,
        existingContact: (error as any).existingContact,
        suggestions: [
          "Use a different email address",
          "Update the existing contact instead",
          "Check if this is a duplicate entry"
        ]
      });
    }
    
    console.error("Error creating contact:", error);
    res.status(500).json({ 
      error: "Failed to create contact",
      message: "An unexpected error occurred while creating the contact"
    });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Get a contact by ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 */
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;
    const contact = await storage.getContactById(contactId);

    if (!contact || contact.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   patch:
 *     summary: Update a contact
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateContact'
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 */
router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;
    const updateData = updateContactSchema.parse(req.body);
    // Ensure ownership before updating
    const existing = await storage.getContactById(contactId);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const contact = await storage.updateContact(contactId, updateData);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Delete a contact
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *       404:
 *         description: Contact not found
 */
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;
    // Ensure the contact exists and belongs to the current user
    const existing = await storage.getContactById(contactId);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (!existing.archived) {
      return res.status(400).json({ error: "Contact must be archived before deletion" });
    }

    try {
      const success = await storage.deleteContact(contactId);
      if (!success) {
        return res.status(404).json({ error: "Contact not found" });
      }
      return res.status(204).send();
    } catch (err) {
      if (err instanceof Error && err.message === "CONTACT_HAS_DEPENDENCIES") {
        const systems = Array.isArray((err as any).systems) ? (err as any).systems as string[] : [];
        const systemsLabel = systems.length > 0 ? ` in: ${systems.join(", ")}` : "";
        return res.status(409).json({
          error: `Contact has linked records${systemsLabel} and cannot be deleted`,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// Archive/unarchive endpoints
router.patch("/:id/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;
    // Ensure ownership before archiving
    const existing = await storage.getContactById(contactId);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (existing.archived) {
      return res.json(existing);
    }

    const contact = await storage.archiveContact(contactId);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    console.error("Error archiving contact:", error);
    res.status(500).json({ error: "Failed to archive contact" });
  }
});

router.patch("/:id/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;
    // Ensure ownership before unarchiving
    const existing = await storage.getContactById(contactId);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    if (!existing.archived) {
      return res.json(existing);
    }

    const contact = await storage.unarchiveContact(contactId);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    console.error("Error unarchiving contact:", error);
    res.status(500).json({ error: "Failed to unarchive contact" });
  }
});

// Bulk operations
const bulkOperationSchema = z.object({
  contactIds: z.array(z.string()).min(1).max(100), // Limit bulk operations
});

router.patch("/bulk/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const { contactIds } = bulkOperationSchema.parse(req.body);

    // Verify ownership of all contacts before bulk operation
    for (const contactId of contactIds) {
      const existing = await storage.getContactById(contactId);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({
          error: `Access denied for contact: ${contactId}`,
        });
      }
    }

    const archivedCount = await storage.bulkArchiveContacts(contactIds);

    res.json({
      success: true,
      archivedCount,
      message: `Successfully archived ${archivedCount} contact(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk archiving contacts:", error);
    res.status(500).json({ error: "Failed to archive contacts" });
  }
});

router.patch("/bulk/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const { contactIds } = bulkOperationSchema.parse(req.body);

    // Verify ownership of all contacts before bulk operation
    for (const contactId of contactIds) {
      const existing = await storage.getContactById(contactId);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({
          error: `Access denied for contact: ${contactId}`,
        });
      }
    }

    const unarchivedCount = await storage.bulkUnarchiveContacts(contactIds);

    res.json({
      success: true,
      unarchivedCount,
      message: `Successfully unarchived ${unarchivedCount} contact(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk unarchiving contacts:", error);
    res.status(500).json({ error: "Failed to unarchive contacts" });
  }
});

/**
 * @swagger
 * /api/contacts/bulk/delete:
 *   delete:
 *     summary: Bulk delete contacts (must be archived and have no dependencies)
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk delete results with success/failure details
 */
router.delete("/bulk/delete", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const { contactIds } = bulkOperationSchema.parse(req.body);

    const results = {
      deleted: [] as string[],
      failed: [] as { id: string; reason: string; name?: string }[]
    };

    for (const contactId of contactIds) {
      try {
        const existing = await storage.getContactById(contactId);
        
        if (!existing || existing.userId !== userId) {
          results.failed.push({ 
            id: contactId, 
            reason: "Not found or access denied" 
          });
          continue;
        }

        if (!existing.archived) {
          results.failed.push({ 
            id: contactId, 
            name: existing.name,
            reason: "Must be archived before deletion" 
          });
          continue;
        }

        const success = await storage.deleteContact(contactId);
        if (success) {
          results.deleted.push(contactId);
        } else {
          results.failed.push({ 
            id: contactId, 
            name: existing.name,
            reason: "Delete operation failed" 
          });
        }
      } catch (err) {
        const existing = await storage.getContactById(contactId);
        if (err instanceof Error && err.message === "CONTACT_HAS_DEPENDENCIES") {
          const systems = Array.isArray((err as any).systems) ? (err as any).systems : [];
          results.failed.push({ 
            id: contactId,
            name: existing?.name,
            reason: `Has linked records in: ${systems.join(", ")}`
          });
        } else {
          results.failed.push({ 
            id: contactId,
            name: existing?.name,
            reason: "Unknown error" 
          });
        }
      }
    }

    res.json({
      success: true,
      deleted: results.deleted.length,
      failed: results.failed.length,
      details: results,
      message: `Successfully deleted ${results.deleted.length} contact(s). ${results.failed.length} failed.`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk deleting contacts:", error);
    res.status(500).json({ error: "Failed to delete contacts" });
  }
});

// Get contact references endpoint
router.get("/:id/references", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) {
      return;
    }

    const contactId = req.params.id;

    // Ensure ownership before checking references
    const existing = await storage.getContactById(contactId);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const references = await storage.getContactReferences(contactId);
    res.json(references);
  } catch (error) {
    console.error("Error fetching contact references:", error);
    res.status(500).json({ error: "Failed to fetch contact references" });
  }
});

export default router;