# Folder, Git and Antigravity setup

## Local folder first

Download and extract `Personal_Finance_Tracker_Starter.zip`. It contains one `personal-finance-tracker` folder. Move that inner folder to a location such as `C:\Projects\personal-finance-tracker` and open it in Antigravity. Do not copy a ZIP file into an empty workspace and expect the agent to see its contents; extract it first.

You do not need to clone a repository that does not exist. This documentation folder can become the repository. If you already created an empty remote and cloned it, copy the contents of this inner folder into that clone's root, including `.gitignore` and `.env.example`; preserve the clone's `.git` directory. Do not nest `personal-finance-tracker` inside another folder of the same name unless deliberately managing a parent workspace.

## Model selection

Choose Gemini 3.8 Flash for initial review and ordinary coding if offered. Medium reasoning is the starting recommendation; High can help with complex design/debugging at greater quota cost. Choose Planning mode for the first task. Set AI Credit Overages to Never in settings where supported. Your account's selector is authoritative for actual access.

Current official docs list Gemini 4 Argon for eligible non-trial Pro users through the App/CLI/IDE extensions, while excluding it from standalone Antigravity IDE. Do not buy or switch products just to use it. Do not substitute app API keys into Antigravity expecting more subscription quota: the development-tool entitlement and runtime API billing are separate.

Read `ANTIGRAVITY_START.md` for the exact first prompt. Root `AGENTS.md` is recognised by current Antigravity rules discovery; explicitly asking the agent to read it also makes this robust across versions.

## Create the private remote later

On your Git hosting service, create an empty repository:

- Name: `personal-finance-tracker`.
- Description: `Personal finance PWA with statement reconciliation, card and EMI tracking, and a Gemini assistant.`
- Visibility: Private.
- If pushing this existing folder, leave automatic README, .gitignore and licence generation off; they can create an unnecessary divergent first commit. An open-source licence has not been selected.

In the Antigravity terminal, opened at this folder, use Git if installed:

```bash
git init
git branch -M main
git status
git add README.md AGENTS.md ANTIGRAVITY_START.md .gitignore .env.example docs fixtures
git diff --cached --stat
git diff --cached
git commit -m "docs: add finance tracker project starter"
```

The final command may ask you to configure your own Git name/email. Use your own identity. Review the staged files before committing; .gitignore is a safeguard, not a complete guarantee against adding private content under arbitrary filenames.

Then copy the actual URL shown by your new remote. Replace the placeholder below before running it:

```bash
git remote add origin YOUR_ACTUAL_PRIVATE_REPOSITORY_URL
git push -u origin main
```

If `origin` already exists, inspect `git remote -v` rather than blindly adding or replacing it. If the remote has commits, reconcile them; do not force-push over existing work. Antigravity's source-control interface or a Git desktop app can perform the same operations. A commit is local; a push publishes it to your chosen private remote. No remote operations were performed for this starter.

## Credentials later

M1 does not require credentials. For M3, frontend configuration uses the Supabase project URL and a publishable key plus correct ownership policies. Privileged keys stay on the backend. For M5, enter `GEMINI_API_KEY` and `GEMINI_MODEL` through backend secret settings. Never prefix a secret with `VITE_`, paste it into project documentation, or commit it. Google account passwords/OTPs are not needed by a coding assistant.

Supplied screenshots indicate Free Tier API setup, not verified quota, API success or redeemed developer credits. Do not activate billing as a prerequisite for writing a prototype. Verify the account/data route separately before real financial data is sent to Gemini.

## Daily development tracking

Use `docs/STATUS.md` for current truth, `docs/DECISIONS.md` for changed decisions and small Git commits for completed work. Keep one primary implementer on a milestone. Share relevant diffs or synthetic screenshots for review; this chat and your local folder do not automatically synchronise. Do not upload private financial records merely to demonstrate UI progress.
