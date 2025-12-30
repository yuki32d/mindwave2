// Reusable Live Session Modal Functions
// Add these functions to any faculty creation JS file

function showSuccessModal(activityId, activityTitle) {
    const modalHTML = `
        <div id="successModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                    <h2 style="color: #f5f7ff; margin: 0 0 8px; font-size: 28px;">Activity Created!</h2>
                    <p style="color: #9ea4b6; margin: 0;">${activityTitle}</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="startLiveBtn" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer; transition: transform 0.2s;">
                        🎮 Start Live Session
                    </button>
                    <button id="viewDashboardBtn" class="secondary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f5f7ff; cursor: pointer; transition: all 0.2s;">
                        📊 View Dashboard
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('startLiveBtn').addEventListener('click', () => startLiveSession(activityId));
    document.getElementById('viewDashboardBtn').addEventListener('click', () => {
        window.location.href = 'interactive-tools-selector.html';
    });

    const startBtn = document.getElementById('startLiveBtn');
    startBtn.addEventListener('mouseenter', () => {
        startBtn.style.transform = 'translateY(-2px)';
        startBtn.style.boxShadow = '0 8px 24px rgba(0, 217, 255, 0.4)';
    });
    startBtn.addEventListener('mouseleave', () => {
        startBtn.style.transform = 'translateY(0)';
        startBtn.style.boxShadow = 'none';
    });
}

async function startLiveSession(activityId) {
    try {
        const response = await fetch(`/api/live-sessions/${activityId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            showLiveSessionCode(result.session);
        } else {
            throw new Error('Failed to start live session');
        }
    } catch (error) {
        console.error('Error starting live session:', error);
        alert('❌ Error starting live session. Please try again.');
    }
}

function showLiveSessionCode(session) {
    document.getElementById('successModal')?.remove();

    const modalHTML = `
        <div id="liveSessionModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 48px; max-width: 600px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center;">
                <div style="font-size: 64px; margin-bottom: 24px;">🎮</div>
                <h2 style="color: #f5f7ff; margin: 0 0 12px; font-size: 32px;">Live Session Started!</h2>
                <p style="color: #9ea4b6; margin: 0 0 32px; font-size: 16px;">Share this code with your students</p>
                
                <div style="background: rgba(0, 217, 255, 0.1); border: 2px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 32px; margin-bottom: 32px;">
                    <div style="font-size: 72px; font-weight: 700; letter-spacing: 16px; color: #00d9ff; font-family: 'Courier New', monospace;">${session.code}</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #9ea4b6;">Activity:</span>
                        <span style="color: #f5f7ff; font-weight: 600;">${session.activityTitle}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #9ea4b6;">Type:</span>
                        <span style="color: #f5f7ff;">${session.activityType}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #9ea4b6;">Status:</span>
                        <span style="color: #10b981; font-weight: 600;">● Active</span>
                    </div>
                </div>
                
                <p style="color: #9ea4b6; font-size: 14px; margin-bottom: 24px;">
                    Students can join by entering this code on their Live Activity page
                </p>
                
                <button id="closeLiveModal" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Done
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('closeLiveModal').addEventListener('click', () => {
        window.location.href = 'interactive-tools-selector.html';
    });
}
