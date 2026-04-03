module.exports = {
  apps: [
    {
      name: "hangouttourist",
      script: "./backend/server.js",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false, // Disable watch in production
      max_memory_restart: "500M", // Restart if memory exceeds 500MB
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
