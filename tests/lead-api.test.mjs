import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { submitLead } from '../dist/lead-api.mjs';

function environment(){
  const window=new Window();Object.assign(globalThis,{window,document:window.document});return window;
}
test('lead API stub confirms a complete lead without a configured endpoint',async()=>{
  const window=environment();
  const result=await submitLead({parentName:'Анна',childAge:7,phone:'+79271234567',direction:'english'});
  assert.equal(result.success,true);assert.equal(result.mock,true);window.close();
});
test('lead API stub rejects incomplete data',async()=>{
  const window=environment();
  await assert.rejects(()=>submitLead({parentName:'Анна'}),/incomplete data/);window.close();
});
test('lead API requires a successful HTTP response and explicit JSON acknowledgement',async()=>{
  const window=environment();
  await assert.rejects(()=>submitLead({}, {endpoint:'/api/leads',fetchImpl:async()=>({ok:false,status:503})}),/503/);
  await assert.rejects(()=>submitLead({}, {endpoint:'/api/leads',fetchImpl:async()=>({ok:true,json:async()=>({success:false})})}),/did not confirm/);
  await assert.rejects(()=>submitLead({}, {endpoint:'/api/leads',fetchImpl:async()=>({ok:true,json:async()=>{throw new Error('bad json');}})}),/invalid JSON/);
  window.close();
});
test('lead API serializes the payload and returns only confirmed success',async()=>{
  const window=environment();let request;
  const result=await submitLead({phone:'+79271234567'}, {endpoint:'/api/leads',fetchImpl:async(url,options)=>{request={url,options};return{ok:true,json:async()=>({success:true,id:'42'})};}});
  assert.equal(request.url,'/api/leads');assert.equal(request.options.method,'POST');assert.equal(JSON.parse(request.options.body).phone,'+79271234567');assert.equal(result.id,'42');window.close();
});
