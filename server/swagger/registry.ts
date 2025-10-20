// Schema registry - composes all domain schemas
import { errorSchemas } from './schemas/common/error-schemas';
import { responseSchemas } from './schemas/common/response-schemas';
import { userSchemas } from './schemas/user/user-schemas';
import { assetSchemas } from './schemas/assets/asset-schemas';
import { portfolioSchemas } from './schemas/assets/portfolio-schemas';
import { pricingSchemas } from './schemas/market/pricing-schemas';
import { salesSchemas } from './schemas/market/sales-schemas';
import { psaSchemas } from './schemas/market/psa-schemas';
import { eventsSchemas } from './schemas/events/events-schemas';
import { cardShowsSchemas } from './schemas/events/cardshows-schemas';
import { contactSchemas } from './schemas/contacts/contact-schemas';
import { buyingSchemas } from './schemas/buying-desk/buying-schemas';

// Compose all schemas into a single object
export const allSchemas = {
  // Common schemas
  ...errorSchemas,
  ...responseSchemas,
  
  // User domain
  ...userSchemas,
  
  // Assets domain
  ...assetSchemas,
  ...portfolioSchemas,
  
  // Market domain
  ...pricingSchemas,
  ...salesSchemas,
  ...psaSchemas,
  
  // Events domain
  ...eventsSchemas,
  ...cardShowsSchemas,
  
  // Contacts domain
  ...contactSchemas,
  
  // Buying desk domain
  ...buyingSchemas,
  
  // Placeholder for other domains that can be added later
  // Collections, Consignments, etc.
};