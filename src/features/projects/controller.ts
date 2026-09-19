import type { ProjectGateway } from '../../api/securepay/projects';
import type { ProjectCalendarDto, ProjectAgreementListDto, ProjectDto, ProjectSummaryDto } from '../../api/securepay/projects/dto';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface ProjectsState {
  ownerKsNumber: string | null;
  list: Loadable<ProjectDto[]>;
  creating: boolean;
  createError: string | null;
  selected: {
    projectId: string | null;
    project: Loadable<ProjectDto>;
    summary: Loadable<ProjectSummaryDto>;
    agreements: Loadable<ProjectAgreementListDto>;
    calendar: Loadable<ProjectCalendarDto>;
    busy: boolean;
    actionError: string | null;
  };
}

const initialSelected: ProjectsState['selected'] = {
  projectId: null, project: idle(), summary: idle(), agreements: idle(), calendar: idle(),
  busy: false, actionError: null,
};

/**
 * SecurePay Final Completion Phase 5A -- session-local orchestration over the real Project
 * endpoints only. No local mock authority, no invented aggregate: every figure shown comes straight
 * from the backend's own read (see ProjectSummaryDto). No share/invite/member method exists here
 * because none exists on the gateway.
 */
export function createProjectsController(gateway: ProjectGateway) {
  let state: ProjectsState = {
    ownerKsNumber: null, list: idle(), creating: false, createError: null, selected: { ...initialSelected },
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<ProjectsState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const updateSelected = (patch: Partial<ProjectsState['selected']>) => update({ selected: { ...state.selected, ...patch } });

  async function loadList(ownerKsNumber: string, active?: boolean, query?: string) {
    update({ ownerKsNumber, list: { status: 'loading', data: null, error: null } });
    try {
      const result = await gateway.list(ownerKsNumber, active, query);
      update({ list: { status: 'ready', data: result.items, error: null } });
    } catch (error) {
      update({ list: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  async function loadSelectedDetail(projectId: string) {
    updateSelected({
      projectId, project: { status: 'loading', data: null, error: null }, summary: { status: 'loading', data: null, error: null },
      agreements: { status: 'loading', data: null, error: null }, calendar: { status: 'loading', data: null, error: null },
      actionError: null,
    });
    const [project, summary, agreements, calendar] = await Promise.allSettled([
      gateway.get(projectId), gateway.summary(projectId), gateway.agreements(projectId), gateway.calendar(projectId),
    ]);
    updateSelected({
      project: project.status === 'fulfilled' ? { status: 'ready', data: project.value, error: null } : { status: 'error', data: null, error: errorText(project.reason) },
      summary: summary.status === 'fulfilled' ? { status: 'ready', data: summary.value, error: null } : { status: 'error', data: null, error: errorText(summary.reason) },
      agreements: agreements.status === 'fulfilled' ? { status: 'ready', data: agreements.value, error: null } : { status: 'error', data: null, error: errorText(agreements.reason) },
      calendar: calendar.status === 'fulfilled' ? { status: 'ready', data: calendar.value, error: null } : { status: 'error', data: null, error: errorText(calendar.reason) },
    });
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    async loadForOwner(ownerKsNumber: string, active?: boolean, query?: string) {
      await loadList(ownerKsNumber, active, query);
    },

    async create(ownerKsNumber: string, name: string, description?: string) {
      if (state.creating) return null;
      update({ creating: true, createError: null });
      try {
        const created = await gateway.create({ ownerKsNumber, name, description });
        update({ creating: false });
        if (state.ownerKsNumber === ownerKsNumber && state.list.status === 'ready' && state.list.data) {
          update({ list: { status: 'ready', data: [created, ...state.list.data], error: null } });
        }
        return created;
      } catch (error) {
        update({ creating: false, createError: errorText(error) });
        return null;
      }
    },

    async open(projectId: string) {
      await loadSelectedDetail(projectId);
    },

    closeSelected() {
      updateSelected({ ...initialSelected });
    },

    async rename(name: string, description: string | undefined, expectedVersion: number) {
      const projectId = state.selected.projectId;
      if (!projectId || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.update(projectId, { name, description, expectedVersion });
        updateSelected({ busy: false, project: { status: 'ready', data: updated, error: null } });
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    async archive(expectedVersion: number) {
      const projectId = state.selected.projectId;
      if (!projectId || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.archive(projectId, { expectedVersion });
        updateSelected({ busy: false, project: { status: 'ready', data: updated, error: null } });
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    async restore(expectedVersion: number) {
      const projectId = state.selected.projectId;
      if (!projectId || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.restore(projectId, { expectedVersion });
        updateSelected({ busy: false, project: { status: 'ready', data: updated, error: null } });
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    /** "Add to Project" -- organizational only. Reloads the Agreements list and summary from the backend afterward. */
    async addAgreement(agreementId: string) {
      const projectId = state.selected.projectId;
      if (!projectId || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        await gateway.addAgreement(projectId, agreementId);
        updateSelected({ busy: false });
        await loadSelectedDetail(projectId);
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    /** "Remove from Project" -- the Agreement itself is never touched, only this organizational reference. */
    async removeAgreement(agreementId: string) {
      const projectId = state.selected.projectId;
      if (!projectId || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        await gateway.removeAgreement(projectId, agreementId);
        updateSelected({ busy: false });
        await loadSelectedDetail(projectId);
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },
  };
}
export type ProjectsController = ReturnType<typeof createProjectsController>;
