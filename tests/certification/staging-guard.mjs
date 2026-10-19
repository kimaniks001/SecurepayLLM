/**
 * Certification safety gate. This validates configuration ONLY.
 * It does not connect to an API or infer that the deployed frontend really
 * points at the supplied backend. An authorised human must verify deployment
 * routing and test identity isolation before any live browser certification.
 */
const NON_PROD_LABEL = /(?:^|[.-])(staging|stage|sandbox|qa|test|testing|dev)(?:[.-]|$)/i;
const LOCAL = new Set(['localhost','127.0.0.1','[::1]']);

function cleanOrigin(raw, label) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(label+' is required');
  let url;
  try { url = new URL(raw); } catch { throw new Error(label+' must be a valid origin'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' )
    throw new Error(label+' must be an origin without path, user info or secrets');
  if (url.protocol !== 'https:' && !(url.protocol==='http:' && LOCAL.has(url.hostname)))
    throw new Error(label+' must use HTTPS, except isolated localhost');
  return url;
}

export function validateCertificationTarget({siteOrigin,apiOrigin,confirmedTestOnly,moneyMode}) {
  const site=cleanOrigin(siteOrigin,'Site origin');
  const api=cleanOrigin(apiOrigin,'API origin');
  const host=api.hostname.toLowerCase();
  const siteHost=site.hostname.toLowerCase();
  if (['securepay.ke','www.securepay.ke'].includes(host) || host.endsWith('.vercel.app'))
    throw new Error('Production or preview API is forbidden for certification');
  if (['securepay.ke','www.securepay.ke'].includes(siteHost) || siteHost.endsWith('.vercel.app'))
    throw new Error('Production site or existing Vercel preview is forbidden for authenticated certification');
  if (!NON_PROD_LABEL.test(host) && !LOCAL.has(host))
    throw new Error('API must be an explicitly named staging, sandbox, QA, test or development origin');
  if (!NON_PROD_LABEL.test(siteHost) && !LOCAL.has(siteHost))
    throw new Error('Site must be an explicitly named non-production environment');
  if (confirmedTestOnly !== 'I_CONFIRM_TEST_ONLY')
    throw new Error('Explicit test-only authorisation is required');
  if (moneyMode !== 'NO_EXECUTION')
    throw new Error('Money execution, payment intents and real invitations are forbidden in this certification phase');
  return {
    phase:'CONFIGURATION_CHECK_ONLY',
    siteOrigin:site.origin,
    apiOrigin:api.origin,
    verifiedDeployedRouting:false,
    verifiedTestIdentities:false,
    allowedActions:'read-only and approved test-only Agreement drafts',
    prohibitedActions:'payments, settlement, booking, real invitations, identity changes',
  };
}

if (process.argv[1] && import.meta.url === new URL('file://'+process.argv[1]).href) {
  try {
    const result=validateCertificationTarget({
      siteOrigin:process.env.SECUREPAY_CERT_SITE_ORIGIN,
      apiOrigin:process.env.SECUREPAY_CERT_API_ORIGIN,
      confirmedTestOnly:process.env.SECUREPAY_CERT_TEST_ONLY,
      moneyMode:process.env.SECUREPAY_CERT_MONEY_MODE,
    });
    console.log(JSON.stringify(result,null,2));
    console.log('Configuration is eligible for a separate deployment/identity review. NO live journey has been run.');
  } catch (error) {
    console.error('CERTIFICATION BLOCKED: '+error.message);
    process.exitCode=1;
  }
}
