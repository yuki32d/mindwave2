# PowerShell Script to Add Loading Spinner to All HTML Files
# Adds loading-spinner.css and loading-spinner.js to all HTML files
# Automatically detects theme based on folder location

$projectRoot = "c:\Users\rajku\OneDrive\Desktop\mindwave"
$marketingSiteFolder = "marketing-site"

# CSS and JS lines to add
$cssLine = '    <link rel="stylesheet" href="loading-spinner.css">'
$cssLineMarketing = '    <link rel="stylesheet" href="../loading-spinner.css">'
$jsLine = '    <script src="loading-spinner.js"></script>'
$jsLineMarketing = '    <script src="../loading-spinner.js"></script>'

# Get all HTML files in project root
$htmlFiles = Get-ChildItem -Path $projectRoot -Filter "*.html" -File

$updatedCount = 0
$skippedCount = 0

Write-Host "`nProcessing Main Project HTML Files..." -ForegroundColor Cyan

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Skip if already has loading-spinner
    if ($content -match 'loading-spinner') {
        Write-Host "Skipping $($file.Name) - already has loading spinner" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    # Add CSS after favicon or after first meta tag
    if ($content -match '(<link rel="icon"[^>]+>)') {
        $content = $content -replace '(<link rel="icon"[^>]+>)', "`$1`r`n$cssLine"
        $modified = $true
    }
    elseif ($content -match '(<meta name="viewport"[^>]+>)') {
        $content = $content -replace '(<meta name="viewport"[^>]+>)', "`$1`r`n$cssLine"
        $modified = $true
    }
    
    # Add JS before closing </body>
    if ($content -match '</body>') {
        $content = $content -replace '(</body>)', "$jsLine`r`n`$1"
        $modified = $true
    }
    
    # Add data-theme="dark" to body tag if not present
    if ($content -match '<body(?![^>]*data-theme)') {
        $content = $content -replace '<body', '<body data-theme="dark"'
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)" -ForegroundColor Green
        $updatedCount++
    }
    else {
        Write-Host "Skipping $($file.Name) - no suitable location found" -ForegroundColor Red
        $skippedCount++
    }
}

# Process marketing site files
Write-Host "`nProcessing Marketing Site HTML Files..." -ForegroundColor Cyan

$marketingPath = Join-Path $projectRoot $marketingSiteFolder
if (Test-Path $marketingPath) {
    $marketingFiles = Get-ChildItem -Path $marketingPath -Filter "*.html" -File
    
    foreach ($file in $marketingFiles) {
        $content = Get-Content $file.FullName -Raw
        $modified = $false
        
        # Skip if already has loading-spinner
        if ($content -match 'loading-spinner') {
            Write-Host "Skipping $($file.Name) - already has loading spinner" -ForegroundColor Yellow
            $skippedCount++
            continue
        }
        
        # Add CSS after favicon or after first meta tag
        if ($content -match '(<link rel="icon"[^>]+>)') {
            $content = $content -replace '(<link rel="icon"[^>]+>)', "`$1`r`n$cssLineMarketing"
            $modified = $true
        }
        elseif ($content -match '(<meta name="viewport"[^>]+>)') {
            $content = $content -replace '(<meta name="viewport"[^>]+>)', "`$1`r`n$cssLineMarketing"
            $modified = $true
        }
        
        # Add JS before closing </body>
        if ($content -match '</body>') {
            $content = $content -replace '(</body>)', "$jsLineMarketing`r`n`$1"
            $modified = $true
        }
        
        # Add data-theme="light" to body tag if not present
        if ($content -match '<body(?![^>]*data-theme)') {
            $content = $content -replace '<body', '<body data-theme="light"'
            $modified = $true
        }
        
        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "Updated $($file.Name)" -ForegroundColor Green
            $updatedCount++
        }
        else {
            Write-Host "Skipping $($file.Name) - no suitable location found" -ForegroundColor Red
            $skippedCount++
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Loading Spinner Integration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Updated: $updatedCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount files" -ForegroundColor Yellow
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Test on a few pages to verify loader appears correctly" -ForegroundColor White
Write-Host "2. Open browser console and test: MindWaveLoader.show()" -ForegroundColor White
Write-Host "3. Push changes to Git when satisfied" -ForegroundColor White
