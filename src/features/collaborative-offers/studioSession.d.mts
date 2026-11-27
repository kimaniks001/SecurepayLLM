export type Personal={identityId:string;ksNumber:string};
export type Capacity={kind:'personal'|'business';ksNumber:string;identityId:string;personalKsNumber:string};
export function studioOrigin(product:string,configured:unknown,current:string,enabled:unknown):string|null;
export function personalIdentity(v:unknown):Personal|null;
export function represented(v:unknown,expected:string):boolean;
export function studioBusinesses(v:unknown):{ksNumber:string;label:string}[]|null;
export function studioPath(capacity:Capacity,suffix:string,method?:'GET'|'POST',body?:unknown,enableG5?:boolean):string|null;
export function studioClient(options:{origin:string;token:string;current:()=>boolean;fetcher:typeof fetch;enableG5?:boolean}):{personal:()=>Promise<Personal>;businesses:()=>Promise<{ksNumber:string;label:string}[]>;scoped:(capacity:Capacity,suffix:string,method?:'GET'|'POST',body?:unknown)=>Promise<unknown>};

export function studioProxyFetch(origin:string,fetcher?:typeof fetch):typeof fetch;
