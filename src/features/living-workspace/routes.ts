export type LivingWorkspaceMode = 'work' | 'vision' | 'circle' | 'community';

const previewRoute = /^#\/?preview\/living-workspace(?:\/(work|vision|circle|community))?\/?$/;
const stagingRoute = /^#\/?(work|vision|circle|community)\/?$/;
const defaultEntry = (hash: string) => hash === '' || hash === '#' || hash === '#/' || /^#\/?sign-(?:in|up)\/?$/.test(hash);

/** The historical preview hash remains supported; staging uses clean area hashes. */
export function parseLivingWorkspaceMode(hash: string, hostname: string, publicStagingHostEnabled = false): LivingWorkspaceMode | null {
  const preview = previewRoute.exec(hash);
  if (preview) return (preview[1] as LivingWorkspaceMode | undefined) ?? 'work';
  if (hostname === 'staging.securepay.ke' || (publicStagingHostEnabled && hostname === 'www.securepay.ke')) {
    const staging = stagingRoute.exec(hash);
    if (staging) return staging[1] as LivingWorkspaceMode;
    if (defaultEntry(hash)) return 'work';
  }
  if (hostname.endsWith('.vercel.app') && defaultEntry(hash)) return 'work';
  return null;
}

export function livingWorkspaceHash(mode: LivingWorkspaceMode, hostname: string, publicStagingHostEnabled = false): string {
  if (hostname === 'staging.securepay.ke' || (publicStagingHostEnabled && hostname === 'www.securepay.ke')) {
    return mode === 'work' ? '' : `#/${mode}`;
  }
  return `#/preview/living-workspace/${mode}`;
}
