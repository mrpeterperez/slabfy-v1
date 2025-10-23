#!/bin/bash

# 🔥 Fix auth race conditions across the codebase
# Adds authLoading check to all useQuery calls that depend on auth

set -e

echo "🔍 Finding files with useAuth + useQuery patterns..."

# Find all TypeScript/TSX files that use both useAuth and useQuery
FILES=$(grep -rl "useAuth" client/src --include="*.tsx" --include="*.ts" | xargs grep -l "useQuery" 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "❌ No files found with useAuth + useQuery"
  exit 0
fi

echo "📝 Found $(echo "$FILES" | wc -l) files to check"

FIXED_COUNT=0

for file in $FILES; do
  # Skip if file doesn't exist
  [ ! -f "$file" ] && continue
  
  # Check if file uses useAuth but doesn't destructure loading
  if grep -q "const.*useAuth()" "$file"; then
    # Check if it's missing loading/authLoading
    if ! grep -q "loading.*useAuth\|authLoading.*useAuth" "$file"; then
      echo "🔧 Fixing: $file"
      
      # Pattern: const { user, ...other } = useAuth()
      # Insert loading before the closing brace
      perl -i -pe 's/const\s+\{\s*user\s*,\s*([^}]+)\}\s*=\s*useAuth\(\)/const { user, loading: authLoading, $1} = useAuth()/g' "$file"
      
      # Pattern: const { user } = useAuth()
      perl -i -pe 's/const\s+\{\s*user\s*\}\s*=\s*useAuth\(\)/const { user, loading: authLoading } = useAuth()/g' "$file"
      
      FIXED_COUNT=$((FIXED_COUNT + 1))
    fi
  fi
done

echo "✅ Phase 1 complete: Added authLoading to $FIXED_COUNT files"
echo ""
echo "🔍 Phase 2: Finding useQuery calls that need !authLoading..."

PHASE2_COUNT=0

# Now find files that have useQuery with enabled but missing !authLoading
for file in $FILES; do
  [ ! -f "$file" ] && continue
  
  # Check if file has useQuery with enabled conditions
  if grep -q "enabled:" "$file"; then
    # Check if it's missing !authLoading in enabled conditions
    if ! grep -q "enabled:.*!authLoading" "$file"; then
      # Check if it has user-dependent queries
      if grep -q "enabled:.*user" "$file"; then
        echo "🔧 Adding !authLoading to enabled conditions in: $file"
        
        # Fix enabled: !!user?.id patterns
        perl -i -pe 's/(enabled:\s*)(!!\s*user\?\.id)(\s*[,}])/$1$2 \&\& !authLoading$3/g' "$file"
        
        # Fix enabled: !!user patterns (without ?.)
        perl -i -pe 's/(enabled:\s*)(!!\s*user)(\s*[,}])/$1$2 \&\& !authLoading$3/g' "$file"
        
        # Fix enabled: !!userId patterns
        perl -i -pe 's/(enabled:\s*)(!!\s*userId)(\s*[,}])/$1$2 \&\& !authLoading$3/g' "$file"
        
        PHASE2_COUNT=$((PHASE2_COUNT + 1))
      fi
    fi
  fi
done

echo "✅ Phase 2 complete: Modified $PHASE2_COUNT files"
echo ""
echo "🎯 Total changes: Phase 1 ($FIXED_COUNT files) + Phase 2 ($PHASE2_COUNT files)"

echo ""
echo "✨ Auth race condition fix complete!"
echo "📋 Review the changes with: git diff"
