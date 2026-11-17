/**
 * Phase 3: optional, tab-local exact-image duplicate check.
 * SHA-256 of selected file bytes is NEVER an Identimark, copyright proof,
 * server provenance, perceptual hash or entitlement to publish.
 * The digest is kept in React memory only; no upload or storage occurs.
 */
export async function miniSellerLocalExactImageDigest(file,subtle=globalThis.crypto?.subtle){
  if(!file || typeof file.arrayBuffer!=='function'||!subtle?.digest)return null;
  if(!Number.isFinite(file.size)||file.size<1||file.size>5*1024*1024)return null;
  try{
    const bytes=await file.arrayBuffer();
    const digest=await subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{return null;}
}
