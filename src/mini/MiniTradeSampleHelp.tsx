import {useState} from 'react';
import {ArrowLeft,ArrowRight,MessageCircle,Send} from 'lucide-react';
import type {MiniStorePlanLine,MiniBasketFulfilment} from './MiniBuyStore';
import type {MiniLanguage} from './miniModel';

function exampleReply(question:string,lines:MiniStorePlanLine[],fulfilment:MiniBasketFulfilment|null){
  const q=question.toLowerCase();
  const sellers=[...new Set(lines.map(x=>x.sellerName))];
  const items=lines.map(x=>x.quantity+' × '+x.title).join(', ');
  if(!lines.length)
    return 'This is a sample conversation. Try adding items in Buy something, then ask from your basket; no real merchant or payment is connected.';
  if(/deliver|transport|collect|pickup|ship/.test(q))
    return 'Your sample basket has '+lines.length+' offers from '+sellers.length+' store(s). Your current receiving choice is '+(fulfilment?.replaceAll('_',' ')||'not selected')+'. A real combined delivery needs verified routes, eligibility, price and each merchant’s approval. I cannot book a driver in this test.';
  if(/pay|money|cost|total|price|charge/.test(q)){
    const all=lines.every(x=>x.priceMinor!==null);
    const total=all?lines.reduce((sum,x)=>sum+(x.priceMinor||0)*x.quantity,0):null;
    return 'Sample items: '+items+'. '+(total===null?'At least one offer needs a quotation.':'Indicative items subtotal: KSh '+(total/100).toLocaleString('en-KE')+'.')+' Payment stays unavailable until separate seller approvals and a certified Money provider are ready.';
  }
  if(/year|maintenance|service|warrant|install/.test(q))
    return 'A service in your sample basket belongs to its own provider. A 12-month term needs its own start date, inclusions, exclusions and acceptance, even if bought with another store’s product.';
  if(/stock|available|confirm|agree|accept|securelink/.test(q))
    return 'Each of these sample offers has a separate seller and offer reference. Adding them to a basket does not reserve stock or accept an Agreement. The seller should see only its portion and confirm it separately.';
  return 'I can see these sample basket items: '+items+'. Which part is unclear? In this demonstration I can explain delivery, price, separate seller obligations and payment readiness, but cannot check real stock or create a live SecureLink.';
}
export function MiniTradeSampleHelp({onBack,language,basket}:{
  onBack:()=>void;language:MiniLanguage;
  basket:{lines:MiniStorePlanLine[];fulfilment:MiniBasketFulfilment|null}|null
}){
  const [question,setQuestion]=useState('');
  const [turns,setTurns]=useState<Array<{question:string;answer:string}>>([]);
  const send=(q:string)=>{
    const text=q.trim();if(!text)return;
    setTurns(old=>[...old,{question:text,answer:exampleReply(text,basket?.lines??[],basket?.fulfilment??null)}]);
    setQuestion('');
  };
  return <section className="spm-content" data-mini-sample-ks001="demo-only">
    <button type="button" className="spm-back" onClick={onBack}><ArrowLeft size={17}/>Back</button>
    <div className="spm-persona"><MessageCircle size={16}/>KS001 · Sample help</div>
    <h1 className="spm-question">What can I help with?</h1>
    <p className="spm-lead">This is scripted help for playing with Mini, not connected to live KS001 or any merchant.</p>
    {!!basket?.lines.length && <div className="spm-mini-buy-result">
      <strong>Your sample basket</strong>
      {basket.lines.map(line=><p key={line.sellerKsNumber+line.offerId}>
        {line.quantity} × {line.title} · {line.sellerName}</p>)}
    </div>}
    <div className="spm-collect-choices">
      {['Can these stores deliver together?','Who is responsible for the one-year service?','Can I pay once?']
        .map(q=><button className="spm-collect-choice" type="button" key={q} onClick={()=>send(q)}>
          {q}<ArrowRight size={15}/></button>)}
    </div>
    <div className="spm-guest-chat" role="log" aria-label="Example KS001 exchange">
      {turns.map((turn,i)=><div key={i}>
        <div className="spm-guest-bubble spm-guest-human"><small>You</small>{turn.question}</div>
        <div className="spm-guest-bubble"><small>KS001 · Sample guidance</small>{turn.answer}</div>
      </div>)}
    </div>
    <form className="spm-guest-compose" onSubmit={e=>{e.preventDefault();send(question);}}>
      <label htmlFor="sample-ks001-input" className="spm-label">{language==='sw'?'Uliza swali':'Your question'}</label>
      <textarea className="spm-field" id="sample-ks001-input" rows={2} maxLength={240}
        value={question} onChange={e=>setQuestion(e.target.value)}
        placeholder="For example: what if a seller declines?"/>
      <button className="spm-secondary" type="submit" disabled={!question.trim()}>
        <Send size={16}/>Ask in sample mode</button>
    </form>
    <p className="spm-disclaimer">Sample only. No messages were sent to sellers, no Agreement was accepted and no Money moved.</p>
  </section>;
}
