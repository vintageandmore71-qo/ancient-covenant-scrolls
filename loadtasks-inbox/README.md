# LoadTasks Inbox

Place a `repo-file-job.json` here to trigger the Repo File Worker dry-run.

The dry-run workflow reads the job, validates required fields, classifies risk, checks whether target files exist in the repo, and uploads a report artifact. It does not modify any files, create branches, open PRs, or deploy anything.

To trigger manually: GitHub Actions > Repo File Worker Dry Run > Run workflow.
