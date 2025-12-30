# Add back button event listeners to slide HTML files

$slideFiles = @(
    'faculty-create-slide-classic.html',
    'faculty-create-slide-title-text.html',
    'faculty-create-slide-bullets.html',
    'faculty-create-slide-quote.html',
    'faculty-create-slide-big-media.html'
)

foreach ($file in $slideFiles) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        
        # Check if back button listener already exists
        if ($content -notmatch 'backBtn.*addEventListener') {
            # Find the DOMContentLoaded and add back button listener
            $content = $content -replace "(document\.addEventListener\('DOMContentLoaded', \(\) => \{)", "`$1`n            // Back button event listener`n            document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());`n"
            
            Set-Content -Path $path -Value $content -NoNewline
            Write-Host "✅ Fixed $file"
        }
        else {
            Write-Host "⏭️  $file already has back button listener"
        }
    }
    else {
        Write-Host "❌ $file not found"
    }
}

Write-Host "`n✅ All slide HTML files processed!"
