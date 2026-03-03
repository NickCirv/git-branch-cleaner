#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { stdout, stdin, argv, exit } from 'node:process';

// ─── Constants ───────────────────────────────────────────────────────────────

const VERSION = '1.0.0';
const PROTECTED = new Set(['main', 'master', 'develop', 'HEAD']);

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
  white:  '\x1b[97m',
};

const noColor = !stdout.isTTY || process.env.NO_COLOR;
const c = (code, str) => noColor ? str : `${code}${str}${C.reset}`;

// ─── Argument Parsing ─────────────────────────────────────────────────────────

function parseArgs(args) {
  const opts = {
    dryRun: false,
    force: false,
    remote: false,
    json: false,
    base: null,
    staleDays: 30,
    keep: [],
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':    opts.dryRun = true; break;
      case '--force':      opts.force = true; break;
      case '--remote':     opts.remote = true; break;
      case '--json':       opts.json = true; break;
      case '--help': case '-h':    opts.help = true; break;
      case '--version': case '-v': opts.version = true; break;
      case '--base':
        opts.base = args[++i];
        break;
      case '--stale-days':
        opts.staleDays = parseInt(args[++i], 10);
        if (isNaN(opts.staleDays) || opts.staleDays < 1) {
          die('--stale-days must be a positive integer');
        }
        break;
      case '--keep':
        opts.keep.push(args[++i]);
        break;
      default:
        if (arg.startsWith('--')) die(`Unknown option: ${arg}`);
    }
  }

  return opts;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function die(msg) {
  console.error(c(C.red, `error: ${msg}`));
  exit(1);
}

