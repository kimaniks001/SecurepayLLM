import type {SessionTokensDto} from './auth';
export function createWorkspaceTransport(config:{enabled:boolean;localOrigin:string;approvedOrigins:string[];fetcher?:typeof fetch;now?:()=>number}):{
 issue(args:{accessToken:string;refreshToken:string;targetOrigin:string;proofChallenge:string}):Promise<{ticket:string;expiresAt:string}>;
 redeem(args:{ticket:string;verifier:string}):Promise<SessionTokensDto>;
 readIdentityWithToken(accessToken:string):Promise<{identityId:string;ksNumber:string}>;
};
