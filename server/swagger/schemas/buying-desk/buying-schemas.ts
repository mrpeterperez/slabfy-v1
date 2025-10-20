// Buying desk domain schemas
export const buyingSchemas = {
  BuyOffer: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique buy offer identifier'
      },
      offerNumber: {
        type: 'string',
        description: 'Human-readable offer number'
      },
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'User who made the offer'
      },
      sellerId: {
        type: 'string',
        format: 'uuid',
        description: 'Seller receiving the offer'
      },
      cardDescription: {
        type: 'string',
        description: 'Description of the card/item'
      },
      offerAmount: {
        type: 'number',
        description: 'Offer amount in dollars'
      },
      notes: {
        type: 'string',
        description: 'Additional notes'
      },
      status: {
        type: 'string',
        enum: ['pending', 'accepted', 'declined', 'expired'],
        description: 'Current offer status'
      },
      expiryDate: {
        type: 'string',
        format: 'date',
        description: 'When the offer expires'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the offer was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the offer was last updated'
      }
    }
  },
  BuyOfferAsset: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Buy offer asset unique identifier'
      },
      buyOfferId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the buy offer this asset belongs to'
      },
      assetId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the global asset'
      },
      sellerId: {
        type: 'string',
        format: 'uuid',
        description: 'Direct reference to seller for performance'
      },
      eventId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        description: 'Direct reference to event/show for performance'
      },
      offerPrice: {
        type: 'string',
        description: 'Offer price in USD (stored as string for precision)',
        example: '45.50'
      },
      offerPercentage: {
        type: 'string',
        description: 'Percentage entered by user (e.g., "75.50" for 75.5%)',
        example: '75.50'
      },
      marketValueAtOffer: {
        type: 'string',
        nullable: true,
        description: 'Market value when offer was made, locked when sent',
        example: '62.45'
      },
      confidenceLevel: {
        type: 'integer',
        nullable: true,
        description: 'User confidence in offer (1-5 scale)',
        minimum: 1,
        maximum: 5
      },
      expectedProfit: {
        type: 'string',
        nullable: true,
        description: 'Calculated expected profit from this offer',
        example: '16.95'
      },
      notes: {
        type: 'string',
        nullable: true,
        description: 'Optional notes for this asset offer'
      },
      addedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the asset was added to the buy offer'
      },
      sentAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'When offer was sent, locks market value at that time'
      }
    }
  },
  EvaluationAsset: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Evaluation asset unique identifier'
      },
      buyOfferId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the buy offer this asset belongs to'
      },
      assetId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the global asset'
      },
      evaluationNotes: {
        type: 'string',
        nullable: true,
        description: 'Evaluation notes or JSON data containing offer details (offerPrice, offerPercentage, marketValueAtOffer, confidenceLevel, expectedProfit)',
        example: '{"offerPrice": 45.50, "offerPercentage": 75.50, "marketValueAtOffer": 62.45, "confidenceLevel": 3, "expectedProfit": 16.95}'
      },
      addedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the asset was added for evaluation'
      }
    }
  }
};