function git(...args) {
  try {
    const result = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (err) {
    return null;
  }
}

function gitLines(...args) {
  const out = git(...args);
  if (!out) return [];
  return out.split('\n').map(l => l.trim()).filter(Boolean);
}

function isGitRepo() {
  const result = spawnSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return result.status === 0;
}

function matchesKeep(branch, patterns) {
  for (const pattern of patterns) {
    if (matchGlob(pattern, branch)) return true;
  }
  return false;
}

function matchGlob(pattern, str) {
  // Simple glob: * matches anything except /
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${regexStr}$`).test(str);
}

function detectBaseBranch(opts) {
  if (opts.base) return opts.base;
  for (const b of ['main', 'master', 'develop']) {
    const ref = git('rev-parse', '--verify', b);
    if (ref) return b;
  }
  return null;
}

function getCurrentBranch() {
  return git('rev-parse', '--abbrev-ref', 'HEAD');
}

function getBranchInfo(branch) {
  const format = '%ci\t%an\t%s';
  const raw = git('log', '-1', `--format=${format}`, branch);
  if (!raw) return { date: null, author: null, message: null, daysOld: null };

  const [datePart, author, ...msgParts] = raw.split('\t');
  const message = msgParts.join('\t');
  const date = new Date(datePart);
  const daysOld = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = date.toISOString().split('T')[0];

  return { date: dateStr, author: author || '?', message: message || '', daysOld };
}

// ─── Detection ────────────────────────────────────────────────────────────────

function getMergedBranches(base) {
  if (!base) return new Set();
  const lines = gitLines('branch', '--merged', base, '--format=%(refname:short)');
  return new Set(lines);
}

function getGoneBranches() {
  // Fetch to update remote tracking info (non-fatal)
  spawnSync('git', ['fetch', '--prune'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const lines = gitLines('branch', '-vv', '--format=%(refname:short)\t%(upstream:track)');
  const gone = new Set();
  for (const line of lines) {
    const [branch, track] = line.split('\t');
    if (track && track.includes('[gone]')) {
      gone.add(branch.trim());
    }
  }
  return gone;
}

function getStaleBranches(days) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const branches = gitLines('branch', '--format=%(refname:short)');
  const stale = new Set();

  for (const branch of branches) {
    const epochStr = git('log', '-1', '--format=%ct', branch);
    if (!epochStr) continue;
    const epoch = parseInt(epochStr, 10) * 1000;
    if (epoch < cutoff.getTime()) {
      stale.add(branch);
    }
  }
  return stale;
}

function getSquashMergedBranches(base) {
  if (!base) return new Set();
  const branches = gitLines('branch', '--format=%(refname:short)');
  const squashed = new Set();

  const baseSha = git('rev-parse', base);
  if (!baseSha) return squashed;

  for (const branch of branches) {
    try {
      // Compute merge-base
      const mergeBase = git('merge-base', base, branch);
      if (!mergeBase) continue;

      // Create a temporary tree that represents the squash
      const tmpTree = git('commit-tree', `${branch}^{tree}`, '-p', mergeBase, '-m', 'tmp');
      if (!tmpTree) continue;

      // Check if that tree is reachable (exists) in base log
      const cherryResult = spawnSync('git', ['cherry', base, tmpTree], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (cherryResult.status === 0) {
        const cherryOut = (cherryResult.stdout || '').trim();
        // If cherry output starts with '-', the commit is already in base (squash merged)
        if (cherryOut.startsWith('-')) {
          squashed.add(branch);
        }
      }
    } catch {
      // Skip on error
    }
  }
  return squashed;
}

// ─── Main Analysis ────────────────────────────────────────────────────────────

function analyzeBranches(opts) {
  const base = detectBaseBranch(opts);
  const current = getCurrentBranch();
  const allBranches = gitLines('branch', '--format=%(refname:short)');

  const merged = getMergedBranches(base);
  const gone = getGoneBranches();
  const stale = getStaleBranches(opts.staleDays);
  const squashed = getSquashMergedBranches(base);

  const candidates = [];
  const protected_ = [];
  const kept = [];

  for (const branch of allBranches) {
    if (PROTECTED.has(branch) || branch === current || branch === base) {
      protected_.push(branch);
      continue;
    }
    if (matchesKeep(branch, opts.keep)) {
      kept.push(branch);
      continue;
    }

    const reasons = [];
    if (merged.has(branch)) reasons.push('merged');
    if (gone.has(branch)) reasons.push('gone');
    if (squashed.has(branch)) reasons.push('squash-merged');
    if (stale.has(branch)) reasons.push(`stale (>${opts.staleDays}d)`);

    if (reasons.length > 0) {
      const info = getBranchInfo(branch);
      candidates.push({ branch, reasons, ...info });
    }
  }

  return { candidates, protected_, kept, base, current };
}

// ─── Deletion ─────────────────────────────────────────────────────────────────

function deleteBranch(branch, remote, dryRun) {
  if (dryRun) return { ok: true, dry: true };

  const localResult = spawnSync('git', ['branch', '-D', branch], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (localResult.status !== 0) {
    return { ok: false, error: localResult.stderr.trim() };
  }

  if (remote) {
    const remoteName = git('config', `branch.${branch}.remote`) || 'origin';
    const remoteResult = spawnSync('git', ['push', remoteName, '--delete', branch], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (remoteResult.status !== 0) {
      return { ok: true, remoteError: remoteResult.stderr.trim() };
    }
  }

  return { ok: true };
}

// ─── Output Helpers ───────────────────────────────────────────────────────────

function reasonColor(reasons) {
  if (reasons.includes('merged') || reasons.includes('gone')) return C.red;
  if (reasons.includes('squash-merged')) return C.cyan;
  return C.yellow;
}

function printCandidate(entry, idx, selected) {
  const { branch, reasons, date, author, message, daysOld } = entry;
  const col = reasonColor(reasons);
  const sel = selected ? c(C.green, '[x]') : c(C.gray, '[ ]');
  const reasonStr = reasons.join(', ');
  const age = daysOld != null ? `${daysOld}d ago` : 'unknown';
  const dateStr = date || 'unknown';

  stdout.write(`  ${sel} ${c(col, branch.padEnd(40))} ${c(C.gray, `[${reasonStr}]`)}\n`);
  stdout.write(`       ${c(C.dim, `${dateStr} · ${age} · ${author} · ${message.slice(0, 60)}`)}\n`);
}

function printHeader(count, base, dryRun) {
  stdout.write('\n');
  stdout.write(c(C.bold, `git-branch-cleaner v${VERSION}`) + '\n');
  stdout.write(c(C.dim, `Base branch: ${base || '(none detected)'} · Found ${count} candidate(s)`) + '\n');
  if (dryRun) stdout.write(c(C.yellow, '  DRY RUN — no changes will be made\n'));
  stdout.write('\n');
}

function printSummary(results, dryRun) {
  const deleted = results.filter(r => r.ok && !r.dry).length;
  const dryCount = results.filter(r => r.dry).length;
  const failed = results.filter(r => !r.ok).length;

  stdout.write('\n');
  if (dryRun) {
    stdout.write(c(C.yellow, `Would delete: ${dryCount} branch(es)\n`));
  } else {
    if (deleted) stdout.write(c(C.green, `Deleted: ${deleted} branch(es)\n`));
    if (failed) stdout.write(c(C.red, `Failed: ${failed} branch(es)\n`));
  }
}

// ─── Interactive Mode ─────────────────────────────────────────────────────────

async function interactiveSelect(candidates) {
  return new Promise((resolve) => {
    if (!stdin.isTTY) {
      // Non-interactive: select all
      resolve(candidates.map((_, i) => i));
      return;
    }

    const selected = new Set(candidates.map((_, i) => i));
    let cursor = 0;

    const render = () => {
      // Move cursor up by (candidates.length * 2 + 3) lines if not first render
      stdout.write('\x1b[?25l'); // hide cursor
      stdout.write(`\n${c(C.bold, 'Select branches to delete:')}\n`);
      stdout.write(c(C.dim, '  SPACE=toggle, A=all/none, ENTER=confirm, Q=quit\n\n'));

      candidates.forEach((entry, i) => {
        const isCursor = i === cursor;
        const isSelected = selected.has(i);
        const prefix = isCursor ? c(C.bold, '> ') : '  ';
        stdout.write(prefix);
        printCandidate(entry, i, isSelected);
      });

      stdout.write('\n');
    };

    const clearAndRender = (() => {
      let firstRender = true;
      return () => {
        if (!firstRender) {
          // Move up: candidates * 2 lines + header (4) + footer (1) = candidates*2+5
          const lines = candidates.length * 2 + 5;
          stdout.write(`\x1b[${lines}A\x1b[0J`);
        }
        firstRender = false;
        render();
      };
    })();

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    clearAndRender();

    stdin.on('data', (key) => {
      if (key === '\u0003') { // Ctrl+C
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\x1b[?25h');
        stdout.write('\n');
        resolve([]);
        return;
      }

      if (key === 'q' || key === 'Q') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\x1b[?25h');
        stdout.write('\n');
        resolve([]);
        return;
      }

      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\x1b[?25h');
        resolve([...selected]);
        return;
      }

      if (key === ' ') {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (key === 'a' || key === 'A') {
        if (selected.size === candidates.length) selected.clear();
        else candidates.forEach((_, i) => selected.add(i));
      } else if (key === '\x1b[A') { // Up
        cursor = Math.max(0, cursor - 1);
      } else if (key === '\x1b[B') { // Down
        cursor = Math.min(candidates.length - 1, cursor + 1);
      }

      clearAndRender();
    });
  });
}

async function confirmRemote(branches) {
  if (!stdin.isTTY) return false;
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout });
    stdout.write(c(C.yellow, `\nAlso delete ${branches.length} remote branch(es)? [y/N] `));
    rl.once('line', (line) => {
      rl.close();
      resolve(line.trim().toLowerCase() === 'y');
    });
  });
}

// ─── JSON Output ──────────────────────────────────────────────────────────────

function outputJson(analysis, results, opts) {
  const { candidates, protected_, kept, base, current } = analysis;
  const out = {
    version: VERSION,
    base,
    current,
    dryRun: opts.dryRun,
    candidates: candidates.map((c, i) => ({
      branch: c.branch,
      reasons: c.reasons,
      date: c.date,
      author: c.author,
      message: c.message,
      daysOld: c.daysOld,
      action: results[i]
        ? results[i].dry ? 'would-delete' : results[i].ok ? 'deleted' : 'failed'
        : 'skipped',
    })),
    protected: protected_,
    kept,
    summary: {
      deleted: results.filter(r => r && r.ok && !r.dry).length,
      wouldDelete: results.filter(r => r && r.dry).length,
      failed: results.filter(r => r && !r.ok).length,
    },
  };
  console.log(JSON.stringify(out, null, 2));
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c(C.bold, `git-branch-cleaner v${VERSION}`)}
${c(C.dim, 'Find and safely delete merged, gone, and stale git branches')}

${c(C.bold, 'USAGE')}
  git-branch-cleaner [options]
  gbc [options]

${c(C.bold, 'OPTIONS')}
  --dry-run            Show what would be deleted, no changes
  --force              Delete all candidates without prompting
  --remote             Also delete remote tracking branches
  --base <branch>      Base branch for merge detection (default: auto)
  --stale-days <n>     Days threshold for stale detection (default: 30)
  --keep <pattern>     Never delete branches matching pattern (glob, repeatable)
  --json               Output as JSON
  -v, --version        Show version
  -h, --help           Show this help

${c(C.bold, 'DETECTION')}
  ${c(C.red, 'merged')}       Fully merged into base branch
  ${c(C.red, 'gone')}         Remote tracking branch no longer exists
  ${c(C.yellow, 'stale')}        Last commit older than --stale-days
  ${c(C.cyan, 'squash-merged')} Squash-merged into base branch

${c(C.bold, 'INTERACTIVE')}
  SPACE        Toggle branch selection
  A            Select / deselect all
  ↑ / ↓       Move cursor
  ENTER        Confirm selection and delete
  Q / Ctrl+C   Quit without deleting

${c(C.bold, 'EXAMPLES')}
  gbc                        # Interactive mode
  gbc --dry-run              # Preview deletions
  gbc --force                # Delete all candidates immediately
  gbc --base develop         # Use develop as base
  gbc --stale-days 60        # 60-day stale threshold
  gbc --keep "release/*"     # Protect release branches
  gbc --remote               # Delete remote branches too
  gbc --json                 # Machine-readable output

${c(C.bold, 'SAFETY')}
  Always protects: ${[...PROTECTED].join(', ')}, current branch, base branch
`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(argv.slice(2));

  if (opts.version) {
    console.log(VERSION);
    exit(0);
  }

  if (opts.help) {
    printHelp();
    exit(0);
  }

  if (!isGitRepo()) {
    if (opts.json) {
      console.log(JSON.stringify({ error: 'Not a git repository' }));
    } else {
      console.error(c(C.red, 'error: not a git repository (or any parent up to mount point)'));
    }
    exit(1);
  }

  const analysis = analyzeBranches(opts);
  const { candidates, protected_, kept, base } = analysis;

  if (!opts.json) {
    printHeader(candidates.length, base, opts.dryRun);
  }

  if (candidates.length === 0) {
    if (opts.json) {
      outputJson(analysis, [], opts);
    } else {
      console.log(c(C.green, 'No stale or merged branches found. All clean!'));
      if (protected_.length) {
        console.log(c(C.dim, `Protected: ${protected_.join(', ')}`));
      }
      if (kept.length) {
        console.log(c(C.dim, `Kept by pattern: ${kept.join(', ')}`));
      }
    }
    exit(0);
  }

  let selectedIndices = [];
  const results = new Array(candidates.length).fill(null);

  if (opts.dryRun) {
    // Show all as dry run
    if (!opts.json) {
      candidates.forEach((entry, i) => printCandidate(entry, i, true));
    }
    candidates.forEach((_, i) => { results[i] = { ok: true, dry: true }; });
  } else if (opts.force) {
    // Delete all without prompt
    if (!opts.json) {
      console.log(c(C.yellow, `Deleting ${candidates.length} branch(es)...\n`));
      candidates.forEach((entry, i) => printCandidate(entry, i, true));
      stdout.write('\n');
    }

    let deleteRemote = opts.remote;
    if (opts.remote) {
      deleteRemote = await confirmRemote(candidates.map(c => c.branch));
    }

    for (let i = 0; i < candidates.length; i++) {
      const result = deleteBranch(candidates[i].branch, deleteRemote, false);
      results[i] = result;
      if (!opts.json) {
        if (result.ok) {
          console.log(c(C.green, `  ✓ deleted: ${candidates[i].branch}`));
        } else {
          console.log(c(C.red, `  ✗ failed: ${candidates[i].branch} — ${result.error}`));
        }
      }
    }
  } else {
    // Interactive mode
    selectedIndices = await interactiveSelect(candidates);

    if (selectedIndices.length === 0) {
      if (!opts.json) console.log(c(C.dim, 'No branches selected. Exiting.'));
      outputJson(analysis, results, opts);
      exit(0);
    }

    let deleteRemote = false;
    if (opts.remote) {
      deleteRemote = await confirmRemote(selectedIndices.map(i => candidates[i].branch));
    }

    if (!opts.json) stdout.write('\n');

    for (const i of selectedIndices) {
      const result = deleteBranch(candidates[i].branch, deleteRemote, false);
      results[i] = result;
      if (!opts.json) {
        if (result.ok) {
          console.log(c(C.green, `  ✓ deleted: ${candidates[i].branch}`));
        } else {
          console.log(c(C.red, `  ✗ failed: ${candidates[i].branch} — ${result.error}`));
        }
      }
    }
  }

  if (opts.json) {
    outputJson(analysis, results, opts);
  } else {
    printSummary(results, opts.dryRun);
    if (protected_.length) {
      console.log(c(C.dim, `Protected: ${protected_.join(', ')}`));
    }
    if (kept.length) {
      console.log(c(C.dim, `Kept by pattern: ${kept.join(', ')}`));
    }
  }
}

main().catch((err) => {
  console.error(c(C.red, `fatal: ${err.message}`));
  exit(1);
});
