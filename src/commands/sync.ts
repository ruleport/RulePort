import type { CLIConfig } from '../config/types.js';
import { getPaths } from '../config/defaults.js';
import { loadCursorRules } from '../sources/cursor.js';
import { loadClaudeRules } from '../sources/claude.js';
import { loadCopilotRules } from '../sources/copilot.js';
import { loadAntigravityRules } from '../sources/antigravity.js';
import { loadKiroRules } from '../sources/kiro.js';
import { loadWindsurfRules } from '../sources/windsurf.js';
import { renderCopilot } from '../targets/copilot.js';
import { renderClaude } from '../targets/claude.js';
import { renderAntigravity } from '../targets/antigravity.js';
import { renderCursor } from '../targets/cursor.js';
import { renderKiro } from '../targets/kiro.js';
import { renderWindsurf } from '../targets/windsurf.js';
import { writeFileAtomic } from '../core/fs.js';
import type { RuleIR } from '../core/ir.js';
import * as log from '../core/log.js';

/**
 * Human-readable display names for each source provider.
 */
const SOURCE_NAMES: Record<string, string> = {
    cursor: 'Cursor',
    claude: 'Claude Code',
    copilot: 'GitHub Copilot',
    antigravity: 'Antigravity',
    kiro: 'Kiro',
    windsurf: 'Windsurf',
};

/**
 * Human-readable display names for each target provider.
 */
const TARGET_NAMES: Record<string, string> = {
    copilot: 'GitHub Copilot',
    claude: 'Claude Code',
    antigravity: 'Antigravity',
    cursor: 'Cursor',
    kiro: 'Kiro',
    windsurf: 'Windsurf',
};

/**
 * Load rules from the configured source.
 */
function loadRules(config: CLIConfig, paths: ReturnType<typeof getPaths>): RuleIR[] {
    switch (config.source) {
        case 'cursor':
            return loadCursorRules(paths.sources.cursor);
        case 'claude':
            return loadClaudeRules(paths.sources.claude);
        case 'copilot':
            return loadCopilotRules(paths.sources.copilot);
        case 'antigravity':
            return loadAntigravityRules(paths.sources.antigravity);
        case 'kiro':
            return loadKiroRules(paths.sources.kiro);
        case 'windsurf':
            return loadWindsurfRules(paths.sources.windsurf);
        default:
            throw new Error(`Unknown source: ${config.source}`);
    }
}

/**
 * Execute the sync command.
 * Loads rules from source and syncs to all configured targets.
 *
 * @param config - CLI configuration
 */
export function syncCommand(config: CLIConfig): void {
    const paths = getPaths(config.baseDir);
    log.debug(`Paths: ${JSON.stringify(paths, null, 2)}`);

    const sourceName = SOURCE_NAMES[config.source] ?? config.source;
    log.info(`🔄 Syncing AI rules (Source: ${sourceName})...\n`);

    // Load rules from source
    let rules: RuleIR[];
    try {
        rules = loadRules(config, paths);
    } catch (error) {
        log.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }

    log.debug(`Loaded ${rules.length} rules from ${paths.sources[config.source]}`);

    if (rules.length === 0) {
        log.warn(`No rules found in ${sourceName} source directory.`);
        log.indent('Create rule files to get started.\n');
        return;
    }

    log.info(`📋 Found ${rules.length} rule(s):\n`);
    for (const rule of rules) {
        const globs = rule.globs.length > 0 ? ` (${rule.globs.length} pattern(s))` : '';
        const always = rule.alwaysApply ? ' [always]' : '';
        log.bullet(`${rule.id}${globs}${always}`);
    }
    log.info('');

    let successCount = 0;
    let errorCount = 0;
    const allWarnings: string[] = [];

    // Render to each target
    for (const target of config.targets) {
        const targetName = TARGET_NAMES[target] ?? target;
        log.info(`📝 Syncing to ${targetName}...`);

        try {
            let result;

            if (target === 'copilot') {
                result = renderCopilot(rules, paths);
            } else if (target === 'claude') {
                result = renderClaude(rules, paths);
            } else if (target === 'antigravity') {
                result = renderAntigravity(rules, paths);
            } else if (target === 'cursor') {
                result = renderCursor(rules, paths);
            } else if (target === 'kiro') {
                result = renderKiro(rules, paths);
            } else if (target === 'windsurf') {
                result = renderWindsurf(rules, paths);
            } else {
                throw new Error(`Unknown target: ${target}`);
            }

            // Write all files
            for (const write of result.writes) {
                log.debug(`Writing file: ${write.path}`);
                writeFileAtomic(write.path, write.content);
            }

            // Collect warnings
            allWarnings.push(...result.warnings);

            // Report success
            if (target === 'copilot') {
                const individualFiles = result.writes.length - 1;
                log.indent(`✓ Created ${individualFiles} instruction file(s) in .github/instructions/`);
                log.indent(`✓ Created consolidated .github/copilot-instructions.md`);
            } else if (target === 'claude') {
                const individualFiles = result.writes.length - 1;
                log.indent(`✓ Created ${individualFiles} rule file(s) in .claude/rules/`);
                log.indent(`✓ Created consolidated .claude/CLAUDE.md`);
            } else if (target === 'antigravity') {
                const individualFiles = result.writes.length - 1;
                log.indent(`✓ Created ${individualFiles} rule file(s) in .agent/rules/`);
                log.indent(`✓ Created consolidated .gemini/GEMINI.md`);
            } else if (target === 'cursor') {
                log.indent(`✓ Created ${result.writes.length} rule file(s) in .cursor/rules/`);
            } else if (target === 'kiro') {
                log.indent(`✓ Created ${result.writes.length} steering file(s) in .kiro/steering/`);
            } else if (target === 'windsurf') {
                log.indent(`✓ Created ${result.writes.length} rule file(s) in .windsurf/rules/`);
            }

            successCount++;
        } catch (error) {
            log.error(`❌ ${targetName}: ${error instanceof Error ? error.message : String(error)}`);
            errorCount++;
        }
    }

    // Print warnings if any
    if (allWarnings.length > 0) {
        log.info('');
        log.warn('Warnings:');
        for (const warning of allWarnings) {
            log.indent(warning);
        }
    }

    if (errorCount > 0) {
        log.warn(`\n📊 Sync complete: ${successCount} succeeded, ${errorCount} failed\n`);
    } else {
        log.info(`\n📊 Sync complete: ${successCount} succeeded, ${errorCount} failed\n`);
    }
}
