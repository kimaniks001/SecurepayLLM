import type {
  ApprenticeshipProjectDto, CommunityEventDto, CommunityObjectResponse,
  CommunityProjectDto, CommunityServiceOpportunityDto, ProjectContributionDto,
} from '../../api/securepay/community/dto';

/**
 * Gate 1: ONE chronological, read-only Community LIVE projection.
 *
 * Inputs are existing member-authorised API responses. We still fail closed on
 * Circle-scoped/inactive records; this is defense-in-depth, not an access grant.
 * No inference of paid work, funding, verification, personal interest, or success.
 */
export type CommunityTimelineGroup =
  | 'stories' | 'opportunities' | 'projects' | 'events' | 'learning';
export type CommunityTimelineKind =
  | 'post' | 'contribution' | 'opportunity' | 'project' | 'event' | 'apprenticeship';
export interface CommunityTimelineEntry {
  key: string;
  kind: CommunityTimelineKind;
  group: CommunityTimelineGroup;
  sourceId: string;
  label: string;
  title: string;
  description: string;
  locationLabel: string | null;
  createdAt: string | null;
  detail: string | null;
}

export interface CommunityTimelineInput {
  live: readonly CommunityObjectResponse[];
  contributions: readonly ProjectContributionDto[];
  help: readonly CommunityServiceOpportunityDto[];
  projects: readonly CommunityProjectDto[];
  events: readonly CommunityEventDto[];
  learning: readonly ApprenticeshipProjectDto[];
}

const validTime = (date: string | null | undefined): number | null => {
  if (!date) return null;
  const stamp = Date.parse(date);
  return Number.isFinite(stamp) ? stamp : null;
};

const labelPost = (type: CommunityObjectResponse['objectType']): string =>
  ({
    QUESTION: 'Community question',
    NEED: 'Community need',
    OPPORTUNITY: 'Community opportunity',
    WORK_STORY: 'Work story',
    DISCUSSION: 'Community discussion',
  })[type];

const labelContribution = (type: ProjectContributionDto['contributionType']): string =>
  type.replace(/_/g, ' ').toLowerCase();

/**
 * Chronology uses recorded creation timestamps, not popularity or speculative
 * dates. Equal timestamps use a stable key; missing/invalid dates come last.
 * An event's scheduled start is displayed separately, never passed off as
 * its publication date.
 */
export function buildCommunityTimeline(input: CommunityTimelineInput): CommunityTimelineEntry[] {
  const items: CommunityTimelineEntry[] = [];

  for (const x of input.live) {
    if (x.circleId !== null || x.status !== 'ACTIVE') continue;
    items.push({
      key: 'post:' + x.id, kind: 'post',
      group: x.objectType === 'OPPORTUNITY' || x.objectType === 'NEED' ? 'opportunities' : 'stories',
      sourceId: x.id,
      label: labelPost(x.objectType) + ' · ' + (x.authorDisplayName || 'Community member'),
      title: x.title, description: x.body, locationLabel: x.locationLabel,
      createdAt: x.createdAt, detail: null,
    });
  }
  for (const x of input.contributions) {
    if (x.circleId !== null || x.status !== 'ACTIVE') continue;
    items.push({
      key: 'contribution:' + x.id, kind: 'contribution', group: 'stories', sourceId: x.id,
      label: 'Member-shared ' + labelContribution(x.contributionType),
      title: x.title, description: x.body, locationLabel: null,
      createdAt: x.createdAt, detail: x.hasOrigin ? 'Linked to a recorded source' : null,
    });
  }
  for (const x of input.help) {
    if (x.circleId !== null || (x.status !== 'OPEN' && x.status !== 'IN_PROGRESS')) continue;
    items.push({
      key: 'opportunity:' + x.id, kind: 'opportunity', group: 'opportunities', sourceId: x.id,
      label: 'Opportunity · ' + x.status.toLowerCase().replace(/_/g, ' '),
      title: x.title, description: x.description, locationLabel: x.locationLabel,
      createdAt: x.createdAt,
      detail: x.skillsNeeded.length ? 'Skills or help: ' + x.skillsNeeded.join(', ') : null,
    });
  }
  for (const x of input.projects) {
    if (x.circleId !== null || (x.status !== 'ACTIVE' && x.status !== 'COMPLETED')) continue;
    items.push({
      key: 'project:' + x.id, kind: 'project', group: 'projects', sourceId: x.id,
      label: 'Community project · ' + x.status.toLowerCase(),
      title: x.title, description: x.purpose, locationLabel: x.locationLabel,
      createdAt: x.createdAt, detail: null,
    });
  }
  for (const x of input.events) {
    if (x.circleId !== null || x.status !== 'CONFIRMED') continue;
    items.push({
      key: 'event:' + x.id, kind: 'event', group: 'events', sourceId: x.id,
      label: 'Community event',
      title: x.title, description: x.description, locationLabel: x.locationLabel,
      createdAt: x.createdAt,
      detail: x.startsAt ? 'Scheduled: ' + x.startsAt : null,
    });
  }
  for (const x of input.learning) {
    if (x.circleId !== null || (x.status !== 'PROPOSED' && x.status !== 'ACTIVE')) continue;
    items.push({
      key: 'apprenticeship:' + x.id, kind: 'apprenticeship', group: 'learning', sourceId: x.id,
      label: 'Apprenticeship · ' + x.status.toLowerCase(),
      title: x.title, description: x.learningGoal, locationLabel: null,
      createdAt: x.createdAt,
      detail: x.sponsorshipReference
        ? 'Sponsorship reference recorded; funding not asserted here'
        : 'No sponsorship established here',
    });
  }

  return items.sort((a, b) => {
    const at = validTime(a.createdAt);
    const bt = validTime(b.createdAt);
    if (at === null && bt !== null) return 1;
    if (bt === null && at !== null) return -1;
    if (at !== null && bt !== null && at !== bt) return bt - at;
    return a.key.localeCompare(b.key);
  });
}
