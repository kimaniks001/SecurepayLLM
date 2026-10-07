import type { AgreementDetailResponse } from '../api/securepay/agreements/dto';
import { decimalMoney } from '../decimalMoney';

const words = (value: string): string =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());

const partyName = (name: string | null, ksNumber: string | null): string =>
  name?.trim() || ksNumber?.trim() || 'Participant';

export function AgreementPrintRecord({ detail, statusLabel }: { detail: AgreementDetailResponse; statusLabel: string }) {
  const amount = detail.overview.proposedAmountMinor
    ? decimalMoney(detail.overview.proposedAmountMinor, detail.overview.currency)
    : null;
  const version = detail.currentVersion ? `Version ${detail.currentVersion.versionNumber}` : 'Current version';
  const terms = [...detail.terms].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const milestones = [...detail.milestones].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  return (
    <article className="agreement-print-record" data-agreement-print aria-label="Printable Agreement record">
      <header className="agreement-print-header">
        <div>
          <p className="agreement-print-brand">SecurePay</p>
          <p className="agreement-print-kicker">Agreement</p>
        </div>
        <div className="agreement-print-meta">
          <span>{version}</span>
          <span>{detail.overview.publicReference}</span>
        </div>
      </header>

      <div className="agreement-print-rule" />

      <section className="agreement-print-title">
        <p className="agreement-print-status">{statusLabel}</p>
        <h1>{detail.overview.title}</h1>
        {detail.overview.purpose && <p className="agreement-print-purpose">{detail.overview.purpose}</p>}
        {detail.overview.description && detail.overview.description !== detail.overview.purpose && (
          <p className="agreement-print-description">{detail.overview.description}</p>
        )}
      </section>

      <section className="agreement-print-section">
        <h2>People</h2>
        <div className="agreement-print-parties">
          {detail.participants.map(participant => (
            <div key={participant.participantId} className="agreement-print-party">
              <strong>{partyName(participant.displayName, participant.ksNumber)}</strong>
              <span>{words(participant.roleCode)}</span>
              {participant.ksNumber && <span>{participant.ksNumber}</span>}
              <small>{words(participant.participantStatus)}</small>
            </div>
          ))}
        </div>
      </section>

      {(amount || detail.overview.expiresAt) && (
        <section className="agreement-print-section">
          <h2>Key details</h2>
          <dl className="agreement-print-details">
            {amount && <div><dt>Value</dt><dd>{amount}</dd></div>}
            {detail.overview.expiresAt && <div><dt>Expires</dt><dd>{detail.overview.expiresAt}</dd></div>}
            <div><dt>Type</dt><dd>{words(detail.overview.agreementType)}</dd></div>
          </dl>
        </section>
      )}

      {terms.length > 0 && (
        <section className="agreement-print-section">
          <h2>What each obligation requires</h2>
          <ol className="agreement-print-obligations">
            {terms.map(term => (
              <li key={term.obligationId}>
                <div className="agreement-print-obligation-heading">
                  <strong>{term.title}</strong>
                  <span>{words(term.status)}</span>
                </div>
                {term.description && <p>{term.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {milestones.length > 0 && (
        <section className="agreement-print-section">
          <h2>Milestones and timing</h2>
          <ol className="agreement-print-obligations">
            {milestones.map(milestone => (
              <li key={milestone.milestoneId}>
                <div className="agreement-print-obligation-heading">
                  <strong>{milestone.title}</strong>
                  <span>{words(milestone.status)}</span>
                </div>
                {milestone.description && <p>{milestone.description}</p>}
                {milestone.dueAt && <p className="agreement-print-note">Due: {milestone.dueAt}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="agreement-print-section agreement-print-confirmation">
        <h2>Participant record</h2>
        <p>
          Participant joining and confirmation remain recorded by SecurePay against the current Agreement version.
          This printed copy does not create or change a confirmation.
        </p>
        <div className="agreement-print-signatures">
          {detail.participants.map(participant => (
            <div key={participant.participantId}>
              <span className="agreement-print-signature-line" />
              <strong>{partyName(participant.displayName, participant.ksNumber)}</strong>
              <small>{words(participant.participantStatus)}</small>
            </div>
          ))}
        </div>
      </section>

      <footer className="agreement-print-footer">
        <span>SecurePay · {detail.overview.publicReference}</span>
        <span>{version} · current record</span>
      </footer>
    </article>
  );
}
