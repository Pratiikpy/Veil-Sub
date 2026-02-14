// Comprehensive XHR polyfill for Node.js WASM
// The WASM module may look for XMLHttpRequest on self, window, or globalThis
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XMLHttpRequest = require('xhr2');

// Set on all possible global references the WASM might use
globalThis.XMLHttpRequest = XMLHttpRequest;
globalThis.self = globalThis.self || globalThis;
globalThis.window = globalThis.window || globalThis;

// Also polyfill performance.now if missing (WASM might need it)
if (!globalThis.performance) {
  const { performance } = await import('perf_hooks');
  globalThis.performance = performance;
}

import { ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient, Account } from '@provablehq/sdk';
import fs from 'fs';
import https from 'https';
import http from 'http';

const PRIVATE_KEY_STR = process.env.ALEO_PRIVATE_KEY;
if (!PRIVATE_KEY_STR) {
  console.error('ERROR: ALEO_PRIVATE_KEY environment variable is required.');
  console.error('Usage: ALEO_PRIVATE_KEY=APrivateKey1... node deploy.mjs');
  process.exit(1);
}
const PROGRAM_PATH = './contracts/veilsub/build/main.aleo';
const NETWORK_URL = 'https://api.explorer.provable.com/v1';

// Monkey-patch xhr2 to handle large binary downloads better
const OrigXHR = XMLHttpRequest;
class PatchedXHR extends OrigXHR {
  open(method, url, async) {
    console.log(`[XHR] ${method} ${url} (async=${async})`);
    return super.open(method, url, async !== undefined ? async : true);
  }
}
globalThis.XMLHttpRequest = PatchedXHR;
globalThis.self.XMLHttpRequest = PatchedXHR;

async function deploy() {
  console.log('Reading program source...');
  const programSource = fs.readFileSync(PROGRAM_PATH, 'utf8');
  console.log(`Program size: ${programSource.length} chars`);

  console.log('Creating Account from private key...');
  const account = new Account({ privateKey: PRIVATE_KEY_STR });
  console.log(`Address: ${account.address().to_string()}`);

  console.log('Initializing network client...');
  const networkClient = new AleoNetworkClient(NETWORK_URL);

  console.log('Setting up key provider...');
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  console.log('Setting up record provider...');
  const recordProvider = new NetworkRecordProvider(account, networkClient);

  console.log('Creating ProgramManager...');
  const pm = new ProgramManager(NETWORK_URL, keyProvider, recordProvider);
  pm.setAccount(account);

  console.log('Deploying to testnet...');
  console.log('Time started:', new Date().toLocaleTimeString());

  try {
    const txId = await pm.deploy(programSource, 1_000_000);
    console.log(`\nDeployment transaction submitted!`);
    console.log(`Transaction ID: ${txId}`);
    console.log(`Explorer: https://explorer.aleo.org/testnet/transaction/${txId}`);
    console.log('Time finished:', new Date().toLocaleTimeString());
  } catch (err) {
    console.error('Deploy failed:', err.message || err);
  }
}

deploy().catch(console.error);
