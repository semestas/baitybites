#!/bin/bash

# WAHA WhatsApp Quick Start Script
# This script helps you set up WAHA for BaityBites

echo "🚀 WAHA WhatsApp Setup for BaityBites"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Ask user which version to install
echo "Which WAHA version do you want to install?"
echo "1) WAHA Core (Free)"
echo "2) WAHA Plus (Donation version with extra features)"
read -p "Enter choice [1-2]: " choice

if [ "$choice" == "2" ]; then
    read -p "Enter WAHA Plus password: " waha_password
    echo "Logging in to Docker..."
    docker login -u devlikeapro -p "$waha_password"
    IMAGE="devlikeapro/waha-plus"
else
    IMAGE="devlikeapro/waha"
fi

echo ""
echo "📦 Pulling WAHA image: $IMAGE"
docker pull $IMAGE

echo ""
echo "🚀 Starting WAHA container..."
docker run -d \
  --name waha \
  -p 3000:3000 \
  -v waha_data:/app/.sessions \
  -e WHATSAPP_HOOK_URL=http://localhost:9876/api/webhooks/whatsapp \
  -e WHATSAPP_HOOK_EVENTS=message,session.status \
  --restart unless-stopped \
  $IMAGE

echo ""
echo "✅ WAHA is now running!"
echo ""
echo "📱 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Use Swagger UI to start a session: POST /api/sessions/start"
echo "3. Get QR code: GET /api/sessions/default/auth/qr"
echo "4. Scan QR code with WhatsApp mobile app"
echo "5. Update .env file:"
echo "   WAHA_URL=http://localhost:3000"
echo "   WAHA_SESSION=default"
echo ""
echo "📚 Full documentation: See WAHA_INTEGRATION.md"
echo ""
echo "🔍 Check WAHA logs:"
echo "   docker logs -f waha"
echo ""
echo "🛑 Stop WAHA:"
echo "   docker stop waha"
echo ""
echo "🗑️ Remove WAHA:"
echo "   docker rm waha"
echo ""
