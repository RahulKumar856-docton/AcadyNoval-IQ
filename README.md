<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3e545d9d-2c83-4c3c-bbbd-d64e087b1a6e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Persist Data On Render (Important)

If you deploy on Render and want students/faculty from all devices to remain visible in Admin after restarts/redeploys, use a persistent disk for SQLite.

1. In Render, add a Persistent Disk and mount it (example mount path: `/var/data`).
2. Add environment variable (recommended):
   `DATABASE_PATH=/var/data/acadynova.db`
3. Redeploy the service.

Notes:
- The server reads `DATABASE_PATH`. If not set and running on Render, it defaults to `/var/data/acadynova.db`.
- Without a persistent disk, local files can be reset during redeploys.
