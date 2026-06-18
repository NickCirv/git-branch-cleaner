<div align="center">

# git-branch-cleaner

**Delete merged, gone, and stale git branches — interactively, with zero dependencies.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?labelColor=0B0A09)](LICENSE)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen?labelColor=0B0A09)](https://nodejs.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?labelColor=0B0A09)](package.json)

</div>

## Install

```bash
npx github:NickCirv/git-branch-cleaner
```

## Usage

```bash
git-branch-cleaner          # Interactive multi-select mode
gbc --dry-run               # Preview candidates without deleting
gbc --force --stale-days 60 --keep "release/*"  # Non-interactive cleanup
```

| Flag | Description |
|---|---|
| `--dry-run` | Preview what would be deleted, no changes made |
| `--force` | Delete all candidates without prompting |
| `--remote` | Also delete remote tracking branches |
| `--base <branch>` | Set the base branch (default: main/master) |
| `--stale-days <n>` | Stale threshold in days (default: 30) |
| `--keep <pattern>` | Glob pattern for branches to always protect |
| `--json` | Machine-readable JSON output for CI/scripts |

## What it does

Scans your local git repo and identifies four categories of dead branches: **merged** (fully merged into base), **gone** (remote tracking deleted), **stale** (last commit older than N days), and **squash-merged** (detected via `git commit-tree` comparison). Presents an interactive multi-select UI with per-branch metadata — date, author, last message, age. Permanently protected: `main`, `master`, `develop`, `HEAD`, and your current branch.

---
<sub>Zero dependencies · Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
