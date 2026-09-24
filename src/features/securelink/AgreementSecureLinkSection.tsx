import { useEffect, useState } from 'react';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { createSecureLinkCreateController } from './createController';
import { createSecureLinkManageController } from './manageController';
import { SecureLinkManagePanel } from './SecureLinkManagePanel';

type SecureLinkGateway = Pick<AgreementGateway, 'activateProduct' | 'issuePublicLocator' | 'activeLocator' | 'rotatePublicLocator' | 'revokePublicLocator'>;

/**
 * KS001 Upgrade Phase 5 continuation (Slice 4, UR-148) — the PERSISTENT SecureLink entry point the
 * Agreement workspace was missing entirely: previously "Create SecureLink" existed only inside the
 * one-time post-SET handoff moment, which could never be revisited for an already-existing Agreement,
 * and which (per this slice's own archaeology) could never legitimately succeed at that exact moment
 * anyway. This reuses Slice 2's own, unmodified `SecureLinkManagePanel`/`CreateSecureLinkPanel` and
 * `createController`/`manageController` — no second SecureLink frontend, no client-side lifecycle state
 * machine. Backend truth alone decides what is shown: before a counterparty has joined, this section
 * says so and stops (the same real backend status the People tab already reads); once the Agreement is
 * PARTICIPANTS_JOINING or CONFIRMATION_PENDING, the SAME manage panel used everywhere else takes over,
 * and any real backend refusal (for example: not every participant has confirmed the current version
 * yet) is surfaced through its own existing, unmodified error handling — never duplicated or
 * re-interpreted here.
 */
export function AgreementSecureLinkSection({ agreementId, agreementTitle, agreementStatus, gateway }: {
  agreementId: string;
  agreementTitle: string;
  agreementStatus: string;
  gateway: SecureLinkGateway;
}) {
  const [controllers, setControllers] = useState<{
    agreementId: string;
    create: ReturnType<typeof createSecureLinkCreateController>;
    manage: ReturnType<typeof createSecureLinkManageController>;
  } | null>(null);

  const eligible = agreementStatus === 'PARTICIPANTS_JOINING' || agreementStatus === 'CONFIRMATION_PENDING';

  useEffect(() => {
    if (!eligible) { setControllers(null); return; }
    if (controllers?.agreementId === agreementId) return;
    const create = createSecureLinkCreateController(gateway, agreementId, agreementTitle);
    const manage = createSecureLinkManageController(gateway, agreementId);
    setControllers({ agreementId, create, manage });
    void manage.load();
    // gateway/agreementTitle are stable for the lifetime of one Agreement view; only the Agreement id
    // (and eligibility) should ever re-create these controllers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, eligible]);

  if (!eligible) {
    return (
      <section aria-label="SecureLink" className="space-y-2 rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3">
        <h3 className="font-display text-[1.05rem] text-forest-800">SecureLink</h3>
        <p className="text-[0.85rem] leading-snug text-sand-700">
          Once someone has joined this Agreement, you’ll be able to create a SecureLink here to share it
          publicly for review.
        </p>
      </section>
    );
  }

  if (!controllers || controllers.agreementId !== agreementId) {
    return <p role="status" className="text-sm text-sand-500 px-1">Checking for an existing SecureLink…</p>;
  }

  return (
    <section aria-label="SecureLink" className="space-y-3">
      <h3 className="font-display text-[1.05rem] text-forest-800">SecureLink</h3>
      <SecureLinkManagePanel
        agreementTitle={agreementTitle}
        manageController={controllers.manage}
        createController={controllers.create}
        onDone={() => { void controllers.manage.load(); }}
      />
    </section>
  );
}
