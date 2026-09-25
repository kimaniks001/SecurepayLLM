import assert from 'node:assert/strict';
import { test } from 'node:test';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

// KS001 Upgrade Phase 5 continuation (Slice 2, Section 13) -- a genuine encode-then-decode round-trip
// proof that a QR code built from a SecurePay-shaped public URL is correctly recoverable byte-for-byte.
// This uses the `qrcode` encoder + `jsqr` decoder pair (both mature, independently-maintained libraries)
// rather than exercising `qrcode.react`'s own internal renderer directly -- `qrcode.react` has no
// server-side/Node decode path available in this environment. This is real verification of the QR
// format/error-correction approach this feature relies on, but it is NOT a claim that `SecureLinkQrCode`'s
// exact rendered SVG has been decoded, and it is NOT a physical camera scan -- see the Phase 5 completion
// report's own honest verification section for what was and was not done.

async function encodeToPngBuffer(text, options = {}) {
  return QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: 'M', margin: 2, ...options });
}

function decodePng(buffer) {
  const png = PNG.sync.read(buffer);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return result ? result.data : null;
}

test('a short SecureLink-shaped URL round-trips exactly through QR encode/decode', async () => {
  const url = 'https://securepay.ke/s/amani-0000000000000000000000000';
  const buffer = await encodeToPngBuffer(url);
  const decoded = decodePng(buffer);
  assert.equal(decoded, url);
});

test('a URL with a reverse-proxy path prefix round-trips exactly', async () => {
  const url = 'https://securepay.ke/public/s/kilimo-abcdefghjkmnpqrstvwxyz0000';
  const buffer = await encodeToPngBuffer(url);
  const decoded = decodePng(buffer);
  assert.equal(decoded, url);
});

test('a KeyContract-path-class URL round-trips exactly', async () => {
  const url = 'https://securepay.ke/k/uzuri-1111111111111111111111111';
  const buffer = await encodeToPngBuffer(url);
  const decoded = decodePng(buffer);
  assert.equal(decoded, url);
});

test('the decoded text never includes anything beyond the exact encoded URL (no truncation, no padding)', async () => {
  const url = 'https://securepay.ke/s/mzuri-2222222222222222222222222';
  const buffer = await encodeToPngBuffer(url);
  const decoded = decodePng(buffer);
  assert.equal(decoded?.length, url.length);
  assert.equal(decoded, url);
});

test('error correction level M leaves enough recovery margin to still decode after a small block of modules is corrupted', async () => {
  // Simulates a small centre obstruction (e.g. print smudging) without going anywhere near
  // level M's real recovery ceiling -- a coarse sanity check on the error-correction choice,
  // not a claim about any specific logo-overlay design (this feature ships unbranded -- see QrCode.tsx).
  const url = 'https://securepay.ke/s/salama-3333333333333333333333333';
  const buffer = await encodeToPngBuffer(url, { scale: 8 });
  const png = PNG.sync.read(buffer);
  const cx = Math.floor(png.width / 2);
  const cy = Math.floor(png.height / 2);
  const blockRadius = Math.floor(png.width * 0.06); // small, centred obstruction
  for (let y = cy - blockRadius; y <= cy + blockRadius; y++) {
    for (let x = cx - blockRadius; x <= cx + blockRadius; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
      png.data[idx + 3] = 255;
    }
  }
  const corruptedBuffer = PNG.sync.write(png);
  const decoded = decodePng(corruptedBuffer);
  assert.equal(decoded, url);
});
