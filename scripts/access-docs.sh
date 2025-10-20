#!/bin/bash

# This script helps to access the API documentation
# Usage: ./scripts/access-docs.sh

# Check if SWAGGER_DOCS_KEY is set
if [ -z "$SWAGGER_DOCS_KEY" ]; then
  echo "Error: SWAGGER_DOCS_KEY environment variable not set."
  echo "Please set it before running this script."
  echo "Example: export SWAGGER_DOCS_KEY=your_secure_key"
  exit 1
fi

# URL of the API documentation
DOCS_URL="http://localhost:5000/api-docs"

# Print instructions
echo "===== API Documentation Access ====="
echo "URL: $DOCS_URL"
echo "Authorization: Bearer $SWAGGER_DOCS_KEY"
echo ""
echo "You can use this API key in the Swagger UI to authorize your requests."
echo "Click the 'Authorize' button and enter the key as: Bearer $SWAGGER_DOCS_KEY"
echo ""

# Check if curl is available
if command -v curl &> /dev/null; then
  echo "Opening API docs using curl..."
  curl -s -X GET "$DOCS_URL" -H "Authorization: Bearer $SWAGGER_DOCS_KEY" > /dev/null
  echo "Done! You can now open $DOCS_URL in your browser."
else
  echo "Curl not found. Please open $DOCS_URL in your browser manually."
  echo "Don't forget to add the Authorization header with: Bearer $SWAGGER_DOCS_KEY"
fi

echo ""
echo "You can also access the docs directly with basic auth in modern browsers by opening:"
echo "$DOCS_URL and entering the API key when prompted."
