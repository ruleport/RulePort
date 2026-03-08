# RulePort
> **Write Once, Run Anywhere.** 

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ruleport/RulePort)

Manage your AI assistant rules in one place and sync them across all your tools.

RulePort handles the translation and synchronization of context, coding standards, and project rules between different AI assistants. Instead of maintaining separate `.cursorrules`, `.github/copilot-instructions.md`, and `.claude/rules/` configs, you define them once and let this tool handle the rest.

## ✨ Features

- � **Automatic Sync** - One-time or watch mode synchronization
- 🎯 **Type-Safe** - Built with TypeScript for reliability
- 🧪 **Tested** - Comprehensive test suite with 87+ tests
- 🏗️ **Clean Architecture** - Adapter-based design for easy extensibility
- ✅ **CI-Friendly** - Check command for validating sync status
- 📦 **Zero Config** - Works out of the box with sensible defaults

## �🔌 Supported Assistants

| Source \ Target | Claude Code | Cursor | GitHub Copilot | Google Antigravity | Kiro | Windsurf |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Claude Code** | - | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cursor** | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| **GitHub Copilot** | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| **Google Antigravity** | ✅ | ✅ | ✅ | - | ✅ | ✅ |
| **Kiro** | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| **Windsurf** | ✅ | ✅ | ✅ | ✅ | ✅ | - |

> ✅ = Available Now | - = N/A

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Sync to Assistants
Translate your rules to all configured targets:
```bash
npm run sync
```

## 📖 Usage

### Commands

#### `sync` - Synchronize Rules
Sync rules from source to all targets:
```bash
npm run sync
```

Sync to specific targets:
```bash
npm run sync -- --target copilot
npm run sync -- --target claude --target antigravity
```

Sync a specific project directory:
```bash
npm run sync -- /path/to/project
```

#### `check` - Validate Sync Status (NEW)
Check if generated files are in sync with source rules (useful for CI):
```bash
npm run check
```

This command:
- Computes what files would be generated
- Compares against existing files
- Exits with code 1 if drift is detected
- Exits with code 0 if everything is in sync

Perfect for CI/CD pipelines to ensure rules are always synced!

#### `watch` - Auto-Sync on Changes
Automatically sync when you change rule files:
```bash
npm run sync:watch
```

Press `Ctrl+C` to stop watching.

### Options

#### `--target <name>`
Limit sync to specific assistants:
```bash
npm run sync -- --target copilot
```

**Available targets**: `copilot`, `claude`, `antigravity`, `cursor`, `kiro`, `windsurf`

Default: All targets

#### `--source <name>`
Specify the source to read rules from:
```bash
npm run sync -- --source cursor
npm run sync -- --source claude
npm run sync -- --source kiro
```

**Available sources**: `cursor`, `claude`, `copilot`, `antigravity`, `kiro`, `windsurf`

Default: `cursor`

#### `--watch` / `-w`
Enable watch mode:
```bash
npm run sync -- --watch
# or
npm run sync -- -w
```

#### `--help` / `-h`
Display help information:
```bash
node dist/cli.js --help
```

## 🏗️ Architecture

RulePort uses a clean adapter-based architecture:

```
Sources (Cursor, …)
        │
        ▼
  ┌──────────┐
  │  Rule IR │  ← canonical, typed, deterministic
  └──────────┘
        │
        ▼
Targets (Copilot, Claude, Antigravity, …)
        │
        ▼
 Planned Writes (path + content)
        │
        ▼
   sync / check / watch
```

### Key Principles

- **IR-First**: All conversions go through a canonical Rule IR
- **No Hidden Magic**: Deterministic output only
- **Adapters, Not Conditionals**: Clean separation of concerns
- **Local-First, CI-Friendly**: Works offline, validates in CI

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

View tests in UI:
```bash
npm run test:ui
```

## 📁 Project Structure

```
ruleport/
├── src/                    # TypeScript source code
│   ├── cli.ts             # Main CLI entry point
│   ├── core/              # Core infrastructure
│   │   ├── ir.ts          # Rule IR data model
│   │   ├── frontmatter.ts # YAML parser
│   │   ├── fs.ts          # File operations
│   │   ├── log.ts         # Logging utilities
│   │   └── planner.ts     # Write planning
│   ├── config/            # Configuration
│   │   ├── types.ts       # Type definitions
│   │   └── defaults.ts    # Default values
│   ├── sources/           # Source adapters
│   │   ├── cursor.ts      # Cursor rules reader
│   │   ├── claude.ts      # Claude Code reader
│   │   ├── copilot.ts     # GitHub Copilot reader
│   │   ├── antigravity.ts # Google Antigravity reader
│   │   ├── kiro.ts        # Kiro reader
│   │   └── windsurf.ts    # Windsurf reader
│   ├── targets/           # Target adapters
│   │   ├── copilot.ts     # GitHub Copilot
│   │   ├── claude.ts      # Claude Code
│   │   ├── antigravity.ts # Google Antigravity
│   │   ├── cursor.ts      # Cursor
│   │   ├── kiro.ts        # Kiro
│   │   └── windsurf.ts    # Windsurf
│   └── commands/          # CLI commands
│       ├── sync.ts        # Sync command
│       ├── check.ts       # Check command
│       └── watch.ts       # Watch command
├── tests/                 # Test suite
│   ├── cli.test.ts        # CLI tests
│   ├── cursor.test.ts     # Cursor source adapter tests
│   ├── sources.test.ts    # All other source adapter tests
│   ├── targets.test.ts    # Target adapter tests
│   ├── e2e.test.ts        # End-to-end tests
│   └── fixtures/          # Test fixtures
├── dist/                  # Compiled JavaScript
└── .cursor/rules/         # Your source rules
```

## 🔧 Development

### Build
```bash
npm run build
```

### Development Mode
Run without building (uses `tsx`):
```bash
npm run dev
```

### Code Quality Tools

**Linting**:
```bash
npm run lint      # Check code style
npm run lint:fix  # Fix automatic issues
```

**Type Checking**:
```bash
npm run typecheck # Verify TypeScript types
```

**Pre-commit Hooks**:
This project uses `husky` and `lint-staged`. On every commit, it automatically:
- Fixes linting issues (`eslint --fix`)
- Runs relevant tests (`vitest related`)
- Blocks the commit if checks fail

### Contribution Guidelines

**Conventional Commits**:
We use [Conventional Commits](https://www.conventionalcommits.org/) to automate versioning and changelogs.
Please use one of the following types:
- `feat`: A new feature (minor release)
- `fix`: A bug fix (patch release)
- `chore`: Maintenance, dependencies, etc. (no release)
- `docs`: Documentation changes
- `test`: Adding or correcting tests

Example:
```bash
git commit -m "feat: add support for new target adapter"
```

### Add a New Target Adapter

1. Create `src/targets/your-target.ts`
2. Implement the `render` function that accepts `RuleIR[]` and returns `RenderResult`
3. Add target to `VALID_TARGETS` in `src/config/defaults.ts`
4. Update command routing in `src/commands/sync.ts`
5. Add tests in `tests/targets.test.ts`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, report bugs, or suggest features.

## 📄 License

MIT

## 🙏 Acknowledgments

Built with TypeScript, Vitest, and ❤️ for the AI coding community.
