/**
 * UUID v4 that also works outside a secure context.
 *
 * `crypto.randomUUID()` is exposed only on secure origins — HTTPS, plus the
 * `localhost` / `127.0.0.1` exceptions. On a plain-HTTP deployment reached by raw IP
 * (e.g. `http://<ip>:3004`) the browser withholds it, so the call throws
 * "crypto.randomUUID is not a function".
 *
 * `crypto.getRandomValues()` carries no such gate, so derive the UUID from it and keep
 * `Math.random()` as a last resort. These ids only correlate a conversation with its
 * transcript, so a non-cryptographic fallback is acceptable here — do not reuse this
 * for tokens, session ids, or anything else security-bearing.
 */
export function randomId(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined;

  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
