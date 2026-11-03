// Keep the original browser-only data before the cloud adapter loads another copy.
(function(){
 const key='gitco_device_recovery_v1';
 try{
  const rawProjects=localStorage.getItem('gitco_projects'),rawClients=localStorage.getItem('gitco_clients');
  const projects=JSON.parse(rawProjects||'[]'),clients=JSON.parse(rawClients||'[]');
  const demoOnly=Array.isArray(projects)&&projects.length===2&&projects.some(p=>p.id===1&&p.name==='مشروع المظلات — مثال')&&projects.some(p=>p.id===2&&p.name==='مشروع توريد — مثال');
  if(!localStorage.getItem(key)&&Array.isArray(projects)&&Array.isArray(clients)&&(projects.length||clients.length)&&!demoOnly){
   localStorage.setItem(key,JSON.stringify({format:'GITCO device recovery v1',savedAt:new Date().toISOString(),projects,clients}));
  }
 }catch(e){console.warn('Device recovery copy could not be stored');}
 document.addEventListener('DOMContentLoaded',()=>{
  if(!localStorage.getItem(key))return;
  const host=document.querySelector('#view-settings');if(!host)return;
  const panel=document.createElement('div');panel.className='panel';panel.style.marginTop='16px';
  const title=document.createElement('h2');title.textContent='بيانات سابقة على هذا الجهاز';
  const note=document.createElement('p');note.textContent='احتفظنا بنسخة من البيانات القديمة قبل تحميل السحابة. نزّلها للمراجعة أو لنقلها إلى حسابك. هذه الخطوة لا تستبدل بيانات السحابة.';
  const button=document.createElement('button');button.className='plain';button.id='downloadDeviceRecovery';button.textContent='تنزيل نسخة بيانات هذا الجهاز';
  button.onclick=()=>{const data=localStorage.getItem(key);if(!data)return;const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gitco-device-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  panel.append(title,note,button);host.append(panel);
 });
})();

