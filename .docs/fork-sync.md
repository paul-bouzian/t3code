# Fork Sync

This repository currently uses:

- `origin` for the upstream project: `https://github.com/pingdotgg/t3code.git`
- `fork` for your personal fork: `https://github.com/paul-bouzian/t3code.git`

That naming is workable, but it means you should treat:

- `origin/main` as the upstream branch you consume
- `fork/main` as the branch you publish and keep custom

## Recommended model

- Keep `fork/main` as the single integration branch for your fork.
- Keep each personal feature on its own branch until it is ready to land in `fork/main`.
- Pull upstream changes through short-lived sync branches, not directly on `main`.
- Adopt interesting third-party PRs with `cherry-pick -x`, not by merging contributor branches.

This keeps one canonical branch with your custom behavior while making every upstream import reviewable.

## One-time setup

Run this once on your machine:

```bash
git fetch origin fork --prune
git config rerere.enabled true
git config rerere.autoupdate true

# Recommended: local main should follow your fork, not upstream.
git switch main
git branch --set-upstream-to=fork/main main
```

`rerere` is worth enabling because repeated conflicts tend to happen in the same places when your fork carries long-lived changes.

## Inspect the current delta

Before every sync, see what your fork is carrying relative to upstream:

```bash
git fetch origin fork --prune
git log --left-right --cherry-pick --oneline origin/main...fork/main
```

Commits prefixed with `>` are fork-only commits you are still carrying.

## Regular upstream sync

Prefer doing sync work in a separate worktree so you do not disturb your active branch.

```bash
git fetch origin fork --prune

SYNC_BRANCH="sync/$(date +%Y-%m-%d)-upstream-main"
git worktree add -b "$SYNC_BRANCH" ../t3code-sync fork/main
cd ../t3code-sync

git merge --no-ff origin/main
bun lint
bun typecheck
```

If the merge is clean and validation passes, push the sync branch to your fork and review it before landing:

```bash
git push -u fork "$SYNC_BRANCH"
gh pr create \
  --repo paul-bouzian/t3code \
  --base main \
  --head "$SYNC_BRANCH" \
  --title "merge upstream main into fork" \
  --body "Why\n- pull latest upstream fixes and features into the personal fork\n\nHow\n- merge origin/main into fork/main on a dedicated sync branch\n- preserve fork-only behavior where conflicts exist\n\nTests\n- bun lint\n- bun typecheck"
```

If you do not want a PR, you can still keep the same branch-based review flow and fast-forward your fork after manual review.

## Conflict policy

When a merge conflicts:

- Keep upstream fixes by default unless they break an intentional fork-only behavior.
- Preserve your fork-only product decisions, but collapse duplicate implementations when upstream now ships the same capability.
- If one of your custom features is now upstream, remove your copy instead of maintaining two versions.
- Re-run `bun lint` and `bun typecheck` after every conflict resolution batch.

The important rule is to carry intent, not duplicate code.

## Adopt an unmerged upstream PR

If there is a GitHub PR you want before upstream merges it, treat it like vendored code and cherry-pick only the commits you want.

```bash
PR_NUMBER=123
VENDOR_BRANCH="vendor/pr-${PR_NUMBER}"

git fetch origin fork --prune
git switch -c "$VENDOR_BRANCH" fork/main

gh pr view "$PR_NUMBER" \
  --repo pingdotgg/t3code \
  --json title,url,author,commits,files

git fetch origin pull/"$PR_NUMBER"/head:pr/"$PR_NUMBER"
git log --oneline pr/"$PR_NUMBER" --not origin/main

# Cherry-pick the exact commits you want, not blindly the whole branch.
git cherry-pick -x <commit-sha>

bun lint
bun typecheck
git push -u fork "$VENDOR_BRANCH"
```

Notes:

- `-x` records the original commit SHA in the new commit message, which makes later cleanup much easier.
- If you are already doing an upstream sync, cherry-pick the PR onto the sync branch after merging `origin/main`. That usually reduces conflicts.
- If the PR author keeps force-pushing, refetch the PR head and review the new commits before picking them.

## When upstream eventually merges the same idea

When upstream ships an equivalent version of one of your personal features:

1. Sync from `origin/main`.
2. Compare the upstream implementation to your carried commits.
3. Drop your fork-only copy if the upstream version is good enough.
4. Keep only the remaining delta that is still truly custom.

The long-term goal is a small, explicit fork delta.

## Recommended cadence

- Sync whenever upstream lands fixes or features you care about.
- Prefer small syncs over large catch-up merges.
- Keep personal features isolated on dedicated branches so they can be rebased, merged, or dropped independently.

## Related prompt

If you want an agent to run this workflow for you, use:

- [`.codex/prompts/sync-fork-from-upstream.md`](../.codex/prompts/sync-fork-from-upstream.md)
