# Configure Jitsi Meet - No Authentication
Write-Host "Configuring Jitsi Meet for MindWave..." -ForegroundColor Green

$envFile = "C:\Users\rajku\OneDrive\Desktop\mindwave\jitsi-meet\.env"
$content = Get-Content $envFile

# Update configuration
$content = $content -replace '#HTTP_PORT=8000', 'HTTP_PORT=8000'
$content = $content -replace '#HTTPS_PORT=8443', 'HTTPS_PORT=8443'
$content = $content -replace '#PUBLIC_URL=.*', 'PUBLIC_URL=http://localhost:8000'
$content = $content -replace '#ENABLE_AUTH=1', 'ENABLE_AUTH=0'
$content = $content -replace '#ENABLE_GUESTS=1', 'ENABLE_GUESTS=1'
$content = $content -replace '#RESTART_POLICY=unless-stopped', 'RESTART_POLICY=unless-stopped'

# Add settings
$content += "`nDISABLE_HTTPS=1"
$content += "`nENABLE_PREJOIN_PAGE=0"
$content += "`nENABLE_XMPP_WEBSOCKET=1"
$content += "`nENABLE_COLIBRI_WEBSOCKET=1"
$content += "`nENABLE_AUTO_OWNER=1"
$content += "`nENABLE_LOBBY=0"

# Generate passwords
function Get-RandomPassword {
    -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
}

$content = $content -replace 'JICOFO_AUTH_PASSWORD=$', "JICOFO_AUTH_PASSWORD=$(Get-RandomPassword)"
$content = $content -replace 'JVB_AUTH_PASSWORD=$', "JVB_AUTH_PASSWORD=$(Get-RandomPassword)"
$content = $content -replace 'JIGASI_XMPP_PASSWORD=$', "JIGASI_XMPP_PASSWORD=$(Get-RandomPassword)"
$content = $content -replace 'JIGASI_TRANSCRIBER_PASSWORD=$', "JIGASI_TRANSCRIBER_PASSWORD=$(Get-RandomPassword)"
$content = $content -replace 'JIBRI_RECORDER_PASSWORD=$', "JIBRI_RECORDER_PASSWORD=$(Get-RandomPassword)"
$content = $content -replace 'JIBRI_XMPP_PASSWORD=$', "JIBRI_XMPP_PASSWORD=$(Get-RandomPassword)"

$content | Set-Content $envFile

Write-Host "Done! ENABLE_AUTH=0 set." -ForegroundColor Green
Write-Host "Run: docker-compose up -d" -ForegroundColor Yellow
