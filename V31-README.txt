LUNHS PORTAL v31 — SCHOOL INFORMATION SYSTEM

Base: v30.3 (user's v30.1 design + portrait/PWA fixes).

Implemented:
• True mobile bottom navigation for portrait phones
• PWA splash screen and installability retained
• Student profile/grade summary area and notification area
• Teacher gradebook search, CSV export and print
• School Calendar
• Learning Resources Center
• Achievements page
• Facilities / Virtual Tour page
• Global content search
• School Management Center
• Admin publishing forms for events/resources/achievements/facilities
• Emergency banner database/control foundation
• Existing MPS analytics, accounts, password management, publications and Media Hub retained
• facebook_url migration included

SETUP:
1. FIRST run V31-UPGRADE.sql in Supabase SQL Editor.
2. Upload/replace all website files to GitHub LUNHS-PORTAL.
3. Wait for GitHub Pages deployment.
4. Refresh once on phones / reopen installed app.

NOTE:
Website statistics and true push notifications require an analytics/push provider and consent/configuration. This package provides the portal notification area and the rest of the requested school-system upgrades without exposing secret keys.
