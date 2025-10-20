// Base Swagger/OpenAPI configuration
export const baseSwaggerConfig = {
  openapi: '3.0.0',
  info: {
    title: 'Slabfy API',
    version: '3.0.0',
    description: 'API documentation for Slabfy - Production-ready sports card platform with card grouping system, Groq AI filtering, authentic marketplace data integration, and intelligent caching architecture',
    contact: {
      name: 'Slabfy Support',
      email: 'support@slabfy.com'
    },
    license: {
      name: 'Private',
      url: 'https://slabfy.com/terms'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

// Swagger JSDoc configuration options
export const swaggerOptions = {
  definition: baseSwaggerConfig,
  apis: ['./server/routes.ts', './server/routes/**/*.ts'], // Path to the API docs including nested routes
};