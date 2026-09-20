import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { NavBar } from '../../components/NavBar';
import { Surface, SurfaceBody } from '../../components/dna/Surface';
import { Button } from '../../components/dna/Button';
import { StatusNotice } from '../../components/dna/StatusNotice';
import { PageHeader } from '../../components/dna/PageHeader';
import type { AppView } from '../../types';
import type { SettingsController } from './controller';
import { useSyncExternalStore } from 'react';

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 py-2.5 cursor-pointer">
      <span>
        <span className="block text-[0.85rem] text-forest-800">{label}</span>
        {hint && <span className="block text-[0.72rem] text-sand-500 mt-0.5">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 shrink-0" />
    </label>
  );
}

/**
 * Phase 5 -- Settings: exactly the five real fields `TraderSettingsController` supports
 * (notification channels, marketing opt-in, profile visibility). Settings ≠ Account: this screen
 * never shows KSNumber, identity status, Business membership, or authority -- see AccountExperience.
 */
export function SettingsExperience({ controller, onNavigate }: {
  controller: SettingsController;
  onNavigate: (view: AppView) => void;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => { void controller.load(); }, [controller]);

  return (
    <div className="min-h-dvh flex flex-col bg-cream-100 pb-16 md:pb-0">
      <NavBar view="signed-in" onNavigate={onNavigate} />
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4 w-full">
        <button onClick={() => onNavigate('account')} className="flex items-center gap-1.5 text-sand-500 hover:text-forest-600 text-[0.8rem]">
          <ArrowLeft className="w-3.5 h-3.5" /> Account
        </button>
        <PageHeader title="Settings" description="How SecurePay behaves for you — not who you are or what you're authorised to do." />

        {state.settings.status === 'loading' && <p role="status" className="text-sm text-sand-500">Loading your settings…</p>}
        {state.settings.status === 'error' && <StatusNotice tone="warning" icon={false}>{state.settings.error}</StatusNotice>}

        {state.draft && (
          <>
            <Surface>
              <SurfaceBody>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Notifications</div>
                <div className="divide-y divide-cream-100">
                  <Toggle label="Email" checked={state.draft.notifyEmail} onChange={v => controller.setDraft({ notifyEmail: v })} />
                  <Toggle label="SMS" checked={state.draft.notifySms} onChange={v => controller.setDraft({ notifySms: v })} />
                  <Toggle label="Push" checked={state.draft.notifyPush} onChange={v => controller.setDraft({ notifyPush: v })} />
                </div>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceBody>
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Privacy &amp; communication</div>
                <div className="divide-y divide-cream-100">
                  <Toggle label="Marketing messages" hint="Product news and offers from SecurePay." checked={state.draft.marketingOptIn} onChange={v => controller.setDraft({ marketingOptIn: v })} />
                </div>
                <div className="pt-2.5">
                  <span className="block text-[0.85rem] text-forest-800 mb-1.5">Profile visibility</span>
                  <div className="flex gap-2">
                    {(['PRIVATE', 'PUBLIC'] as const).map(v => (
                      <button key={v} onClick={() => controller.setDraft({ profileVisibility: v })} className={`flex-1 rounded-lg border px-3 py-2 text-[0.8rem] capitalize ${state.draft?.profileVisibility === v ? 'border-forest-500 text-forest-700 bg-forest-50' : 'border-cream-200 text-sand-600'}`}>
                        {v.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </SurfaceBody>
            </Surface>

            {state.saveError && <StatusNotice tone="warning" icon={false}>{state.saveError}</StatusNotice>}
            {state.justSaved && !state.saveError && <StatusNotice tone="success" icon={false}>Saved.</StatusNotice>}
            <Button onClick={() => void controller.save()} disabled={state.saving} className="w-full py-2.5">
              {state.saving ? 'Saving…' : 'Save settings'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
