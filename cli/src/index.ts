// =============================================================================
// @veilsub/cli — Entry Point
//
// Lightweight command router. Parses process.argv and dispatches to the
// appropriate command handler. Zero runtime dependencies.
//
// Usage: veilsub <command> [options]
// =============================================================================

import { runInfo, runPrograms } from './commands/info';
import { runQuery } from './commands/query';
import { runCreator, runSubscribers, runRevenue, runTiers } from './commands/creator';
import { runContent, runDisputes, runPlatform } from './commands/content';
import { color, printError, hasFlag, getFlagValue } from './utils';

// ---------------------------------------------------------------------------
// Version & Help
// ---------------------------------------------------------------------------

const VERSION = '0.1.0';
const DEFAULT_PROGRAM = 'veilsub_v29.aleo';

function printVersion(): void {
  console.log(`@veilsub/cli v${VERSION}`);
}

function printHelp(): void {
  console.log();
  console.log(color.bold(color.cyan('  VeilSub CLI')) + color.dim(` v${VERSION}`));
  console.log(color.dim('  Privacy-first creator subscriptions on Aleo'));
  console.log();
  console.log(color.bold('  USAGE'));
  console.log(`    veilsub ${color.cyan('<command>')} ${color.dim('[options]')}`);
  console.log();
  console.log(color.bold('  COMMANDS'));
  console.log(`    ${color.cyan('info')}                          Show protocol info (programs, network)`);
  console.log(`    ${color.cyan('programs')}                      List all VeilSub programs`);
  console.log(`    ${color.cyan('query')} <mapping> <key>         Query any on-chain mapping value`);
  console.log(`    ${color.cyan('creator')} <hash>                Get comprehensive creator stats`);
  console.log(`    ${color.cyan('subscribers')} <creator_hash>    Get subscriber count for a creator`);
  console.log(`    ${color.cyan('revenue')} <creator_hash>        Get total revenue for a creator`);
  console.log(`    ${color.cyan('tiers')} <creator_hash>          Get tier prices for a creator`);
  console.log(`    ${color.cyan('content')} <content_hash>        Get content metadata`);
  console.log(`    ${color.cyan('disputes')} <content_hash>       Get dispute count for content`);
  console.log(`    ${color.cyan('platform')}                      Get platform-wide statistics`);
  console.log(`    ${color.cyan('help')}                          Show this help message`);
  console.log(`    ${color.cyan('version')}                       Show version`);
  console.log();
  console.log(color.bold('  OPTIONS'));
  console.log(`    ${color.cyan('--json')}                        Output as JSON (machine-readable)`);
  console.log(`    ${color.cyan('--program')} <id>                Override program ID (default: ${DEFAULT_PROGRAM})`);
  console.log();
  console.log(color.bold('  EXAMPLES'));
  console.log(color.dim('    # Show protocol info'));
  console.log('    veilsub info');
  console.log();
  console.log(color.dim('    # Query a mapping'));
  console.log('    veilsub query tier_prices 5895434346742188517605628668414418785502575139839733911875586046449923524635field');
  console.log();
  console.log(color.dim('    # Get creator stats as JSON'));
  console.log('    veilsub creator 5895434...field --json');
  console.log();
  console.log(color.dim('    # Get platform-wide stats'));
  console.log('    veilsub platform');
  console.log();
}

// ---------------------------------------------------------------------------
// Command Router
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  // Extract global flags
  const jsonMode = hasFlag(rawArgs, '--json');
  const programOverride = getFlagValue(rawArgs, '--program');
  const programId = programOverride ?? DEFAULT_PROGRAM;

  // Remove flags from args to get positional args
  const positionalArgs: string[] = [];
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

  if (!command || command === 'help' || hasFlag(rawArgs, '--help') || hasFlag(rawArgs, '-h')) {
    printHelp();
    return;
  }

  if (command === 'version' || hasFlag(rawArgs, '--version') || hasFlag(rawArgs, '-v')) {
    printVersion();
    return;
  }

  switch (command) {
    case 'info':
      runInfo(jsonMode);
      break;

    case 'programs':
      runPrograms(jsonMode);
      break;

    case 'query':
      await runQuery(commandArgs, programId, jsonMode);
      break;

    case 'creator':
      await runCreator(commandArgs, programId, jsonMode);
      break;

    case 'subscribers':
      await runSubscribers(commandArgs, programId, jsonMode);
      break;

    case 'revenue':
      await runRevenue(commandArgs, programId, jsonMode);
      break;

    case 'tiers':
      await runTiers(commandArgs, programId, jsonMode);
      break;

    case 'content':
      await runContent(commandArgs, programId, jsonMode);
      break;

    case 'disputes':
      await runDisputes(commandArgs, programId, jsonMode);
      break;

    case 'platform':
      await runPlatform(programId, jsonMode);
      break;

    default:
      printError(`Unknown command: ${command}`);
      console.log(`Run ${color.cyan('veilsub help')} to see available commands.`);
      process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  printError(`Unexpected error: ${msg}`);
  process.exitCode = 1;
});
