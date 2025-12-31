// Simple HTTP server for Jitsi Meet
const express = require('express');
const path = require('path');

const app = express();
const PORT = 8443;

// Serve static files from jitsi-meet-app directory
app.use(express.static(path.join(__dirname, 'jitsi-meet-app')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'jitsi-meet-app', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🎉 Jitsi Meet is running!`);
    console.log(`\n📱 Open in browser: http://localhost:${PORT}`);
    console.log(`\n✅ 100% free, unlimited participants, no authentication!\n`);
});
