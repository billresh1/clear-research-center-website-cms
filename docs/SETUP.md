# One-time setup: GitHub, Netlify, and CloudCannon

This guide assumes Windows and deliberately avoids command-line Git. The downloaded repository already contains its initial Git history, so the nested folders are correct and should remain exactly where they are.

## Before starting

Install **GitHub Desktop** and sign in to the GitHub account that will own the website repository. Create a CloudCannon account and keep access to the existing Netlify CLEAR project.

Do not alter the domain's DNS while performing the repository setup. The custom domain can remain attached to the existing Netlify project throughout this process.

## 1. Extract the repository ZIP

1. Download `CLEAR-Research-Center-v2-GitHub-Desktop.zip`.
2. Right-click the ZIP and select **Extract All**.
3. Open the extracted `CLEAR-Research-Center-v2` folder.
4. Confirm that it contains `src`, `scripts`, `.cloudcannon`, `cloudcannon.config.yml`, `netlify.toml`, and `package.json`.

Do not move the contents of `src` into the top level. `src/pages`, `src/content`, and the other subfolders are the intended repository structure.

## 2. Publish the prepared repository with GitHub Desktop

1. Open GitHub Desktop.
2. Select **File → Add local repository**.
3. Select the extracted `CLEAR-Research-Center-v2` folder itself—not its parent and not `src`.
4. Select **Add repository**.
5. In the top toolbar, select **Publish repository**.
6. Use the repository name `clear-research-center-website`.
7. Keep **Keep this code private** selected unless there is a reason to make the source public.
8. Select the appropriate personal account or organization, then select **Publish repository**.

GitHub Desktop should show the initial commit named **Build production CLEAR CMS website** and no uncommitted changes.

## 3. Connect the existing Netlify project to the repository

Use the existing Netlify project so that its temporary Netlify URL and custom-domain settings remain in one place.

1. Open the existing CLEAR project in Netlify.
2. Go to **Project configuration → Build & deploy → Continuous deployment → Repository**.
3. Select **Link repository**. If another repository is already connected, select **Manage repository → Link to a different repository**.
4. Choose GitHub and authorize Netlify to access `clear-research-center-website`.
5. Choose the `main` branch.
6. Confirm these build settings:

   ```text
   Build command: npm run build
   Publish directory: _site
   Base directory: leave blank
   ```

   The same settings are already stored in `netlify.toml`, including Node.js 22.

7. Trigger the first deploy.
8. Open the temporary `.netlify.app` address and check the homepage, Projects, People & Partners, INSIGHT+, and Contact pages.

Do not move the custom domain to another Netlify project. Once this existing project successfully deploys the repository, it will serve the new build under the domain already attached to it.

## 4. Connect the same repository to CloudCannon

1. In CloudCannon, create a new Site from your own files.
2. Select **GitHub** as the file source and authenticate it.
3. Install or configure the CloudCannon GitHub App so it can access `clear-research-center-website`.
4. Select the repository and use the existing `main` branch.
5. Name the Site **CLEAR Research Center — Production**.
6. Create the Site and allow it to sync and build.

The repository contains `.cloudcannon/initial-site-settings.json`. CloudCannon should therefore prefill:

```text
Static site generator: Custom / Other
Mode: Hosted
Build command: npm run build
Output path: _site
Node version: 22
```

It also contains `cloudcannon.config.yml`, which defines the page and content collections, editor fields, image-upload path, preview URLs, and visual editing regions.

## 5. Verify CloudCannon before routine use

After the first CloudCannon build:

1. Open **Main Pages → Home**.
2. Select the **Visual Editor**.
3. Confirm that page sections show yellow editable outlines when selected.
4. Open **Research → Projects → INSIGHT+** and confirm that its title, summary, and main text can be selected in the preview.
5. Open **Community → People → William G. Resh** and confirm that the structured fields appear in the Data Editor.
6. Make one harmless test change, such as adding and removing a period in a summary, then save it.
7. Confirm that the change appears as a new GitHub commit and that Netlify starts a new deploy.

## 6. Leave DNS alone during this transition

Connecting GitHub and CloudCannon does not require any GoDaddy DNS change. Netlify remains the web host. Keep all existing email-related MX, TXT, Autodiscover, SIP, and SRV records untouched. Address custom-domain or certificate issues only from Netlify's Domain management screen after the repository build is working at the temporary `.netlify.app` address.

## Recovery

The repository's Git history makes every CloudCannon edit reversible. Netlify also retains prior deploys. A manually deployable static backup is supplied separately as `CLEAR-Research-Center-v2-deploy.zip`.
