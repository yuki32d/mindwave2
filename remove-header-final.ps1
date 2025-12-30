# Remove header and reposition back button for all faculty-create pages
$files = Get-ChildItem -Path "c:\Users\rajku\OneDrive\Desktop\mindwave" -Filter "faculty-create-*.html"

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content $file.FullName -Raw
    
    # Pattern to match the entire header section through to main-header div
    $oldPattern = '(?s)\<body data-theme="dark"\>\r?\n    \<div class="app-shell"\>.*?\<div class="main-header"\>.*?\</div\>\r?\n                \</div\>'
    
    # Check if file has the old header structure
    if ($content -match '\<header class="topbar"\>') {
        # Remove header section
        $content = $content -replace '(?s)        \<\!-- Header --\>.*?\</header\>\r?\n\r?\n', ''
        
        # Replace main-header div structure
        $content = $content -replace '(?s)                \<div class="main-header"\>.*?                \</div\>', @'
                <!-- Back Button -->
                <div style="margin-bottom: 24px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px; font-weight: 500;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
'@
        
        # Extract and fix the title and description for each file
        # This part needs to preserve the unique content of each page
        
        # Save the file
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Updated"
    }
    else {
        Write-Host "  - Already updated or different structure"
    }
}

Write-Host "`nDone!"
