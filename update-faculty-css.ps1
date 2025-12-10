# PowerShell script to update remaining faculty pages with 3D design
# This script updates CSS links and adds the 3D layout structure

$pages = @(
    "faculty-classroom.html",
    "faculty-courses.html",
    "faculty-subject-manage.html",
    "faculty-create-debug.html",
    "faculty-create-fillin.html",
    "faculty-create-quiz.html",
    "faculty-create-sorter.html",
    "faculty-create-sql.html",
    "faculty-create-unjumble.html",
    "faculty-audience.html",
    "faculty-community.html",
    "faculty-git-student.html",
    "faculty-help.html",
    "faculty-settings.html",
    "faculty-setup.html"
)

foreach ($page in $pages) {
    $filePath = "c:\Users\rajku\OneDrive\Desktop\mindwave\$page"
    
    if (Test-Path $filePath) {
        Write-Host "Updating $page..." -ForegroundColor Cyan
        
        # Read content
        $content = Get-Content $filePath -Raw
        
        # Replace CSS links
        $content = $content -replace 'href="role-page\.css"', 'href="3d-depth-design.css"'
        $content = $content -replace 'href="theme\.css"', ''
        $content = $content -replace 'href="mindwave-design-system\.css"', ''
        
        # Clean up empty link tags
        $content = $content -replace '<link rel="stylesheet" href="">\r?\n\s*', ''
        
        # Write back
        Set-Content $filePath -Value $content -NoNewline
        
        Write-Host "✓ Updated $page" -ForegroundColor Green
    }
    else {
        Write-Host "✗ File not found: $page" -ForegroundColor Red
    }
}

Write-Host "`nAll pages updated! Now they use 3d-depth-design.css" -ForegroundColor Yellow
