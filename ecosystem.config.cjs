module.exports = {
  apps: [
    {
      name: 'mindwave',
      script: 'server.js',

      // ── Cluster mode: uses ALL CPU cores on the server ──────────────────────
      // On a 4-core server this gives you 4x capacity vs single process.
      // NOTE: Socket.IO requires sticky sessions when using cluster mode.
      // If you see WebSocket disconnects, switch instances back to 1.
      instances: 1,           // Start with 1 — change to 'max' once confirmed stable
      exec_mode: 'fork',      // Use 'cluster' only after testing sticky sessions

      // ── Auto-restart on crash ────────────────────────────────────────────────
      autorestart: true,
      watch: false,           // Don't watch files in production
      max_restarts: 10,       // Give up after 10 rapid crashes
      min_uptime: '10s',      // Must be alive 10s to count as a stable start

      // ── Memory limit — restart if RAM exceeds this ───────────────────────────
      max_memory_restart: '800M',  // Restart if Node.js consumes > 800MB RAM

      // ── Environment ──────────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 8081
      },

      // ── Logging ──────────────────────────────────────────────────────────────
      out_file: './logs/mindwave-out.log',
      error_file: './logs/mindwave-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Graceful shutdown ─────────────────────────────────────────────────────
      kill_timeout: 5000,     // Wait 5s for connections to drain before force-kill
      listen_timeout: 8000    // Wait 8s for app to start listening
    }
  ]
};
