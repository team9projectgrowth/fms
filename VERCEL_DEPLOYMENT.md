# Vercel Deployment Guide

This guide will help you deploy your Facility Management System to Vercel.

## Prerequisites

- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ GitHub/GitLab/Bitbucket account (for Git integration)
- ✅ Supabase project credentials

## Step 1: Prepare Your Repository

### 1.1 Ensure your code is in a Git repository

```bash
cd /Users/manishgupta/team9projectlatest/fms/fms
git init  # If not already initialized
git add .
git commit -m "Prepare for Vercel deployment"
```

### 1.2 Push to GitHub/GitLab/Bitbucket

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

## Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **mxrjygxhjeubisjrfmfr**
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL**: `https://mxrjygxhjeubisjrfmfr.supabase.co`
   - **anon/public key**: (starts with `eyJ...`)

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Sign in with your GitHub/GitLab/Bitbucket account

2. **Import Your Repository**
   - Click "Import Project"
   - Select your repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Project Settings**
   - **Framework Preset**: Vite (should be auto-detected)
   - **Root Directory**: `fms/fms` (if your repo root is `/Users/manishgupta/team9projectlatest`)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `dist` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   ```
   VITE_SUPABASE_URL=https://mxrjygxhjeubisjrfmfr.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   ⚠️ **Important**: Replace `your-anon-key-here` with your actual anon key from Step 2.

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 1-2 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to your project**
   ```bash
   cd /Users/manishgupta/team9projectlatest/fms/fms
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new? → Create new
   - Project name? → (press Enter for default or enter custom name)
   - Directory? → `./` (current directory)
   - Override settings? → No

5. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   # Enter: https://mxrjygxhjeubisjrfmfr.supabase.co
   
   vercel env add VITE_SUPABASE_ANON_KEY
   # Enter: your-anon-key-here
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 4: Verify Deployment

1. **Check Build Logs**
   - Go to your project in Vercel Dashboard
   - Click on the latest deployment
   - Review build logs for any errors

2. **Test Your App**
   - Visit your deployment URL (e.g., `https://your-app.vercel.app`)
   - Test key features:
     - ✅ Homepage loads
     - ✅ Navigation works
     - ✅ Login page accessible
     - ✅ Can connect to Supabase

3. **Check Browser Console**
   - Open DevTools (F12)
   - Check for any errors related to Supabase connection
   - Verify environment variables are loaded

## Step 5: Configure Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Supabase Allowed URLs** (if using custom domain)
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your custom domain to "Site URL" and "Redirect URLs"

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel

**Error: Build command failed**
- Solution: Check build logs, ensure all dependencies are in `package.json`

### App Works but Can't Connect to Supabase

**Error: "Failed to fetch" or CORS errors**
- Solution: 
  1. Verify environment variables are set correctly in Vercel
  2. Check Supabase project is active (not paused)
  3. Verify RLS policies allow public access where needed

**Error: "Missing Supabase environment variables"**
- Solution: 
  1. Go to Vercel Dashboard → Settings → Environment Variables
  2. Ensure variables are set for "Production", "Preview", and "Development"
  3. Redeploy after adding variables

### Routing Issues

Since your app uses hash-based routing (`#/page`), it should work out of the box. The `vercel.json` file includes a rewrite rule to serve `index.html` for all routes.

If you encounter 404 errors on refresh:
- The `vercel.json` rewrite rule should handle this
- Verify `vercel.json` is in your repository root

## Environment Variables Reference

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon/public key |

## Post-Deployment Checklist

- [ ] App loads successfully
- [ ] Environment variables are set
- [ ] Can navigate between pages
- [ ] Login functionality works
- [ ] Can connect to Supabase
- [ ] No console errors
- [ ] Custom domain configured (if applicable)
- [ ] Supabase allowed URLs updated (if using custom domain)

## Continuous Deployment

Once connected to Git:
- ✅ Every push to `main` branch = Production deployment
- ✅ Every pull request = Preview deployment
- ✅ Automatic deployments on every commit

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Supabase Documentation](https://supabase.com/docs)

