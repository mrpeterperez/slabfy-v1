// Ensure environment variables are loaded for supabase import
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // Also load .env as fallback

import type { Express, Response } from "express";
import { authenticateUser, AuthenticatedRequest } from "./supabase";
import { withUserDb } from "./db";
import { userAssets } from "@shared/schema";
import { sql as dsql } from "drizzle-orm";
import { specs, swaggerUi, authenticateSwaggerUI } from "./swagger/index";

// Import route modules
import salesRoutes from "./routes/sales";
import refreshRoutes from "./routes/refresh";
import pricingRoutes from "./routes/pricing";
import marketRoutes from "./routes/market";
import eventsRoutes from "./routes/events";
import authRoutes from "./routes/auth";
import publicRoutes from "./routes/public";
import cardShowsRoutes from "./routes/card-shows";
import buyingDeskRoutes from "./routes/buying-desk/index";
import globalAssetsRoutes from "./routes/global-assets";
import assetsRoutes from "./routes/assets";
import consignmentsRoutes from "./routes/consignments";
import contactsRoutes from "./routes/contacts";
import collectionsRoutes from "./routes/collections";
import portfolioRoutes from "./routes/portfolio";
import { preferencesRouter } from "./routes/user/preferences";
import userRoutes from "./routes/user";
import inviteCodesRoutes from "./routes/invite-codes";
import reportsRoutes from "./routes/reports";
import purchasesRoutes from "./routes/purchases";
import { analyticsRouter } from "./routes/analytics";
import dashboardRoutes from "./routes/dashboard";
import storefrontRoutes from "./routes/storefront";

export async function registerRoutes(app: Express): Promise<void> {
  // Swagger UI setup - TEMPORARILY DISABLED due to YAML parsing errors
  // app.use('/api-docs', authenticateSwaggerUI, swaggerUi.serve, swaggerUi.setup(specs, {
  //   explorer: true,
  //   swaggerOptions: {
  //     persistAuthorization: true,
  //     displayRequestDuration: true,
  //     docExpansion: 'list',
  //     filter: true,
  //     showExtensions: true,
  //   },
  //   customSiteTitle: "Slabfy API Documentation",
  //   customCss: '.swagger-ui .topbar { display: none }',
  //   customfavIcon: "/favicon.ico",
  // }));

  // Mount all route modules
  app.use('/api/user/preferences', preferencesRouter);
  app.use('/api/user', userRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use("/api/sales", salesRoutes);
  // Mount refresh router at '/api' so it exposes:
  // - POST /api/refresh (preferred)
  // - POST /api/sales-history-refresh/refresh (legacy)
  app.use("/api", refreshRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/market", marketRoutes);
  app.use("/api/events", eventsRoutes);
  // app.use("/api/card-shows", cardShowsRoutes); // Removed - scraping complexity not needed
  app.use("/api", purchasesRoutes);
  app.use("/api/buying-desk", buyingDeskRoutes);
  app.use("/api/global-assets", globalAssetsRoutes);
  app.use("/api/assets", assetsRoutes);
  app.use("/api/consignments", consignmentsRoutes);
  app.use("/api/contacts", contactsRoutes);
  app.use("/api/collections", collectionsRoutes);
  app.use("/api/portfolio", portfolioRoutes);
  app.use("/api/invite-codes", inviteCodesRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/storefront", storefrontRoutes);

  // RLS verification endpoint
  app.get("/api/rls/verify", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const data = await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
        const [{ count }] = await scopedDb
          .select({ count: dsql<number>`COUNT(*)` })
          .from(userAssets);
        const sample = await scopedDb.select().from(userAssets).limit(3);
        return { count: Number(count) || 0, sample };
      });
      res.json({ ok: true, userId, ...data });
    } catch (err) {
      console.error('RLS verify failed', err);
      res.status(500).json({ ok: false, error: 'RLS verification failed' });
    }
  });

}