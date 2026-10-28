import type {
  CircleResponse, CommunityServiceOpportunityDto,
} from '../../api/securepay/community/dto';

/**
 * Gate 2. Members initiate an ephemeral search. This is literal public-record
 * matching, NOT an inferred personal profile or AI confidence score.
 * Permissions remain wholly with SecurePayAPI.
 */
export interface CommunityDiscoveryChoice {
  purpose: 'explore' | 'learn' | 'help' | 'find-work' | 'build';
  interests: string;
  skills: string;
  area: string;
  availability: 'unspecified' | 'weekdays' | 'weekends' | 'flexible';
}
export interface CircleDiscoveryResult {
  circle: CircleResponse;
  reasons: string[];
}
export interface OpportunityDiscoveryResult {
  opportunity: CommunityServiceOpportunityDto;
  reasons: string[];
}
const STOP = new Set(['and','the','for','with','from','want','will','like','this','that','have','some','into','help','work']);
const words = (input:string):string[] => [...new Set(
  input.toLocaleLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]{3,}/gu) ?? [],
)].filter(word=>!STOP.has(word)).slice(0,12);
const contains = (text:string,term:string) =>
  text.toLocaleLowerCase().normalize('NFKC').includes(term);
const placeMatches = (location:string|null,area:string) => {
  const wanted=area.trim();
  return !wanted || !!location && contains(location,wanted.toLocaleLowerCase().normalize('NFKC'));
};
function reasons(interest:string,skills:string,fields:string[]):string[] {
  const publicText=fields.join(' ');
  const interested=words(interest).find(term=>contains(publicText,term));
  const capable=words(skills).find(term=>contains(publicText,term));
  const result:string[]=[];
  if(interested)result.push('Published description mentions “'+interested+'”');
  if(capable && capable!==interested)result.push('Published description mentions your skill “'+capable+'”');
  return result;
}

/** Only public, active Circle descriptions. No private Circle invitations here.
 * Purpose is a discovery motivation, not a proxy for qualifications or paid work.
 * Availability is deliberately not used: Circle DTOs have no verified schedules.
 */
export function matchCommunityCircles(
  rows: readonly CircleResponse[], choice:CommunityDiscoveryChoice,
):CircleDiscoveryResult[] {
  const hasWords=words(choice.interests).length>0||words(choice.skills).length>0;
  return rows.filter(circle=>circle.visibility==='PUBLIC' && circle.status==='ACTIVE'
      && placeMatches(circle.locationLabel,choice.area))
    .map(circle=>({
      circle,
      reasons:reasons(choice.interests,choice.skills,
        [circle.name,circle.purpose,circle.categoryLabel??'']),
    }))
    .filter(result=>!hasWords || result.reasons.length>0)
    .sort((a,b)=>a.circle.name.localeCompare(b.circle.name));
}

/** An OPEN Community opportunity is a chance to inquire, not a funded job.
 * This selector never infers pay, openings, availability or human eligibility.
 */
export function matchCommunityOpportunities(
  rows:readonly CommunityServiceOpportunityDto[],choice:CommunityDiscoveryChoice,
):OpportunityDiscoveryResult[] {
  const hasWords=words(choice.interests).length>0||words(choice.skills).length>0;
  return rows.filter(item=>item.circleId===null && item.status==='OPEN'
      && placeMatches(item.locationLabel,choice.area))
    .map(opportunity=>({
      opportunity,
      reasons:reasons(choice.interests,choice.skills,
        [opportunity.title,opportunity.description,...opportunity.skillsNeeded]),
    }))
    .filter(result=>!hasWords || result.reasons.length>0)
    .sort((a,b)=>a.opportunity.title.localeCompare(b.opportunity.title));
}
