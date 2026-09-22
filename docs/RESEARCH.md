# git-branch-cleaner — research record

## Revision and scope

- Repository: [NickCirv/git-branch-cleaner](https://github.com/NickCirv/git-branch-cleaner)
- Commit: `9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa`
- Tree: `b1d0693d575cc48d493314c616bb9da82cde3d0d`
- Captured: 6 of 6 eligible text files (all eligible text files).
- Recursive tree truncated: `False`.
- Runtime verification: **unverified**; no repository code, installation or test command was executed.

The captured file inventory is broader than the semantic review. Authoring inspected package metadata, entrypoint/argument handling and implementation paths relevant to the claims below, plus test declarations. This is documentation research, not a line-by-line security audit. Generated/binary artifacts, lockfiles and file types outside the acquisition filter were not inspected.

## Claim and evidence

| Claim | Pinned evidence | Status |
| --- | --- | --- |
| Runtime requirement and executable mapping | [package.json](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/package.json) | verified in manifest; installation unverified |
| Review local branch cleanup candidates before choosing deletions. | [implementation](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/index.js) | partially verified by static implementation review |
| Operational limits and side effects | [implementation](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/index.js) and source map in [reference](REFERENCE.md) | partially verified; runtime unverified |
| Test command definition | [package.json](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/package.json) | verified as a declaration only |

## Findings carried into the rewrite

Analysis calls git fetch --prune even on a dry run, so it may use the network and update remote-tracking refs. Staleness or a heuristic squash match does not prove work is disposable. --force bypasses selection.

No runtime checks were executed for this documentation review. The committed smoke test checks entrypoint JavaScript syntax; it does not exercise the command behavior.

## Documentation inventory and disposition

| Existing document | Disposition |
| --- | --- |
| [README.md](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/README.md) | Rewritten overview; historical copy remains at this pinned URL. |

New supporting documents: `docs/REFERENCE.md` and `docs/RESEARCH.md`. No original source or protected legal/security file was changed.

## Protected-file evidence

- `LICENSE` SHA-256 `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d`.

## Remaining verification

Clean installation, useful-command execution, malformed input, side-effect boundaries, platform compatibility and end-to-end tests remain unverified. Package-registry availability and live API destinations were not checked. No performance, customer-adoption, compliance or production-readiness claim is made.

## Captured evidence index

- [LICENSE](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/LICENSE) · blob `05b804beeec7d1a6c933d087387ba4adf6463d93`.
- [README.md](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/README.md) · blob `cf259ecad70fb1a56e64ae3c2d61e5e5dd6bb827`.
- [package.json](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/package.json) · blob `a105db64057475f7df4508a3f6377c424c2bdf85`.
- [.github/workflows/ci.yml](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/.github/workflows/ci.yml) · blob `44515034a394670de44454a7a1bd2c7ef0c9836e`.
- [index.js](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/index.js) · blob `83da5ec81a12762d388f18239d9e386a596a80f7`.
- [test/smoke.test.js](https://github.com/NickCirv/git-branch-cleaner/blob/9c2d35a11f38f3bdbb059f9c0d0a2c81f775afaa/test/smoke.test.js) · blob `ebbccaaf2583b4850575f835313e4b0afd21bff7`.

## Tree files outside the captured text set

These paths were mapped but their contents were not acquired in this research pass:

- `banner.svg`
