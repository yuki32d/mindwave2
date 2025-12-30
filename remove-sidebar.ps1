# Remove sidebar from all faculty-create pages
$files = Get-ChildItem -Path "c:\Users\rajku\OneDrive\Desktop\mindwave" -Filter "faculty-create-*.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace the layout div with sidebar with a simple centered container
    $pattern = '        <div class="layout">[\s\S]*?<!-- Sidebar -->[\s\S]*?</nav>\r?\n\r?\n            <!-- Main Content -->'
    $replacement = '
        <div style="max-width: 1400px; margin: 0 auto; padding: 24px;">
            <!-- Main Content -->'
    
    $newContent = $content -replace $pattern, $replacement
    
    # Save the file
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
    
    Write-Host "Updated: $($file.Name)"
}

Write-Host "`nAll files updated successfully!"
