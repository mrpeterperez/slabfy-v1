// Portfolio and value calculation schemas
export const portfolioSchemas = {
  PortfolioSummary: {
    type: 'object',
    description: 'Complete portfolio summary with asset counts and values',
    properties: {
      totalAssets: {
        type: 'integer',
        description: 'Total number of assets (owned + consignment)',
        example: 150
      },
      totalPurchaseValue: {
        type: 'number',
        format: 'decimal',
        description: 'Total purchase value of owned assets',
        example: 12500.00
      },
      totalMarketValue: {
        type: 'number', 
        format: 'decimal',
        description: 'Total current market value of all assets',
        example: 15750.00
      },
      totalConsignmentValue: {
        type: 'number',
        format: 'decimal', 
        description: 'Total asking value of consignment assets',
        example: 8200.00
      },
      breakdown: {
        type: 'object',
        description: 'Detailed breakdown by ownership type',
        properties: {
          owned: {
            type: 'object',
            description: 'Statistics for user-owned assets',
            properties: {
              count: {
                type: 'integer',
                description: 'Number of owned assets',
                example: 125
              },
              purchaseValue: {
                type: 'number',
                format: 'decimal',
                description: 'Total purchase value of owned assets',
                example: 12500.00
              },
              marketValue: {
                type: 'number',
                format: 'decimal',
                description: 'Current market value of owned assets', 
                example: 13200.00
              },
              personalValue: {
                type: 'number',
                format: 'decimal',
                description: 'Total personal value assigned to owned assets',
                example: 14000.00
              }
            }
          },
          consignment: {
            type: 'object',
            description: 'Statistics for consignment assets',
            properties: {
              count: {
                type: 'integer',
                description: 'Number of consignment assets',
                example: 25
              },
              consignorValue: {
                type: 'number',
                format: 'decimal',
                description: 'Total consignor price for consignment assets',
                example: 6500.00
              },
              askingValue: {
                type: 'number',
                format: 'decimal',
                description: 'Total asking price for consignment assets',
                example: 8200.00
              },
              marketValue: {
                type: 'number',
                format: 'decimal',
                description: 'Current market value of consignment assets',
                example: 2550.00
              }
            }
          }
        }
      }
    }
  }
};