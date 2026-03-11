# Personal Desktop Updates

This fork now supports a personal desktop release flow for macOS arm64 only.

## What this solves

- Pull upstream changes into your personal fork branch.
- Keep your fork-only features.
- Publish a personal GitHub Release for Apple Silicon macOS only.
- Let the installed app auto-update from your fork.

## Important constraint

Auto-update still requires a GitHub Release.

The desktop app uses `electron-updater`, which expects release assets such as:

- the `.dmg`
- the macOS `.zip`
- `latest-mac.yml`
- `.blockmap`

A plain commit on `main` is not enough by itself. The fix is to automate the release creation so you do not need to manage tags or release notes manually.

## Personal workflow

Workflow file:

- `.github/workflows/personal-desktop-release.yml`

Behavior:

- runs on every push to `main`
- can also be triggered manually with GitHub Actions or `gh workflow run`
- builds only macOS `arm64`
- publishes only the assets needed for desktop auto-update
- does not publish npm packages
- does not build Linux, Windows, or Intel macOS artifacts

## Local trigger

From this repo:

```bash
bun run release:desktop:personal
```

That runs:

- `scripts/run-personal-desktop-release.mjs`

which triggers the GitHub Actions workflow on `main`.

## First install

For the updater to switch to your fork, the app must be installed once from a build produced by this fork.

After that, future updates can come from your fork release feed automatically.

## Private repo note

If the fork repo is private, run the desktop app with:

- `T3CODE_DESKTOP_UPDATE_GITHUB_TOKEN`
- or `GH_TOKEN`

The app already supports authenticated GitHub update checks.
