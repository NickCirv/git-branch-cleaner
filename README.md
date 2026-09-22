![git-branch-cleaner — Nicholas Ashkar repository collection](assets/nicholas-ashkar/banner.png)

# git-branch-cleaner

Review local branch cleanup candidates before choosing deletions.


<a id="usage"></a>

## What it does

Classifies merged, stale, missing-upstream and squash-merge candidates, supports keep patterns and offers interactive or force deletion. --remote can also issue remote branch deletions. See the pinned [implementation](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/index.js).


<a id="install"></a>

## Quickstart

Node requirement from the inspected manifest: **`>=20`**. Requires Git and a local repository with the relevant history. Commands are source-inspected, not executed in this review.

The following example is **source-inspected, not executed**. It uses a pinned checkout; npm package publication is not assumed. Replace project paths or provide the stated input fixtures before running it.

```bash
git clone https://github.com/NickCirv/git-branch-cleaner.git
cd git-branch-cleaner
git checkout 9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa
npm install --ignore-scripts
node index.js --dry-run --base main
```

Dependencies are installed with lifecycle scripts disabled in this recipe. Read the package scripts before enabling any lifecycle step required by your environment.

## Usage and reference

`git-branch-cleaner` | `gbc` are the executable names declared by the package. [Command reference](docs/REFERENCE.md) covers source-backed options and entry points.

| Control | Behavior in the inspected implementation |
| --- | --- |
| `--dry-run` | Preview deletions while analysis may fetch/prune refs |
| `--base BRANCH` | Choose merge-comparison base |
| `--keep PATTERN` | Protect matching names |
| `--remote` | Enable remote branch deletion |
| `--force` | Bypass interactive selection |

## Limits and operational notes

Analysis calls git fetch --prune even on a dry run, so it may use the network and update remote-tracking refs. Staleness or a heuristic squash match does not prove work is disposable. --force bypasses selection.

## Development

No runtime checks were executed for this documentation review. The committed smoke test checks entrypoint JavaScript syntax; it does not exercise the command behavior.

| Script | Declared command |
| --- | --- |
| `test` | `node --test` |

Work from the pinned source, keep changes focused, and reproduce the affected behavior with a small fixture before proposing a change. Existing contribution and security policies remain authoritative where present.

## Research and status

[Research record](docs/RESEARCH.md) identifies the inspected revision, source evidence, documentation disposition and verification gaps. Static inspection supports the descriptions here; runtime behavior, dependency installation and current hosted services remain unverified.

## License and author

[License](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/LICENSE)

[Nicholas Ashkar](https://nicholashkar.com) · Applied AI, systems and consulting.
