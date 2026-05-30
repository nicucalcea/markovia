---
name: version-bump
description: Version bump, release, tag, gh, package.json, package-lock.json. Use when asked to cut a new release, bump the extension/app version, push a release tag, or publish a GitHub release from this repo.
---

# Version Bump

Use this skill when the user wants a release version bump and GitHub release.

## Goal

Produce a clean release from the current branch by:

- choosing the correct next version
- updating manifest version fields
- validating the repo
- creating a release commit
- creating and pushing the version tag
- creating the GitHub release against that tag
- verifying any release workflow and uploaded assets

## Safety Rules

- Inspect the repo before changing anything. Do not assume the current version is correct.
- Check for mismatches between local manifest versions, git tags, and GitHub releases.
- If the next version is ambiguous, ask the user for the exact target version instead of guessing.
- If the worktree is dirty, do not revert unrelated changes.
- Stage only the intended release files. Avoid sweeping unrelated edits into the release unless the user clearly wants the full worktree released.
- Use an annotated version tag in the form `vX.Y.Z`.
- If `gh` is unavailable or not authenticated, stop and tell the user exactly what blocked release creation.

## Release Checklist

1. Inspect state.

Run:

```bash
git status --short
git log --oneline -10
git remote -v
git tag --sort=-creatordate
gh --version
gh auth status
gh release list --limit 20
```

Check:

- current branch
- dirty files
- recent commit style
- whether `gh` is installed and authenticated
- existing tags and releases

2. Resolve version ancestry.

Run the equivalent of:

```bash
git describe --tags --abbrev=0
git log --graph --decorate --oneline --all -20
gh release view <existing-tag>
```

Look for cases where:

- `package.json` says one version but GitHub already has a newer release
- the latest release tag exists on a different branch line
- the latest reachable local tag is not the latest GitHub release

If there is any mismatch, ask the user which version to release before proceeding.

3. Bump version files.

Update at minimum:

- `package.json`
- `package-lock.json`

Keep the plain version in manifests, for example `0.1.1`, and reserve the `v` prefix for the git tag and GitHub release.

4. Validate before release.

Run:

```bash
npm run compile
npm run lint
npm run test
```

Do not create the release commit until these pass, unless the user explicitly wants a release despite failures.

5. Inspect the final diff.

Before committing, review:

```bash
git status --short
git diff --stat
git diff -- <intended files>
git log --oneline -10
```

Make sure the release commit contains only the intended changes.

6. Commit the release.

Use a concise commit message matching repo style. For this repo, `release: vX.Y.Z` is acceptable.

Example:

```bash
git add <intended files>
git commit -m "release: v0.1.1"
```

7. Tag and push.

Use an annotated tag:

```bash
git tag -a v0.1.1 -m "v0.1.1"
git push origin <branch>
git push origin v0.1.1
```

8. Create the GitHub release.

If the tag push triggers a release workflow, still verify whether the GitHub release object exists. If it does not, create it explicitly with `gh`:

```bash
gh release create "v0.1.1" --verify-tag --title "v0.1.1" --generate-notes --latest
```

9. Verify release workflow and assets.

Check recent workflow runs and release details:

```bash
gh run list --limit 10 --json databaseId,displayTitle,event,headBranch,headSha,status,conclusion,workflowName
gh run view <run-id> --json status,conclusion,url,workflowName,jobs
gh run watch <run-id> --interval 5
gh release view v0.1.1 --json url,assets
```

Confirm:

- the release exists
- the workflow completed successfully
- expected assets were uploaded, such as a `.vsix`

## What To Report Back

When done, report:

- the released version
- the release commit SHA
- the tag name
- the GitHub release URL
- whether release assets were uploaded
- any warnings that did not block release

## Notes From This Repo

- This repo already had a version-history mismatch once: `package.json` was behind a pre-existing GitHub release tag.
- In that situation, the correct move was to stop, surface the mismatch, and ask the user to confirm the next version.
- The release workflow is tag-driven via `.github/workflows/release.yml`.
- After manual `gh release create`, the workflow can still attach packaged assets to the same release.
