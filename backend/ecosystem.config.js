module.exports = {
  apps: [
    {
      name: 'cethub-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
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
