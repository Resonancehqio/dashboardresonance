# Resonance Ops Dashboard

Live Monday standup dashboard — pulls from Jira (DEV + SF projects) and Confluence (RC space) via Netlify Functions.

## Deploy to Netlify

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Resonance ops dashboard"
git remote add origin https://github.com/YOUR_ORG/resonance-ops-dashboard.git
git push -u origin main
```

### 2. Connect to Netlify
- Go to [app.netlify.com](https://app.netlify.com)
- Click "Add new site" → "Import an existing project"
- Connect your GitHub repo
- Build settings are auto-detected from `netlify.toml`

### 3. Set Environment Variables
In Netlify: Site settings → Environment variables → Add:

| Variable | Value |
|----------|-------|
| `ATLASSIAN_EMAIL` | `sean@yourresonance.com` |
| `ATLASSIAN_TOKEN` | Sean's API token |
| `ATLASSIAN_DOMAIN` | Your Atlassian domain (e.g. `resonance-10062658.atlassian.net`) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for Confluence summaries) |

### 4. Deploy
Netlify auto-deploys on push. Your dashboard is live at `https://YOUR-SITE.netlify.app`

### Optional: Custom domain
Add `ops.resonancehq.io` as a custom domain in Netlify site settings.

## Architecture

```
Browser → Netlify CDN (index.html)
       → /.netlify/functions/jira     → Jira REST API
       → /.netlify/functions/confluence → Confluence REST API → Anthropic API (summaries)
```

All API credentials stay server-side in Netlify env vars. Nothing is sensitive in the client code.

## Project Structure

```
├── netlify.toml              # Build config
├── package.json              # Dependencies
├── public/
│   └── index.html            # Dashboard UI
└── netlify/
    └── functions/
        ├── jira.mjs           # Jira proxy function
        └── confluence.mjs     # Confluence proxy + Claude summaries
```
