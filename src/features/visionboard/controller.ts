import type { VisionBoardGateway } from '../../api/securepay/visionboard';
import type {
  VisionItemDto, VisionItemTypeCode, VisionItemUsagePolicy, VisionShelfCode, VisionShelfDto,
} from '../../api/securepay/visionboard/dto';
import { errorText } from '../agent/controller';

export type Loadable<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data: T | null; error: string | null };
const idle = <T>(): Loadable<T> => ({ status: 'idle', data: null, error: null });

export interface VisionBoardState {
  /** The explicitly chosen owner KS (e.g. a Business), or null to use the signed-in person's own KS. */
  ownerKsNumber: string | null;
  /** True once a load has been attempted at all -- distinct from ownerKsNumber being set, since
   *  "no ownerKsNumber" (my own board) is itself a valid, already-loaded state (section 43). */
  boarded: boolean;
  shelves: Loadable<VisionShelfDto[]>;
  selectedShelf: VisionShelfCode | null;
  items: Loadable<VisionItemDto[]>;
  searchQuery: string;
  creating: boolean;
  createError: string | null;
  selected: { item: VisionItemDto | null; busy: boolean; actionError: string | null };
}

const initialSelected: VisionBoardState['selected'] = { item: null, busy: false, actionError: null };

/**
 * SecurePay Final Completion Phase 5B, convergence-corrected against section 43 -- session-local
 * orchestration over the real Vision Board endpoints only. No local mock authority, no invented
 * content: every shelf/item shown comes straight from the backend's own read. No share/invite/
 * member method exists here because none exists on the gateway. Locked items are never rewritten
 * in place -- see `supersede`.
 *
 * A person is never required to type their own KS number: {@link loadForOwner} with no argument
 * loads the signed-in person's own board (the backend resolves it); passing an explicit KS number
 * switches to managing that KS's board instead (e.g. a Business they administer).
 */
export function createVisionBoardController(gateway: VisionBoardGateway) {
  let state: VisionBoardState = {
    ownerKsNumber: null, boarded: false, shelves: idle(), selectedShelf: null, items: idle(), searchQuery: '',
    creating: false, createError: null, selected: { ...initialSelected },
  };
  const listeners = new Set<() => void>();
  const update = (patch: Partial<VisionBoardState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };
  const updateSelected = (patch: Partial<VisionBoardState['selected']>) => update({ selected: { ...state.selected, ...patch } });

  async function loadShelves(ownerKsNumber: string | null) {
    update({ ownerKsNumber, boarded: true, shelves: { status: 'loading', data: null, error: null } });
    try {
      const result = await gateway.shelves(ownerKsNumber ?? undefined);
      update({ shelves: { status: 'ready', data: result.shelves, error: null } });
    } catch (error) {
      update({ shelves: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  async function loadItems(ownerKsNumber: string | null, shelf: VisionShelfCode | null, query?: string) {
    update({ items: { status: 'loading', data: null, error: null }, selectedShelf: shelf });
    try {
      const result = await gateway.items(ownerKsNumber ?? undefined, shelf ?? undefined, query);
      update({ items: { status: 'ready', data: result.items, error: null } });
    } catch (error) {
      update({ items: { status: 'error', data: null, error: errorText(error) } });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },

    /** No argument (or a blank string) loads the signed-in person's own board. */
    async loadForOwner(ownerKsNumber?: string) {
      await loadShelves(ownerKsNumber && ownerKsNumber.trim() ? ownerKsNumber.trim() : null);
    },

    async openShelf(shelf: VisionShelfCode) {
      if (!state.boarded) return;
      await loadItems(state.ownerKsNumber, shelf);
    },

    async search(query: string) {
      update({ searchQuery: query });
      if (!state.boarded) return;
      await loadItems(state.ownerKsNumber, null, query || undefined);
    },

    closeShelf() {
      update({ selectedShelf: null, items: idle(), searchQuery: '' });
    },

    async create(shelf: VisionShelfCode, itemType: VisionItemTypeCode, title: string, content?: string, usagePolicy?: VisionItemUsagePolicy) {
      if (!state.boarded || state.creating) return null;
      update({ creating: true, createError: null });
      try {
        const created = await gateway.create({
          ownerKsNumber: state.ownerKsNumber ?? undefined, shelf, itemType, title, content, usagePolicy, source: 'OWNER',
        });
        update({ creating: false });
        await loadShelves(state.ownerKsNumber);
        if (state.selectedShelf === shelf && state.items.status === 'ready' && state.items.data) {
          update({ items: { status: 'ready', data: [created, ...state.items.data], error: null } });
        }
        return created;
      } catch (error) {
        update({ creating: false, createError: errorText(error) });
        return null;
      }
    },

    open(item: VisionItemDto) {
      updateSelected({ item, actionError: null });
    },

    closeSelected() {
      updateSelected({ ...initialSelected });
    },

    async update(title: string, content: string | undefined, usagePolicy: VisionItemUsagePolicy | undefined, expectedVersion: number) {
      const item = state.selected.item;
      if (!item || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.update(item.itemId, { title, content, usagePolicy, expectedVersion });
        updateSelected({ busy: false, item: updated });
        if (state.boarded && state.selectedShelf) await loadItems(state.ownerKsNumber, state.selectedShelf, state.searchQuery || undefined);
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    async lock(expectedVersion: number) {
      const item = state.selected.item;
      if (!item || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.lock(item.itemId, { expectedVersion });
        updateSelected({ busy: false, item: updated });
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    async unlock(expectedVersion: number) {
      const item = state.selected.item;
      if (!item || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const updated = await gateway.unlock(item.itemId, { expectedVersion });
        updateSelected({ busy: false, item: updated });
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },

    /** Preserves history (v1 -> superseded by v2) rather than rewriting a locked/prior version. */
    async supersede(title: string | undefined, content: string | undefined, expectedVersion: number) {
      const item = state.selected.item;
      if (!item || state.selected.busy) return;
      updateSelected({ busy: true, actionError: null });
      try {
        const next = await gateway.supersede(item.itemId, { title, content, expectedVersion });
        updateSelected({ busy: false, item: next });
        if (state.boarded && state.selectedShelf) await loadItems(state.ownerKsNumber, state.selectedShelf, state.searchQuery || undefined);
      } catch (error) {
        updateSelected({ busy: false, actionError: errorText(error) });
      }
    },
  };
}
export type VisionBoardController = ReturnType<typeof createVisionBoardController>;
