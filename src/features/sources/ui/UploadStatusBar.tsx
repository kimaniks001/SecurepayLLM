/**
 * An honest, indeterminate transfer indicator.
 *
 * fetch does not expose upload-byte progress. We therefore intentionally do NOT
 * fabricate a percentage: the bar signals an active network transfer (or
 * subsequent source processing), while the precise backend state comes from
 * its source receipt and extraction status.
 */
export function UploadStatusBar({ stage, fileName }: {
  stage: 'uploading' | 'reading';
  fileName?: string;
}) {
  const uploading = stage === 'uploading';
  const message = uploading
    ? 'Uploading to SecurePay…'
    : 'Upload received. SecurePay is reading the file…';
  return (
    <div data-source-upload-status={stage} role="status" aria-live="polite" className="space-y-2 rounded-xl border border-cream-200 bg-cream-50 p-3">
      <p className="text-xs font-medium text-forest-800">{message}</p>
      {fileName && <p className="truncate text-xs text-sand-600" title={fileName}>{fileName}</p>}
      <progress aria-label={uploading ? 'File upload in progress' : 'File reading in progress'}
        className="block h-2 w-full overflow-hidden rounded-full accent-forest-700" max={100}/>
      <p className="text-[0.72rem] text-sand-600">
        {uploading ? 'Keep this page open until SecurePay confirms receipt.' : 'Receiving a file is not the same as understanding it.'}
      </p>
    </div>
  );
}
