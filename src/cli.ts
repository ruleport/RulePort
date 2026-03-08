#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { CLIConfig } from './config/types.js';
import { getDefaultConfig, VALID_TARGETS, VALID_SOURCES } from './config/defaults.js';
import { syncCommand } from './commands/sync.js';
import { checkCommand } from './commands/check.js';
import { watchCommand } from './commands/watch.js';
import * as log from './core/log.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
    return pkg.version;
}

/**
 * Parse command-line arguments into CLI configuration.
 * Matches the behavior of the JavaScript version's parseArgs function.
 * 
 * @param args - Command-line arguments (excluding node and script path)
 * @returns Parsed configuration
 */
// Helper to check if a string is a valid target
function isValidTarget(target: string): target is typeof VALID_TARGETS[number] {
    return (VALID_TARGETS as readonly string[]).includes(target);
}

// Helper to check if a string is a valid source
function isValidSource(source: string): source is typeof VALID_SOURCES[number] {
    return (VALID_SOURCES as readonly string[]).includes(source);
}

// Helper to check if a string is a valid log level
function isValidLogLevel(level: string): level is import('./config/types.js').LogLevel {
    return ['error', 'warn', 'info', 'debug', 'trace'].includes(level);
}

/**
 * Parse command-line arguments into CLI configuration.
 * Matches the behavior of the JavaScript version's parseArgs function.
 * 
 * @param args - Command-line arguments (excluding node and script path)
 * @returns Parsed configuration
 */
function parseArgs(args: string[]): CLIConfig {
    const config = getDefaultConfig();

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--watch' || arg === '-w') {
            config.isWatchMode = true;
        } else if (arg === '--source') {
            if (i + 1 < args.length) {
                const source = args[++i];
                if (isValidSource(source)) {
                    config.source = source;
                } else {
                    // Store the invalid value to let validation report a clear error later
                    config.source = source as typeof VALID_SOURCES[number];
                }
            } else {
                throw new Error('--source requires a value');
            }
        } else if (arg === '--target') {
            if (i + 1 < args.length) {
                const target = args[++i];
                if (isValidTarget(target)) {
                    config.targets.push(target);
                } else {
                    // Start of change: Use explicit type assertion
                    config.targets.push(target as import('./config/types.js').CLIConfig['targets'][number]);
                }
            } else {
                throw new Error('--target requires a value');
            }
        } else if (arg === '--log-level') {
            if (i + 1 < args.length) {
                const level = args[++i];
                if (isValidLogLevel(level)) {
                    config.logLevel = level;
                } else {
                    throw new Error(`Invalid log level "${level}". Must be one of: error, warn, info, debug, trace`);
                }
            } else {
                throw new Error('--log-level requires a value');
            }
        } else if (arg.startsWith('-')) {
            log.warn(`Warning: Unknown flag "${arg}" ignored.`);
        } else {
            // Positional argument
            const potentialTarget = arg.toLowerCase();
            if (isValidTarget(potentialTarget)) {
                log.info(`💡 Treating positional argument "${arg}" as target.`);
                config.targets.push(potentialTarget);
            } else {
                if (config.isBaseDirExplicit) {
                    throw new Error(`Multiple paths provided. First: "${config.baseDir}", Second: "${path.resolve(arg)}"`);
                }
                config.baseDir = path.resolve(arg);
                config.isBaseDirExplicit = true;
                log.info(`📂 Using project root: ${config.baseDir}\n`);
            }
        }
    }

    // Validation
    if (!isValidSource(config.source)) {
        throw new Error(`Invalid source "${config.source}". Valid sources: ${VALID_SOURCES.join(', ')}`);
    }

    if (config.targets.length === 0) {
        config.targets.push(...VALID_TARGETS);
    } else {
        const invalidTargets = config.targets.filter(t => !isValidTarget(t as string));
        if (invalidTargets.length > 0) {
            throw new Error(`Invalid targets: ${invalidTargets.join(', ')}`);
        }
    }

    return config;
}

/**
 * Display help text.
 */
function showHelp(): void {
    console.log(`
RulePort v${getVersion()} - Unified AI assistant rules syncing utility

Usage:
  ruleport [path] [options]
  ruleport [command] [path] [options]

Commands:
  sync      Sync rules from source to targets (default)
  check     Check if rules are in sync (exits 1 if drift detected)
  watch     Watch for changes and auto-sync

Options:
  --version, -v         Print version and exit
  --watch, -w           Watch for changes and auto-sync
  --source <name>       Source to read from (default: cursor)
                        Valid sources: cursor, claude, copilot, antigravity, kiro, windsurf
  --target <name>       Target to sync to (can be specified multiple times)
                        Valid targets: copilot, claude, antigravity, cursor, kiro, windsurf
                        Default: all targets
  --log-level <level>   Set log level (error, warn, info, debug, trace)
                        Default: warn

Examples:
  ruleport                           # Sync all targets in current directory
  ruleport /path/to/project          # Sync all targets in specified directory
  ruleport --target copilot          # Sync only to GitHub Copilot
  ruleport --watch                   # Watch mode
  ruleport check                     # Check sync status (for CI)
  ruleport --log-level debug         # Run with debug logging


Legacy scripts:
  npm run legacy:sync                # Run original JavaScript version
`);
}

/**
 * Main CLI entry point.
 */
function main(): void {
    const args = process.argv.slice(2);

    // Handle version flag
    if (args.includes('--version') || args.includes('-v')) {
        console.log(getVersion());
        process.exit(0);
    }

    // Handle help flag
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    // Handle command
    let command = 'sync';
    let commandArgs = args;

    if (args.length > 0 && ['sync', 'check', 'watch'].includes(args[0])) {
        command = args[0];
        commandArgs = args.slice(1);
    }

    try {
        const config = parseArgs(commandArgs);

        // Initialize log level
        log.setLogLevel(config.logLevel);

        // Route to appropriate command
        if (command === 'check') {
            checkCommand(config);
        } else if (command === 'watch' || config.isWatchMode) {
            watchCommand(config);
        } else {
            syncCommand(config);
        }
    } catch (error) {
        log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

main();

export { parseArgs, main };
