# Add loading spinner to specific important pages only
$projectRoot = "c:\Users\rajku\OneDrive\Desktop\mindwave"

# List of important pages
$importantPages = @(
    "homepage.html",
    "admin.html",
    "faculty-dataanalytics.html",
    "student-game.html",
    "ai-game-builder.html",
    "signup.html",
    "marketing-site\website-home.html"
)

$cssLine = '    <link rel="stylesheet" href="loading-spinner.css">'
$cssLineMarketing = '    <link rel="stylesheet" href="../loading-spinner.css">'
$jsLine = '    <script src="loading-spinner.js"></script>'
$jsLineMarketing = '    <script src="../loading-spinner.js"></script>'

$addedCount = 0

foreach ($pagePath in $importantPages) {
    $fullPath = Join-Path $projectRoot $pagePath
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "Skipping $pagePath - file not found" -ForegroundColor Red
        continue
    }
    
    $content = Get-Content $fullPath -Raw
    $modified = $false
    $isMarketing = $pagePath.StartsWith("marketing-site")
    
    # Determine which CSS/JS lines to use
    $cssToAdd = if ($isMarketing) { $cssLineMarketing } else { $cssLine }
    $jsToAdd = if ($isMarketing) { $jsLineMarketing } else { $jsLine }
    
    # Add CSS after favicon
    if ($content -match '(<link rel="icon"[^>]+>)' -and $content -notmatch 'loading-spinner\.css') {
        $content = $content -replace '(<link rel="icon"[^>]+>)', "`$1`r`n$cssToAdd"
        $modified = $true
    }
    
    # Add JS before closing </body>
    if ($content -match '</body>' -and $content -notmatch 'loading-spinner\.js') {
        $content = $content -replace '(</body>)', "$jsToAdd`r`n`$1"
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $fullPath -Value $content -NoNewline
        Write-Host "Added to: $pagePath" -ForegroundColor Green
        $addedCount++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Added loading spinner to $addedCount important pages" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
