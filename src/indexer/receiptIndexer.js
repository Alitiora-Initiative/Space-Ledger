'use strict';
// Replay every receipt each run so incomplete signature enrichment is retried.
async function syncDevnetReceipts({solanaService,store,programId,now=()=>new Date(),batchSize=50}) {
  if(!solanaService||!store||!store.configured) throw new Error('A configured Solana service and private Supabase store are required.');
  if(!programId) throw new Error('SOLANA_PROGRAM_ID is required for Devnet indexing.');
  const state=await solanaService.getState();
  if(!state.initialized) return {status:'awaiting_initialization',indexed:0,skipped:0,errors:0,lastIndexedSlot:0,scanned:0};
  if(state.programId.toBase58()!==programId) throw new Error('The configured Devnet program ID does not match the on-chain state.');
  const receipts=await solanaService.listReceipts();
  const size=Math.max(1,Math.min(100,Number(batchSize)||50));
  const previous=await store.getState(programId);
  let indexed=0,skipped=0,errors=0,maxSlot=Number(previous?.last_indexed_slot||0),lastSignature=previous?.last_signature||null;
  for(let offset=0;offset<receipts.length;offset+=size) {
    const batch=receipts.slice(offset,offset+size),existing=new Set(await store.getExistingReceiptAddresses(batch.map(x=>x.receipt)));
    const rows=[],events=[];
    for(const receipt of batch) {
      if(existing.has(receipt.receipt)){skipped++;continue;}
      try {
        const signatures=await solanaService.signaturesForAccount(receipt.receipt,20);
        const tx=signatures.find(x=>x&&!x.err&&typeof x.signature==='string'&&Number.isSafeInteger(x.slot));
        if(!tx){errors++;continue;}
        const row={network:'devnet',receipt_address:receipt.receipt,program_id:programId,buyer:receipt.buyer,start_block:receipt.startBlock,block_count:receipt.blockCount,end_block:receipt.endBlock,asset:receipt.asset,paid_units:receipt.paidUnits,price_micro_usd:receipt.priceMicroUsd,fee_micro_usd:receipt.feeMicroUsd,settled_at:new Date(receipt.settledAt*1000).toISOString(),slot:tx.slot,signature:tx.signature,commitment:'confirmed',raw_receipt:receipt};
        rows.push(row);
        events.push({network:'devnet',signature:tx.signature,event_index:0,program_id:programId,slot:tx.slot,block_time:Number.isSafeInteger(tx.blockTime)?new Date(tx.blockTime*1000).toISOString():null,event_type:'PurchaseSettled',payload:row,commitment:'confirmed'});
        if(tx.slot>=maxSlot){maxSlot=tx.slot;lastSignature=tx.signature;}
      } catch (_) {errors++;}
    }
    if(rows.length){await store.upsertReceipts(rows);await store.upsertEvents(events);indexed+=rows.length;}
    await store.upsertState({network:'devnet',program_id:programId,last_indexed_slot:maxSlot,last_signature:lastSignature,last_success_at:now().toISOString(),last_error:errors?errors+' receipt(s) could not be indexed; the next replay retries them.':null,receipts_indexed:Number(previous?.receipts_indexed||0)+indexed,updated_at:now().toISOString()});
  }
  return {status:errors?'partial':'ok',indexed,skipped,errors,lastIndexedSlot:maxSlot,scanned:receipts.length};
}
module.exports={syncDevnetReceipts};