const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');navigation.classList.remove('is-open');menu.setAttribute('aria-label','Открыть меню');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');navigation.classList.toggle('is-open',open);});
navigation.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menu.focus();}});
let interest='Английский для детей';
const form=document.querySelector('#lead-form');
const status=document.querySelector('#form-status');
const send=document.querySelector('#send-message');
const preview=document.querySelector('#message-preview');
const messageText=document.querySelector('#message-text');
function resetMessage(){send.hidden=true;preview.hidden=true;status.textContent='';}
document.querySelectorAll('[data-interest]').forEach(link=>link.addEventListener('click',()=>{interest=link.dataset.interest;form.querySelector('h3').textContent='Обсудить: '+interest.toLowerCase();resetMessage();}));
document.querySelectorAll('a[href="#signup"]:not([data-interest])').forEach(link=>link.addEventListener('click',()=>{interest='Английский для детей';form.querySelector('h3').textContent='Подобрать занятия по английскому';resetMessage();}));
form.addEventListener('input',resetMessage);
// Integration point: replace message preparation with an authenticated CRM/webhook request when configured.
// No personal data is stored, logged or submitted automatically.
form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);const phone=String(data.get('phone')).trim();const name=String(data.get('parent')).trim();const phoneField=form.querySelector('#phone');phoneField.setCustomValidity('');if(!name){form.querySelector('#parent').setCustomValidity('Введите имя');form.querySelector('#parent').reportValidity();return;}form.querySelector('#parent').setCustomValidity('');if(phone.replace(/\D/g,'').length<10){phoneField.setCustomValidity('Укажите телефон: не меньше 10 цифр');phoneField.reportValidity();return;}const message=`Здравствуйте! Интересуют занятия в «Акварельке»: ${interest}.\nМеня зовут ${name}. Возраст ребёнка: ${data.get('age')} лет.\nТелефон для связи: ${phone}.\nПодскажите, пожалуйста, подходящую группу, расписание, длительность занятия и актуальную стоимость. Можно ли прийти познакомиться?`;messageText.value=message;send.href='https://wa.me/79172666597?text='+encodeURIComponent(message);send.hidden=false;preview.hidden=false;status.textContent='Сообщение готово. Откройте WhatsApp и нажмите «Отправить». Заявка пока не отправлена.';send.focus();});
form.querySelector('#phone').addEventListener('input',e=>e.target.setCustomValidity(''));
form.querySelector('#parent').addEventListener('input',e=>e.target.setCustomValidity(''));
document.querySelector('#copy-message').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(messageText.value);status.textContent='Текст скопирован. Вставьте и отправьте его в чате с центром.';}catch{messageText.focus();messageText.select();status.textContent='Выделили сообщение — скопируйте его вручную.';}});
