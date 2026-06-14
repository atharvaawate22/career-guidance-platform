// PM2 process config. This is only used if you start the app via
// `npm run start:prod` (PM2) — typically on a self-managed VPS. On Render the
// service is started with the plain `node dist/server.js` start command and PM2
// is not involved.
//
// IMPORTANT: `instances: 'max'` (cluster mode) is intentionally avoided here.
// On a small shared host (e.g. Render free: 0.1 CPU / 512 MB) PM2 would detect
// the *host's* core count and fork that many Node processes, each loading the
// full app — instantly exhausting 512 MB and triggering an OOM restart loop.
// A single process is correct for a low-CPU instance; scale by upgrading the
// instance or running more replicas at the platform level, not via cluster mode.
module.exports = {
  apps: [
    {
      name: 'cethub-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      // Keep below the 512 MB free-tier ceiling so a leak restarts cleanly
      // instead of being hard-killed by the platform.
      max_memory_restart: '450M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
