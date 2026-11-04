'use strict';
require('dotenv').config();
const solanaService=require('../src/solanaService');
const {createSupabaseStore}=require('../src/indexer/supabaseStore');
const {syncDevnetReceipts}=require('../src/indexer/receiptIndexer');
(async()=>{
 try {
  if(!process.env.SOLANA_PROGRAM_ID) throw new Error('SOLANA_PROGRAM_ID is not configured.');
  const result=await syncDevnetReceipts({solanaService,store:createSupabaseStore(process.env),programId:process.env.SOLANA_PROGRAM_ID});
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status==='partial') process.exitCode=2;
 } catch(error) {process.stderr.write('Devnet indexer failed: '+(error.message||'unknown error')+'\n');process.exitCode=1;}
})();