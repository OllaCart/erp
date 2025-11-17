#!/bin/bash
cd "$(dirname "$0")"

echo "Installing dependencies..."
if command -v pnpm &> /dev/null; then
    echo "Using pnpm..."
    pnpm install
else
    echo "Using npm..."
    npm install
fi

echo ""
echo "Setup complete! Run 'npm run dev' or 'pnpm dev' to start the server."


