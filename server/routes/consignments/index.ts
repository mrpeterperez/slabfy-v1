// 🤖 INTERNAL NOTE:
// Purpose: Main router for consignment-related API endpoints
// Exports: Consolidated Express router with all consignment functionality
// Feature: consignments (server)
// Dependencies: All consignment sub-modules, authentication middleware

import { Router } from "express";
import { authenticateUser } from "../../supabase";
import consignmentRoutes from "./consignments";
import assetRoutes from "./assets";
import pricingRoutes from "./pricing";
import summariesRoutes from "./summaries";
import bulkRoutes from "./bulk";
import consignorRoutes from "./consignor";
import titlesRoutes from "./titles";

const router = Router();

// Apply authentication middleware to all consignment routes
// This fixes the security issue where some routes were missing authentication
router.use(authenticateUser);

// Mount title generation routes (must be before /:id routes)
router.use("/", titlesRoutes);

// Mount summary and stats routes
router.use("/", summariesRoutes);

// Mount bulk operation routes
router.use("/", bulkRoutes);

// Mount core consignment CRUD routes
router.use("/", consignmentRoutes);

// Mount consignor management routes with parameter inheritance
router.use("/", consignorRoutes);

// Mount pricing operation routes BEFORE asset routes so static paths like
// '/:id/assets/bulk' are matched before '/:id/assets/:assetId'
router.use("/", pricingRoutes);

// Mount asset management routes with parameter inheritance
// Routes like /:id/assets and /:id/assets/:assetId
router.use("/", assetRoutes);

export default router;