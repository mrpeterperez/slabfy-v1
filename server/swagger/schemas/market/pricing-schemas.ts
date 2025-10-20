// Market pricing and search schemas
export const pricingSchemas = {
  PricingSearchRequest: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        description: 'Search query for eBay listings',
        example: '2024 PANINI INSTANT WNBA ROOKIE OF THE YEAR CAITLIN CLARK #A GEM MT 10'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return',
        default: 100,
        minimum: 1,
        maximum: 200
      },
      sortBy: {
        type: 'string',
        enum: ['ending_soonest', 'newly_listed', 'price_low_to_high', 'price_high_to_low'],
        description: 'Sort order for results',
        default: 'newly_listed'
      },
      condition: {
        type: 'string',
        enum: ['all', 'new', 'used'],
        description: 'Item condition filter',
        default: 'all'
      },
      psaData: {
        type: 'object',
        description: 'PSA certificate data for enhanced matching',
        properties: {
          playerName: {
            type: 'string',
            description: 'Player name from PSA certificate'
          },
          year: {
            type: 'string',
            description: 'Card year from PSA certificate'
          },
          setName: {
            type: 'string',
            description: 'Set name from PSA certificate'
          },
          grade: {
            type: 'string',
            description: 'PSA grade (e.g., GEM MT 10)'
          },
          cardNumber: {
            type: 'string',
            description: 'Card number from PSA certificate'
          },
          grader: {
            type: 'string',
            description: 'Grading company',
            default: 'PSA'
          }
        }
      }
    }
  },
  PricingSearchResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful'
      },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            thumbnail: {
              type: 'string',
              description: 'URL to item thumbnail image'
            },
            marketplace: {
              type: 'string',
              description: 'Marketplace name (eBay)'
            },
            titleLink: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Item listing title'
                },
                url: {
                  type: 'string',
                  description: 'URL to eBay listing'
                }
              }
            },
            grade: {
              type: 'string',
              description: 'Extracted grading information'
            },
            soldType: {
              type: 'string',
              description: 'Type of sale (Auction, Best Offer, etc.)'
            },
            listPrice: {
              type: 'number',
              description: 'Listed price'
            },
            soldPrice: {
              type: 'number',
              description: 'Final sold price'
            },
            shipping: {
              type: 'number',
              description: 'Shipping cost'
            },
            totalWithShipping: {
              type: 'number',
              description: 'Total cost including shipping'
            },
            seller: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'eBay seller username'
                },
                feedbackScore: {
                  type: 'integer',
                  description: 'Seller feedback score'
                },
                feedbackPercentage: {
                  type: 'number',
                  description: 'Seller feedback percentage'
                }
              }
            },
            soldDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date item was sold'
            }
          }
        }
      },
      metadata: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total listings found from API'
          },
          afterSellerFilter: {
            type: 'integer',
            description: 'Listings after seller quality control'
          },
          afterAiFilter: {
            type: 'integer',
            description: 'Listings after processing (same as afterSellerFilter for raw data)'
          },
          final: {
            type: 'integer',
            description: 'Final number of listings returned'
          },
          aiInsights: {
            type: 'object',
            properties: {
              aiFilteringUsed: {
                type: 'boolean',
                description: 'Whether AI filtering was applied'
              },
              reason: {
                type: 'string',
                description: 'Explanation of processing applied'
              }
            }
          }
        }
      }
    }
  }
};