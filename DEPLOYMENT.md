# Prept Deployment Guide — Free Tier

This guide walks you through deploying Prept for $0/month using Vercel, Neon, and Cloudflare R2.

---

## Prerequisites

- A GitHub account (to push the repo)
- Node.js 18+ installed locally
- The Prept project running locally

---

## Step 1: Push to GitHub

If your repo isn't on GitHub yet:

1. Go to github.com → **New repository**
2. Name it `prept` (or whatever you want), set it to **Private**
3. Don't initialize with README (you already have one)
4. Push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/prept.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Neon PostgreSQL (Free Database)

1. Go to **neon.tech** and sign up (GitHub login works)
2. Click **Create Project**
   - Name: `prept`
   - Region: pick the closest to you (e.g. `us-east-1`)
3. Once created, you'll see a **Connection string** like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Copy this connection string** — you'll need it in Step 4

### Push your schema to Neon

Run this locally with the Neon connection string:

```bash
DATABASE_URL="your-neon-connection-string" npx prisma db push
```

This creates all your tables. If you want seed data:

```bash
DATABASE_URL="your-neon-connection-string" npm run db:seed
```

---

## Step 3: Set Up Cloudflare R2 (Free File Storage)

This is for progress photos. If you don't need photos yet, skip this step and leave the S3 vars empty — everything else will work fine.

1. Go to **dash.cloudflare.com** and sign up
2. In the sidebar, click **R2 Object Storage**
3. Click **Create bucket**
   - Name: `prept-uploads`
   - Location: **Automatic**
4. Go to **R2 → Overview → Manage R2 API Tokens**
5. Click **Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `prept-uploads`
6. Copy these values:
   - **Access Key ID**
   - **Secret Access Key**
7. Your R2 endpoint will be: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - Find your Account ID in the Cloudflare dashboard URL or R2 overview page

### Make the bucket publicly readable (for photo URLs)

1. In your bucket settings, go to **Settings → Public access**
2. Under **Custom Domains** or **R2.dev subdomain**, enable public access
3. Copy the public URL — you'll use this to construct photo URLs

Note: Your `getFileUrl` function in `src/lib/s3.ts` builds URLs using the S3_ENDPOINT. For R2 public access, you may want to update it to use the public bucket URL instead. This is optional — presigned URLs work without it.

---

## Step 4: Deploy to Vercel

1. Go to **vercel.com** and sign up with GitHub
2. Click **Add New → Project**
3. **Import** your `prept` repository
4. Vercel will auto-detect it's a Next.js project
5. Before clicking Deploy, expand **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string from Step 2 |
| `NEXTAUTH_URL` | Leave blank for now (Vercel sets this automatically) |
| `NEXTAUTH_SECRET` | Generate one (see below) |
| `S3_BUCKET_NAME` | `prept-uploads` (or skip if no photos) |
| `S3_REGION` | `auto` |
| `S3_ACCESS_KEY_ID` | From Cloudflare R2 Step 3 |
| `S3_SECRET_ACCESS_KEY` | From Cloudflare R2 Step 3 |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |

### Generate NEXTAUTH_SECRET

Run this in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the `NEXTAUTH_SECRET` value.

6. Click **Deploy**

Vercel will run `npm run build` which triggers `prisma generate` automatically (Prisma's postinstall hook handles this). Your app will be live at `https://prept-xxxxx.vercel.app`.

---

## Step 5: Set NEXTAUTH_URL

After your first deploy:

1. Go to your Vercel project → **Settings → Domains**
2. Copy your production URL (e.g. `https://prept.vercel.app`)
3. Go to **Settings → Environment Variables**
4. Set `NEXTAUTH_URL` to your production URL
5. **Redeploy** (Deployments tab → click the three dots on the latest → Redeploy)

---

## Step 6: Add Prisma Build Step (Important)

Vercel needs to generate the Prisma client during build. Add a `postinstall` script to `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate",
  ...
}
```

If builds fail with Prisma errors, this is why. The postinstall hook ensures the Prisma client is generated before the Next.js build runs.

---

## Step 7: Create Your Account

1. Open your live URL
2. Go to `/register` and create your coach account
3. You're live!

---

## Verify Everything Works

- [ ] Can register and log in
- [ ] Dashboard loads with no errors
- [ ] Can create a client
- [ ] Can create a workout template
- [ ] Can navigate all dashboard pages
- [ ] (If R2 configured) Can upload a progress photo

---

## Custom Domain (Optional — ~$12/yr)

1. Buy a domain from **Cloudflare Registrar** or **Namecheap**
2. In Vercel → **Settings → Domains → Add**
3. Enter your domain (e.g. `app.prept.com`)
4. Vercel will give you DNS records to add at your registrar
5. Update `NEXTAUTH_URL` to your custom domain and redeploy

---

## Troubleshooting

### Build fails with "prisma: command not found"
Add `"postinstall": "prisma generate"` to your scripts in `package.json`.

### "NEXTAUTH_URL" errors or redirect loops
Make sure `NEXTAUTH_URL` exactly matches your Vercel URL, including `https://`. No trailing slash.

### Database connection errors
Check that your Neon connection string includes `?sslmode=require` at the end.

### R2 upload fails
Double check the endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (no bucket name in the endpoint). Make sure `forcePathStyle: true` is set (it already is in `src/lib/s3.ts`).

### Cold starts / slow first load
Normal on free tier. Neon scales to zero after 5 minutes of inactivity. First request after idle takes 1-3 seconds. This goes away on paid plans.

---

## Free Tier Limits Summary

| Service | Limit | What Happens When Exceeded |
|---------|-------|---------------------------|
| Vercel | 100 GB bandwidth/mo | Builds stop, need to upgrade ($20/mo) |
| Neon | 0.5 GB storage, 190 compute hrs/mo | DB goes read-only, need to upgrade ($19/mo) |
| Cloudflare R2 | 10 GB storage, 10M reads/mo | Charged at $0.015/GB/mo for overages |

For a single coach with under 20 clients, you won't come close to any of these limits.
