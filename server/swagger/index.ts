// Main modular swagger configuration
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { baseSwaggerConfig, swaggerOptions } from './config/base-config';
import { authenticateSwaggerUI } from './config/auth-middleware';
import { allSchemas } from './registry';

// Create complete swagger configuration with modular schemas
const modularSwaggerConfig = {
  ...baseSwaggerConfig,
  components: {
    ...baseSwaggerConfig.components,
    schemas: allSchemas
  }
};

// Update swagger options to use modular configuration
const completeSwaggerOptions = {
  ...swaggerOptions,
  definition: modularSwaggerConfig
};

// Initialize swagger-jsdoc with modular configuration
export const specs = swaggerJsdoc(completeSwaggerOptions);

// Export Swagger UI and authentication
export { swaggerUi, authenticateSwaggerUI };