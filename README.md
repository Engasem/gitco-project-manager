# GITCO Project Manager — GitHub Pages Preview

## Publish
1. Create a NEW GitHub repository named `gitco-project-manager` (do not use the SunTex repository).
2. Upload `index.html` and `.nojekyll` to the repository root on the `main` branch.
3. Go to Settings → Pages → Build and deployment. Choose Deploy from a branch; select `main` and `/ (root)`; Save.
4. Wait for the published URL shown in Settings → Pages. Usually: `https://YOUR-USERNAME.github.io/gitco-project-manager/`.

## Security and limitations
This is an UNSAFE-FOR-PRODUCTION browser-only preview. GitHub Pages makes the HTML publicly accessible. It does not provide server-side authentication, cloud sync, access control, or shared file storage. Data are stored locally in each browser (localStorage and IndexedDB). Do not enter real confidential project details, employee information, customer data, or business documents. Do not assume that uploads will be accessible on another device. Do not publish credentials or API secrets.

Next development: independent Supabase project with Auth, Row Level Security, private Storage, data migration and backups, reminder scheduler, end-to-end tests.
