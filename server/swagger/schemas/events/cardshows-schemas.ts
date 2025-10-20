// Card shows schemas
export const cardShowsSchemas = {
  CardShow: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Card show unique identifier'
      },
      name: {
        type: 'string',
        description: 'Card show name'
      },
      dateStart: {
        type: 'string',
        format: 'date',
        description: 'Show start date'
      },
      dateEnd: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Show end date'
      },
      venueName: {
        type: 'string',
        nullable: true,
        description: 'Venue name'
      },
      fullAddress: {
        type: 'string',
        nullable: true,
        description: 'Full venue address'
      },
      city: {
        type: 'string',
        nullable: true,
        description: 'City'
      },
      state: {
        type: 'string',
        nullable: true,
        description: 'State'
      },
      website: {
        type: 'string',
        nullable: true,
        description: 'Official website URL'
      },
      eventSize: {
        type: 'string',
        nullable: true,
        description: 'Estimated size of the event'
      },
      cardTypes: {
        type: 'array',
        items: { type: 'string' },
        nullable: true,
        description: 'Types of cards featured'
      },
      specialServices: {
        type: 'array',
        items: { type: 'string' },
        nullable: true,
        description: 'Special services available'
      },
      isActive: {
        type: 'boolean',
        default: true,
        description: 'Whether the show is active'
      },
      fetchedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the show data was fetched'
      }
    }
  }
};