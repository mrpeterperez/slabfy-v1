import { Router } from 'express';
import { authenticateUser } from '../../supabase';
import { storage } from '../../storage';
import sessionRoutes from './sessions';
import assetRoutes from './assets';
import checkoutRoutes from './checkout';
import sellersRoutes from './sellers';
import bulkRoutes from './bulk';
import { createBuyingDeskRouter } from '../buying-desk';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

// Mount sub-routers properly with their paths
router.use('/sessions', sessionRoutes);
router.use('/bulk', bulkRoutes);
router.use('/', assetRoutes);  
router.use('/', checkoutRoutes);
router.use('/', sellersRoutes);

// Settings routes (from buying-desk.ts)
const settingsRouter = createBuyingDeskRouter(storage);
router.use('/', settingsRouter);

export default router;