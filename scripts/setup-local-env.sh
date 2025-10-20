#!/bin/bash

# 🚀 SlabFy Local Development Setup Script
# This script helps you get the Railway environment variables and set up local development

echo "🔥 SlabFy Local Development Setup"
echo "=================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    echo ""
    echo "Run this command first:"
    echo "npm install -g @railway/cli"
    echo ""
    echo "Then run this script again!"
    exit 1
fi

echo "✅ Railway CLI found!"
echo ""

# Check if logged into Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log into Railway first:"
    echo "railway login"
    echo ""
    echo "Then run this script again!"
    exit 1
fi

echo "✅ Railway authenticated!"
echo ""

# Create .env.local from Railway variables
echo "🎯 Fetching environment variables from Railway..."

# Check if we're in a Railway project
if ! railway status &> /dev/null; then
    echo "❌ Not in a Railway project directory."
    echo "Make sure you're in the SlabFy project root and linked to Railway."
    echo ""
    echo "To link: railway link"
    exit 1
fi

# Get variables and create .env.local
echo "📝 Creating .env.local with Railway variables..."

# Use Railway CLI to get all variables and format them for local use
railway vars --json > /tmp/railway_vars.json 2>/dev/null

if [ ! -f /tmp/railway_vars.json ]; then
    echo "❌ Could not fetch Railway variables."
    echo "Make sure you have access to the SlabFy Railway project."
    exit 1
fi

# Create .env.local file
cat > .env.local << 'EOF'
# 🚀 SlabFy Local Development Environment
# Auto-generated from Railway on $(date)

# Development mode
NODE_ENV=development
PORT=5000

EOF

# Parse JSON and add variables (simplified approach)
echo "# Railway Environment Variables" >> .env.local
railway vars | grep -E "^[A-Z_]+=" >> .env.local 2>/dev/null || {
    echo "⚠️  Could not auto-populate variables."
    echo "Please manually copy variables from Railway dashboard."
}

echo ""
echo "✅ .env.local created!"
echo ""
echo "🎯 Next steps:"
echo "1. Review .env.local and verify all values look correct"
echo "2. Install dependencies: npm install"
echo "3. Start development server: npm run dev"
echo "4. Open http://localhost:5000"
echo ""
echo "🔧 If you need to manually update variables:"
echo "   - Go to Railway dashboard → Variables tab"
echo "   - Copy values to .env.local"
echo ""
echo "Happy coding! 🚀"