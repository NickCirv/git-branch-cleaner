# git-branch-cleaner — command reference

[Overview](../README.md) · [Research record](RESEARCH.md)

Describes revision `9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa`. Commands are source-inspected; no execution results are asserted.

## Workflow

Classifies merged, stale, missing-upstream and squash-merge candidates, supports keep patterns and offers interactive or force deletion. --remote can also issue remote branch deletions.

Requires Git and a local repository with the relevant history. Commands are source-inspected, not executed in this review.

```bash
node index.js --dry-run --base main
```

## Commands and controls

| Control | Behavior in the inspected implementation |
| --- | --- |
| `--dry-run` | Preview deletions while analysis may fetch/prune refs |
| `--base BRANCH` | Choose merge-comparison base |
| `--keep PATTERN` | Protect matching names |
| `--remote` | Enable remote branch deletion |
| `--force` | Bypass interactive selection |

## Interpretation and side effects

Analysis calls git fetch --prune even on a dry run, so it may use the network and update remote-tracking refs. Staleness or a heuristic squash match does not prove work is disposable. --force bypasses selection.

## Implementation reference

- [package.json](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/package.json)
- [index.js](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/index.js)
- [test/smoke.test.js](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/test/smoke.test.js)
