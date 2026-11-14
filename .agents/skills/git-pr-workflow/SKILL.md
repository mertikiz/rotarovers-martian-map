---
name: git-pr-workflow
description: Use whenever starting a task, committing, updating from main, resolving a merge conflict or opening a pull request in this repository. Keeps beginners' work on branches, small, and mergeable without losing anyone's changes.
---

# Git and pull-request workflow (RotaRovers)

Explain each step to the user in Turkish and show the commands you run. Never use `push --force`, `reset --hard`,
`git clean`, or delete branches. Never commit secrets or files from `data/`.

## Start a task
```bash
git switch main
git pull
git switch -c feat/<short-task-name>      # e.g. feat/walk-view
```
One branch per task. If a branch for this task already exists: `git switch <branch>` then `git pull`.

## Work in small steps
- Make one small change, run the check, then commit.
- Web check: `cd web && npm run build` (must pass). Python check: run the script on its small example.
- Before each commit show `git status` and `git diff --stat` and point out any file unrelated to the task.
- Commit messages in English, imperative: `feat: add walk view distance panel`.
```bash
git add <the files you changed>
git commit -m "feat: ..."
```

## Stay up to date with main (do this before opening a PR, and if main changed a lot)
```bash
git fetch origin
git merge origin/main
```
If there is a **conflict**: open each conflicted file, keep both people's intended changes, remove the `<<<<<<<`,
`=======`, `>>>>>>>` markers, run the check, then `git add <file>` and `git commit`. If you are not sure whose change
is right, stop and ask the user; never just pick "ours" or "theirs" for the whole file.

## Open the pull request
```bash
git push -u origin <branch>
```
Then open the PR on GitHub (the repository page shows a "Compare & pull request" button). Fill in the PR template: what
changed and why, how it was tested, AI use. Leave "Kodu okudum, ne yaptığını anlatabilirim" for the user to tick.
Link the issue with `Closes #<number>` in the description. Mert merges.

## If something went wrong
- Uncommitted change to one file you want to undo: `git restore <file>`.
- A bad commit that is already pushed: `git revert <commit>` (creates a new commit; never rewrite history).
- Lost or confused: run `git status` and `git log --oneline -5`, show the output, and ask the user before doing more.
