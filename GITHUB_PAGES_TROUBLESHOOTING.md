# GitHub Pages Deployment Troubleshooting

## Common Issues and Solutions

### 1. Blank Screen After Deployment

**Possible Causes:**

#### A. Missing Environment Variables
- **Symptom**: Blank screen, no console errors
- **Solution**: 
  1. Go to GitHub repo → Settings → Secrets and variables → Actions
  2. Add these secrets:
     - `VITE_SUPABASE_URL` (your Supabase project URL)
     - `VITE_SUPABASE_ANON_KEY` (your Supabase anon key)
  3. Re-run the GitHub Actions workflow

#### B. JavaScript Errors
- **Symptom**: Blank screen with console errors
- **Solution**: 
  1. Open browser DevTools (F12)
  2. Check Console tab for errors
  3. Check Network tab for failed asset loads
  4. Common issues:
     - Asset paths incorrect (check if `/sunny/` prefix is missing)
     - CORS errors (check Supabase settings)
     - Module loading errors

#### C. Routing Issues
- **Symptom**: App loads but routes don't work
- **Solution**: 
  - The `404.html` file handles SPA routing
  - Make sure it's in the `public/` folder
  - Vite will copy it to `dist/` during build

### 2. How to Debug

1. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for red error messages
   - Check if Supabase client is initialized

2. **Check Network Tab**:
   - Look for failed requests (red status codes)
   - Check if assets are loading from `/sunny/` path

3. **Check GitHub Actions Logs**:
   - Go to Actions tab in your repo
   - Click on the latest workflow run
   - Check if build succeeded
   - Look for any warnings or errors

4. **Verify Environment Variables**:
   - Check if secrets are set correctly
   - Make sure they don't have extra spaces or quotes
   - Values should match your `.env` file locally

### 3. Quick Fixes

**If assets aren't loading:**
- Verify `base: '/sunny/'` in `vite.config.js`
- Verify `basename: '/sunny'` in `src/router.jsx`

**If routes don't work:**
- Make sure `public/404.html` exists
- Verify it's copied to `dist/` during build

**If Supabase connection fails:**
- Check environment variables are set in GitHub Secrets
- Verify Supabase project is active
- Check browser console for CORS errors

### 4. Testing Locally Before Deploy

Test the production build locally:

```bash
npm run build
npm run preview
```

Then visit `http://localhost:4173/sunny/` to test if routing works.

### 5. Manual Verification Checklist

- [ ] Environment variables set in GitHub Secrets
- [ ] `vite.config.js` has `base: '/sunny/'`
- [ ] `src/router.jsx` has `basename: '/sunny'`
- [ ] `public/404.html` exists
- [ ] GitHub Actions workflow runs successfully
- [ ] GitHub Pages is enabled (Settings → Pages → Source: GitHub Actions)
- [ ] Browser console shows no errors
- [ ] Network tab shows assets loading correctly

