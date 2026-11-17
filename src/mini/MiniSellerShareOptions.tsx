import {useState} from 'react';
import {Check, Copy, Link2, QrCode, Send, X} from 'lucide-react';
import {SecureLinkQrCode} from '../features/securelink/QrCode';

type Props={
  publicUrl:string;
  title:string;
};

/**
 * One Agreement, one server-issued SecureLink, two delivery presentations.
 * Never assembles, edits, shortens or generates a new URL. In particular,
 * QRCodeSVG receives the exact same publicUrl that copy/share use.
 * Browsing or scanning does not mean acceptance, joining or funding.
 */
export function MiniSellerShareOptions({publicUrl,title}:Props){
  const [showQr,setShowQr]=useState(false);
  const [notice,setNotice]=useState('');
  const [copied,setCopied]=useState(false);
  const [sharing,setSharing]=useState(false);
  // Even if a caller accidentally passes bad data, do not embed it in a QR.
  const urlValid=(()=>{
    try{
      const u=new URL(publicUrl);
      return u.protocol==='https:' && !u.username && !u.password &&
        !!u.hostname;
    }catch{return false;}
  })();
  if(!urlValid){
    return <p className="spm-sell-hint" role="status">
      SecurePay has not returned a usable sharing address. Open the Agreement to check its SecureLink.
    </p>;
  }
  const text='Please review this proposed SecurePay Agreement. Opening it does not accept or pay:';
  const copy=async()=>{
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);setNotice('SecureLink copied. Choose who receives it.');
    }catch{
      setNotice('Copy was not available. Select the link below to copy it manually.');
    }
  };
  const share=async()=>{
    if(sharing)return;
    const nav=navigator as Navigator & {share?:(data:{title:string;text:string;url:string})=>Promise<void>};
    if(typeof nav.share!=='function'){
      setNotice('Use Copy link, WhatsApp, or show the QR code.');
      return;
    }
    setSharing(true);
    try{
      await nav.share({title:'SecurePay Agreement',text,url:publicUrl});
      setNotice('Share sheet closed. SecurePay cannot assume the buyer received or accepted it.');
    }catch{
      setNotice('Sharing was cancelled or did not complete. No buyer action was recorded.');
    }finally{setSharing(false);}
  };
  const whatsapp=()=>{
    const message=text+'\n'+publicUrl;
    const destination='https://wa.me/?text='+encodeURIComponent(message);
    const win=window.open(destination,'_blank','noopener,noreferrer');
    setNotice(win?'Choose a recipient in WhatsApp. SecurePay has not sent it automatically.':
      'If WhatsApp did not open, copy the link instead. SecurePay did not send anything.');
  };
  return <section className="spm-sell-link-actions" aria-label="Share this SecureLink" data-mini-seller-share-options>
    <div className="spm-sell-link-actions-head"><Link2 size={18}/><strong>Your SecureLink is ready</strong></div>
    <p className="spm-sell-link-title">{title}</p>
    <p className="spm-sell-hint">Send it to the buyer when you choose. It opens this Agreement for review — not acceptance or payment.</p>
    <p className="spm-sell-link-address" aria-label="Server-issued SecureLink address">{publicUrl}</p>
    <div className="spm-sell-pill-row">
      <button type="button" className="spm-secondary" onClick={()=>void copy()}>
        {copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copied':'Copy link'}
      </button>
      <button type="button" className="spm-secondary" onClick={()=>void share()} disabled={sharing}>
        <Send size={16}/> {sharing?'Sharing…':'Share link'}
      </button>
      <button type="button" className="spm-secondary" onClick={whatsapp}>WhatsApp</button>
      <button type="button" className="spm-secondary" aria-expanded={showQr}
        aria-controls="spm-mini-seller-qr" onClick={()=>setShowQr(v=>!v)}>
        {showQr?<X size={16}/>:<QrCode size={16}/>} {showQr?'Hide QR':'Show QR'}
      </button>
    </div>
    {showQr&&<div className="spm-sell-qr-display" id="spm-mini-seller-qr">
      <SecureLinkQrCode publicUrl={publicUrl} size={208}/>
      <p>Show this to someone beside you. They scan the same SecureLink — no second Agreement is created.</p>
    </div>}
    {notice&&<p className="spm-sell-hint" role="status">{notice}</p>}
  </section>;
}
