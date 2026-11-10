import {
  PHASE5_GATE4_HOSTS,
  PHASE5_GATE4_SCENARIOS,
  phase5Gate4Sample,
  phase5Gate4Assess
} from './securepay-mini-phase5-gate4-preflight.js';

/** No API calls, no ledger state, no Mini checkout launch.
 * This is intentionally a read-only preview of host-owned prerequisites.
 */
const root=document.querySelector('[data-phase5-gate4="offline-shape-only"]');
const buttons=[...document.querySelectorAll('[data-host]')];
const scenario=document.querySelector('#p5g4-scenario');
const verdict=document.querySelector('#p5g4-verdict');
const checks=document.querySelector('#p5g4-checks');
const details=document.querySelector('#p5g4-sample');
const title=document.querySelector('#p5g4-title');
const subtitle=document.querySelector('#p5g4-subtitle');
const next=document.querySelector('#p5g4-next');
const owner=document.querySelector('#p5g4-host-authority');
let selected='MY_RIDE';

function fact(label,value){
  const line=document.createElement('div');
  line.className='p5g4-fact';
  const name=document.createElement('span');name.textContent=label;
  const content=document.createElement('strong');content.textContent=String(value);
  line.append(name,content);
  return line;
}
function previewFacts(sample){
  const d=sample?.data||{};
  if(sample.hostId==='MY_RIDE')return [
    ['Journey',d.pickUp+' → '+d.dropOff],
    ['Vehicle',d.vehicleId],
    ['Sample seats',d.seatsRequested+' of '+d.seatsAvailable],
    ['Sample fare','KSh '+((d.fareMinor||0)/100).toLocaleString('en-KE')]
  ];
  if(sample.hostId==='STORAGE')return [
    ['Space',d.spaceType+' · '+d.unitId],
    ['Sample load',d.requiredKg+' kg of '+d.capacityKg+' kg'],
    ['Sample term','Three days'],
    ['Sample charge','KSh '+((d.priceMinor||0)/100).toLocaleString('en-KE')]
  ];
  return [
    ['Service','Sample estate service charge'],
    ['Sample bill',d.billId],
    ['Household','SAMPLE-HOUSEHOLD-01 (fictional)'],
    ['Sample amount','KSh '+((d.amountDueMinor||0)/100).toLocaleString('en-KE')],
    ['Gate decision','Separate — never controlled by payment']
  ];
}
function render(){
  if(!root||!PHASE5_GATE4_HOSTS[selected]||
    !PHASE5_GATE4_SCENARIOS.some(x=>x.id===scenario.value))return;
  const now=Date.now();
  const sample=phase5Gate4Sample(selected,scenario.value,now);
  const result=phase5Gate4Assess(selected,sample,now);
  const info=PHASE5_GATE4_HOSTS[selected];
  title.textContent=info.title;
  subtitle.textContent=info.subtitle;
  owner.textContent=info.sourceOwner+'.';
  for(const button of buttons){
    button.setAttribute('aria-pressed',String(button.dataset.host===selected));
  }
  details.replaceChildren(...previewFacts(sample).map(([key,value])=>fact(key,value)));
  verdict.textContent=result.sourceShapeComplete
    ? 'All local sample fields are present. NOT VERIFIED · NOT PAID · NO CHECKOUT.'
    : 'Sample cannot proceed: '+result.checks.filter(x=>!x.passed).length+
      ' local check(s) failed. NOT PAID · NO CHECKOUT.';
  verdict.dataset.status=result.sourceShapeComplete?'sample-complete':'source-blocked';
  const elements=result.checks.map(item=>{
    const li=document.createElement('li');
    li.dataset.status=item.passed?'pass':'fail';
    const mark=document.createElement('span');
    mark.className='p5g4-mark';
    mark.textContent=item.passed?'✓':'!';
    const label=document.createElement('span');
    label.textContent=item.label;
    li.append(mark,label);
    return li;
  });
  checks.replaceChildren(...elements);
  next.textContent='Next action: '+result.nextAction;
}
if(root&&buttons.length===3&&scenario&&verdict&&checks&&details&&title&&subtitle&&next&&owner){
  for(const button of buttons){
    button.addEventListener('click',()=>{
      if(!Object.prototype.hasOwnProperty.call(PHASE5_GATE4_HOSTS,button.dataset.host))return;
      selected=button.dataset.host;
      scenario.value='complete';
      render();
    });
  }
  scenario.addEventListener('change',render);
  render();
}
