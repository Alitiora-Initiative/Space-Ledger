'use strict';

const { getNetwork } = require('../networkConfig');

function createSupabaseStore(env = process.env, fetchImpl = globalThis.fetch) {
  const network = getNetwork(env);
  const url = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const configured = Boolean(url && key && typeof fetchImpl === 'function');
  if (url) {
    let parsed;
    try { parsed = new URL(url); } catch (_) { throw new Error('SUPABASE_URL must be a valid HTTPS project URL.'); }
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) || parsed.pathname !== '/' && parsed.pathname !== '') throw new Error('SUPABASE_URL must be a valid HTTPS project URL on the Supabase domain.');
  }
  if (key && !/^(sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9._-]{20,})$/.test(key)) throw new Error('Use a Supabase secret key or legacy service_role key in the server environment only.');
  async function request(table, params, options = {}) {
    if (!configured) throw new Error('The private Supabase indexer is not configured.');
    const response = await fetchImpl(url + '/rest/v1/' + table + (params ? '?' + params : ''), {
      method:options.method || 'GET',
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:options.prefer || 'return=representation'},
      body:options.body === undefined ? undefined : JSON.stringify(options.body),
      signal:AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const detail=(await response.text()).slice(0,240);
      throw new Error('Supabase indexer request failed ('+response.status+'). '+detail);
    }
    const body=await response.text();
    if (!body) return [];
    try { return JSON.parse(body); } catch (_) { throw new Error('Supabase indexer returned invalid JSON.'); }
  }
  return Object.freeze({
    configured,
    async getState(programId) {
      const q=new URLSearchParams({select:'*',network:'eq.'+network,program_id:'eq.'+programId,limit:'1'});
      const rows=await request('indexer_state',q.toString());return rows[0]||null;
    },
    async listReceipts({programId,limit=20,beforeSlot,beforeSignature}={}) {
      const count=Math.max(1,Math.min(100,Number(limit)||20));
      const filters={select:'*',network:'eq.'+network,order:'slot.desc,signature.desc',limit:String(count+1)};
      if(programId) filters.program_id='eq.'+programId;
      if(beforeSlot!==undefined&&beforeSlot!==null) {
        if(!Number.isSafeInteger(Number(beforeSlot))||Number(beforeSlot)<0||!beforeSignature) throw new Error('Both a valid slot and signature are required for the receipt cursor.');
        filters.or='(slot.lt.'+Number(beforeSlot)+',and(slot.eq.'+Number(beforeSlot)+',signature.lt.'+beforeSignature+'))';
      }
      return request('purchase_receipts',new URLSearchParams(filters).toString());
    },
    async getExistingReceiptAddresses(addresses) {
      if (!addresses.length) return [];
      const q=new URLSearchParams({select:'receipt_address',network:'eq.'+network,receipt_address:'in.('+addresses.join(',')+')'});
      const rows=await request('purchase_receipts',q.toString());return rows.map(row=>row.receipt_address);
    },
    async upsertReceipts(rows) {
      if (!rows.length) return [];
      return request('purchase_receipts','on_conflict=network%2Creceipt_address',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:rows});
    },
    async upsertEvents(rows) {
      if (!rows.length) return [];
      return request('chain_events','on_conflict=network%2Csignature%2Cevent_index',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:rows});
    },
    async upsertState(row) {
      return request('indexer_state','on_conflict=network%2Cprogram_id',{method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:[row]});
    }
  });
}
module.exports={createSupabaseStore};
