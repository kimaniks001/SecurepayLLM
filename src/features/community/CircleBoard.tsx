import type { CommunityObjectResponse } from '../../api/securepay/community/dto';

type CircleBoardLane = {
  key: 'CHECKPOINTS' | 'NEEDS' | 'DECISIONS' | 'OPPORTUNITIES' | 'NOTES';
  label: string;
  hint: string;
  objectTypes: CommunityObjectResponse['objectType'][];
};

const LANES: CircleBoardLane[] = [
  { key: 'CHECKPOINTS', label: 'Checkpoints', hint: 'Work that is ready, completed, or needs an internal look before formal review.', objectTypes: ['WORK_STORY'] },
  { key: 'NEEDS', label: 'Needs', hint: 'Skills, help, people or practical things the Circle still needs to sort out.', objectTypes: ['NEED'] },
  { key: 'DECISIONS', label: 'Questions & decisions', hint: 'Things the Circle needs to answer or agree before moving on.', objectTypes: ['QUESTION'] },
  { key: 'OPPORTUNITIES', label: 'Options', hint: 'Useful possibilities the Circle may choose to pursue.', objectTypes: ['OPPORTUNITY'] },
  { key: 'NOTES', label: 'Notes', hint: 'Shared context worth keeping visible while the Circle coordinates.', objectTypes: ['DISCUSSION'] },
];

function BoardCard({ object, onOpen }: { object: CommunityObjectResponse; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-cream-200 bg-white px-3.5 py-3 hover:border-forest-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.82rem] font-medium text-forest-800 leading-snug">{object.title}</div>
        {object.status !== 'ACTIVE' && (
          <span className="shrink-0 text-[0.62rem] uppercase tracking-wide text-sand-500">{object.status.toLowerCase()}</span>
        )}
      </div>
      <p className="text-[0.74rem] text-sand-600 mt-1 line-clamp-3">{object.body}</p>
      <div className="mt-2 flex items-center gap-2 flex-wrap text-[0.66rem] text-sand-500">
        {object.authorDisplayName && <span>{object.authorDisplayName}</span>}
        {object.locationLabel && <span>· {object.locationLabel}</span>}
      </div>
    </button>
  );
}

/**
 * Circle Board is deliberately a view over the Circle's existing persisted Community objects.
 * It does not invent a second planning datastore or imply Agreement authority. The same Circle item
 * can be discussed in the conversation view and organised here by its real backend object type.
 */
export function CircleBoard({
  objects,
  loading,
  active,
  onOpenObject,
  onAdd,
}: {
  objects: CommunityObjectResponse[];
  loading: boolean;
  active: boolean;
  onOpenObject: (id: string) => void;
  onAdd: () => void;
}) {
  if (loading) {
    return <p className="text-[0.8rem] text-sand-500 py-4">Loading Circle Board…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-forest-100 bg-forest-50/40 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base text-forest-800 font-medium">Circle Board</h2>
            <p className="text-[0.76rem] text-sand-600 mt-1">
              The Circle's shared working view — what is ready, needed, unresolved and worth keeping in sight.
            </p>
          </div>
          {active && (
            <button
              onClick={onAdd}
              className="shrink-0 rounded-xl bg-forest-600 px-3 py-2 text-[0.75rem] font-medium text-cream-50 hover:bg-forest-700"
            >
              + Add
            </button>
          )}
        </div>
        <p className="text-[0.68rem] text-sand-500 mt-2">
          Board items coordinate the Circle. They do not accept an Agreement milestone, bind a member, or move money.
        </p>
      </div>

      {objects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-300 bg-white px-5 py-7 text-center">
          <p className="text-[0.84rem] font-medium text-forest-800">Nothing needs organising yet.</p>
          <p className="text-[0.75rem] text-sand-500 mt-1">Add the first checkpoint, need, question, option or shared note.</p>
          {active && (
            <button onClick={onAdd} className="mt-3 text-[0.78rem] font-medium text-forest-600 hover:text-forest-700">
              Add to Circle Board
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {LANES.map(lane => {
            const laneObjects = objects.filter(object => lane.objectTypes.includes(object.objectType));
            return (
              <section key={lane.key} className="rounded-2xl border border-cream-200 bg-cream-50/50 p-3">
                <div className="px-1 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[0.76rem] font-semibold text-forest-800 uppercase tracking-wide">{lane.label}</h3>
                    <span className="text-[0.66rem] text-sand-500">{laneObjects.length}</span>
                  </div>
                  <p className="text-[0.68rem] text-sand-500 mt-0.5">{lane.hint}</p>
                </div>
                <div className="space-y-2">
                  {laneObjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-cream-200 bg-white/70 px-3 py-3 text-[0.7rem] text-sand-500">
                      Nothing here right now.
                    </div>
                  ) : laneObjects.map(object => (
                    <BoardCard key={object.id} object={object} onOpen={() => onOpenObject(object.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
