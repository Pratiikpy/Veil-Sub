# @veilsub/cli

Command-line interface for the VeilSub privacy protocol on Aleo. Query on-chain state, inspect creator stats, and explore content metadata — all from your terminal.

## Installation

```bash
# From the monorepo
cd cli && npm install && npm run build

# Global install (once published)
npm install -g @veilsub/cli

# Or run directly
npx @veilsub/cli info
```

## Usage

```
veilsub <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `info` | Show protocol info (programs, network, API endpoint) |
| `programs` | List all VeilSub programs with transition/mapping counts |
| `query <mapping> <key>` | Query any on-chain mapping value |
| `creator <hash>` | Get comprehensive creator statistics |
| `subscribers <creator_hash>` | Get subscriber count for a creator |
| `revenue <creator_hash>` | Get total revenue for a creator |
| `tiers <creator_hash>` | Get tier prices for a creator |
| `content <content_hash>` | Get content metadata |
| `disputes <content_hash>` | Get dispute count for content |
| `platform` | Get platform-wide statistics |
| `help` | Show help message |
| `version` | Show version |

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (machine-readable) |
| `--program <id>` | Override program ID (default: `veilsub_v29.aleo`) |

## Examples

### Show protocol info

```bash
$ veilsub info

VeilSub Protocol
────────────────────────────────────────
  Core:         veilsub_v29.aleo (31 transitions, 30 mappings) deployed
  Extras:       veilsub_extras_v1.aleo (8 transitions, 6 mappings) planned
  Identity:     veilsub_identity_v1.aleo (4 transitions, 3 mappings) planned
  Access:       veilsub_access_v1.aleo (5 transitions, 4 mappings) planned
  Governance:   veilsub_governance_v1.aleo (6 transitions, 5 mappings) planned
  Marketplace:  veilsub_marketplace_v1.aleo (7 transitions, 5 mappings) planned

  Network:      Aleo Testnet
  API:          https://api.explorer.provable.com/v1/testnet
```

### Query a mapping

```bash
$ veilsub query tier_prices 5895434346742188517605628668414418785502575139839733911875586046449923524635field

Query: tier_prices
────────────────────────────────────────
  Program:  veilsub_v29.aleo
  Mapping:  tier_prices
  Key:      5895434...4635field
  Raw:      3000000u64
  Value:    3,000,000 microcredits (3.0 ALEO)
```

### Get creator stats

```bash
$ veilsub creator 5895434346742188517605628668414418785502575139839733911875586046449923524635field

Creator Stats
────────────────────────────────────────
  Creator Hash:   5895434...4635field
  Status:         Registered
  Base Price:     3,000,000 microcredits (3.0 ALEO)
  Subscribers:    3
  Total Revenue:  9,000,000 microcredits (9.0 ALEO)
  Content:        4
  Tiers:          2
```

### Get platform stats as JSON

```bash
$ veilsub platform --json
{
  "program": "veilsub_v29.aleo",
  "totalCreators": 5,
  "totalContent": 12,
  "platformRevenue": 450000,
  "platformRevenueAleo": 0.45
}
```

### Query with custom program

```bash
$ veilsub query tier_prices 123field --program veilsub_v29.aleo
```

## Design Principles

- **Zero runtime dependencies** — uses only Node.js built-ins and the Fetch API
- **Fast startup** — no heavy CLI frameworks, simple arg parsing
- **Colored output** — ANSI escape codes (respects `NO_COLOR` env variable)
- **Machine-readable** — `--json` flag on every command for scripting
- **Read-only** — queries on-chain state, never sends transactions
- **TypeScript strict mode** — full type safety

## Development

```bash
# Build
npm run build

# Run directly
node dist/index.js info

# Link globally for development
npm link
veilsub info
```

## Architecture

```
cli/
├── package.json          # Package config, bin entry
├── tsconfig.json         # TypeScript strict mode
├── bin/
│   └── veilsub.js        # Shebang entry point
├── src/
│   ├── index.ts           # Command router (process.argv parsing)
│   ├── utils.ts           # Colors, formatting, parsing helpers
│   └── commands/
│       ├── info.ts        # info, programs commands
│       ├── query.ts       # Generic mapping query + fetchMapping helper
│       ├── creator.ts     # creator, subscribers, revenue, tiers commands
│       └── content.ts     # content, disputes, platform commands
└── dist/                  # Compiled JavaScript output
```

## License

MIT
