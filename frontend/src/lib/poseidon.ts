/**
 * Client-side Poseidon2 hash computation using @provablehq/wasm.
 *
 * On-chain, all content/creator mappings are keyed by Poseidon2::hash_to_field(input).
 * JavaScript can't natively compute this (BLS12-377 field arithmetic), so we
 * dynamically load the Aleo WASM binary which includes the exact same Poseidon2
 * implementation used by the Leo compiler and snarkVM prover.
 *
 * The WASM module (~2.6 MB) is loaded lazily — only when a hash is needed
 * (e.g., at content publish time), not on every page load.
 */

let wasmLoaded = false
let Poseidon2Class: any = null
let FieldClass: any = null

async function ensureWasm(): Promise<boolean> {
  if (wasmLoaded) return true
  try {
    const wasm = await import('@provablehq/wasm')
    Poseidon2Class = wasm.Poseidon2
    FieldClass = wasm.Field
    wasmLoaded = true
    return true
  } catch (e) {
    console.error('[poseidon] Failed to load @provablehq/wasm:', e)
    return false
  }
}

/**
 * Compute Poseidon2::hash_to_field(input) for a single field value.
 * Returns the hash as a string like "12345field", or null on failure.
 *
 * @param input - Field value string, e.g. "259582625469377415105313169923451102157field"
 */
export async function poseidon2HashField(input: string): Promise<string | null> {
  if (!(await ensureWasm())) return null
  try {
    const fieldInput = input.endsWith('field') ? input : `${input}field`
    const hasher = new Poseidon2Class()
    const field = FieldClass.fromString(fieldInput)
    const result = hasher.hash([field])
    const hash = result.toString()
    hasher.free()
    return hash
  } catch (e) {
    console.error('[poseidon] Hash computation failed:', e)
    return null
  }
}
