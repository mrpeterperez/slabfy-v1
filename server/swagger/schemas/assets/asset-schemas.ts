// Asset domain schemas
export const assetSchemas = {
  Asset: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Asset unique identifier'
      },
      userId: {
        type: 'string',
        description: 'Owner user ID'
      },
      globalAssetId: {
        type: 'string',
        description: 'Reference to global asset data'
      },
      type: {
        type: 'string',
        enum: ['graded', 'raw', 'sealed', 'other'],
        description: 'Type of collectible asset'
      },
      title: {
        type: 'string',
        description: 'Asset title/description'
      },
      playerName: {
        type: 'string',
        nullable: true,
        description: 'Name of player (for cards)'
      },
      setName: {
        type: 'string',
        nullable: true,
        description: 'Set name'
      },
      year: {
        type: 'string',
        nullable: true,
        description: 'Year of release'
      },
      cardNumber: {
        type: 'string',
        nullable: true,
        description: 'Card number in set'
      },
      variant: {
        type: 'string',
        nullable: true,
        description: 'Variant/parallel details'
      },
      grader: {
        type: 'string',
        enum: ['PSA', 'BGS', 'CGC', 'RAW'],
        nullable: true,
        description: 'Grading company'
      },
      grade: {
        type: 'string',
        nullable: true,
        description: 'Grade assigned'
      },
      certNumber: {
        type: 'string',
        nullable: true,
        description: 'Certification number'
      },
      serialNumbered: {
        type: 'boolean',
        default: false,
        description: 'Whether item is serial numbered'
      },
      serialNumber: {
        type: 'integer',
        nullable: true,
        description: 'Serial number'
      },
      serialMax: {
        type: 'integer',
        nullable: true,
        description: 'Maximum serial number'
      },
      purchasePrice: {
        type: 'number',
        format: 'float',
        nullable: true,
        description: 'Purchase price'
      },
      purchaseDate: {
        type: 'string',
        format: 'date',
        nullable: true,
        description: 'Purchase date'
      },
      purchaseSource: {
        type: 'string',
        nullable: true,
        description: 'Where asset was purchased'
      },
      ownershipStatus: {
        type: 'string',
        enum: ['owned', 'for_sale', 'sold', 'pending_transfer'],
        default: 'owned',
        description: 'Current ownership status'
      },
      sourceSlug: {
        type: 'string',
        enum: ['psa', 'bgs', 'manual'],
        default: 'manual',
        description: 'Source of the asset data'
      },
      imageUrl: {
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'URL to asset image'
      },
      notes: {
        type: 'string',
        nullable: true,
        description: 'Additional notes'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the asset was created'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the asset was last updated'
      }
    }
  }
};