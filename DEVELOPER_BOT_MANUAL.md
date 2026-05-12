# Developer Bot Operating Manual

Version: 2026-05-12
Applies to: Load Tasks site, DssOrit/ancient-covenant-scrolls

---

## What is the Developer Bot?

The Developer Bot is a set of tools inside Load Tasks that helps you make safe, controlled changes to files in this repo.

It does not change anything automatically. Every step requires you to read a report and decide what to do next. Nothing merges or deploys without your direct approval.

The bot gives you:

- A guided form for building a change request (the job file)
- Automated validation and safety checks via GitHub Actions
- A draft PR you review and approve before anything touches the live site
- Plain-language risk warnings at every step

---

## The Five Pipeline Phases (2A through 2E)

These are the five GitHub Actions workflows that make up the pipeline.

### 2A — Job File Template (manual step)

You write a JSON file called `repo-file-job.json` and place it in the `loadtasks-inbox/` folder. This is your change request. Nothing runs until you do this.

### 2B — Packet Generator

Workflow name: **Repo File Worker - Packet Generator**

What it does: reads the job file and bundles a packet containing the current file snapshots, a patch plan, a PR draft, and a rollback plan. Downloads as a zip artifact. Does not change any files.

### 2C1 — PR Prep Validate

Workflow name: **Repo File Worker - PR Prep Validate**

What it does: checks the job file for required fields, classifies the risk level, verifies the target files exist in the repo, and checks that your declared risk matches the auto-classified risk. Produces a validation report and a branch name preview. Does not change any files.

Runs automatically when you push `loadtasks-inbox/repo-file-job.json`. Can also be run manually.

### 2C2 — Branch Create

Workflow name: **Repo File Worker - Branch Create**

What it does: runs all the same checks as 2C1, then creates a new branch off `main` if all checks pass. Does not edit any files.

Run this manually after 2C1 gives a clean report.

### 2C3 — PR Create

Workflow name: **Repo File Worker - PR Create**

What it does: opens a draft pull request from the branch created in 2C2. The PR contains all the job details from the job file. Does not edit any files. Does not merge anything.

Run this manually after 2C2 succeeds.

### 2D — File Edit

Workflow name: **Repo File Worker - File Edit**

What it does: makes the actual change to the target file on the feature branch. Runs the same safety checks as 2C1. Can be blocked by risk level (HIGH requires `highRiskOverride: true`).

Run this manually, on the feature branch, after you have confirmed the draft PR looks correct.

### 2E — Validation / Approval Gate

This is the human review step. After 2D runs, you review the file diff in the draft PR. When you are satisfied, you mark the PR ready for review and merge it yourself. No workflow merges the PR automatically.

---

## The Job File

The job file is a plain JSON file. Save it as `loadtasks-inbox/repo-file-job.json`.

### Required fields

| Field | What to put |
|---|---|
| `jobId` | A unique ID for this job, e.g. `RFJ-MYCHANGE-001` |
| `targetSite` | Which site this change is for, e.g. `LoadTasks` |
| `targetFiles` | Path to the file you want to change, e.g. `LoadTasks/index.html` |
| `fileAction` | What you are doing: `edit`, `add`, or `delete` |
| `riskLevel` | Your declared risk: `LOW`, `MEDIUM`, or `HIGH` |
| `proposedChangeSummary` | One or two sentences describing what you are changing and why |
| `acceptanceCriteria` | How you will confirm the change worked |
| `rollbackPlan` | The command to undo this change if it goes wrong |
| `status` | Set to `approved` when you are ready to run the pipeline |
| `userApprovalRequired` | Always set to `Yes` |

### Optional fields

| Field | What to put |
|---|---|
| `patchMode` | How 2D should apply the change: `replace-block`, `append`, or `prepend` |
| `targetAnchor` | The exact text in the file that marks where the change goes |
| `patchContent` | The new text to insert |
| `branchNameSuggestion` | Preferred branch name, e.g. `rfw/my-change-YYYY-MM-DD` |
| `prTitleSuggestion` | Preferred PR title |
| `highRiskOverride` | Set to `true` only if the auto-risk is HIGH and you have reviewed the Do Not Touch rules |

### Example job file

