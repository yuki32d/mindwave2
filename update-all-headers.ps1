# Remove header from all faculty-create pages - Simple approach
$files = Get-ChildItem -Path "c:\Users\rajku\OneDrive\Desktop\mindwave" -Filter "faculty-create-*.html" | Where-Object { $_.Name -ne "faculty-create-type-answer.html" }

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    $content = Get-Content $file.FullName -Raw
    
    # Check if file has the old header structure
    if ($content -notmatch '\<header class="topbar"\>') {
        Write-Host "  - Already updated"
        continue
    }
    
    # Step 1: Remove header
    $content = $content -replace '(?s)        \<\!-- Header --\>.*?\</header\>\r?\n\r?\n', ''
    
    # Step 2: Extract title, description, and button text
    if ($content -match '\<h1[^>]*\>(.*?)\</h1\>') {
        $title = $matches[1]
    }
    else {
        $title = "Create Tool"
    }
    
    if ($content -match '\<div class="main-header"\>[\s\S]*?\<p\>(.*?)\</p\>') {
        $description = $matches[1]
    }
    else {
        $description = "Create your tool"
    }
    
    if ($content -match '\<button class="primary-btn" id="publishBtn"\>([^<]+)\</button\>') {
        $publishText = $matches[1]
    }
    else {
        $publishText = "🚀 Publish"
    }
    
    # Step 3: Replace main-header div
    $newHeader = @"
                <!-- Back Button -->
                <div style="margin-bottom: 24px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px; font-weight: 500;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: #f5f7ff;">$title</h1>
                        <p style="color: #9ea4b6; font-size: 16px;">$description</p>
                    </div>
                    <div>
                        <button class="primary-btn" id="publishBtn">$publishText</button>
                    </div>
                </div>
"@
    
    $content = $content -replace '(?s)                \<div class="main-header"\>.*?                \</div\>', $newHeader
    
    # Save
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  ✓ Updated"
}

Write-Host "`nAll files updated!"
