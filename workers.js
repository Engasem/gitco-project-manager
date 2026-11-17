/* Daily attendance shares the existing per-account cloud payload. */
function gitcoWorkforce(value) {
  return {workers:Array.isArray(value?.workers)?value.workers:[],days:value?.days&&typeof value.days==='object'&&!Array.isArray(value.days)?value.days:{}};
}
(() => {
  const now=new Date();
  let date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,query='',month=date.slice(0,7);
  const text=(ar,en)=>lang==='ar'?ar:en;
  function downloadCsv(filename,rows){
    const cell=value=>{let v=String(value??'');if(/^[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
    const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function parseCsv(source){
    source=source.replace(/^\ufeff/,'');const lines=[],row=[];let value='',quoted=false;
    const delimiter=source.split(/\r?\n/,1)[0].includes(';')?';':',';
    for(let i=0;i<source.length;i++){
      const c=source[i];
      if(c==='"'){if(quoted&&source[i+1]==='"'){value+='"';i++}else quoted=!quoted}
      else if(!quoted&&(c===delimiter||c==='\n'||c==='\r')){row.push(value);value='';if(c!==delimiter){if(c==='\r'&&source[i+1]==='\n')i++;lines.push(row.splice(0))}}
      else value+=c;
    }
    if(quoted)throw Error(text('الملف يحتوي علامة اقتباس غير مغلقة.','Unclosed quote in CSV.'));
    if(value||row.length){row.push(value);lines.push(row)}return lines.filter(r=>r.some(v=>v.trim()));
  }
  let excelLoader;
  function loadExcel(){
    if(window.XLSX)return Promise.resolve(window.XLSX);
    if(!excelLoader)excelLoader=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='vendor/xlsx.full.min.js';
      script.onload=()=>resolve(window.XLSX);script.onerror=()=>{script.remove();excelLoader=null;reject(Error(text('تعذر تحميل قارئ Excel. أعد المحاولة.','Could not load Excel reader. Please retry.')))};
      document.head.appendChild(script);
    });return excelLoader;
  }
  async function importWorkers(file){
    if(!file)return;
    try{
      if(file.size>5*1024*1024)throw Error(text('حجم الملف الأقصى 5 ميغابايت.','Maximum file size is 5 MB.'));
      if(!/\.(csv|xlsx)$/i.test(file.name))throw Error(text('اختر ملف Excel .xlsx أو CSV UTF-8.','Choose an Excel .xlsx or CSV UTF-8 file.'));
      let data;
      if(/\.xlsx$/i.test(file.name)){
        const reader=await loadExcel(),book=reader.read(await file.arrayBuffer(),{type:'array'});
        data=reader.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:false,defval:''}).map(row=>row.map(String)).filter(row=>row.some(v=>v.trim()));
      }else data=parseCsv(await file.text());if(!data.length)throw Error(text('الملف فارغ.','File is empty.'));
      const headers=['name','worker name','employee name','اسم العامل','اسم الموظف','الاسم'];let column=data[0].findIndex(v=>headers.includes(v.trim().toLowerCase()));
      if(column>=0)data.shift();else{column=0;if(data[0].length!==1)throw Error(text('أضف عموداً بعنوان اسم العامل أو name.','Add a column named name or اسم العامل.'))}
      const names=data.map(r=>(r[column]||'').trim().replace(/^'(?=[=+@\-])/,'')).filter(Boolean);
      if(names.length>5000||names.some(n=>n.length>100||n.includes('\ufffd')||/[\r\n]/.test(n)))throw Error(text('تحقق من الأسماء واحفظ الملف بترميز UTF-8 (حتى 5000 اسم، 100 حرف للاسم).','Check names and save as UTF-8 (up to 5000 names, 100 characters each).'));
      const known=new Set(workforce.workers.map(w=>w.name.trim().toLowerCase())),added=[];let duplicates=0;
      for(const name of names){const key=name.toLowerCase();if(known.has(key)){duplicates++;continue}known.add(key);added.push({id:crypto.randomUUID(),name})}
      if(added.length){workforce.workers.push(...added);save();window.gitcoRenderWorkers()}
      toast(text(`تمت إضافة ${added.length} عامل، وتجاوز ${duplicates} اسم مكرر.`,`Added ${added.length} workers; skipped ${duplicates} duplicates.`));
    }catch(e){toast(e.message)}
  }
  function rows(){return workforce.workers.filter(w=>!w.archived&&w.name.toLowerCase().includes(query.toLowerCase()));}
  function drawMonth(){
    const host=document.getElementById('workerMonthRows');if(!host)return;
    const days=Object.entries(workforce.days).filter(([d])=>d.startsWith(month+'-'));
    host.innerHTML=workforce.workers.map(w=>{
      let present=0,absent=0,overtime=0;
      for(const [,day] of days){const r=day[w.id];if(r?.status==='present'){present++;overtime+=Number(r.overtime)||0}else if(r?.status==='absent')absent++}
      return `<article class="worker-month-row" data-month-worker="${esc(w.id)}"><strong>${esc(w.name)}</strong><span>${text('حضور','Present')}: <b data-total="present">${present}</b> ${text('يوم','days')}</span><span>${text('غياب','Absent')}: <b data-total="absent">${absent}</b> ${text('يوم','days')}</span><span>${text('إضافي','Overtime')}: <b data-total="overtime">${overtime}</b> ${text('ساعة','hours')}</span></article>`;
    }).join('')||`<p class="empty">${text('لا يوجد عمال مسجلون.','No workers yet.')}</p>`;
  }
  function drawRows(){
    drawMonth();
    const day=workforce.days[date]||{},all=workforce.workers.filter(w=>!w.archived);
    document.getElementById('workerSummary').textContent=text('حاضر','Present')+': '+all.filter(w=>day[w.id]?.status==='present').length+' · '+text('غايب','Absent')+': '+all.filter(w=>day[w.id]?.status==='absent').length+' · '+text('غير مسجل','Unmarked')+': '+all.filter(w=>!day[w.id]?.status).length;
    document.getElementById('workerRows').innerHTML=rows().map(w=>{const r=day[w.id]||{};return `<article class="worker-row" data-worker="${esc(w.id)}"><strong>${esc(w.name)}</strong><div class="worker-status"><button type="button" data-status="present" aria-pressed="${r.status==='present'}" class="${r.status==='present'?'present':'plain'}">${text('حاضر','Present')}</button><button type="button" data-status="absent" aria-pressed="${r.status==='absent'}" class="${r.status==='absent'?'absent':'plain'}">${text('غايب','Absent')}</button></div><label class="worker-overtime">${text('إضافي (ساعات)','Overtime (hours)')}<input type="number" min="0" max="24" step="0.5" inputmode="decimal" value="${Number(r.overtime)||0}" ${r.status!=='present'?'disabled':''} aria-label="${text('إضافي','Overtime')} — ${esc(w.name)}"></label><button class="plain" data-clear title="${text('إلغاء تسجيل اليوم','Clear today')}">↶</button></article>`}).join('')||`<div class="empty">${text('لا يوجد عمال. أضف أسماء العمال للبدء.','No workers. Add names to begin.')}</div>`;
  }
  window.gitcoRenderWorkers=function(){
    const host=document.getElementById('view-workers');if(!host)return;
    host.innerHTML=`<div class="hello"><div><h1>${text('حضور العمال','Worker attendance')}</h1><div class="muted">${text('اختار اليوم وسجّل الحضور والإضافي. الحفظ تلقائي.','Choose a day and record attendance and overtime. Changes save automatically.')}</div></div><button class="primary" id="workerAdd">＋ ${text('إضافة عامل','Add worker')}</button></div><details class="panel worker-files"><summary>${text('استيراد وتصدير العمال','Import / export workers')}</summary><p class="muted">${text('استيراد Excel (.xlsx) أو CSV UTF-8، وتصدير CSV يفتح بـExcel. عمود اسم العامل أو اسم الموظف؛ الاستيراد يضيف الأسماء فقط ويحافظ على الحضور السابق.','Import Excel (.xlsx) or CSV UTF-8; export CSV for Excel. Use a name column; import adds names and preserves attendance.')}</p><div class="inline"><button class="secondary" id="workerImport">${text('استيراد أسماء العمال','Import worker names')}</button><button class="plain" id="workerExport">${text('تصدير أسماء العمال','Export worker names')}</button><button class="plain" id="workerTemplate">${text('تنزيل قالب جاهز','Download template')}</button><input hidden type="file" id="workerImportFile" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div></details><div class="toolbar"><label class="field">${text('اليوم','Date')}<input id="workerDate" type="date" value="${date}"></label><label class="field">${text('بحث عن عامل','Find worker')}<input id="workerSearch" type="search" value="${esc(query)}"></label></div><div class="panel"><button type="button" class="secondary" id="workerAllPresent">✓ ${text('الكل حاضر','Mark all present')}</button><p class="muted">${text('يسجّل العمال غير المسجّلين فقط؛ الغياب والإضافي المسجّل يبقى كما هو.','Marks unmarked workers only; existing absences and overtime stay unchanged.')}</p><p id="workerSummary" role="status"></p><div id="workerRows"></div></div><details class="panel worker-month"><summary>${text('إجمالي الشهر لكل عامل','Monthly totals per worker')}</summary><label class="field">${text('الشهر','Month')}<input type="month" id="workerMonth" value="${month}"></label><p class="muted">${text('الأيام غير المسجّلة والعطل لا تُحسب غياباً.','Unmarked days and days off do not count as absences.')}</p><div id="workerMonthRows"></div></details>`;
    document.getElementById('workerImport').onclick=()=>document.getElementById('workerImportFile').click();
    document.getElementById('workerImportFile').onchange=e=>{importWorkers(e.target.files[0]);e.target.value=''};
    document.getElementById('workerExport').onclick=()=>downloadCsv('gitco-workers.csv',[[text('اسم العامل','name')],...workforce.workers.map(w=>[w.name])]);
    document.getElementById('workerTemplate').onclick=()=>downloadCsv('gitco-workers-template.csv',[[text('اسم العامل','name')]]);
    document.getElementById('workerMonth').onchange=e=>{if(e.target.value){month=e.target.value;drawMonth()}};
    document.getElementById('workerAllPresent').onclick=()=>{
      const day=workforce.days[date]||(workforce.days[date]={});
      for(const w of workforce.workers)if(!w.archived&&!day[w.id]?.status)day[w.id]={status:'present',overtime:0};
      save();drawRows();
    };
    document.getElementById('workerDate').onchange=e=>{if(e.target.value){date=e.target.value;drawRows()}};
    document.getElementById('workerSearch').oninput=e=>{query=e.target.value;drawRows()};
    document.getElementById('workerAdd').onclick=()=>{
      showModal(`<h2>${text('إضافة عامل','Add worker')}</h2><form id="workerForm"><label class="field">${text('اسم العامل','Worker name')}<input name="name" required maxlength="100" autocomplete="off"></label><div class="actions"><button type="button" class="plain" onclick="closeModal()">${text('إلغاء','Cancel')}</button><button class="primary">${text('إضافة','Add')}</button></div></form>`);
      document.getElementById('workerForm').onsubmit=e=>{e.preventDefault();const name=e.target.elements.name.value.trim();if(!name)return;if(workforce.workers.some(w=>w.name.toLowerCase()===name.toLowerCase())){toast(text('اسم العامل مسجل مسبقاً','Worker already exists'));return}workforce.workers.push({id:crypto.randomUUID(),name});save();closeModal();window.gitcoRenderWorkers()};
    };
    document.getElementById('workerRows').onclick=e=>{const row=e.target.closest('[data-worker]'),b=e.target.closest('button');if(!row||!b)return;const day=workforce.days[date]||(workforce.days[date]={});if(b.hasAttribute('data-clear'))delete day[row.dataset.worker];else if(b.dataset.status)day[row.dataset.worker]={...day[row.dataset.worker],status:b.dataset.status,overtime:b.dataset.status==='present'?(day[row.dataset.worker]?.overtime||0):0};else return;save();drawRows()};
    document.getElementById('workerRows').onchange=e=>{if(e.target.tagName!=='INPUT')return;const input=e.target,hours=Number(input.value),id=input.closest('[data-worker]').dataset.worker,r=workforce.days[date]?.[id];if(!r||r.status!=='present')return;if(input.value===''||!Number.isFinite(hours)||hours<0||hours>24||hours*2!==Math.round(hours*2)){input.value=r.overtime||0;toast(text('أدخل ساعات من 0 إلى 24، بفاصل نصف ساعة','Enter 0–24 hours in half-hour steps'));return}r.overtime=hours;save();drawMonth()};
    drawRows();
  };
})();
