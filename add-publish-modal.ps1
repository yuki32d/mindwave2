# Script to Add Publish Modal to All Faculty Game Creation Pages
# This PowerShell script adds the publish modal to all faculty-create-*.html files

$files = Get-ChildItem -Path "." -Filter "faculty-create-*.html" | Where-Object { $_.Name -ne "faculty-create-quiz.html" }

$cssLink = '    <link rel="stylesheet" href="publish-modal.css">'
$scriptTag = '    <script src="publish-modal.js"></script>'

$modalHTML = @'
    <!-- Publish Modal -->
    <div id="publishModal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2>📢 Publish Game</h2>
                <button class="close-btn" onclick="closePublishModal()">×</button>
            </div>
            
            <div class="modal-body">
                <p>Select which classes should have access to this game:</p>
                
                <div class="form-group">
                    <label for="modalTargetClasses">Target Classes *</label>
                    <select id="modalTargetClasses" multiple style="height: 200px; width: 100%;">
                        <!-- Populated dynamically from /api/faculty/classes -->
                    </select>
                    <small>Hold Ctrl/Cmd to select multiple classes</small>
                </div>
                
                <div class="form-group" style="margin-top: 15px;">
                    <label>
                        <input type="checkbox" id="modalIsPublic">
                        Make available to all departments
                    </label>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closePublishModal()">Cancel</button>
                <button class="btn-primary" onclick="confirmPublish()">Publish Game</button>
            </div>
        </div>
    </div>

'@

foreach ($file in $files) {
    Write-Host "Processing: $($file.Name)"
    
    $content = Get-Content $file.FullName -Raw
    
    # Check if already has modal
    if ($content -match "publish-modal.css") {
        Write-Host "  ✓ Already has modal, skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Add CSS link in <head> after 3d-depth-design.css
    if ($content -match '(<link rel="stylesheet" href="3d-depth-design.css">)') {
        $content = $content -replace '(<link rel="stylesheet" href="3d-depth-design.css">)', "`$1`r`n$cssLink"
        Write-Host "  ✓ Added CSS link" -ForegroundColor Green
    }
    
    # Add modal HTML before </body>
    if ($content -match '(\s*</body>)') {
        $content = $content -replace '(\s*</body>)', "$modalHTML`$1"
        Write-Host "  ✓ Added modal HTML" -ForegroundColor Green
    }
    
    # Add script tag before existing script
    if ($content -match '(\s*<script src="faculty-create-[^"]+\.js">)') {
        $content = $content -replace '(\s*<script src="faculty-create-[^"]+\.js">)', "$scriptTag`r`n`$1"
        Write-Host "  ✓ Added script tag" -ForegroundColor Green
    }
    
    # Save the file
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  ✅ Completed: $($file.Name)" -ForegroundColor Cyan
}

Write-Host "`n✅ All files processed!" -ForegroundColor Green
Write-Host "Note: You still need to update each .js file to call showPublishModal() and add publishGameWithClasses()" -ForegroundColor Yellow
