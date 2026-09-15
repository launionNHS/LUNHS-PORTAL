LUNHS School Portal v6

UPLOAD TO GITHUB
1. Extract this ZIP.
2. Upload index.html, styles.css, config.js, app.js, and lunhs-logo.png to the ROOT of the GitHub repository named lunhs.
3. Commit the changes.
4. GitHub > repository Settings > Pages > Deploy from branch > main > /(root).
5. Wait for deployment, then refresh the site with Ctrl+F5.

LOGIN
Use the email/password created in Supabase Authentication.
ADMIN-001 is the internal school ID, not the login username.

SECURITY
config.js contains only a browser-safe publishable key.
Never put a Supabase secret/service_role key in GitHub or browser JavaScript.
