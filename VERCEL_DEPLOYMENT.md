# Vercel deployment

This repository is deployment-ready without environment variables. The Vite
frontend is served from Vercel's CDN and all `/api/*` requests are handled by a
single Express Function in Singapore, close to the Appwrite database.

## Connect once, deploy on every push

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave the detected settings unchanged and click **Deploy**.

After that one-time connection, every push to the production branch deploys
automatically. Pull requests receive Vercel preview deployments.

The deployment settings and application configuration are committed in the
repository; no dashboard variables, build overrides, or environment files are
needed. Manifesto suggestions use the built-in local campaign-text optimizer.

## Verification

After deployment, open `/api/health`. A successful deployment returns:

```json
{"status":"ok","database":"appwrite"}
```

Local development remains available with `npm run dev`.
