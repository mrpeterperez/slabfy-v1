// Events domain schemas
export const eventsSchemas = {
  Event: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Event unique identifier'
      },
      name: {
        type: 'string',
        description: 'Event name'
      },
      dateStart: {
        type: 'string',
        format: 'date',
        description: 'Event start date'
      },
      dateEnd: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Event end date'
      },
      location: {
        type: 'string',
        nullable: true,
        description: 'Event location'
      },
      description: {
        type: 'string',
        nullable: true,
        description: 'Event description'
      },
      userId: {
        type: 'string',
        description: 'User who created the event'
      },
      status: {
        type: 'string',
        enum: ['upcoming', 'active', 'completed', 'cancelled'],
        default: 'upcoming',
        description: 'Event status'
      },
      cardShowId: {
        type: 'string',
        nullable: true,
        description: 'Related card show ID if created from card show'
      },
      isCustom: {
        type: 'boolean',
        default: true,
        description: 'Whether this is a custom user event'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the event was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the event was last updated'
      }
    }
  },
  EventsSummary: {
    type: 'object',
    properties: {
      totalEvents: {
        type: 'integer',
        description: 'Total number of events'
      },
      totalBuyOffers: {
        type: 'integer',
        description: 'Total buy offers made'
      },
      totalSold: {
        type: 'integer',
        description: 'Total items sold'
      },
      totalRevenue: {
        type: 'number',
        description: 'Total revenue generated'
      },
      totalProfit: {
        type: 'number',
        description: 'Total profit made'
      }
    }
  }
};