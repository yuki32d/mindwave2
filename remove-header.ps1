# Remove header and reposition back button for all faculty-create pages
$files = Get-ChildItem -Path "c:\Users\rajku\OneDrive\Desktop\mindwave" -Filter "faculty-create-*.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remove the entire header section
    $pattern1 = '        \<\!-- Header --\>[\s\S]*?\</header\>\r?\n\r?\n'
    $content = $content -replace $pattern1, ''
    
    # Update the main-header to have back button at top-left
    $pattern2 = '                \<div class="main-header"\>[\s\S]*?\</div\>'
    $replacement = '                <!-- Back Button -->
                <div style="margin-bottom: 32px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
                    <div>
                        <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">'
    
    $content = $content -replace $pattern2, $replacement
    
    # This is getting complex, let me do it differently - I'll manually edit the first file as template
    
    Write-Host "Processing: $($file.Name)"
}

Write-Host "`nNote: Manual template needed for precise layout"
