import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { submitLead, getLeadEndpoint } from '../dist/lead-api.mjs';

const lead={parentName:'Parent',childAge:7,phone:'+70000000000',direction:'english',personalDataConsent:true};
test('demo confirms valid input without returning personal data',async()=>{
  const result=await submitLead(lead);
  assert.equal(result.success,true);assert.equal(result.local,true);
  assert.equal('parentName' in result,false);assert.equal('phone' in result,false);
});
test('demo rejects incomplete input',async()=>{
  await assert.rejects(()=>submitLead({parentName:'Demo'}),/incomplete data/);
});
test('demo ignores injected endpoint metadata and explicit transport options',async()=>{
  const window=new Window();Object.assign(globalThis,{window,document:window.document});
  window.document.head.innerHTML='<meta name="lead-endpoint" content="https://example.invalid/leads">';
  let calls=0;
  const fetchImpl=()=>{calls++;throw new Error('Demo must never transmit');};window.fetch=fetchImpl;
  try {
    assert.equal(getLeadEndpoint(),'');
    assert.equal((await submitLead(lead,{endpoint:'https://example.invalid/leads',fetchImpl})).local,true);
    assert.equal((await submitLead(lead)).local,true);assert.equal(calls,0);
    assert.equal(window.localStorage.length,0);assert.equal(window.sessionStorage.length,0);
  }finally{window.close();}
});

test('confirmation rejects missing or false personal data consent',async()=>{
  await assert.rejects(()=>submitLead({...lead,personalDataConsent:false}),/incomplete data/);
  const {personalDataConsent,...withoutConsent}=lead;
  await assert.rejects(()=>submitLead(withoutConsent),/incomplete data/);
});
