# WAHA Session Setup Script
# This script creates a WhatsApp session on your WAHA instance

Write-Host "🚀 WAHA WhatsApp Session Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$WAHA_URL = Read-Host "Enter your WAHA URL (e.g., https://waha-whatsapp.onrender.com)"
$BACKEND_URL = Read-Host "Enter your backend URL (e.g., https://baitybites-api.onrender.com)"

# Remove trailing slash if present
$WAHA_URL = $WAHA_URL.TrimEnd('/')
$BACKEND_URL = $BACKEND_URL.TrimEnd('/')

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   WAHA URL: $WAHA_URL"
Write-Host "   Backend URL: $BACKEND_URL"
Write-Host ""

# Step 1: Create session
Write-Host "Step 1: Creating WhatsApp session..." -ForegroundColor Green

$sessionBody = @{
    name   = "default"
    config = @{
        webhooks = @(
            @{
                url    = "$BACKEND_URL/api/webhooks/whatsapp"
                events = @("message", "session.status")
            }
        )
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$WAHA_URL/api/sessions/start" -Method POST -Body $sessionBody -ContentType "application/json"
    Write-Host "✅ Session created successfully!" -ForegroundColor Green
    Write-Host "   Session name: $($response.name)"
    Write-Host "   Status: $($response.status)"
    Write-Host ""
}
catch {
    Write-Host "❌ Error creating session:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "💡 Possible reasons:" -ForegroundColor Yellow
    Write-Host "   1. WAHA URL is incorrect"
    Write-Host "   2. WAHA service is not running"
    Write-Host "   3. Session already exists"
    Write-Host ""
    Write-Host "🔧 Try accessing: $WAHA_URL in your browser to verify WAHA is running"
    exit 1
}

# Step 2: Get QR code
Write-Host "Step 2: Getting QR code..." -ForegroundColor Green

try {
    # Get QR code as base64
    $null = Invoke-RestMethod -Uri "$WAHA_URL/api/sessions/default/auth/qr" -Method GET
    
    Write-Host "✅ QR code retrieved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Open this URL in your browser to see the QR code:"
    Write-Host "      $WAHA_URL/api/sessions/default/auth/qr"
    Write-Host ""
    Write-Host "   2. Open WhatsApp on your phone"
    Write-Host "   3. Go to Settings → Linked Devices"
    Write-Host "   4. Tap 'Link a Device'"
    Write-Host "   5. Scan the QR code from the browser"
    Write-Host ""
}
catch {
    Write-Host "⚠️ Could not retrieve QR code automatically" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📱 Manual steps:" -ForegroundColor Cyan
    Write-Host "   1. Open this URL in your browser:"
    Write-Host "      $WAHA_URL/api/sessions/default/auth/qr"
    Write-Host ""
    Write-Host "   2. Scan the QR code with WhatsApp"
    Write-Host ""
}

# Step 3: Wait for user to scan
Write-Host "⏳ Waiting for you to scan the QR code..." -ForegroundColor Yellow
Write-Host "   Press Enter after you've scanned the QR code..."
Read-Host

# Step 4: Check session status
Write-Host ""
Write-Host "Step 3: Checking session status..." -ForegroundColor Green

try {
    $statusResponse = Invoke-RestMethod -Uri "$WAHA_URL/api/sessions/default" -Method GET
    
    if ($statusResponse.status -eq "WORKING") {
        Write-Host "✅ WhatsApp connected successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Setup complete!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Session Details:" -ForegroundColor Yellow
        Write-Host "   Name: $($statusResponse.name)"
        Write-Host "   Status: $($statusResponse.status)"
        Write-Host ""
        Write-Host "✅ Your BaityBites app can now send WhatsApp messages!" -ForegroundColor Green
        Write-Host ""
    }
    else {
        Write-Host "⚠️ Session status: $($statusResponse.status)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 If status is not 'WORKING', try:" -ForegroundColor Yellow
        Write-Host "   1. Make sure you scanned the QR code"
        Write-Host "   2. Wait a few seconds and run this script again"
        Write-Host "   3. Check WAHA logs for errors"
        Write-Host ""
    }
}
catch {
    Write-Host "❌ Error checking session status:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
}

Write-Host ""
Write-Host "📚 For more help, see:" -ForegroundColor Cyan
Write-Host "   - WAHA_RENDER_DEPLOY.md"
Write-Host "   - WAHA_SWAGGER_SIMPLE_GUIDE.md"
Write-Host ""
