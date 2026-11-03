import type { SelectedStoreEnquiryContextDto } from '../../api/securepay/agent/dto';

/**
 * Part of the EXISTING SourceReference / SecurePay Check, not a separate
 * Store Agreement engine. Every value is sourced from an authenticated
 * server read of a buyer-owned enquiry. None has been accepted as a term.
 */
export function StoreEnquiryCheck({ context }: { context: SelectedStoreEnquiryContextDto }) {
  return (
    <section aria-label="Selected Store enquiry proposed facts"
      className="rounded-xl border border-cream-200 bg-white p-3 text-sm text-forest-900">
      <p className="font-medium">Your Store enquiry · proposed, not agreed</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        <dt className="text-sand-500">Seller</dt><dd className="break-all">{context.sellerKsNumber}</dd>
        <dt className="text-sand-500">Quantity</dt><dd>{context.requestedQuantity} requested</dd>
        <dt className="text-sand-500">Enquiry</dt><dd className="whitespace-pre-wrap break-words">{context.customerMessage}</dd>
        <dt className="text-sand-500">Status</dt><dd>{context.enquiryStatus}</dd>
        {context.sellerReply && <>
          <dt className="text-sand-500">Trader replied</dt>
          <dd className="whitespace-pre-wrap break-words">{context.sellerReply}</dd>
        </>}
      </dl>
      <p className="mt-2 text-xs text-sand-600">
        KS001 can now help clarify the scope, final price, delivery, parties and conditions.
        A seller's reply is not Agreement acceptance. No stock or money is committed.
      </p>
    </section>
  );
}
