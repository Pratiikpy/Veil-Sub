"use strict";
// =============================================================================
// @veilsub/cli — Entry Point
//
// Lightweight command router. Parses process.argv and dispatches to the
// appropriate command handler. Zero runtime dependencies.
//
// Usage: veilsub <command> [options]
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const info_1 = require("./commands/info");
const query_1 = require("./commands/query");
const creator_1 = require("./commands/creator");
const content_1 = require("./commands/content");
const utils_1 = require("./utils");
// ---------------------------------------------------------------------------
// Version & Help
// ---------------------------------------------------------------------------
const VERSION = '0.1.0';
const DEFAULT_PROGRAM = 'veilsub_v29.aleo';
function printVersion() {
    console.log(`@veilsub/cli v${VERSION}`);
}
function printHelp() {
    console.log();
    console.log(utils_1.color.bold(utils_1.color.cyan('  VeilSub CLI')) + utils_1.color.dim(` v${VERSION}`));
    console.log(utils_1.color.dim('  Privacy-first creator subscriptions on Aleo'));
    console.log();
    console.log(utils_1.color.bold('  USAGE'));
    console.log(`    veilsub ${utils_1.color.cyan('<command>')} ${utils_1.color.dim('[options]')}`);
    console.log();
    console.log(utils_1.color.bold('  COMMANDS'));
    console.log(`    ${utils_1.color.cyan('info')}                          Show protocol info (programs, network)`);
    console.log(`    ${utils_1.color.cyan('programs')}                      List all VeilSub programs`);
    console.log(`    ${utils_1.color.cyan('query')} <mapping> <key>         Query any on-chain mapping value`);
    console.log(`    ${utils_1.color.cyan('creator')} <hash>                Get comprehensive creator stats`);
    console.log(`    ${utils_1.color.cyan('subscribers')} <creator_hash>    Get subscriber count for a creator`);
    console.log(`    ${utils_1.color.cyan('revenue')} <creator_hash>        Get total revenue for a creator`);
    console.log(`    ${utils_1.color.cyan('tiers')} <creator_hash>          Get tier prices for a creator`);
    console.log(`    ${utils_1.color.cyan('content')} <content_hash>        Get content metadata`);
    console.log(`    ${utils_1.color.cyan('disputes')} <content_hash>       Get dispute count for content`);
    console.log(`    ${utils_1.color.cyan('platform')}                      Get platform-wide statistics`);
    console.log(`    ${utils_1.color.cyan('help')}                          Show this help message`);
    console.log(`    ${utils_1.color.cyan('version')}                       Show version`);
    console.log();
    console.log(utils_1.color.bold('  OPTIONS'));
    console.log(`    ${utils_1.color.cyan('--json')}                        Output as JSON (machine-readable)`);
    console.log(`    ${utils_1.color.cyan('--program')} <id>                Override program ID (default: ${DEFAULT_PROGRAM})`);
    console.log();
    console.log(utils_1.color.bold('  EXAMPLES'));
    console.log(utils_1.color.dim('    # Show protocol info'));
    console.log('    veilsub info');
    console.log();
    console.log(utils_1.color.dim('    # Query a mapping'));
    console.log('    veilsub query tier_prices 5895434346742188517605628668414418785502575139839733911875586046449923524635field');
    console.log();
    console.log(utils_1.color.dim('    # Get creator stats as JSON'));
    console.log('    veilsub creator 5895434...field --json');
    console.log();
    console.log(utils_1.color.dim('    # Get platform-wide stats'));
    console.log('    veilsub platform');
    console.log();
}
// ---------------------------------------------------------------------------
// Command Router
// ---------------------------------------------------------------------------
async function main() {
    const rawArgs = process.argv.slice(2);
    // Extract global flags
    const jsonMode = (0, utils_1.hasFlag)(rawArgs, '--json');
    const programOverride = (0, utils_1.getFlagValue)(rawArgs, '--program');
    const programId = programOverride ?? DEFAULT_PROGRAM;
    // Remove flags from args to get positional args
    const positionalArgs = [];
    let i = 0;
    while (i < rawArgs.length) {
        if (rawArgs[i] === '--json') {
            i++;
            continue;
        }
        if (rawArgs[i] === '--program') {
            i += 2; // skip flag and its value
            continue;
        }
        positionalArgs.push(rawArgs[i]);
        i++;
    }
    const command = positionalArgs[0];
    const commandArgs = positionalArgs.slice(1);
    if (!command || command === 'help' || (0, utils_1.hasFlag)(rawArgs, '--help') || (0, utils_1.hasFlag)(rawArgs, '-h')) {
        printHelp();
        return;
    }
    if (command === 'version' || (0, utils_1.hasFlag)(rawArgs, '--version') || (0, utils_1.hasFlag)(rawArgs, '-v')) {
        printVersion();
        return;
    }
    switch (command) {
        case 'info':
            (0, info_1.runInfo)(jsonMode);
            break;
        case 'programs':
            (0, info_1.runPrograms)(jsonMode);
            break;
        case 'query':
            await (0, query_1.runQuery)(commandArgs, programId, jsonMode);
            break;
        case 'creator':
            await (0, creator_1.runCreator)(commandArgs, programId, jsonMode);
            break;
        case 'subscribers':
            await (0, creator_1.runSubscribers)(commandArgs, programId, jsonMode);
            break;
        case 'revenue':
            await (0, creator_1.runRevenue)(commandArgs, programId, jsonMode);
            break;
        case 'tiers':
            await (0, creator_1.runTiers)(commandArgs, programId, jsonMode);
            break;
        case 'content':
            await (0, content_1.runContent)(commandArgs, programId, jsonMode);
            break;
        case 'disputes':
            await (0, content_1.runDisputes)(commandArgs, programId, jsonMode);
            break;
        case 'platform':
            await (0, content_1.runPlatform)(programId, jsonMode);
            break;
        default:
            (0, utils_1.printError)(`Unknown command: ${command}`);
            console.log(`Run ${utils_1.color.cyan('veilsub help')} to see available commands.`);
            process.exitCode = 1;
    }
}
// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main().catch((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    (0, utils_1.printError)(`Unexpected error: ${msg}`);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map