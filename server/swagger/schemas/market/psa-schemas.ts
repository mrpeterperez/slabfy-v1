// PSA certification schemas
export const psaSchemas = {
  PSACertResponse: {
    type: 'object',
    properties: {
      certNumber: { type: 'string' },
      playerName: { type: 'string' },
      setName: { type: 'string' },
      year: { type: 'string' },
      cardNumber: { type: 'string' },
      grade: { type: 'string' },
      psaImageFrontUrl: { type: 'string' },
      psaImageBackUrl: { type: 'string' }
    }
  }
};