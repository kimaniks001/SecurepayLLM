import type { AppView } from '../../types';

/**
 * The Workspace's shared-NavBar routing. Home and Agreements stay inside the Workspace's own state machine;
 * every other existing destination is handed to the top-level router (AgentExperience) through the optional
 * callbacks, mirroring onOpenStore. Anything not wired still fails closed to the "not available" notice.
 *
 * Phase 4A final navigation closure: Account and Notifications were missing here and fell through to the
 * notice, although both exist and work from every other signed-in surface.
 */
export interface WorkspaceNavigation {
  goHome: () => void;
  goHub: () => void;
  setNotice: (notice: string | null) => void;
  onOpenStore?: () => void;
  onOpenCommunity?: () => void;
  onOpenProjects?: () => void;
  onOpenVisionBoard?: () => void;
  onOpenAccount?: () => void;
  onOpenNotifications?: () => void;
}

export const WORKSPACE_UNAVAILABLE_NOTICE = 'This area is not available yet.';

export function navigateWorkspace(view: AppView, nav: WorkspaceNavigation): void {
  nav.setNotice(null);
  if (view === 'signed-in') nav.goHome();
  else if (view === 'agreements') nav.goHub();
  else if (view === 'money') nav.setNotice('Open Money from a specific agreement to view it.');
  else if (view === 'store' && nav.onOpenStore) nav.onOpenStore();
  else if (view === 'community' && nav.onOpenCommunity) nav.onOpenCommunity();
  else if (view === 'projects' && nav.onOpenProjects) nav.onOpenProjects();
  else if (view === 'vision-board' && nav.onOpenVisionBoard) nav.onOpenVisionBoard();
  else if (view === 'account' && nav.onOpenAccount) nav.onOpenAccount();
  else if (view === 'notifications' && nav.onOpenNotifications) nav.onOpenNotifications();
  else nav.setNotice(WORKSPACE_UNAVAILABLE_NOTICE);
}
