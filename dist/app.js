import { attachPhoneMask } from './phone-mask.mjs';
import { initMotion } from './motion.mjs';

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');navigation.classList.remove('is-open');menu.setAttribute('aria-label','Открыть меню');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');navigation.classList.toggle('is-open',open);});
navigation.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape' && menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
const form=document.querySelector('#lead-form');
const status=document.querySelector('#form-status');
const send=document.querySelector('#send-message');
const preview=document.querySelector('#message-preview');
const messageText=document.querySelector('#message-text');
const nameField = form.querySelector('#parent');
const ageField = form.querySelector('#age');
const phoneField = form.querySelector('#phone');
const phone = attachPhoneMask(phoneField, form.querySelector('#phone-normalized'));
const directionField = form.querySelector('.direction-field');
// Labels live in the form markup; CTA mapping reuses that single list.
const directions = [...form.querySelectorAll('[name="direction"]')].map(input => ({
  input, value: input.value, label: input.closest('label').querySelector('span').textContent.trim()
}));
const touched = new Set();
let interestContext = '';
const selectedDirection = () => directions.find(direction => direction.input.checked);
function resetMessage(){send.hidden=true;send.removeAttribute('href');preview.hidden=true;messageText.value='';status.textContent='';form.dataset.state='idle';}
function feedback(element) {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && element.animate) {
    element.animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
  }
}
function showError(key, message) {
  const error = form.querySelector('#' + key + '-error');
  const fields = key === 'direction' ? directions.map(direction => direction.input) : [form.querySelector('#' + key)];
  fields.forEach(field => field.setAttribute('aria-invalid', String(Boolean(message))));
  const changed = error.textContent !== message;
  error.textContent = message;
  error.hidden = !message;
  if (message && changed) feedback(error);
  return !message;
}
function validate(key) {
  let error = '';
  if (key === 'parent' && !nameField.value.trim()) error = 'Подскажите, как к вам обращаться';
  if (key === 'age' && (!/^\d+$/.test(ageField.value) || Number(ageField.value)<1 || Number(ageField.value)>18)) error = 'Укажите возраст от 1 до 18 лет';
  if (key === 'phone' && !phone.complete) error = 'Введите номер полностью';
  if (key === 'direction' && !selectedDirection()) error = 'Выберите направление или консультацию';
  return showError(key, error);
}
function updateDirection() {
  const direction = selectedDirection();
  form.querySelector('h3').textContent = !direction || direction.value === 'consultation' ? 'Подобрать занятия' : direction.value === 'english' ? 'Подобрать занятия по английскому' : 'Обсудить: ' + direction.label.toLowerCase();
  resetMessage();
  if (touched.has('direction')) validate('direction');
  feedback(directionField);
}
directions.forEach(direction => direction.input.addEventListener('change', () => {
  interestContext = '';
  touched.add('direction');
  updateDirection();
}));
document.querySelectorAll('a[href="#signup"]').forEach(link => link.addEventListener('click', () => {
  const labelMatch = directions.find(direction => direction.label === link.dataset.interest);
  const value = link.dataset.direction || (link.closest('#english') ? 'english' : labelMatch?.value) || 'consultation';
  directions.forEach(direction => { direction.input.checked = direction.value === value; });
  interestContext = value === 'english' ? (link.dataset.interest || '') : '';
  updateDirection();
}));
[['parent',nameField],['age',ageField],['phone',phoneField]].forEach(([key,field]) => {
  field.addEventListener('blur', () => { touched.add(key); validate(key); });
  field.addEventListener('input', () => { if(touched.has(key)) validate(key); });
});
form.addEventListener('input',resetMessage);
// Integration point: replace message preparation with an authenticated CRM/webhook request when configured.
// No personal data is stored, logged or submitted automatically.
form.addEventListener('submit',e=>{
  e.preventDefault();
  resetMessage();
  const keys = ['direction','parent','age','phone'];
  const invalid = keys.filter(key => { touched.add(key); return !validate(key); });
  if(invalid.length){
    form.dataset.state='error';
    (invalid[0]==='direction' ? directions[0].input : form.querySelector('#'+invalid[0])).focus();
    return;
  }
  const direction = selectedDirection();
  const interest = direction.label + (interestContext ? ' — ' + interestContext : '');
  const message=`Здравствуйте! Интересуют занятия в «Акварельке»: ${interest}.\nМеня зовут ${nameField.value.trim()}. Возраст ребёнка: ${ageField.value} лет.\nТелефон для связи: ${phone.value}.\nПодскажите, пожалуйста, подходящую группу, расписание, длительность занятия и актуальную стоимость. Можно ли прийти познакомиться?`;
  messageText.value=message;
  send.href='https://wa.me/79172666597?text='+encodeURIComponent(message);
  send.hidden=false;preview.hidden=false;
  status.textContent='Сообщение готово. Откройте WhatsApp и нажмите «Отправить». Заявка пока не отправлена.';
  form.dataset.state='ready';
  feedback(status);feedback(preview);send.focus();
});
document.querySelector('#copy-message').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(messageText.value);status.textContent='Текст скопирован. Вставьте и отправьте его в чате с центром.';}catch{messageText.focus();messageText.select();status.textContent='Выделили сообщение — скопируйте его вручную.';}});
initMotion();
