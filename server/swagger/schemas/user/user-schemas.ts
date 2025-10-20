// User domain schemas
export const userSchemas = {
  User: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'User\'s unique identifier'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User\'s email address'
      },
      name: {
        type: 'string',
        description: 'User\'s display name'
      },
      bio: {
        type: 'string',
        description: 'User\'s biography'
      },
      avatarUrl: {
        type: 'string',
        format: 'uri',
        description: 'URL to user\'s avatar image'
      },
      collections: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'User\'s collection preferences'
      },
      onboardingComplete: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Whether the user has completed onboarding'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the user account was created'
      }
    }
  }
};