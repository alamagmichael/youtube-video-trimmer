# Deployment Guide

## Hosting on Fly.io

This guide covers deploying your YouTube Video Trimmer to Fly.io.

### Prerequisites

1. **GitHub Account** - Push your code to a GitHub repository
2. **Fly.io Account** - Sign up at [fly.io](https://fly.io)
3. **Fly CLI** - Install from [fly.io/docs/getting-started/installing-flyctl](https://fly.io/docs/getting-started/installing-flyctl/)

### Step 1: Prepare Your Repository

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

### Step 2: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 3: Authenticate with Fly.io

```bash
flyctl auth login
```

This will open a browser to authenticate. Create an API token if prompted.

### Step 4: Deploy Your App

Navigate to your project directory and run:

```bash
flyctl launch
```

This will:
- Ask for your app name (or use default from `fly.toml`)
- Detect the Dockerfile
- Create the Fly.io app

Then deploy with:

```bash
flyctl deploy
```

### Step 5: Monitor Your Deployment

Check your app status:
```bash
flyctl status
```

View logs:
```bash
flyctl logs
```

View your app live:
```bash
flyctl open
```

This will open your deployed app in the browser at `https://<your-app-name>.fly.dev`

### Step 6: Verify It Works

Once deployed, test the `/health` endpoint:
```bash
curl https://<your-app-name>.fly.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "ytDlp": true,
  "ffmpeg": true
}
```

### Updating Your App

After making changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
flyctl deploy
```

### Scaling & Configuration

Scale up your app:
```bash
flyctl scale vm shared-cpu-1x --memory 1024
```

View available options:
```bash
flyctl platform vm-sizes
```

### Troubleshooting

**App won't deploy:**
```bash
flyctl logs -n 50
```

**Free tier limits:**
- 3 shared-cpu-1x 256MB VMs
- 3GB storage
- 160GB/month data transfer

**Need more resources:**
```bash
# Upgrade to a paid account on fly.io dashboard
# Then scale as needed
```

### Custom Domain

To use a custom domain:

1. Add your domain to Fly.io:
```bash
flyctl certs create yourdomain.com
```

2. Update your DNS provider with the CNAME records provided

3. Monitor certificate:
```bash
flyctl certs list
```

### Environment Variables

If you need to add environment variables:

```bash
flyctl secrets set VARIABLE_NAME=value
```

### Rollback

If something goes wrong:

```bash
flyctl releases
flyctl releases rollback
```

## Alternative Hosting Options

### Railway.app
```bash
# Connect GitHub repo and deploy automatically
# No CLI needed - dashboard-based deployment
```

### Heroku (deprecated but still available)
```bash
# Note: Free tier removed, but process similar
```

### DigitalOcean App Platform
- Drop-in replacement for Heroku
- Deploy from GitHub with similar workflow

## Performance Tips

1. **Image optimization**: The Dockerfile uses `node:18-slim` to reduce image size
2. **Caching**: Docker layers are cached between deployments
3. **Region selection**: Deploy to region closest to your users

## Security Notes

- The CORS headers are set to `*` for convenience. In production, consider restricting to specific origins
- Keep `yt-dlp` and `ffmpeg` updated
- Monitor logs for suspicious activity

## Support

- Fly.io Docs: https://fly.io/docs/
- GitHub Issues: Add issues to your repository
