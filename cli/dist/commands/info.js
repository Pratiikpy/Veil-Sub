"use strict";
// =============================================================================
// @veilsub/cli — info command
//
// Display VeilSub protocol information: programs, transitions, mappings.
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInfo = runInfo;
exports.runPrograms = runPrograms;
const utils_1 = require("../utils");
const PROGRAMS = [
    {
        id: 'veilsub_v29.aleo',
        label: 'Core',
        description: 'Subscriptions, content, tipping, privacy proofs',
        transitions: 31,
        mappings: 30,
        status: 'deployed',
        version: 'v29',
    },
    {
        id: 'veilsub_extras_v1.aleo',
        label: 'Extras',
        description: 'Reviews, lottery, creator badges',
        transitions: 8,
        mappings: 6,
        status: 'planned',
        version: 'v1',
    },
    {
        id: 'veilsub_identity_v1.aleo',
        label: 'Identity',
        description: 'On-chain signatures, ECDSA verification',
        transitions: 4,
        mappings: 3,
        status: 'planned',
        version: 'v1',
    },
    {
        id: 'veilsub_access_v1.aleo',
        label: 'Access',
        description: 'Login with VeilSub (OAuth-like ZK auth)',
        transitions: 5,
        mappings: 4,
        status: 'planned',
        version: 'v1',
    },
    {
        id: 'veilsub_governance_v1.aleo',
        label: 'Governance',
        description: 'Private voting, proposal management',
        transitions: 6,
        mappings: 5,
        status: 'planned',
        version: 'v1',
    },
    {
        id: 'veilsub_marketplace_v1.aleo',
        label: 'Marketplace',
        description: 'Creator reputation, content auctions',
        transitions: 7,
        mappings: 5,
        status: 'planned',
        version: 'v1',
    },
];
const NETWORK = 'Aleo Testnet';
const API_URL = 'https://api.explorer.provable.com/v1/testnet';
// ---------------------------------------------------------------------------
// info command
// ---------------------------------------------------------------------------
function runInfo(jsonMode) {
    if (jsonMode) {
        (0, utils_1.printJson)({
            protocol: 'VeilSub',
            network: NETWORK,
            api: API_URL,
            programs: PROGRAMS.map(p => ({
                id: p.id,
                label: p.label,
                description: p.description,
                transitions: p.transitions,
                mappings: p.mappings,
                status: p.status,
                version: p.version,
            })),
        });
        return;
    }
    (0, utils_1.printHeader)('VeilSub Protocol');
    const rows = [];
    for (const p of PROGRAMS) {
        const statusIcon = p.status === 'deployed'
            ? utils_1.color.green('deployed')
            : utils_1.color.yellow('planned');
        const stats = utils_1.color.dim(`(${p.transitions} transitions, ${p.mappings} mappings)`);
        rows.push({
            label: `${p.label}:`,
            value: `${utils_1.color.cyan(p.id)} ${stats} ${statusIcon}`,
        });
    }
    rows.push({ label: '', value: '' });
    rows.push({ label: 'Network:', value: utils_1.color.cyan(NETWORK) });
    rows.push({ label: 'API:', value: utils_1.color.cyan(API_URL) });
    (0, utils_1.printTable)(rows);
    console.log();
}
// ---------------------------------------------------------------------------
// programs command
// ---------------------------------------------------------------------------
function runPrograms(jsonMode) {
    if (jsonMode) {
        (0, utils_1.printJson)(PROGRAMS);
        return;
    }
    (0, utils_1.printHeader)('VeilSub Programs');
    const divider = '─'.repeat(90);
    console.log(`  ${utils_1.color.bold('Program ID'.padEnd(34))} ` +
        `${utils_1.color.bold('Label'.padEnd(14))} ` +
        `${utils_1.color.bold('Transitions'.padEnd(13))} ` +
        `${utils_1.color.bold('Mappings'.padEnd(10))} ` +
        `${utils_1.color.bold('Status')}`);
    console.log(`  ${utils_1.color.dim(divider)}`);
    for (const p of PROGRAMS) {
        const statusStr = p.status === 'deployed'
            ? utils_1.color.green('deployed')
            : utils_1.color.yellow('planned');
        console.log(`  ${utils_1.color.cyan(p.id.padEnd(34))} ` +
            `${p.label.padEnd(14)} ` +
            `${String(p.transitions).padEnd(13)} ` +
            `${String(p.mappings).padEnd(10)} ` +
            `${statusStr}`);
    }
    console.log();
}
//# sourceMappingURL=info.js.map