```json
{
  "jobId": "RFJ-MYCHANGE-001",
  "targetSite": "LoadTasks",
  "targetFiles": "LoadTasks/index.html",
  "fileAction": "edit",
  "riskLevel": "MEDIUM",
  "status": "approved",
  "userApprovalRequired": "Yes",
  "proposedChangeSummary": "Add a new label to the help panel.",
  "acceptanceCriteria": "Label appears on iPad. No other panels affected.",
  "rollbackPlan": "git revert <merge-sha> --no-edit",
  "patchMode": "replace-block",
  "targetAnchor": "</article>",
  "patchContent": "<p>New label text here.</p>\n</article>",
  "branchNameSuggestion": "rfw/add-help-label-YYYY-MM-DD"
}
```

---

## Step-by-Step: Making a Change

Follow these steps in order. Do not skip ahead.

**Step 1. Use the Safe File Picker**

Open Load Tasks. Go to Safe File Picker. Find the file you want to change. Check the risk level shown. If the risk is HIGH, read the Do Not Touch panel before continuing.

**Step 2. Use the Guided Bot Flow (optional)**

Go to Guided Bot Flow. It walks you through filling in every required field. Switch to Beginner Mode if you want plain-language hints. When done, copy the generated JSON.

**Step 3. Write the job file**

Paste the JSON into `loadtasks-inbox/repo-file-job.json`. Push it to the `main` branch. This triggers the 2C1 validation workflow automatically.

**Step 4. Check the 2C1 validation report**

Go to GitHub. Open the Actions tab. Find the **Repo File Worker - PR Prep Validate** run. Click it. Download the artifact zip. Open `validation-report.txt`. Look for the VERDICT line.

- SAFE TO PROCEED: continue to Step 5.
- BLOCKED: fix the listed problems in the job file and push again.

**Step 5. Run 2C2 — Branch Create**

Go to Actions. Find **Repo File Worker - Branch Create**. Click Run workflow. Wait for it to finish. Check the artifact report. If it says BRANCH CREATED, continue.

**Step 6. Run 2C3 — PR Create**

Go to Actions. Find **Repo File Worker - PR Create**. Click Run workflow. Wait for it to finish. Check the report for the PR URL. Open the PR on GitHub.

**Step 7. Review the draft PR**

Use the PR Review Coach in Load Tasks. Work through every checklist item. Do not merge until all critical items are confirmed.

**Step 8. Run 2D — File Edit** (optional, if the PR does not already include the edit)

Go to Actions. Find **Repo File Worker - File Edit**. Run it on the feature branch. Check the run log. Confirm the file was changed correctly by looking at the PR diff.

**Step 9. You merge the PR**

When you are satisfied, mark the PR as ready for review on GitHub. Merge it yourself. Do not rely on auto-merge.

---

## How to Run a Workflow

1. Go to GitHub.com and open the repository.
2. Click the **Actions** tab at the top.
3. In the left sidebar, find the workflow you want to run.
4. Click it.
5. Click the **Run workflow** button on the right.
6. Leave the inputs at their defaults unless you have a specific job file path.
7. Click **Run workflow** to confirm.
8. Wait for the run to finish. Green = passed. Red = failed.

---

## How to Review an Actions Run

1. Go to the **Actions** tab.
2. Click the workflow run you want to check.
3. Click the job name to see the full log.
4. Scroll down to the Python step output. Look for the VERDICT line.
5. If there is an artifact, click **Artifacts** at the bottom of the run page. Download and open the zip to read the full report.

Common things to look for:

- BLOCKED lines list each reason the run was stopped.
- SAFE TO PROCEED means all checks passed.
- A red X on the run means the workflow exited with an error. Check the log for the Python error message.

---

## How to Review a Draft PR

1. Open the PR on GitHub.
2. Click the **Files changed** tab. Read every line that changed.
3. Check that only the files listed in the job file are in the diff.
4. Open Load Tasks. Go to PR Review Coach. Complete the checklist.
5. If all critical items are confirmed, mark the PR ready for review.
6. Merge the PR yourself.

---

## How to Rollback Safely

If a change caused a problem after merging:

**Step 1. Do not panic. The change can be reversed.**

**Step 2. Get the merge SHA.**

Go to the merged PR on GitHub. Find the merge commit SHA in the activity log at the bottom. It looks like `a38318bb`.

**Step 3. Use the Rollback Command Builder.**

Open Load Tasks. Go to Rollback Command Builder. Enter the merge SHA, the branch name, and the PR number. Copy the generated revert commands.

