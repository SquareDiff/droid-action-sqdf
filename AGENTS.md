# AGENTS.md

This file provides guidance to Factory Droid Exec when working with code in this repository.

> **SquareDiff fork note**: this is `SquareDiff/droid-action-sqdf`, a fork of
> `Factory-AI/droid-action`. The `dev` and `main` branches mirror upstream.
> Hill-climbing branches (`feat/*`, `candidate/*`) carry SquareDiff-specific
> modifications — most importantly the **inline review skill override**
> introduced on `feat/skill-override`. See "SquareDiff: skill override" below.

## SquareDiff: skill override

Upstream droid-action tells Droid to `"Invoke the 'review' skill"` — a name
lookup that resolves to Factory's private skill registry inside the Droid CLI.
That works for production reviews but blocks SquareDiff's hill-climbing loop:
edits to a local `.md` file have no effect on what Droid actually receives.

This fork (since `feat/skill-override`) inlines the review methodology directly
into the prompt, so the skill we ship in this branch is exactly what Droid
sees:

| File | Role |
|---|---|
| `src/create-prompt/templates/review-skill.md` | The review methodology, byte-identical to the harness repo's `skills/review.SKILL.md` |
| `src/create-prompt/templates/load-review-skill.ts` | Reads the `.md` at module-init, strips YAML frontmatter, prepends the `<!-- SKILL_OVERRIDE_v1 -->` sentinel, caches the result |
| `src/create-prompt/templates/review-candidates-prompt.ts` | Inlines the loaded skill via `<review_skill>...</review_skill>` and instructs Droid to follow Pass 1 |
| `src/create-prompt/templates/review-validator-prompt.ts` | Same, but Pass 2 |

The sentinel `SKILL_OVERRIDE_v1` is grep-able in the GitHub Actions log of any
Droid run — that's how we verify the override is in effect rather than the
upstream codepath. If a future log doesn't contain that string, the override
silently regressed and runs are evaluating Factory's built-in skill instead.

### Hill-climbing workflow

To test a new skill candidate:

1. In the harness repo: edit `skills/review.SKILL.md`
2. Run `python3 harness/sync_skill.py` (copies it into this repo's
   `src/create-prompt/templates/review-skill.md`)
3. In this repo: `git checkout -b candidate/<version>-<desc>` and commit the
   updated `review-skill.md`
4. `bun test && bun run typecheck && bun run format:check`
5. Push the candidate branch
6. In the harness repo: update `DROID_ACTION_REF` in `harness/patch_repos.py`
   (or pass `--ref` flag) and re-patch the eval repos

`review-skill.md` is in `.prettierignore` so the sync stays byte-identical to
the harness source of truth.

## Development Tools

- Runtime: Bun 1.2.11
- TypeScript with strict configuration

## Common Development Tasks

### Available npm/bun scripts from package.json:

```bash
# Test
bun test

# Formatting
bun run format          # Format code with prettier
bun run format:check    # Check code formatting

# Type checking
bun run typecheck       # Run TypeScript type checker
```

## Architecture Overview

This is a GitHub Action that enables Droid to interact with GitHub PRs and issues. The action operates in two main phases:

### Phase 1: Preparation (`src/entrypoints/prepare.ts`)

1. **Authentication Setup**: Establishes GitHub token via OIDC or GitHub App
2. **Permission Validation**: Verifies actor has write permissions
3. **Trigger Detection**: Evaluates `@droid` mentions or automatic-review flags to determine if Droid should run
4. **Context Creation**: Prepares GitHub context and initial tracking comment

### Phase 2: Execution (`base-action/`)

The `base-action/` directory contains the core Droid Exec invocation logic, which serves a dual purpose:

- **Standalone Action**: Published separately for reuse in other workflows
- **Inner Logic**: Used internally by this GitHub Action after preparation completes

Execution steps:

1. **MCP Server Setup**: Installs and configures GitHub MCP server for tool access
2. **Prompt Generation**: Creates context-rich prompts from GitHub data
3. **Droid Exec Integration**: Executes via Factory's CLI using your `FACTORY_API_KEY`
4. **Result Processing**: Updates comments and creates branches/PRs as needed

### Key Architectural Components

#### Tag Execution Helpers (`src/tag/`)

- `shouldTriggerTag` detects `@droid` mentions or automatic-review conditions
- `prepareTagExecution` creates tracking comments and dispatches to commands
- `commands/fill.ts` and `commands/review.ts` build prompts and allowed tool lists

#### GitHub Integration (`src/github/`)

- **Context Parsing** (`context.ts`): Unified GitHub event handling
- **Data Fetching** (`data/fetcher.ts`): Retrieves PR/issue data via GraphQL/REST
- **Data Formatting** (`data/formatter.ts`): Converts GitHub data into prompt-ready format for Droid
- **Comment Management** (`operations/comments/`): Creates and updates tracking comments

#### MCP Server Integration (`src/mcp/`)

- **GitHub Actions Server** (`github-actions-server.ts`): Workflow and CI access
- **GitHub Comment Server** (`github-comment-server.ts`): Comment operations
- **GitHub File Operations** (`github-file-ops-server.ts`): File system access
- Auto-installation and configuration in `install-mcp-server.ts`

#### Authentication & Security (`src/github/`)

- **Token Management** (`token.ts`): OIDC token exchange and GitHub App authentication
- **Permission Validation** (`validation/permissions.ts`): Write access verification
- **Actor Validation** (`validation/actor.ts`): Human vs bot detection

### Project Structure

```
src/
├── entrypoints/           # Action entry points
│   ├── prepare.ts         # Main preparation logic
│   ├── update-comment-link.ts  # Post-execution comment updates
│   └── format-turns.ts    # Droid conversation formatting
├── github/               # GitHub integration layer
│   ├── api/              # REST/GraphQL clients
│   ├── data/             # Data fetching and formatting
│   ├── operations/       # Branch, comment, git operations
│   ├── validation/       # Permission and trigger validation
│   └── utils/            # Image downloading, sanitization
├── tag/                  # Tag-based trigger detection and command prep
│   ├── commands/         # Fill/review command helpers
│   └── index.ts          # Orchestrates tag executions
├── mcp/                  # MCP server implementations
├── prepare/              # Preparation orchestration
└── utils/                # Shared utilities
```

## Important Implementation Notes

### Authentication Flow

- Uses GitHub OIDC token exchange for secure authentication
- Supports custom GitHub Apps via `APP_ID` and `APP_PRIVATE_KEY`
- Defaults to the Factory Droid GitHub App when a custom app is not supplied

### MCP Server Architecture

- Each MCP server has specific GitHub API access patterns
- Servers are auto-installed in `~/.factory/droid/mcp/github-{type}-server/`
- Configuration merged with user-provided MCP tool config via `mcp_tools` input

### Tag Execution Design

- `shouldTriggerTag` inspects incoming GitHub events for `@droid` mentions or automatic-review triggers
- `prepareTagExecution` performs permission checks, creates tracking comments, and delegates to the appropriate command
- Fill/review command modules gather GitHub data, generate prompts, and configure MCP tools

### Comment Threading

- Single tracking comment updated throughout execution
- Progress indicated via dynamic checkboxes
- Links to job runs and created branches/PRs
- Sticky comment option for consolidated PR comments

## Code Conventions

- Use Bun-specific TypeScript configuration with `moduleResolution: "bundler"`
- Strict TypeScript with `noUnusedLocals` and `noUnusedParameters` enabled
- Prefer explicit error handling with detailed error messages
- Use discriminated unions for GitHub context types
- Implement retry logic for GitHub API operations via `utils/retry.ts`
