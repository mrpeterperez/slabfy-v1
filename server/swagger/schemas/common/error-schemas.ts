// Common error and response schemas
export const errorSchemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        oneOf: [
          {
            type: 'string',
            description: 'Error message'
          },
          {
            type: 'array',
            items: {
              type: 'object'
            },
            description: 'Validation errors'
          }
        ]
      },
      details: {
        type: 'string',
        description: 'Additional error details',
        nullable: true
      },
      code: {
        type: 'string',
        description: 'Error code for programmatic handling',
        nullable: true
      }
    }
  }
};