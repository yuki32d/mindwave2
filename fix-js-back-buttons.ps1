# Fix CSP violations by adding back button listeners to JS files

$jsFiles = @(
    'faculty-create-pin-answer.js',
    'faculty-create-puzzle.js',
    'faculty-create-drop-pin.js',
    'faculty-create-brainstorm.js'
)

foreach ($file in $jsFiles) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        
        # Check if back button listener already exists
        if ($content -notmatch 'backBtn') {
            # Find the first addEventListener and add back button listener before it
            $content = $content -replace "(document\.addEventListener\('DOMContentLoaded', \(\) => \{)", "`$1`n    // Back button event listener`n    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());`n"
            
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

Write-Host "`n✅ All JS files processed!"
