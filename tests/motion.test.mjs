import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { initMotion } from '../dist/motion.mjs';
let window, document, reduced, finePointer, observers;
beforeEach(()=>{
  window=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  document=window.document;document.write(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
  const media=matches=>({matches, listeners:[],addEventListener(event,listener){this.listeners.push(listener);},change(matches){this.matches=matches;this.listeners.forEach(listener=>listener());}});
  reduced=media(false);finePointer=media(true);window.matchMedia=query=>query.includes('prefers-reduced-motion')?reduced:finePointer;
  observers=[];
  class Observer{constructor(callback){this.callback=callback;this.observed=new Set();observers.push(this);}observe(el){this.observed.add(el);}unobserve(el){this.observed.delete(el);}disconnect(){this.observed.clear();}}
  window.IntersectionObserver=Observer;
  Object.assign(globalThis,{window,document,IntersectionObserver:Observer,requestAnimationFrame:callback=>{callback();return 1;}});
});
afterEach(async()=>{await window.happyDOM.abort();window.close();});
test('reveal runs once per element and caps stagger delay',()=>{
  initMotion();assert.ok(observers[0].observed.size>20);
  const element=document.querySelector('.english-card');
  observers[0].callback([{target:element,isIntersecting:true}]);
  assert.ok(element.classList.contains('is-visible'));assert.equal(observers[0].observed.has(element),false);
  for(const element of document.querySelectorAll('.reveal'))assert.ok(parseInt(element.style.getPropertyValue('--reveal-delay'))<=120);
});
test('reduced motion starts with all content visible and responds to live setting changes',()=>{
  reduced.matches=true;initMotion();assert.equal(document.querySelectorAll('.reveal').length,0);assert.equal(observers.length,0);
  reduced.change(false);assert.ok(document.querySelectorAll('.reveal').length>0);
  reduced.change(true);assert.equal(document.querySelectorAll('.reveal').length,0);assert.equal(observers[0].observed.size,0);
  assert.equal(document.querySelector('.hero-visual').style.getPropertyValue('--parallax-y'),'0px');
});
test('missing IntersectionObserver keeps content visible',()=>{
  delete window.IntersectionObserver;initMotion();assert.equal(document.querySelectorAll('.reveal').length,0);
});
test('FAQ supports opening, closing, rapid reversal and reduced-motion interruption',()=>{
  const details=document.querySelectorAll('.faq-list details')[1];const summary=details.querySelector('summary');
  details.getBoundingClientRect=()=>({height:details.open?140:60});summary.getBoundingClientRect=()=>({height:60});
  const animations=[];details.animate=(frames,options)=>{const animation={frames,options,cancel(){this.cancelled=true;}};animations.push(animation);return animation;};
  initMotion();summary.click();assert.equal(details.open,true);assert.equal(animations[0].frames[1].height,'140px');
  summary.click();assert.equal(animations[0].cancelled,true);assert.equal(animations[1].frames[1].height,'60px');
  summary.click();assert.equal(animations[1].cancelled,true);animations[2].onfinish();assert.equal(details.open,true);assert.equal(details.style.overflow,'');
  summary.click();reduced.change(true);assert.equal(details.open,false);assert.equal(details.style.height,'');assert.equal(details.style.overflow,'');
});
