// Contacts domain schemas
export const contactSchemas = {
  Contact: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique contact identifier'
      },
      name: {
        type: 'string',
        description: 'Contact name'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Contact email'
      },
      phone: {
        type: 'string',
        description: 'Contact phone number'
      },
      companyName: {
        type: 'string',
        description: 'Company name'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the contact was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the contact was last updated'
      }
    }
  },
  Seller: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique seller identifier'
      },
      contactId: {
        type: 'string',
        format: 'uuid',
        description: 'Associated contact ID'
      },
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User who owns this seller'
      },
      specialties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Seller specialties'
      },
      isActive: {
        type: 'boolean',
        description: 'Whether seller is active'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the seller was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the seller was last updated'
      }
    }
  }
};