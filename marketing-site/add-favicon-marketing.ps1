# Script to add favicon link to all HTML files in the marketing-site folder
# This adds <link rel="icon" type="image/png" href="favicon.png"> to all HTML files

$marketingSiteRoot = "c:\Users\rajku\OneDrive\Desktop\mindwave\marketing-site"
$faviconLine = '    <link rel="icon" type="image/png" href="favicon.png">'

# Get all HTML files in the marketing-site folder
$htmlFiles = Get-ChildItem -Path $marketingSiteRoot -Filter "*.html" -File

$updatedCount = 0
$skippedCount = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if favicon link already exists
    if ($content -match 'rel="icon"') {
        Write-Host "Skipping $($file.Name) - favicon already exists" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    # Check if file has a <head> tag
    if ($content -match '<head>') {
        # Find the position after <head> and add favicon
        # Look for common patterns after <head>
        if ($content -match '(<head>\s*\r?\n\s*<meta charset="[^"]+">)') {
            $content = $content -replace '(<head>\s*\r?\n\s*<meta charset="[^"]+">)', "`$1`r`n$faviconLine"
        }
        elseif ($content -match '(<head>\s*\r?\n\s*<meta)') {
            # If there's any meta tag, add before it
            $content = $content -replace '(<head>)(\s*\r?\n)', "`$1`$2$faviconLine`$2"
        }
        elseif ($content -match '(<head>)') {
            # Otherwise just add after <head>
            $content = $content -replace '(<head>)', "`$1`r`n$faviconLine"
        }
        
        # Save the updated content
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated $($file.Name)" -ForegroundColor Green
        $updatedCount++
    }
    else {
        Write-Host "Skipping $($file.Name) - no <head> tag found" -ForegroundColor Red
        $skippedCount++
    }
}

Write-Host "`nMarketing Site Summary:" -ForegroundColor Cyan
Write-Host "Updated: $updatedCount files" -ForegroundColor Green
Write-Host "Skipped: $skippedCount files" -ForegroundColor Yellow
