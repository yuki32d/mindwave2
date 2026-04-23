module.exports = {
  apps: [
    {
      name: 'mindwave',
      script: 'server.js',

      // ── Cluster process (Maximize available CPU cores) ────────
      instances: 'max',
      exec_mode: 'cluster',

      // ── Node.js heap size: allow up to 4GB RAM (server has 8GB, OS+MongoDB need ~3GB) ──
      // Default heap is only ~1.5GB — this lets us handle way more concurrent users
      node_args: '--max-old-space-size=4096',

      // ── Auto-restart on crash ────────────────────────────────────────────────
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '30s',

      // ── Restart if RAM goes above 5.5GB (leaves headroom for MongoDB + OS) ──
      max_memory_restart: '5500M',

      // ── Environment ──────────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 10000,
        // Tune UV threadpool for I/O heavy workloads (file uploads, crypto)
        // Default is 4 — bump to match logical cores available to the process
        UV_THREADPOOL_SIZE: '8'
      },

      // ── Logging ──────────────────────────────────────────────────────────────
      out_file: './logs/mindwave-out.log',
      error_file: './logs/mindwave-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ── Graceful shutdown ─────────────────────────────────────────────────────
      kill_timeout: 5000,
      listen_timeout: 8000
    }
  ]
};
