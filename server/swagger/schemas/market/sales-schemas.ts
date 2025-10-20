// Market sales data schemas
export const salesSchemas = {
  SalesCompResponse: {
    type: 'object',
    properties: {
      sales_history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            finalPrice: { type: 'number' },
            shipping: { type: 'number' },
            soldDate: { type: 'string', format: 'date-time' },
            condition: { type: 'string' },
            sellerName: { type: 'string' },
            sellerFeedback: { type: 'integer' },
            listingUrl: { type: 'string' }
          }
        }
      },
      from_cache: { type: 'boolean' },
      liquidity_rating: { type: 'string' },
      cached_at: { type: 'string', format: 'date-time' }
    }
  }
};