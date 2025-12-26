# Remove loading spinner from all HTML files
$projectRoot = "c:\Users\rajku\OneDrive\Desktop\mindwave"

# Get all HTML files
$allHtmlFiles = Get-ChildItem -Path $projectRoot -Filter "*.html" -File -Recurse

$removedCount = 0

foreach ($file in $allHtmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Remove loading-spinner.css link
    if ($content -match '<link[^>]*loading-spinner\.css[^>]*>') {
        $content = $content -replace '\s*<link[^>]*loading-spinner\.css[^>]*>\r?\n?', ''
        $modified = $true
    }
    
    # Remove loading-spinner.js script
    if ($content -match '<script[^>]*loading-spinner\.js[^>]*></script>') {
        $content = $content -replace '\s*<script[^>]*loading-spinner\.js[^>]*></script>\r?\n?', ''
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Removed from: $($file.Name)" -ForegroundColor Yellow
        $removedCount++
    }
}

Write-Host "`nRemoved loading spinner from $removedCount files" -ForegroundColor Green
