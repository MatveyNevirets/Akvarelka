import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Window } from 'happy-dom';
import { nationalDigits, formatPhone } from '../dist/phone-mask.mjs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
let window, document, count = 0;
beforeEach(async () => {
  window = new Window({width:1280,height:900,url:'http://localhost:5187',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  document = window.document;
  document.write(html);
  Object.assign(globalThis,{window,document,Event:window.Event,IntersectionObserver:window.IntersectionObserver,requestAnimationFrame:window.requestAnimationFrame.bind(window)});
  await import('../dist/app.js?test=' + count++);
});
afterEach(async () => { await window.happyDOM.abort(); window.close(); });
const field = id => document.getElementById(id);
function input(id,value){field(id).value=value;field(id).dispatchEvent(new window.Event('input',{bubbles:true}));}
function paste(value){
  const data = new window.DataTransfer();data.setData('text',value);
  field('phone').dispatchEvent(new window.ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
}
function edit(inputType,data=null){field('phone').dispatchEvent(new window.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType,data}));}
function submit(){field('lead-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
async function settle(){await new Promise(resolve=>setTimeout(resolve,0));}
function endpoint(value='/api/leads'){const meta=document.createElement('meta');meta.name='lead-endpoint';meta.content=value;document.head.append(meta);}
function validForm(){input('parent','Анна');input('age','7');field('phone').focus();paste('89271234567');}
const direction = value => document.querySelector(`[name="direction"][value="${value}"]`);
const selected = () => document.querySelector('[name="direction"]:checked')?.value;

for(const value of ['89271234567','79271234567','+79271234567','+7 (927) 123-45-67','9271234567']) {
  test('paste normalizes ' + value, () => {
    field('phone').focus();paste(value);
    assert.equal(field('phone').value,'+7 (927) 123-45-67');
    assert.equal(field('phone-normalized').value,'+79271234567');
    assert.equal(new window.FormData(field('lead-form')).get('phone'),'+79271234567');
  });
}
test('typing national digits, excess digits, letters and full selection replacement',()=>{
  field('phone').focus();
  for(const digit of '4951234567') edit('insertText',digit);
  assert.equal(field('phone').value,'+7 (495) 123-45-67');
  edit('insertText','8');edit('insertText','a');
  assert.equal(field('phone').value,'+7 (495) 123-45-67');
  field('phone').select();paste('9997654321');
  assert.equal(field('phone').value,'+7 (999) 765-43-21');
});
test('backspace and delete work across mask separators and in the middle',()=>{
  field('phone').focus();paste('89271234567');
  field('phone').setSelectionRange(9,9); // Immediately after the closing parenthesis and space.
  edit('deleteContentBackward');
  assert.equal(field('phone-normalized').value,'+7921234567');
  paste('+79271234567');
  field('phone').setSelectionRange(13,13); // After the first dash, before 45.
  edit('deleteContentForward');
  assert.equal(field('phone-normalized').value,'+7927123567');
  field('phone').select();edit('deleteContentBackward');
  assert.equal(field('phone-normalized').value,'');
  field('phone').blur();assert.equal(field('phone').value,'');
});
test('selection can replace a middle digit without losing the rest of the number',()=>{
  field('phone').focus();paste('89271234567');
  field('phone').setSelectionRange(5,6);edit('insertText','1');
  assert.equal(field('phone').value,'+7 (917) 123-45-67');
});
test('autofill fallback normalizes an unformatted value and caret',()=>{
  input('phone','89271234567');
  assert.equal(field('phone').value,'+7 (927) 123-45-67');
  assert.equal(field('phone-normalized').value,'+79271234567');
});
test('errors stay hidden initially, then show by the corresponding fields',()=>{
  assert.ok([...document.querySelectorAll('.field-error')].every(error=>error.hidden));
  input('phone','927');assert.equal(field('phone-error').hidden,true);
  field('phone').dispatchEvent(new window.Event('blur'));
  assert.equal(field('phone-error').textContent,'Введите номер полностью');
  submit();
  assert.equal(field('parent-error').hidden,false);
  assert.equal(field('age-error').hidden,false);
  assert.equal(field('success-card').hidden,true);
  assert.equal(document.activeElement,field('parent'));
  validForm();field('phone').dispatchEvent(new window.Event('blur'));assert.equal(field('phone-error').hidden,true);
});
test('whitespace name, incomplete phone and invalid ages do not create a message',()=>{
  validForm();input('parent','   ');submit();assert.equal(field('parent-error').hidden,false);
  input('parent','Анна');input('phone','92712345');submit();assert.equal(field('phone-error').hidden,false);
  paste('89271234567');
  for(const age of ['0','19','7.5','']){input('age',age);submit();assert.equal(field('age-error').hidden,false);assert.equal(field('success-card').hidden,true);}
});
test('direction is required even if the initial consultation was cleared',()=>{
  validForm();document.querySelectorAll('[name="direction"]').forEach(radio=>radio.checked=false);submit();
  assert.equal(field('direction-error').hidden,false);
  direction('consultation').click();assert.equal(field('direction-error').hidden,true);
});
test('English CTAs select English; manual direction change overrides the CTA payload',async()=>{
  document.querySelector('.english-card a').click();assert.equal(selected(),'english');
  direction('art').click();assert.equal(selected(),'art');
  endpoint();let payload;
  window.fetch=async(url,options)=>{payload=JSON.parse(options.body);return{ok:true,json:async()=>({success:true})};};
  validForm();submit();await settle();
  assert.equal(payload.directionLabel,'Художественные курсы');
  assert.equal(payload.context,null);
  assert.equal(payload.phone,'+79271234567');
});
test('every CTA maps to its context, while general CTAs choose consultation',()=>{
  const cases=[['.hero-actions a','english'],['.english-card.lavender a','english'],['.header-cta','consultation'],['.mobile-cta a','consultation'],['.contact-actions a[href="#signup"]','consultation'],['.activity-list a:nth-child(1)','school'],['.activity-list a:nth-child(2)','art'],['.activity-list a:nth-child(3)','children']];
  for(const [selector,value] of cases){document.querySelector(selector).click();assert.equal(selected(),value,selector);}
});
test('confirmed API response shows success, clears fields and never creates a WhatsApp action',async()=>{
  endpoint();let count=0;
  window.fetch=async()=>{count++;return{ok:true,json:async()=>({success:true,id:'lead-1'})};};
  validForm();submit();await settle();
  assert.equal(count,1);assert.equal(field('lead-form').dataset.state,'success');
  assert.equal(field('success-card').hidden,false);assert.equal(field('form-status').hidden,true);
  assert.equal(field('parent').value,'');assert.equal(field('phone-normalized').value,'');assert.equal(selected(),'consultation');
  assert.equal(field('lead-form').querySelector('[href*="wa.me"]'),null);
  assert.equal(field('lead-form').textContent.includes('WhatsApp'),false);
  assert.equal(field('lead-form').textContent.includes('Скопировать'),false);
});
test('loading disables repeat submit and restores controls after confirmed success',async()=>{
  endpoint();let resolveFetch;let count=0;
  window.fetch=()=>{count++;return new Promise(resolve=>{resolveFetch=resolve;});};
  validForm();submit();submit();
  assert.equal(count,1);assert.equal(field('submit-lead').disabled,true);assert.equal(field('submit-lead').textContent.includes('Отправляем'),true);assert.equal(field('lead-form').getAttribute('aria-busy'),'true');
  resolveFetch({ok:true,json:async()=>({success:true})});await settle();
  assert.equal(field('submit-lead').disabled,false);assert.equal(field('lead-form').getAttribute('aria-busy'),'false');
});
test('local API stub succeeds, while a configured server failure shows an error',async()=>{
  const originalError=console.error;console.error=()=>{};
  try{
    validForm();submit();await settle();
    assert.equal(field('form-status').hidden,true);assert.equal(field('success-card').hidden,false);
    endpoint();window.fetch=async()=>({ok:false,status:500,json:async()=>({success:false})});
    validForm();
    submit();await settle();assert.equal(field('form-status').hidden,false);assert.equal(field('success-card').hidden,true);
  }finally{console.error=originalError;}
});
test('all local resources, module imports, anchors and error descriptions exist',()=>{
  for(const element of document.querySelectorAll('[src],link[href]')){
    const value=element.getAttribute('src')||element.getAttribute('href');
    if(!value.startsWith('http'))assert.ok(existsSync(new URL('../dist/'+value,import.meta.url)),value);
  }
  for(const anchor of document.querySelectorAll('a[href^="#"]')){
    const id=anchor.getAttribute('href').slice(1);if(id)assert.ok(field(id),id);
  }
  for(const element of document.querySelectorAll('[aria-describedby]'))assert.ok(field(element.getAttribute('aria-describedby')));
  const ids=[...document.querySelectorAll('[id]')].map(element=>element.id);assert.equal(ids.length,new Set(ids).size);
});
test('mobile menu closes after navigation; Escape does not steal unrelated form focus',()=>{
  const menu=document.querySelector('.menu-toggle');menu.click();assert.equal(menu.getAttribute('aria-expanded'),'true');
  document.querySelector('#navigation a').click();assert.equal(menu.getAttribute('aria-expanded'),'false');
  field('parent').focus();document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(document.activeElement,field('parent'));
});
test('national number parsing supports different codes without locking to 927',()=>{
  assert.equal(formatPhone(nationalDigits('84951234567')),'+7 (495) 123-45-67');
  assert.equal(formatPhone(nationalDigits('+7 800 123 45 67')),'+7 (800) 123-45-67');
});
