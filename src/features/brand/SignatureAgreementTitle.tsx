/**
 * Signature heading, inspired by the approved restrained manuscript initial.
 * Dynamic text only. The decorative initial is typographic, never a fake image
 * of the Agreement. Screen readers receive the plain, uninterrupted title.
 */
export function SignatureAgreementTitle({ title }: { title: string }) {
  const clean = title.trim();
  const parts = Array.from(clean);
  const initial = parts[0] ?? '';
  const eligible = parts.length > 2 && /^\p{L}$/u.test(initial);
  if (!eligible) return <>{clean}</>;
  return <span className="sp-initial-title">
    <span className="sr-only">{clean}</span>
    <span aria-hidden="true" className="sp-initial-letter">{initial}</span>
    <span aria-hidden="true">{parts.slice(1).join('')}</span>
  </span>;
}
