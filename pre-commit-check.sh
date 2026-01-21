#!/bin/bash

# Baitybites - Pre-commit Checklist Script
# Run this before committing to GitHub

echo "🔍 Baitybites Pre-Commit Checklist"
echo "=================================="
echo ""

# Check if .env exists (should not be committed)
if [ -f ".env" ]; then
    echo "✅ .env file exists (will be ignored by git)"
else
    echo "⚠️  .env file not found - create from .env.example"
fi

# Check if .gitignore exists
if [ -f ".gitignore" ]; then
    echo "✅ .gitignore exists"
else
    echo "❌ .gitignore missing!"
    exit 1
fi

# Check if node_modules will be ignored
if grep -q "node_modules" .gitignore; then
    echo "✅ node_modules will be ignored"
else
    echo "⚠️  node_modules not in .gitignore"
fi

# Check for sensitive data
echo ""
echo "🔐 Checking for sensitive data..."
if grep -r "password\|secret\|api_key" --include="*.ts" --include="*.js" --exclude-dir=node_modules .; then
    echo "⚠️  Found potential sensitive data in code files!"
    echo "   Please review and move to environment variables"
else
    echo "✅ No obvious sensitive data in code"
fi

echo ""
echo "📦 Files ready for commit:"
git status --short

echo ""
echo "✨ Ready to commit!"
echo ""
echo "Next steps:"
echo "1. git add ."
echo "2. git commit -m 'Your commit message'"
echo "3. git push origin main"
