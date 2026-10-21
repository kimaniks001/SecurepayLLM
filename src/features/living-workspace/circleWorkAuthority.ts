import type { CommunityGateway } from '../../api/securepay/community';

export interface CircleWorkProposal {
  circleId:string;
  objectId:string;
  title:string;
  body:string;
  kind:'QUESTION'|'NEED'|'OPPORTUNITY'|'WORK_STORY'|'DISCUSSION';
}

/** A Circle discussion is never governance approval or Agreement consent.
 * Only owners/stewards can export selected group material for their own
 * proposed draft. Server rechecks scope and source at the moment of handoff. */
export async function verifyCircleWorkProposal(
  proposal: CircleWorkProposal,
  community:Pick<CommunityGateway,'circles'>,
):Promise<string> {
  if(!proposal.circleId||!proposal.objectId||!proposal.title.trim()||!proposal.body.trim())
    throw Error('Choose one existing Circle planning item.');
  const [circle,member,objects]=await Promise.all([
    community.circles.get(proposal.circleId),
    community.circles.membership(proposal.circleId),
    community.circles.objects.list(proposal.circleId,50,0),
  ]);
  if(circle.id!==proposal.circleId || circle.status!=='ACTIVE' ||
      !(member.isOwner||member.isSteward) ||
      !(member.isOwner||member.status==='ACTIVE')) {
    throw Error('Authorised Circle stewardship could not be confirmed.');
  }
  const item=objects.find(x=>x.id===proposal.objectId);
  if(!item||item.circleId!==proposal.circleId||item.status!=='ACTIVE'||
      item.objectType!==proposal.kind||item.title!==proposal.title||item.body!==proposal.body) {
    throw Error('This Circle proposal changed or is no longer accessible. Review it again.');
  }
  const summary='Circle planning proposal — NOT a group decision, consent, accepted Agreement or funding authorisation.\n'+
    'Circle: '+circle.name+'\n'+
    'Proposal: '+item.title+'\n'+item.body;
  if(summary.length>1200)
    throw Error('Selected Circle material is too long. Review a smaller section before continuing in My Work.');
  return summary;
}
