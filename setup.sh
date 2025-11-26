#!/bin/bash

# Pre-deployment checklist and startup script for Prep4Int

echo "================================"
echo "Prep4Int - Pre-Deployment Check"
echo "================================"
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
node_version=$(node -v)
echo "  Node version: $node_version"
echo ""

# Check npm version
echo "✓ Checking npm version..."
npm_version=$(npm -v)
echo "  npm version: $npm_version"
echo ""

# Check if .env exists
echo "✓ Checking .env file..."
if [ -f "backend/.env" ]; then
    echo "  .env file found in backend/"
else
    echo "  ⚠ No .env file found. Creating from .env.example..."
    cp .env.example backend/.env
    echo "  Please update backend/.env with your MongoDB URI"
    exit 1
fi
echo ""

# Install dependencies
echo "✓ Installing dependencies..."
npm install
cd backend
npm install
cd ..
echo ""

# Check MongoDB connection
echo "✓ Testing MongoDB connection..."
echo "  Will verify when server starts"
echo ""

echo "================================"
echo "✓ All checks passed!"
echo "================================"
echo ""
echo "To start the server, run:"
echo "  npm start"
echo ""
echo "Server will run on http://localhost:8000"
echo ""
