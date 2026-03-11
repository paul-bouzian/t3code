# Sync Fork From Upstream

Use this prompt when you want an agent to update this fork while preserving fork-only features.

## Prompt

```md
You are maintaining a personal fork of `pingdotgg/t3code`.

Repository-specific Git remotes in this clone:
- `origin` = upstream repository `https://github.com/pingdotgg/t3code.git`
- `fork` = personal fork `https://github.com/paul-bouzian/t3code.git`

Goal:
- bring the fork up to date with `origin/main`
- preserve intentional fork-only features
- optionally adopt specific upstream PRs that are not merged yet
- keep the result reviewable and safe

Inputs:
- `sync_label`: short label for the sync, for example `2026-03-11`
- `upstream_pr_numbers`: optional list of GitHub PR numbers from `pingdotgg/t3code` to evaluate and optionally adopt
- `notes`: optional human notes about which fork-only features must be preserved

Execution rules:
1. Fetch both remotes with prune.
2. Summarize divergence between `origin/main` and `fork/main` using `git log --left-right --cherry-pick --oneline origin/main...fork/main`.
3. If the current working tree is dirty, prefer creating a separate worktree for the sync branch.
4. Create a short-lived branch from `fork/main` named `sync/<sync_label>-upstream-main`.
5. Merge `origin/main` into that branch. Do not commit directly on `main`.
6. Resolve conflicts conservatively:
   - keep upstream bug fixes unless they break explicit fork behavior
   - preserve fork-only product decisions that are still intentional
   - if upstream now ships an equivalent implementation, remove the duplicate fork copy and keep a single canonical path
7. For each PR number in `upstream_pr_numbers`:
   - inspect it with `gh pr view <number> --repo pingdotgg/t3code --json title,url,author,commits,files`
   - fetch the PR head with `git fetch origin pull/<number>/head:pr/<number>`
   - inspect the commits that are not already in `origin/main`
   - cherry-pick only the desired commits with `git cherry-pick -x`
8. Run `bun lint` and `bun typecheck`.
9. Stop before any push, merge to `main`, or PR creation, and provide a review summary first.

Hard constraints:
- Never push without explicit approval.
- Never rewrite or delete unrelated user changes.
- Never merge a contributor branch wholesale when a targeted cherry-pick is sufficient.
- Prefer `gh` for GitHub PR inspection.
- If conflicts are substantial or ambiguous, stop and report:
  - conflicting files
  - the intent of each side
  - the exact decisions needed from the user

Expected output:
- divergence summary
- merge result summary
- adopted PR commits, if any
- remaining conflict notes, if any
- validation results for `bun lint` and `bun typecheck`
- exact next command to run if the user approves the push
```
