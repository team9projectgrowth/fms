# Vercel Deployment Checklist

Quick reference checklist for deploying to Vercel.

## ✅ Pre-Deployment Checklist

- [x] **Build works locally** - `npm run build` completes successfully
- [x] **vercel.json created** - Configuration file for Vercel
- [x] **.vercelignore created** - Excludes unnecessary files
- [ ] **Code pushed to Git** - Repository is ready
- [ ] **Supabase credentials ready** - URL and anon key available

## 📋 Deployment Steps

### 1. Get Supabase Credentials
- [ ] Go to [Supabase Dashboard](https://app.supabase.com)
- [ ] Project: **mxrjygxhjeubisjrfmfr**
- [ ] Settings → API
- [ ] Copy **Project URL**: `https://mxrjygxhjeubisjrfmfr.supabase.co`
- [ ] Copy **anon/public key**: `eyJ...`

### 2. Deploy to Vercel

**Option A: Via Dashboard (Recommended)**
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Import your Git repository
- [ ] Configure:
  - [ ] Root Directory: `fms/fms` (if repo root is parent directory)
  - [ ] Framework: Vite (auto-detected)
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Add Environment Variables:
  - [ ] `VITE_SUPABASE_URL` = `https://mxrjygxhjeubisjrfmfr.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY` = (your anon key)
- [ ] Click "Deploy"

**Option B: Via CLI**
- [ ] Install: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel` (from `fms/fms` directory)
- [ ] Set env vars: `vercel env add VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Production: `vercel --prod`

### 3. Post-Deployment Verification
- [ ] App loads at deployment URL
- [ ] No console errors in browser DevTools
- [ ] Can navigate between pages
- [ ] Login page accessible
- [ ] Supabase connection works (check Network tab)
- [ ] Environment variables loaded correctly

### 4. Optional: Custom Domain
- [ ] Add domain in Vercel Dashboard → Settings → Domains
- [ ] Configure DNS as instructed
- [ ] Update Supabase allowed URLs (if needed)

## 🔧 Configuration Files Created

✅ `vercel.json` - Vercel deployment configuration
✅ `.vercelignore` - Files to exclude from deployment
✅ `VERCEL_DEPLOYMENT.md` - Detailed deployment guide

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check environment variables are set |
| "Failed to fetch" | Verify Supabase URL and key are correct |
| 404 on refresh | `vercel.json` rewrite rule should handle this |
| CORS errors | Check Supabase project is active and RLS policies |

## 📝 Environment Variables Needed

```
VITE_SUPABASE_URL=https://mxrjygxhjeubisjrfmfr.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🎯 Quick Commands

```bash
# Test build locally
npm run build

# Deploy via CLI
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs
```

---

**Ready to deploy?** Follow the steps in `VERCEL_DEPLOYMENT.md` for detailed instructions.