**Step 4. Run the revert commands in your terminal.**

The commands create a new branch with the revert, which you then push and merge via a new PR. This does not directly touch `main`.

**Step 5. Close the original PR and delete the branch.**

If the original PR is still open, close it. After the revert lands, delete the feature branch.

**Step 6. If SW or cached files were changed, bump the cache version.**

A lower cache number can leave the broken version cached on devices. Always go forward, never backward.

---

## Protected Areas — Do Not Touch

These files and paths are HIGH risk. The pipeline will block any job targeting them unless you add `highRiskOverride: true` and have a very clear reason.

| Area | Why it is protected |
|---|---|
| `.github/workflows/` | Editing a workflow could break the pipeline or remove safety checks |
| `sw.js` / service worker | A broken service worker locks users out of the site |
| `content/` | Bulk content; changes here affect every page |
| `acr.css` | Root stylesheet; a mistake breaks the visual layout everywhere |
| AI / provider files | Changes here affect the AI features for all users |
| `load/sw` | The Load site service worker |
| Audio / animation files | High complexity, high impact on performance |
| Deployment / token / credential files | Security risk |
| Export package files | Affects data integrity for exports |

The pipeline self-protection rule: the five workflow YAML files in `.github/workflows/` must never be edited via the 2D file-edit pipeline. Edit them only via a direct PR with human review.

---

## Risk Levels

### LOW

The file change is unlikely to break anything visible to users. Examples: updating a text label, adding a help note, changing a color value in an isolated component.

What the pipeline does: standard checks. No extra gates.

### MEDIUM

The file change touches shared code, a main HTML file, or a key JavaScript file. A mistake could affect multiple features. Examples: editing `LoadTasks/index.html`, `load/load.js`, or a shared library file.

What the pipeline does: standard checks. Declared risk must match auto-classified risk exactly.

### HIGH

The file change touches a protected area (service worker, workflows, credentials, AI providers, deployment). A mistake here could break the site for all users or create a security problem.

What the pipeline does: hard block by default. You must add `highRiskOverride: true` to the job file AND the declared risk must be HIGH. Even with the override, treat this as a very high risk action.

---

## Troubleshooting Common Failures

### "status is draft — must be approved"

Fix: open `repo-file-job.json` and change `"status": "draft"` to `"status": "approved"`.

### "userApprovalRequired is no — must be Yes"

Fix: add `"userApprovalRequired": "Yes"` to the job file.

### "risk mismatch: declared=LOW auto=MEDIUM"

Fix: change the `riskLevel` field in the job file to match the auto-classified level shown in the error. Use the Risk Classifier tool in Load Tasks to preview what the auto-risk will be.

### "auto risk is HIGH — add highRiskOverride:true"

Fix: if you have confirmed the target file is safe to change, add `"highRiskOverride": true` to the job file. If the file is in the protected list above, stop and reconsider.

### "target file not found in repo"

Fix: check the file path in `targetFiles`. It must be the exact path from the repo root, e.g. `LoadTasks/index.html` not `index.html`. Use the Safe File Picker to copy the correct path.

### "branch already exists on origin"

Fix: the branch name from `branchNameSuggestion` already exists. Change the date suffix in the branch name, or delete the old branch on GitHub first.

### "gh pr create failed"

Fix: the branch was created but the PR could not be opened. Go to GitHub and open the PR manually from the branch page.

### 2D workflow fails with a Python error

Fix: check the workflow log for the specific error. Common causes: `targetAnchor` text not found in the file (copy it exactly as it appears), or `patchContent` has invalid characters. Fix the job file and re-run.

### PR is still a draft after 2C3

This is expected. The PR is always created as a draft. You must manually mark it ready for review before merging.

---

## No Automatic Merge or Deploy

The pipeline never merges a PR automatically. Auto-merge must never be enabled.

Every PR created by the Repo File Worker pipeline requires you to:

1. Read the diff.
2. Confirm all checklist items in the PR Review Coach.
3. Manually click Merge on GitHub.

This is intentional. The safety of the pipeline depends on a human review step at the end. Removing it defeats the purpose of the whole system.

If you are ever unsure whether to merge, wait. A delay is always safer than a mistake on the live site.

---

*This manual covers the Repo File Worker pipeline as of 2026-05-12. Keep this file updated as new phases are added.*
