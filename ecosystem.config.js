module.exports = {
  apps: [
    {
      name: "jambistoreweb",
      cwd: "/home/ubuntu/jambistore-app",
      script: "npm",
      args: "run start -- -p 3000 -H 0.0.0.0",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://3.26.221.95:3000",
        DISCORD_REDIRECT_URI: "http://3.26.221.95:3000/api/auth/discord/callback",
        DISCORD_SIGNIN_REDIRECT_URI: "http://3.26.221.95:3000/api/auth/discord/signin-callback",
        DISCORD_CLIENT_ID: "1387527549365518387",
        DISCORD_CLIENT_SECRET: "0hXoS7-8AL15ZOQJw8TjbMVgwyvKM92y",
        // Add other env vars as needed
      }
    },
    {
      name: "jambistorebot",
      cwd: "/home/ubuntu/jambistore-app/bot/bot",
      script: "node",
      args: "index.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
