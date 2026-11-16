/* Daily attendance shares the existing per-account cloud payload. */
function gitcoWorkforce(value) {
  return {workers:Array.isArray(value?.workers)?value.workers:[],days:value?.days&&typeof value.days==='object'&&!Array.isArray(value.days)?value.days:{}};
}
(() => {
  const now=new Date();
  let date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,query='';
  const text=(ar,en)=>lang==='ar'?ar:en;
  function rows(){return workforce.workers.filter(w=>!w.archived&&w.name.toLowerCase().includes(query.toLowerCase()));}
  function drawRows(){
    const day=workforce.days[date]||{},all=workforce.workers.filter(w=>!w.archived);
    document.getElementById('workerSummary').textContent=text('حاضر','Present')+': '+all.filter(w=>day[w.id]?.status==='present').length+' · '+text('غايب','Absent')+': '+all.filter(w=>day[w.id]?.status==='absent').length+' · '+text('غير مسجل','Unmarked')+': '+all.filter(w=>!day[w.id]?.status).length;
    document.getElementById('workerRows').innerHTML=rows().map(w=>{const r=day[w.id]||{};return `<article class="worker-row" data-worker="${esc(w.id)}"><strong>${esc(w.name)}</strong><div class="worker-status"><button type="button" data-status="present" aria-pressed="${r.status==='present'}" class="${r.status==='present'?'present':'plain'}">${text('حاضر','Present')}</button><button type="button" data-status="absent" aria-pressed="${r.status==='absent'}" class="${r.status==='absent'?'absent':'plain'}">${text('غايب','Absent')}</button></div><label class="worker-overtime">${text('إضافي (ساعات)','Overtime (hours)')}<input type="number" min="0" max="24" step="0.5" inputmode="decimal" value="${Number(r.overtime)||0}" ${r.status!=='present'?'disabled':''} aria-label="${text('إضافي','Overtime')} — ${esc(w.name)}"></label><button class="plain" data-clear title="${text('إلغاء تسجيل اليوم','Clear today')}">↶</button></article>`}).join('')||`<div class="empty">${text('لا يوجد عمال. أضف أسماء العمال للبدء.','No workers. Add names to begin.')}</div>`;
  }
  window.gitcoRenderWorkers=function(){
    const host=document.getElementById('view-workers');if(!host)return;
    host.innerHTML=`<div class="hello"><div><h1>${text('حضور العمال','Worker attendance')}</h1><div class="muted">${text('اختار اليوم وسجّل الحضور والإضافي. الحفظ تلقائي.','Choose a day and record attendance and overtime. Changes save automatically.')}</div></div><button class="primary" id="workerAdd">＋ ${text('إضافة عامل','Add worker')}</button></div><div class="toolbar"><label class="field">${text('اليوم','Date')}<input id="workerDate" type="date" value="${date}"></label><label class="field">${text('بحث عن عامل','Find worker')}<input id="workerSearch" type="search" value="${esc(query)}"></label></div><div class="panel"><p id="workerSummary" role="status"></p><div id="workerRows"></div></div>`;
    document.getElementById('workerDate').onchange=e=>{if(e.target.value){date=e.target.value;drawRows()}};
    document.getElementById('workerSearch').oninput=e=>{query=e.target.value;drawRows()};
    document.getElementById('workerAdd').onclick=()=>{
      showModal(`<h2>${text('إضافة عامل','Add worker')}</h2><form id="workerForm"><label class="field">${text('اسم العامل','Worker name')}<input name="name" required maxlength="100" autocomplete="off"></label><div class="actions"><button type="button" class="plain" onclick="closeModal()">${text('إلغاء','Cancel')}</button><button class="primary">${text('إضافة','Add')}</button></div></form>`);
      document.getElementById('workerForm').onsubmit=e=>{e.preventDefault();const name=e.target.elements.name.value.trim();if(!name)return;if(workforce.workers.some(w=>w.name.toLowerCase()===name.toLowerCase())){toast(text('اسم العامل مسجل مسبقاً','Worker already exists'));return}workforce.workers.push({id:crypto.randomUUID(),name});save();closeModal();window.gitcoRenderWorkers()};
    };
    document.getElementById('workerRows').onclick=e=>{const row=e.target.closest('[data-worker]'),b=e.target.closest('button');if(!row||!b)return;const day=workforce.days[date]||(workforce.days[date]={});if(b.hasAttribute('data-clear'))delete day[row.dataset.worker];else if(b.dataset.status)day[row.dataset.worker]={...day[row.dataset.worker],status:b.dataset.status,overtime:b.dataset.status==='present'?(day[row.dataset.worker]?.overtime||0):0};else return;save();drawRows()};
    document.getElementById('workerRows').onchange=e=>{if(e.target.tagName!=='INPUT')return;const input=e.target,hours=Number(input.value),id=input.closest('[data-worker]').dataset.worker,r=workforce.days[date]?.[id];if(!r||r.status!=='present')return;if(input.value===''||!Number.isFinite(hours)||hours<0||hours>24||hours*2!==Math.round(hours*2)){input.value=r.overtime||0;toast(text('أدخل ساعات من 0 إلى 24، بفاصل نصف ساعة','Enter 0–24 hours in half-hour steps'));return}r.overtime=hours;save()};
    drawRows();
  };
})();
