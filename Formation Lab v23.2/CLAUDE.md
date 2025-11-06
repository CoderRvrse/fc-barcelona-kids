# Formation Lab v23.2 Deployment Notes

Use these steps whenever you need to replace the currently hosted Formation Lab with the new v23.2 build from this folder.

1. **Prep the repo**
   - Pull the latest `main` from GitHub: `git checkout main && git pull`.
   - Make sure the entire `Formation Lab v23.2/` directory exists; it contains the built assets plus sources.

2. **Clean out the old app on hosting**
   - Back up the existing Formation Lab folder on the server (zip/tar or rename it to `formation-lab-old`).
   - Remove the published assets so the new files drop in cleanly (clear CDN cache if there is one).

3. **Publish v23.2**
   - Copy the fresh `Formation Lab v23.2/dist` output into the hosting location that previously served the old Formation Lab.
   - If the host expects the project root rather than `dist`, mirror the repo structure and point the site root to `index.html`.

4. **Smoke-test**
   - Load the hosted URL, confirm pitch rendering, drag/drop, export, and preset loading.
   - Run the in-repo audit script if time allows: `cd "Formation Lab v23.2" && npm install && npm run audit`.

5. **Commit + push for the team**
   - `git add "Formation Lab v23.2"` plus any other touched files, then `git commit -m "chore: add Formation Lab v23.2 deployment notes"` (update message if you change code).
   - `git push origin main` so everyone shares the same folder and docs.

6. **Update references**
   - Wherever the old Formation Lab was linked (README, docs, CMS, etc.), point those links to the new deployment URL.
   - Let the team know that v23.2 is live and where to file issues.

That’s it—once these steps are done the environment is running the refreshed Formation Lab v23.2 build.
