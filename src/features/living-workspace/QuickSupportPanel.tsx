import { useState } from 'react';
import { BedDouble, CarFront, FileText, LifeBuoy, ShieldCheck, ArrowLeft } from 'lucide-react';
type Service = 'menu'|'stays'|'ride'|'documents';
const services = [
 {id:'stays' as const,title:'Short Stays',description:'Find suitable accommodation',Icon:BedDouble},
 {id:'ride' as const,title:'My Ride',description:'Plan transport for yourself or goods',Icon:CarFront},
 {id:'documents' as const,title:'Quick Documents',description:'Prepare invoices, receipts and quotations',Icon:FileText},
];
export function QuickSupportPanel(){
 const [service,setService]=useState<Service>('menu');
 const [documentType,setDocumentType]=useState('Invoice');
 const [description,setDescription]=useState('');
 const [recipient,setRecipient]=useState('');
 const [amount,setAmount]=useState('');
 return <section className="space-y-4" aria-label="Universal Quick Support">
  <div className="flex items-center gap-2"><LifeBuoy size={19}/><h3 className="font-semibold">Quick Support</h3></div>
  <p className="text-xs text-sand-600">Available in My Work, Vision, Circle and Community. Nothing leaves this preview.</p>
  {service==='menu'?<div className="space-y-2">{services.map(({id,title,description:desc,Icon})=><button key={id} onClick={()=>setService(id)} className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-cream-200 bg-white p-3 text-left"><Icon size={20}/><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-sand-600">{desc}</span></span></button>)}</div>:<>
   <button className="flex min-h-11 items-center gap-2 text-xs" onClick={()=>setService('menu')}><ArrowLeft size={15}/> All Quick Support</button>
   <h4 className="font-semibold">{services.find(s=>s.id===service)?.title}</h4>
   {service==='documents'?<div className="space-y-3">
     <label className="block text-xs font-semibold">Document type<select value={documentType} onChange={e=>setDocumentType(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2"><option>Invoice</option><option>Receipt</option><option>Quotation</option></select></label>
     <label className="block text-xs font-semibold">Customer or recipient<input value={recipient} onChange={e=>setRecipient(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="Customer"/></label>
     <label className="block text-xs font-semibold">Items or description<input value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="What is it for?"/></label>
     <label className="block text-xs font-semibold">Amount (KES)<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" className="mt-1 min-h-11 w-full rounded-xl border border-cream-200 p-2" placeholder="Amount"/></label>
     <div className="rounded-xl bg-cream-100 p-4"><p className="text-xs uppercase tracking-wide text-sand-600">Draft preview · not issued</p><p className="mt-2 font-semibold">{documentType}</p><p className="mt-2 text-sm">For: {recipient||'Not supplied'}</p><p className="text-sm">Item: {description||'Not supplied'}</p><p className="text-sm">KES {amount||'—'}</p><p className="mt-3 text-xs text-sand-600">{documentType==='Receipt'?'A receipt must identify genuine payment evidence or be explicitly labelled user-declared; this is not proof of payment.':documentType==='Invoice'?'An invoice requests payment; it does not prove payment.':'A quotation is a proposal, not an accepted Agreement.'}</p></div>
   </div>:<div className="rounded-xl bg-cream-100 p-4"><p className="text-sm">{service==='stays'?'Describe your destination, dates and accommodation needs to KS001.':'Describe where you need to go, or what goods need transporting.'}</p><p className="mt-2 text-xs text-sand-600">This preview cannot search live provider availability, dispatch transport, reserve accommodation or make payment.</p></div>}
  </>}
  <p className="flex items-start gap-2 text-xs text-sand-600"><ShieldCheck size={15}/> Quick Support never silently creates an Agreement, charges you or shares private workspace information.</p>
 </section>;
}
