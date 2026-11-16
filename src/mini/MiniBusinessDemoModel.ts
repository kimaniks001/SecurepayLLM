/** Owner-only fictional merchant workspace for trying end-to-end UX.
 * No API calls or storage: NEVER Business authority, verified public stock,
 * a payment record, or a real Agreement.
 */
export type Listing = {
  id:string; title:string; description:string; price:number|null; unit:string;
  quantity:number; stockChecked:boolean; visible:boolean; delivery:boolean; version:number;
};
export type Enquiry = {id:string;offerId:string;buyer:string;quantity:number;question:string;status:'new'|'quoted';created:string};
export type AgreementDemo = {
  id:string; enquiryId:string;offerId:string;offerVersion:number;
  buyer:string;quantity:number;unitPrice:number;terms:string;version:number;
  state:'draft'|'sent'|'reviewed'|'accepted'|'working'|'completed';
  evidence:string[]; paymentPlan:boolean;
};
export type TeamDemo = {id:string;label:string;role:'Store editor'|'Agreement assistant'|'Read only';status:'pending'};
export type InvoiceDemo = {id:string;agreementId:string;recipient:string;description:string;amount:number};
export type BusinessDemo = {
  name:string;place:string;summary:string;guideWelcome:string;
  offers:Listing[];enquiries:Enquiry[];agreements:AgreementDemo[];
  team:TeamDemo[];invoices:InvoiceDemo[];
  networks:{mini:boolean;estate:boolean;shortstays:boolean};
  directory:boolean;guideEnabled:boolean;etimsWanted:boolean;planWanted:boolean;
  activity:string[];sequence:number;
};
export const sampleBusiness:BusinessDemo = {
  name:'Kamakis Traders',place:'Kamakis · Ruiru, Kiambu',summary:'Hardware, outdoor lighting and local delivery',
  guideWelcome:'Hello! What would you like for your project?',
  offers:[
    {id:'o1',title:'Solar floodlight 200W',description:'Outdoor solar lighting. Collection or delivery by quotation.',price:8500,unit:'each',quantity:6,stockChecked:true,visible:true,delivery:true,version:1},
    {id:'o2',title:'Cement 50kg bag',description:'Cement for building and repairs; quantity and delivery to confirm.',price:750,unit:'bag',quantity:24,stockChecked:true,visible:true,delivery:true,version:1},
    {id:'o3',title:'Local delivery',description:'Transport of eligible hardware orders around Ruiru.',price:null,unit:'trip',quantity:0,stockChecked:false,visible:false,delivery:true,version:1},
  ],
  enquiries:[
    {id:'q1',offerId:'o1',buyer:'Sample buyer · Nyeri guesthouse',quantity:2,question:'Can you supply two lights and deliver them next week?',status:'new',created:'Example enquiry'},
  ],
  agreements:[], team:[],invoices:[],
  networks:{mini:true,estate:false,shortstays:false},directory:false,guideEnabled:true,
  etimsWanted:false,planWanted:false,activity:[],sequence:2
};
export const listed = (offer:Listing)=>offer.visible&&offer.stockChecked&&offer.quantity>0;
export const amount = (value:number|null)=>value===null?'Price by quotation':'KSh '+value.toLocaleString('en-KE',{maximumFractionDigits:2});
export function copyDemo():BusinessDemo {
  return JSON.parse(JSON.stringify(sampleBusiness)) as BusinessDemo;
}
export function logDemo(prev:BusinessDemo,message:string,patch:Partial<BusinessDemo>):BusinessDemo {
  return {...prev,...patch,activity:[message,...prev.activity].slice(0,25)};
}
export function upsertOffer(prev:BusinessDemo,entry:Listing):BusinessDemo {
  const has=prev.offers.some(o=>o.id===entry.id);
  const next:Listing={...entry,version:has?(prev.offers.find(o=>o.id===entry.id)?.version??0)+1:1};
  next.visible=Boolean(next.visible&&next.stockChecked&&next.quantity>0);
  if(!next.title.trim()||!Number.isInteger(next.quantity)||next.quantity<0||
    (next.price!==null&&(!Number.isFinite(next.price)||next.price<0)))return prev;
  return logDemo(prev,(has?'Updated':'Created')+' sample offer: '+next.title,{
    offers:has?prev.offers.map(o=>o.id===next.id?next:o):[...prev.offers,next],
    sequence:has?prev.sequence:prev.sequence+1
  });
}
export function createEnquiry(prev:BusinessDemo,offerId:string,qty=1):BusinessDemo {
  const offer=prev.offers.find(o=>o.id===offerId);
  if(!offer||!listed(offer)||!Number.isInteger(qty)||qty<1||qty>offer.quantity)return prev;
  const q:Enquiry={id:'q'+prev.sequence,offerId,buyer:'Sample buyer',quantity:qty,
    question:'Would you quote '+qty+' '+offer.unit+' of '+offer.title+'?',
    status:'new',created:'Just now · demo'};
  return logDemo(prev,'Example buyer asked about '+offer.title,{
    enquiries:[q,...prev.enquiries],sequence:prev.sequence+1});
}
export function quoteEnquiry(prev:BusinessDemo,enquiryId:string,terms:string):BusinessDemo {
  const q=prev.enquiries.find(v=>v.id===enquiryId);
  const offer=q&&prev.offers.find(o=>o.id===q.offerId);
  if(!q||!offer||!listed(offer)||offer.price===null||q.status==='quoted'||q.quantity>offer.quantity||!terms.trim())return prev;
  const a:AgreementDemo={id:'a'+prev.sequence,enquiryId:q.id,offerId:offer.id,offerVersion:offer.version,
    buyer:q.buyer,quantity:q.quantity,unitPrice:offer.price,terms:terms.trim().slice(0,300),
    version:1,state:'draft',evidence:[],paymentPlan:false};
  return logDemo(prev,'Prepared fictional quotation for '+offer.title,{
    agreements:[a,...prev.agreements],enquiries:prev.enquiries.map(v=>v.id===q.id?{...v,status:'quoted'}:v),
    sequence:prev.sequence+1});
}
export function progressAgreement(prev:BusinessDemo,id:string,next:AgreementDemo['state']):BusinessDemo {
  const a=prev.agreements.find(v=>v.id===id);
  const transitions:Record<AgreementDemo['state'],AgreementDemo['state'][]> = {
    draft:['sent'],sent:['reviewed'],reviewed:['accepted'],accepted:['working'],
    working:['completed'],completed:[]
  };
  if(!a||!transitions[a.state].includes(next)||(next==='completed'&&!a.evidence.length))return prev;
  return logDemo(prev,'Fictional Agreement '+a.id+': '+next,{
    agreements:prev.agreements.map(v=>v.id===id?{...v,state:next}:v)});
}
export function guideReply(demo:BusinessDemo,query:string):string {
  if(!demo.guideEnabled)return 'The Store Guide is disabled in this preview.';
  const words=query.trim().toLowerCase().split(/\s+/).filter(w=>w.length>2);
  if(!words.length)return 'Ask about a product, and I will check the sample public Store offers.';
  const offers=demo.offers.filter(o=>listed(o)&&words.some(w=>(o.title+' '+o.description).toLowerCase().includes(w)));
  if(!offers.length)return 'I cannot confirm that item from the currently listed and stock-checked sample offers. Ask the merchant to check availability.';
  return offers.map(o=>o.title+': '+amount(o.price)+' / '+o.unit+'. Sample stock checked: '+o.quantity+'. This is fictional preview data; real availability needs merchant verification.').join('\n');
}
