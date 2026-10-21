import { attachPhoneMask } from './phone-mask.mjs';
import { submitLead } from './lead-api.mjs';
import { initMotion } from './motion.mjs';

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu(){
  menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-label','Открыть меню');
  navigation.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}
menu.addEventListener('click',()=>{
  const open=menu.getAttribute('aria-expanded')!=='true';
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  navigation.classList.toggle('is-open',open);
  document.body.classList.toggle('menu-open',open);
});
navigation.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});

const form=document.querySelector('#lead-form');
const status=document.querySelector('#form-status');
const successCard=document.querySelector('#success-card');
const submitButton=document.querySelector('#submit-lead');
const submitLabel=submitButton.querySelector('.submit-label');
const nameField=form.querySelector('#parent');
const ageField=form.querySelector('#age');
const phoneField=form.querySelector('#phone');
const phone=attachPhoneMask(phoneField,form.querySelector('#phone-normalized'));
const directionField=form.querySelector('.direction-field');
const directions=[...form.querySelectorAll('[name="direction"]')].map(input=>({input,value:input.value,label:input.closest('label').querySelector('span').textContent.trim()}));
const touched=new Set();
let interestContext='';
let submitInFlight=false;
const selectedDirection=()=>directions.find(direction=>direction.input.checked);

function feedback(element){
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&element.animate){
    element.animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
  }
}
function clearOutcome(){
  if(submitInFlight)return;
  status.hidden=true;
  status.textContent='';
  successCard.hidden=true;
  form.dataset.state='idle';
}
function showError(key,message){
  const error=form.querySelector('#'+key+'-error');
  const fields=key==='direction'?directions.map(direction=>direction.input):[form.querySelector('#'+key)];
  fields.forEach(field=>field.setAttribute('aria-invalid',String(Boolean(message))));
  const changed=error.textContent!==message;
  error.textContent=message;
  error.hidden=!message;
  if(message&&changed)feedback(error);
  return !message;
}
function validate(key){
  let error='';
  if(key==='parent'&&!nameField.value.trim())error='Подскажите, как к вам обращаться';
  if(key==='age'&&(!/^\d+$/.test(ageField.value)||Number(ageField.value)<1||Number(ageField.value)>18))error='Укажите возраст от 1 до 18 лет';
  if(key==='phone'&&!phone.complete)error='Введите номер полностью';
  if(key==='direction'&&!selectedDirection())error='Выберите направление или консультацию';
  return showError(key,error);
}
function setFormTitle(){
  const direction=selectedDirection();
  form.querySelector('h3').textContent=!direction||direction.value==='consultation'?'Подобрать занятия':direction.value==='english'?'Подобрать занятия по английскому':'Обсудить: '+direction.label.toLowerCase();
}
function updateDirection(){
  setFormTitle();clearOutcome();
  if(touched.has('direction'))validate('direction');
  feedback(directionField);
}
directions.forEach(direction=>direction.input.addEventListener('change',()=>{interestContext='';touched.add('direction');updateDirection();}));
document.querySelectorAll('a[href="#signup"]').forEach(link=>link.addEventListener('click',()=>{
  const labelMatch=directions.find(direction=>direction.label===link.dataset.interest);
  const value=link.dataset.direction||(link.closest('#english')?'english':labelMatch?.value)||'consultation';
  directions.forEach(direction=>{direction.input.checked=direction.value===value;});
  interestContext=value==='english'?(link.dataset.interest||''):'';
  updateDirection();
}));
[['parent',nameField],['age',ageField],['phone',phoneField]].forEach(([key,field])=>{
  field.addEventListener('blur',()=>{touched.add(key);validate(key);});
  field.addEventListener('input',()=>{if(touched.has(key))validate(key);});
});
form.addEventListener('input',clearOutcome);
form.addEventListener('focusin',()=>document.body.classList.add('form-active'));
form.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!form.contains(document.activeElement))document.body.classList.remove('form-active');}));

function setBusy(busy){
  submitInFlight=busy;
  form.setAttribute('aria-busy',String(busy));
  submitButton.disabled=busy;
  submitLabel.textContent=busy?'Отправляем…':'Оставить заявку';
  directions.forEach(direction=>direction.input.disabled=busy);
  [nameField,ageField,phoneField].forEach(field=>field.disabled=busy);
}
function resetAfterSuccess(){
  form.reset();phone.reset();interestContext='';touched.clear();
  ['direction','parent','age','phone'].forEach(key=>showError(key,''));
  setFormTitle();
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(submitInFlight)return;
  clearOutcome();
  const keys=['direction','parent','age','phone'];
  const invalid=keys.filter(key=>{touched.add(key);return !validate(key);});
  if(invalid.length){
    form.dataset.state='error';
    (invalid[0]==='direction'?directions[0].input:form.querySelector('#'+invalid[0])).focus();
    return;
  }
  const direction=selectedDirection();
  const payload={parentName:nameField.value.trim(),childAge:Number(ageField.value),phone:phone.value,direction:direction.value,directionLabel:direction.label,context:interestContext||null,source:'akvarelka-website'};
  setBusy(true);form.dataset.state='submitting';
  try{
    await submitLead(payload);
    resetAfterSuccess();status.hidden=true;successCard.hidden=false;form.dataset.state='success';
    feedback(successCard);successCard.focus({preventScroll:true});
  }catch(error){
    console.error('Lead submission failed',error);
    status.textContent='Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
    status.hidden=false;successCard.hidden=true;form.dataset.state='error';feedback(status);
  }finally{setBusy(false);}
});

initMotion();
