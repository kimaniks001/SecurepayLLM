import { useEffect, useState, useSyncExternalStore } from 'react';
import type { AgreementGateway } from '../../api/securepay/agreements';
import { createSecureLinkCreateController } from './createController';
import { createSecureLinkManageController } from './manageController';
import { SecureLinkManagePanel } from './SecureLinkManagePanel';
import { createDoorwayCreateController } from './doorwayCreateController';
import { createDoorwayManageController } from './doorwayManageController';
import { DoorwayManagePanel } from './DoorwayManagePanel';

type SecureLinkGateway = Pick<AgreementGateway,
  'activateProduct' | 'issuePublicLocator' | 'activeLocator' | 'rotatePublicLocator' | 'revokePublicLocator'
  | 'issuePublicDoorway' | 'activeDoorway' | 'rotatePublicDoorway' | 'revokePublicDoorway'>;

// KS001 Upgrade Phase 5 continuation (Slice 5, UR-150) -- a POSITIVE allow-list, deliberately never an
// exclusion list: an exclusion list fails OPEN for any unrecognized/mistyped status (treats the unknown
// as eligible), exactly backwards from this doctrine's own "fail closed" requirement. Every status this
// Agreement can legitimately be in once past DRAFT and before CANCELLED/EXPIRED is listed explicitly.
const ELIGIBLE_STATUSES = new Set(['PROPOSED', 'INVITATION_PENDING', 'PARTICIPANTS_JOINING', 'CONFIRMATION_PENDING']);

// KS001 Upgrade Phase 5 Slice 5 hardening (live-discovered infinite-render-loop crash) -- these must be
// STABLE, module-level references, never recreated inline at call sites. `useSyncExternalStore` compares
// each render's `subscribe`/`getSnapshot` by identity to decide whether the store "changed"; an inline
// `() => ({ phase: 'loading' })` (or `() => () => {}`) allocates a NEW function/object every render, so
// React sees a "change" on every single render and re-renders forever ("Maximum update depth exceeded") --
// this fired on EVERY Agreement, eligible or not, since these hooks run before the `!eligible` early
// return below. A real Agreement's People tab crashed white-screen on this during Phase 5 Slice 5's own
// golden-journey verification.
const NOOP_SUBSCRIBE = () => () => {};
const LOADING_SNAPSHOT = { phase: 'loading' as const };
const GET_LOADING_SNAPSHOT = () => LOADING_SNAPSHOT;

/**
 * KS001 Upgrade Phase 5 continuation (Slice 4 + Slice 5, UR-148/UR-150) — the PERSISTENT SecureLink entry
 * point in the Agreement workspace. Backend truth alone decides what is shown, never a client-side
 * lifecycle state machine: a DRAFT Agreement must be proposed first (unchanged, Slice 4); once PROPOSED
 * or later, this checks the bounded ACTIVE-product-locator truth FIRST (the SAME, unmodified
 * `SecureLinkManagePanel`/`manageController` from Slice 2/4) — if an ACTIVE SecureLink already exists,
 * that takes over completely, exactly as before. Only when NO active product exists yet does this fall
 * back to the NEW pre-activation `DoorwayManagePanel` (Slice 5): the person can create/replace/revoke the
 * public review/Join doorway well before product activation, closing UR-150's own "SecureLink can never
 * be the first-counterparty mechanism" gap. Both panels speak only "SecureLink" to the person (Section
 * 8) — the pre-activation/ACTIVE distinction is entirely a backend-authority concern.
 */
export function AgreementSecureLinkSection({ agreementId, agreementTitle, agreementStatus, gateway }: {
  agreementId: string;
  agreementTitle: string;
  agreementStatus: string;
  gateway: SecureLinkGateway;
}) {
  const [controllers, setControllers] = useState<{
    agreementId: string;
    productCreate: ReturnType<typeof createSecureLinkCreateController>;
    productManage: ReturnType<typeof createSecureLinkManageController>;
    doorwayCreate: ReturnType<typeof createDoorwayCreateController>;
    doorwayManage: ReturnType<typeof createDoorwayManageController>;
  } | null>(null);

  const eligible = ELIGIBLE_STATUSES.has(agreementStatus);

  useEffect(() => {
    if (!eligible) { setControllers(null); return; }
    if (controllers?.agreementId === agreementId) return;
    const productManage = createSecureLinkManageController(gateway, agreementId);
    const next = {
      agreementId,
      productCreate: createSecureLinkCreateController(gateway, agreementId, agreementTitle),
      productManage,
      doorwayCreate: createDoorwayCreateController(gateway, agreementId),
      doorwayManage: createDoorwayManageController(gateway, agreementId),
    };
    setControllers(next);
    // Check ACTIVE-product truth first -- only once we know there is none does the persistent
    // entry point fall back to pre-activation doorway management (see below).
    void productManage.load();
    // gateway/agreementTitle are stable for the lifetime of one Agreement view; only the Agreement id
    // (and eligibility) should ever re-create these controllers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId, eligible]);

  const productState = useSyncExternalStore(
    controllers?.productManage.subscribe ?? NOOP_SUBSCRIBE,
    controllers?.productManage.getSnapshot ?? GET_LOADING_SNAPSHOT,
    controllers?.productManage.getSnapshot ?? GET_LOADING_SNAPSHOT,
  );

  useEffect(() => {
    if (controllers && productState.phase === 'no-link') {
      void controllers.doorwayManage.load();
    }
    // Loads doorway truth exactly once per "confirmed no active product" transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllers, productState.phase === 'no-link']);

  if (!eligible) {
    return (
      <section aria-label="SecureLink" className="space-y-2 rounded-2xl border border-cream-200 bg-cream-50/60 px-4 py-3">
        <h3 className="font-display text-[1.05rem] text-forest-800">SecureLink</h3>
        <p className="text-[0.85rem] leading-snug text-sand-700">
          Once this Agreement has been proposed, you’ll be able to create a SecureLink here to share it
          publicly for review.
        </p>
      </section>
    );
  }

  if (!controllers || controllers.agreementId !== agreementId) {
    return <p role="status" className="text-sm text-sand-500 px-1">Checking for an existing SecureLink…</p>;
  }

  // An ACTIVE product/SecureLink already exists (or the product-truth read is still loading/failed) --
  // the existing, unmodified Slice 2 experience owns this completely.
  if (productState.phase !== 'no-link') {
    return (
      <section aria-label="SecureLink" className="space-y-3">
        <h3 className="font-display text-[1.05rem] text-forest-800">SecureLink</h3>
        <SecureLinkManagePanel
          agreementTitle={agreementTitle}
          manageController={controllers.productManage}
          createController={controllers.productCreate}
          onDone={() => { void controllers.productManage.load(); }}
        />
      </section>
    );
  }

  // No ACTIVE product yet -- the new pre-activation doorway (Slice 5, UR-150) is the honest offer.
  return (
    <section aria-label="SecureLink" className="space-y-3">
      <h3 className="font-display text-[1.05rem] text-forest-800">SecureLink</h3>
      <DoorwayManagePanel
        agreementTitle={agreementTitle}
        manageController={controllers.doorwayManage}
        createController={controllers.doorwayCreate}
        productCreate={controllers.productCreate}
        onDone={() => { void controllers.doorwayManage.load(); }}
        onActivated={() => { void controllers.productManage.load(); }}
      />
    </section>
  );
}
