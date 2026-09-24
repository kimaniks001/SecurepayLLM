import { QRCodeSVG } from 'qrcode.react';

/**
 * KS001 Upgrade Phase 5 continuation (Slice 2, Sections 12/13) — encodes ONLY the exact server-issued
 * `publicUrl`, never a client-reconstructed URL, never an internal Agreement/product/locator id.
 *
 * Deliberately UNBRANDED this round (no SecurePay icon cut into the centre): the mandate's own guidance
 * is "if there is any uncertainty, ship a clean unbranded-centre QR first — scan reliability is more
 * important than decoration," and no physical camera scan was available in this environment to verify a
 * logo-cutout code stays reliably scannable at real print/screen sizes (see the Phase 5 completion
 * report's own honest verification section). Error correction is set to 'M' (15% recovery), a
 * conventional, safe default for a plain, undecorated code — 'Q'/'H' are reserved for a future round
 * that adds a verified centre-logo overlay and needs the extra recovery budget that overlay consumes.
 */
export function SecureLinkQrCode({ publicUrl, size = 176 }: { publicUrl: string; size?: number }) {
  return (
    <QRCodeSVG
      value={publicUrl}
      size={size}
      level="M"
      bgColor="#ffffff"
      fgColor="#162d21"
      role="img"
      aria-label="QR code for this SecureLink"
    />
  );
}
