# Launch checklist

## Repository and builds

- [ ] Repository published to GitHub on the `main` branch
- [ ] GitHub Actions validation passes
- [ ] Existing Netlify project linked to the repository
- [ ] Netlify build command is `npm run build`
- [ ] Netlify publish directory is `_site`
- [ ] Temporary `.netlify.app` site passes review
- [ ] CloudCannon Site connected to the same repository and branch
- [ ] CloudCannon Visual Editor shows editable regions
- [ ] A test CloudCannon edit produces a GitHub commit and Netlify deploy

## Content review

- [ ] Director title, office, phone, and email confirmed
- [ ] Fellows and affiliations reviewed
- [ ] Partner descriptions and external URLs reviewed
- [ ] Publication citations and destinations reviewed
- [ ] BookMarked archive links reviewed
- [ ] INSIGHT+ destination and codebook links reviewed
- [ ] Privacy, legal, and accessibility links approved

## Custom domain

- [ ] Both bare and `www` domains listed in the same Netlify project
- [ ] Netlify DNS verification succeeds
- [ ] Certificate covers both domain forms
- [ ] Preferred domain redirects correctly
- [ ] GoDaddy email-related records remain unchanged

## Final QA

- [ ] Homepage tested on desktop and phone
- [ ] Mobile navigation opens, closes, and responds to Escape
- [ ] Project and resource filters work
- [ ] Search returns expected results
- [ ] Contact links work
- [ ] No missing images or broken local links
- [ ] Keyboard focus is visible
- [ ] Page titles and descriptions are present
