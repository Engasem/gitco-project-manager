/* Fixed local commands only: no OpenAI requests, billing, deletion or stock writes. */
(function(){
 const suntex=!!document.getElementById('main');
 const normalize=s=>String(s).normalize('NFKC').toLocaleLowerCase().replace(/[أإآ]/g,'ا').replace(/[\u064B-\u065F\u0670]/g,'').trim();
 function install(){const host=suntex?document.querySelector('nav'):document.querySelector('.top-actions');if(!host)return;document.getElementById('gitcoAIButton')?.remove();document.getElementById('gitcoAIPanel')?.remove();
  const button=document.createElement('button');button.id='freeCommandButton';button.textContent='✦ مساعد الأوامر — مجاني';button.className='secondary';host.append(button);
  const panel=document.createElement('section');panel.id='freeCommandPanel';panel.hidden=true;panel.innerHTML='<div class="free-command-top"><h2>مساعد الأوامر / Free commands</h2><button type="button" id="freeCommandClose">إغلاق / Close</button></div><p>أوامر محددة دون خدمة AI مدفوعة. يفتح الصفحات ويبحث ويجهز النماذج؛ راجع النموذج واضغط حفظ بنفسك. لا ينفذ حذفًا أو تغييرات مخزون.</p><p id="freeCommandExamples"></p><form id="freeCommandForm"><label for="freeCommandInput">اكتب الأمر / Command</label><input id="freeCommandInput" maxlength="500" autocomplete="off"><button type="submit">تنفيذ / Run</button></form><p id="freeCommandStatus" role="status" aria-live="polite"></p>';document.body.append(panel);panel.querySelector('#freeCommandExamples').textContent=suntex?'أمثلة: افتح المواد، ابحث عن M24، فاتورة جديدة، أمر شراء جديد، عرض سعر جديد، افتح MTC':'أمثلة: افتح المشاريع، ابحث عن مظلات، مشروع جديد، عميل جديد، افتح الأرشيف';
  button.onclick=()=>{panel.hidden=false;panel.querySelector('input').focus()};panel.querySelector('#freeCommandClose').onclick=()=>{panel.hidden=true;button.focus()};
  panel.querySelector('form').onsubmit=async event=>{event.preventDefault();const raw=panel.querySelector('input').value.trim(),q=normalize(raw),status=panel.querySelector('#freeCommandStatus'),run=panel.querySelector('button[type=submit]');if(!q)return;run.disabled=true;try{
   const search=raw.match(/^(?:ابحث(?:\s+عن)?|بحث|search(?:\s+for)?)\s+(.+)$/i);
   if(search){const term=search[1].trim();if(suntex){await page('materials');const input=document.getElementById('mq');input.value=term;input.focus();renderMaterials()}else{go('projects');document.getElementById('projectSearch').value=term;render()}status.textContent='تم البحث عن: '+term;panel.hidden=true;return}
   const routes=suntex?[[/^(?:افتح\s+)?(?:المواد(?:\s+والمخزون)?|materials|inventory)$/,'materials'],[/^(?:افتح\s+)?(?:المشتريات|اوامر الشراء|purchases)$/,'purchases'],[/^(?:افتح\s+)?(?:المبيعات|الفواتير|invoices)$/,'sales'],[/^(?:افتح\s+)?(?:mtc|الشهادات|شهادات المواد)$/i,'mtc'],[/^(?:افتح\s+)?(?:المشاريع|projects)$/,'projects']]:[[/^(?:افتح\s+)?(?:المشاريع|projects)$/,'projects'],[/^(?:افتح\s+)?(?:العملاء|clients)$/,'clients'],[/^(?:افتح\s+)?(?:الارشيف|archive)$/,'archive'],[/^(?:افتح\s+)?(?:التنبيهات|alerts)$/,'alerts']];
   const route=routes.find(([pattern])=>pattern.test(q));if(route){if(suntex)await page(route[1]);else go(route[1]);panel.hidden=true;return}
   if(suntex&&/^(?:انشئ\s+|جهز\s+)?(?:فاتورة جديدة|فاتوره جديده|new invoice)$/.test(q)){await invoiceForm();panel.hidden=true;return}
   if(suntex&&/^(?:انشئ\s+|جهز\s+)?(?:امر شراء جديد|new purchase order)$/.test(q)){await poForm();panel.hidden=true;return}
   if(suntex&&/^(?:انشئ\s+|جهز\s+)?(?:عرض سعر جديد|new quotation)$/.test(q)){await quoteForm();panel.hidden=true;return}
   const project=raw.match(/^(?:(?:انشئ|أنشئ|اضف|أضف)\s+)?(?:مشروع جديد|new project)(?:\s+(.+))?$/i);if(project){if(suntex)projectForm();else showProjectModal();const input=document.querySelector(suntex?'#prname':'#projectForm [name=name]');if(input&&project[1])input.value=project[1].trim();panel.hidden=true;return}
   if(!suntex&&/^(?:عميل جديد|new client)$/.test(q)){showClientModal();panel.hidden=true;return}
   status.textContent='هذا الأمر غير مدعوم. استخدم أحد الأمثلة أعلاه؛ لم يتم تغيير أي بيانات.';
  }catch(e){status.textContent='تعذر تنفيذ الأمر: '+(e.message||String(e))}finally{run.disabled=false}};
  const style=document.createElement('style');style.textContent='#freeCommandPanel{position:fixed;z-index:1200;inset-block:16px;inset-inline-end:16px;width:min(460px,calc(100% - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:18px;background:#fff;color:#17202a;border:1px solid #dbe1e7;border-radius:14px;box-shadow:0 12px 40px #12324733}#freeCommandPanel[hidden]{display:none}.free-command-top{display:flex;justify-content:space-between;align-items:center;gap:8px}#freeCommandForm{display:grid;gap:10px}#freeCommandInput{width:100%;padding:12px;font-size:16px;border:1px solid #b8cbd5;border-radius:8px}';document.head.append(style);
 }
 document.addEventListener('DOMContentLoaded',install);
})();

