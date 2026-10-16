// Campaign names/terms are deliberately excluded: they can contain personal data.
// Olga can use numeric campaign/ad IDs; source and medium use a closed vocabulary.
export const ATTRIBUTION_COOKIE='lt_ga4_attribution';
export type Campaign={campaign_source?:string;campaign_medium?:string;campaign_id?:string;campaign_content?:string};
export function safeCampaign(params:URLSearchParams):Campaign{
 const source=params.get('utm_source'),medium=params.get('utm_medium'),id=params.get('utm_id')||params.get('utm_campaign'),content=params.get('utm_content');
 return {...(source&&['facebook','instagram','meta','google','newsletter'].includes(source)?{campaign_source:source}:{}),...(medium&&['cpc','paid_social','social','email','organic'].includes(medium)?{campaign_medium:medium}:{}),...(id&&/^\d{1,30}$/.test(id)?{campaign_id:id}:{}),...(content&&/^\d{1,30}$/.test(content)?{campaign_content:content}:{})};
}
export function onlyAttributionQuery(url:URL){return Boolean(url.search)&&[...url.searchParams.keys()].every(k=>['utm_source','utm_medium','utm_id','utm_campaign','utm_content','utm_term','fbclid'].includes(k))&&[...url.searchParams.keys()].every(k=>url.searchParams.getAll(k).length===1);}
export function readCampaign(cookie:string,receiptId:string,now=Date.now()):Campaign{
 try{const raw=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(ATTRIBUTION_COOKIE+'='))?.slice(ATTRIBUTION_COOKIE.length+1);const c=JSON.parse(decodeURIComponent(raw??''));if(c.receiptId!==receiptId||!Number.isSafeInteger(c.at)||c.at>now||c.at<now-1800000)return {};const p=new URLSearchParams();for(const [k,v]of Object.entries(c.values??{})){const names:Record<string,string>={campaign_source:'utm_source',campaign_medium:'utm_medium',campaign_id:'utm_id',campaign_content:'utm_content'};if(names[k]&&typeof v==='string')p.set(names[k],v);}return safeCampaign(p);}catch{return {};}
}
