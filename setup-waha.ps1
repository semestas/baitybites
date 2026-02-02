# WAHA WhatsApp Quick Start Script for Windows PowerShell
# This script helps you set up WAHA for BaityBites

Write-Host "🚀 WAHA WhatsApp Setup for BaityBites" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

Write-Host "✅ Docker is installed" -ForegroundColor Green
Write-Host ""

# Ask user which version to install
Write-Host "Which WAHA version do you want to install?"
Write-Host "1) WAHA Core (Free)"
Write-Host "2) WAHA Plus (Donation version with extra features)"
$choice = Read-Host "Enter choice [1-2]"

if ($choice -eq "2") {
    $wahaPassword = Read-Host "Enter WAHA Plus password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($wahaPassword)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    Write-Host "Logging in to Docker..." -ForegroundColor Yellow
    docker login -u devlikeapro -p $password
    $IMAGE = "devlikeapro/waha-plus"
} else {
    $IMAGE = "devlikeapro/waha"
}

Write-Host ""
Write-Host "📦 Pulling WAHA image: $IMAGE" -ForegroundColor Yellow
docker pull $IMAGE

Write-Host ""
Write-Host "🚀 Starting WAHA container..." -ForegroundColor Yellow
docker run -d `
  --name waha `
  -p 3000:3000 `
  -v waha_data:/app/.sessions `
  -e WHATSAPP_HOOK_URL=http://localhost:9876/api/webhooks/whatsapp `
  -e WHATSAPP_HOOK_EVENTS=message,session.status `
  --restart unless-stopped `
  $IMAGE

Write-Host ""
Write-Host "✅ WAHA is now running!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000 in your browser"
Write-Host "2. Use Swagger UI to start a session: POST /api/sessions/start"
Write-Host "3. Get QR code: GET /api/sessions/default/auth/qr"
Write-Host "4. Scan QR code with WhatsApp mobile app"
Write-Host "5. Update .env file:"
Write-Host "   WAHA_URL=http://localhost:3000"
Write-Host "   WAHA_SESSION=default"
Write-Host ""
Write-Host "📚 Full documentation: See WAHA_INTEGRATION.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔍 Check WAHA logs:" -ForegroundColor Cyan
Write-Host "   docker logs -f waha"
Write-Host ""
Write-Host "🛑 Stop WAHA:" -ForegroundColor Cyan
Write-Host "   docker stop waha"
Write-Host ""
Write-Host "🗑️ Remove WAHA:" -ForegroundColor Cyan
Write-Host "   docker rm waha"
Write-Host ""
