import type {CookieConsent} from './cookie-consent';
export const ACCOUNT_GROWTH_POLICY = 'growth-account-v2';
export type AccountGrowthChoice = { personalization: boolean; history: boolean; adult: boolean };
export type AccountGrowthResult = { guest: boolean; accountId?: string; receiptId?: string };
// Only called for an explicit new choice, never replay a cookie grant on page load.
// The backend derives identity from its authenticated session, not request contact fields.
export async function applyAccountGrowthChoice(choice: AccountGrowthChoice, fetcher: typeof fetch = fetch): Promise<AccountGrowthResult> {
  if (choice.history && !choice.personalization) throw Error('Lo storico richiede la personalizzazione.');
  if (choice.personalization && !choice.adult) throw Error('La personalizzazione è riservata ai maggiorenni.');
  let accountId = '';
  const request = async (url: string, init: RequestInit = {}) => {
    const headers=new Headers(init.headers);
    if(accountId)headers.set('X-Growth-Account',accountId);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try{return await fetcher(url,{...init,headers,credentials:'same-origin',cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timer);}
  };
  const session = await request('/api/auth/session');
  if (!session.ok) throw Error('Non riesco a verificare l’account. Riprova.');
  const user = (await session.json())?.user;
  if (!user) return { guest: true };
  if (user.app_metadata?.role && user.app_metadata.role !== 'customer') throw Error('Preferenze riservate agli account cliente.');
  accountId=user.id;
  const current = await request('/api/account/growth/preferences');
  if (!current.ok) throw Error('Personalizzazione non confermata. Le preferenze dell’account non sono state aggiornate: riprova.');
  const preferences = await current.json();
  if (!preferences.linked && !preferences.pending && !choice.personalization) return { guest: false, accountId: user.id };
  const enroll = !preferences.linked && choice.personalization;
  if (preferences.pending && !choice.personalization) {
    // Cancel a partially completed enrollment through the existing durable privacy fence.
    // Never complete a pending opt-in to be able to revoke it afterwards.
    const cancelled = await request('/api/account/growth/erase-optional', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    });
    if (!cancelled.ok) throw Error('Revoca dell’account non confermata: riprova.');
    return { guest: false, accountId: user.id };
  }
  const body = enroll ? {
    personalization: true, history: choice.history, adult_confirmed: choice.adult, policy_version: ACCOUNT_GROWTH_POLICY,
  } : {
    personalization: choice.personalization, history: choice.history, email: false, in_app: false, policy_version: ACCOUNT_GROWTH_POLICY,
  };
  const response = await request('/api/account/growth/' + (enroll ? 'enroll' : 'preferences'), {
    method: enroll ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw Error('Scelta dell’account non confermata. Puoi ordinare normalmente; riprova dalle preferenze.');
  const result = await response.json();
  if (typeof result.receipt_id !== 'string' || !result.receipt_id) throw Error('Manca la conferma del consenso dell’account. Riprova.');
  return { guest: false, accountId: user.id, receiptId: result.receipt_id };
}

// Only a denial may be retried automatically, and only for the account that made it.
export function needsGrowthWithdrawalRetry(consent:CookieConsent|null,accountId:string):boolean {
  return Boolean(accountId&&consent?.growthWithdrawalPending&&consent.profileAccountId===accountId&&!consent.personalization);
}
