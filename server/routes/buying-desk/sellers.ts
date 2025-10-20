import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts, sellers } from "@shared/schema";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /sellers - list sellers for current user with joined contact info
router.get("/sellers", async (req: any, res) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rows = await db
      .select({
        sellerId: sellers.id,
        contactId: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phoneNumber: contacts.phone,
        companyName: contacts.companyName,
        notes: contacts.notes,
      })
      .from(sellers)
      .leftJoin(contacts, eq(sellers.contactId, contacts.id))
      .where(eq(sellers.userId, userId));

    const data = rows.map((r) => ({
      seller: { id: r.sellerId },
      contact: {
        id: r.contactId,
        name: r.name,
        email: r.email,
        phoneNumber: r.phoneNumber,
        companyName: r.companyName,
        notes: r.notes,
      },
    }));

    return res.json(data);
  } catch (err) {
    console.error("Error listing sellers:", err);
    return res.status(500).json({ error: "Failed to list sellers" });
  }
});

const createSellerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /sellers - create a new seller (creates/uses contact and then seller)
router.post("/sellers", async (req: any, res) => {
  try {
    const userId = req.user?.id as string | undefined;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const body = createSellerSchema.parse(req.body ?? {});
    const email = body.email ?? undefined;
    const phone = body.phoneNumber ?? body.phone ?? undefined;

    // If email exists, try to reuse existing contact for this user
    let contactRow = undefined as
      | { id: string; name: string | null; email: string | null; phone: string | null; companyName: string | null; notes: string | null }
      | undefined;

    if (email) {
      const existing = await db
        .select({ id: contacts.id, name: contacts.name, email: contacts.email, phone: contacts.phone, companyName: contacts.companyName, notes: contacts.notes })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), eq(contacts.email, email)))
        .limit(1);
      contactRow = existing[0];
    }

    // Create contact when not reusing
    if (!contactRow) {
      const newId = uuidv4();
      await db.insert(contacts).values({
        id: newId,
        userId,
        name: body.name,
        email: email ?? null,
        phone: phone ?? null,
        companyName: body.companyName ?? null,
        notes: body.notes ?? null,
      });

      const [created] = await db
        .select({ id: contacts.id, name: contacts.name, email: contacts.email, phone: contacts.phone, companyName: contacts.companyName, notes: contacts.notes })
        .from(contacts)
        .where(eq(contacts.id, newId))
        .limit(1);
      contactRow = created;
    }

    if (!contactRow) {
      return res.status(500).json({ error: "Failed to create contact" });
    }

    // Reuse seller for this contact if already exists
    const existingSeller = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(and(eq(sellers.userId, userId), eq(sellers.contactId, contactRow.id)))
      .limit(1);

    let sellerId: string;
    if (existingSeller[0]?.id) {
      sellerId = existingSeller[0].id;
    } else {
      sellerId = uuidv4();
      await db.insert(sellers).values({ id: sellerId, userId, contactId: contactRow.id });
    }

    return res.status(201).json({
      id: sellerId,
      contactId: contactRow.id,
      contact: {
        id: contactRow.id,
        name: contactRow.name,
        email: contactRow.email,
        phoneNumber: contactRow.phone,
        companyName: contactRow.companyName,
        notes: contactRow.notes,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Error creating seller:", err);
    return res.status(500).json({ error: "Failed to create seller" });
  }
});

export default router;
