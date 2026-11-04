import{FloatingPanel,floatingSupported}from'./floating.js';
import{uid,randomIndex,parseNames,assignGroups,studentMatchesFilter,eligibleStudents,recordDraw,newRound,validateState,csvCell}from'./core.js';
const $=id=>document.getElementById(id), KEY='shiming-classroom-v1';
const icons={float:'<rect x="3" y="4" width="18" height="16" rx="3"/><rect x="11" y="11" width="8" height="6" rx="1"/>',spark:'<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>',plus:'<path d="M12 5v14M5 12h14"/>',book:'<path d="M4 4h6c1 0 2 1 2 2v15c0-2-2-3-4-3H4zM20 4h-6c-1 0-2 1-2 2v15c0-2 2-3 4-3h4z"/>',play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M5.5 8a7 7 0 0 1 12-3L20 8M4 16l2.5 3a7 7 0 0 0 12-3"/>',expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.book}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sampleState(){
 const names=['林知夏','陈亦舟','许星野','周予安','沈清禾','陆景行','苏念白','江时雨','温以宁','顾明远','叶初晴','程书言','宋晚晴','何以辰','唐可欣','徐知行','夏一诺','梁思远','方若溪','吴言川','郑语桐','谢云帆','白映雪','赵承宇'];
 const a={id:uid(),name:'数字媒体 1 班',students:names.map((name,i)=>({id:uid(),name,gender:i%2?'male':'female'})),called:[],history:[],round:1,demo:true};
 const b={...a,id:uid(),name:'数字媒体 2 班',students:names.slice(6).map((name,i)=>({id:uid(),name,gender:i%2?'female':'male'})),called:[],history:[]};
 return{version:1,classes:[a,b],activeId:a.id,settings:{noRepeat:true,autoStop:true,sound:false}};
}
let storageProblem=false,state;
try{const saved=localStorage.getItem(KEY);state=saved?validateState(JSON.parse(saved)):sampleState();}catch{state=sampleState();storageProblem=true;}
let filter='all',rolling=false,rollTimer=null,autoTimer=null,lastStudent=null,editingId=null,toastTimer=null,audio=null,confirmResolve=null,floating=null,timerOwner=window;
const active=()=>state.classes.find(c=>c.id===state.activeId);
const pad=n=>String(n).padStart(2,'0');
const clock=t=>new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
const pool=()=>active()?eligibleStudents(active(),filter,state.settings.noRepeat):[];
function notify(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageProblem=false;}catch{storageProblem=true;notify('浏览器未能保存数据，请导出备份，避免名单丢失。');}$('storageStatus').textContent=storageProblem?'暂未保存，请导出备份':'数据保存在此浏览器';}
function openMenu(open){$('sidebar').classList.toggle('open',open);$('scrim').hidden=!open;$('menu').setAttribute('aria-expanded',String(open));if(open)$('classList').querySelector('button')?.focus();}
function renderSidebar(){
 $('classCount').textContent=pad(state.classes.length);
 $('classList').innerHTML=state.classes.map(c=>`<button class="class-item ${c.id===state.activeId?'active':''}" data-class="${escape(c.id)}" ${c.id===state.activeId?'aria-current="page"':''}>${icon('book')}<span><strong>${escape(c.name)}</strong><small>${c.students.length} 位同学${c.demo?' · 示例班级':''}</small></span>${c.id===state.activeId?'<span class="class-item-dot"></span>':''}</button>`).join('');
}
function renderStats(){
 const c=active(),total=c?.students.length||0,called=c?.called.length||0;
 $('calledCount').textContent=called;$('remainingCount').textContent=total-called;$('progressText').textContent=`${called} / ${total}`;$('progressBar').style.width=`${total?called/total*100:0}%`;
 $('activeClassName').textContent=(c?.name||'我的课堂')+(['A','B'].includes(filter)?` · ${filter} 组`:'');
 $('roundLabel').textContent=`第 ${pad(c?.round||1)} 轮`;$('poolLabel').textContent=`${['A','B'].includes(filter)?filter+' 组 · ':''}${pool().length} 位同学${state.settings.noRepeat?'待点名':'可抽取'}`;
 $('drawButton').disabled=!rolling&&!pool().length;
 for(const id of ['noRepeat','autoStop','sound']){$(id).setAttribute('aria-checked',String(state.settings[id]));$(id).disabled=rolling;}
 $('fairnessNote').textContent=state.settings.noRepeat?'同一轮内不重复，让每个人都有机会':'可重复抽取，每次都从当前筛选名单中随机选择';
 $('recentList').innerHTML=c?.history.length?c.history.slice(0,3).map(h=>`<div class="recent-row"><span>✓</span><strong>${escape(h.name)}</strong><time>${clock(h.time)}</time></div>`).join(''):'<div class="recent-empty">下一个名字，即将出现</div>';
 $('resetRound').disabled=rolling||!c;$('editRoster').disabled=rolling;$('addClass').disabled=rolling;$('backup').disabled=rolling;$('restore').disabled=rolling;
 $('openFloating').disabled=rolling;syncFloating();
 $('filters').querySelectorAll('button').forEach(b=>{b.disabled=rolling;b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
}
function renderRoster(){
 const c=active(),search=$('search').value.trim().toLowerCase(),called=new Set(c?.called||[]);
 $('rosterCount').textContent=['A','B'].includes(filter)?`${filter} 组 · ${c?.students.filter(s=>studentMatchesFilter(s,filter)).length||0} 人`:`${c?.students.length||0} 人`;$('rosterHelp').textContent=c?.demo?'示例名单，可在「管理名单」中替换':'筛选仅影响抽取范围，搜索仅用于查找';
 const students=c?.students.map((s,i)=>({...s,index:i+1})).filter(s=>(studentMatchesFilter(s,filter))&&s.name.toLowerCase().includes(search))||[];
 $('studentGrid').innerHTML=students.length?students.map(s=>`<div class="student-tile ${called.has(s.id)?'called':''} ${lastStudent?.id===s.id?'latest':''}" data-student="${escape(s.id)}" title="${escape(s.name)} · ${s.index} 号 · ${called.has(s.id)?'已点名':'待点名'}"><span class="student-number">${pad(s.index)}</span><span class="student-name">${escape(s.name)}</span>${called.has(s.id)?'<span class="student-check">✓</span>':''}</div>`).join(''):`<div class="empty-roster">${!c?'新建一个班级，开启你的课堂。':!c.students.length?'这里还没有学生，点击「管理名单」录入。':'没有找到符合条件的同学。'}</div>`;
}
function idleStage(){
 const c=active();$('drawCard').classList.remove('rolling','result');
 $('stageCaption').textContent=!c?'为新的课堂，留一个位置':c.students.length?'每一份精彩，都从一个名字开始':'每一堂课，都从认识彼此开始';
 const emptyGroup=c&&['A','B'].includes(filter)&&!eligibleStudents(c,filter,false).length;
 const exhausted=!!c?.students.length&&!pool().length;
 $('nameDisplay').innerHTML=!c?'创建你的班级':!c.students.length?'添加第一位同学':exhausted?'这一轮，已完成':'准备好了吗<span class="name-question">？</span>';
 if(exhausted)$('nameDisplay').textContent=emptyGroup?`${filter} 组还没有同学`:filter==='all'?'这一轮，已完成':'当前范围已点完';
 $('stageSubtitle').textContent=!c?'点击「新建班级」，录入同学的名字':!c.students.length?'点击「管理名单」，粘贴或导入学生姓名':exhausted?'切换筛选或开始新一轮，继续精彩互动':'点击下方按钮，开启今天的课堂互动';
 if(emptyGroup)$('stageSubtitle').textContent=`点击「管理名单」，在 ${filter} 组填写学生姓名后保存`;
 $('cardStatus').textContent=emptyGroup?'请先设置分组名单':exhausted?'抽取范围已完成':'等待开始';syncFloating();
}
function renderAll(reset=true){
 const c=active();renderSidebar();$('breadcrumbClass').textContent=c?.name||'尚未创建班级';$('activeClassName').textContent=c?.name||'我的课堂';$('demoTag').hidden=!c?.demo;renderStats();renderRoster();if(reset)idleStage();syncFloating();
}
function setStudent(student){
 const c=active();$('nameDisplay').textContent=student.name;$('stageCaption').textContent=`${pad(c.students.findIndex(s=>s.id===student.id)+1)} 号同学`;
 const long=student.name.length>12;$('nameDisplay').style.fontSize=long?'clamp(25px, 3.5vw, 44px)':'';syncFloating();
}
function tick(){const p=pool();if(!p.length)return;const s=p[randomIndex(p.length)];setStudent(s);$('studentGrid').querySelector('.scanning')?.classList.remove('scanning');$('studentGrid').querySelector(`[data-student="${CSS.escape(s.id)}"]`)?.classList.add('scanning');}
function initAudio(){if(!state.settings.sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function chime(){if(!audio||!state.settings.sound)return;try{for(const[f,d]of[[660,0],[880,.12]]){const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+d;osc.type='sine';osc.frequency.value=f;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.35);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.36);}}catch{}}
function startDraw(){
 if(rolling)return stopDraw();if(!pool().length)return;initAudio();rolling=true;lastStudent=null;$('drawCard').classList.remove('result');$('drawCard').classList.add('rolling');$('stageSubtitle').textContent=state.settings.autoStop?'名字正在滚动，即将自动定格…':'名字正在滚动，再按一次停止定格';$('cardStatus').textContent='随机抽取中';$('drawButtonText').textContent='停止 · 定格';$('drawButton').querySelector('[data-icon]').innerHTML=icon('stop');renderStats();tick();timerOwner=floating?.window&&!floating.window.closed?floating.window:window;rollTimer=timerOwner.setInterval(tick,85);if(state.settings.autoStop)autoTimer=timerOwner.setTimeout(stopDraw,2500);
}
function stopDraw(){
 if(!rolling)return;timerOwner.clearInterval(rollTimer);timerOwner.clearTimeout(autoTimer);rolling=false;
 const candidates=pool();if(!candidates.length){renderAll();return;}
 // The committed draw is sampled independently from the visual rolling animation.
 const s=candidates[randomIndex(candidates.length)],c=active();lastStudent=s;recordDraw(c,s);persist();setStudent(s);$('drawCard').classList.remove('rolling');void $('drawCard').offsetWidth;$('drawCard').classList.add('result');$('stageSubtitle').textContent=`轮到你啦，期待你的分享${pool().length?'。':'。当前抽取范围已完成。'}`;$('cardStatus').textContent='已选中 · '+s.name;$('drawButtonText').textContent='再点一位';$('drawButton').querySelector('[data-icon]').innerHTML=icon('play');renderStats();renderRoster();$('announcement').textContent=`本次点名：${s.name}，${c.students.findIndex(x=>x.id===s.id)+1} 号。`;chime();
}
function resetButton(){ $('drawButtonText').textContent='开始点名';$('drawButton').querySelector('[data-icon]').innerHTML=icon('play');$('nameDisplay').style.fontSize=''; }
function ask(title,message,ok='确定'){
 $('confirmTitle').textContent=title;$('confirmText').textContent=message;$('confirmOk').textContent=ok;$('confirmDialog').showModal();return new Promise(resolve=>confirmResolve=resolve);
}
function closeConfirm(result){$('confirmDialog').close();confirmResolve?.(result);confirmResolve=null;}
function openEditor(id){
 if(rolling)return;editingId=id;const c=state.classes.find(x=>x.id===id);$('editorTitle').textContent=c?'管理班级名单':'创建新班级';$('classNameInput').value=c?.name||'';$('namesInput').value=c?.students.map(s=>s.name+(s.gender==='male'?',男':s.gender==='female'?',女':'')).join('\n')||'';for(const group of ['A','B']){$('group'+group+'Input').value=c?.students.map((s,i)=>({s,i})).filter(({s})=>s.groups?.includes(group)).map(({s,i})=>c.students.filter(other=>other.name===s.name).length>1?`#${i+1} ${s.name}`:s.name).join('\n')||'';}
 $('deleteClass').hidden=!c;updateEditorCount();$('editorDialog').showModal();
}
function updateEditorCount(){
 const parsed=parseNames($('namesInput').value);const names=new Set(parsed.map(s=>s.name));$('editorStatus').textContent=`已识别 ${parsed.length} 位同学${names.size<parsed.length?' · 含同名学生，将保留为独立学号':''}`;
 try{const grouped=assignGroups(parsed,$('groupAInput').value,$('groupBInput').value);for(const group of ['A','B'])$('group'+group+'Count').textContent=grouped.filter(s=>s.groups.includes(group)).length+' 人';$('groupEditorStatus').textContent='';$('groupEditorStatus').classList.remove('invalid');}
 catch(error){for(const group of ['A','B'])$('group'+group+'Count').textContent=parseNames($('group'+group+'Input').value).length+' 项';$('groupEditorStatus').textContent=error.message;$('groupEditorStatus').classList.add('invalid');}
}
function download(content,name,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function safeName(name){return name.replace(/[\\/:*?"<>|]/g,'_');}
function dateStamp(){return new Date().toLocaleDateString('sv-SE');}
function showHistory(){const c=active();$('historyDescription').textContent=`${c?.name||'尚无班级'} · 共 ${c?.history.length||0} 条记录（含历史轮次）`;$('historyList').innerHTML=c?.history.length?c.history.map((h,i)=>`<div class="history-row"><span>${pad(i+1)}</span><strong>${escape(h.name)}</strong><small>第 ${h.round} 轮<br>${new Date(h.time).toLocaleDateString('zh-CN')} ${clock(h.time)}</small></div>`).join(''):'<div class="empty-roster">还没有记录，开始第一次点名吧。</div>';$('exportHistory').disabled=!c?.history.length;$('historyDialog').showModal();}
async function toggleFullscreen(){
 if(document.body.classList.contains('focus-mode')){document.body.classList.remove('focus-mode');try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}return;}
 document.body.classList.add('focus-mode');try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notify('已进入专注展示，按 F 或双击背景退出');}catch{notify('已进入专注展示，按 F 或双击背景退出');}
}
$('menu').addEventListener('click',()=>openMenu(!$('sidebar').classList.contains('open')));$('scrim').addEventListener('click',()=>openMenu(false));
$('classList').addEventListener('click',e=>{const button=e.target.closest('[data-class]');if(!button||rolling)return;switchClass(button.dataset.class);openMenu(false);});
$('addClass').addEventListener('click',()=>{if(state.classes.length>=100){notify('最多支持 100 个班级');return;}openMenu(false);openEditor(null);});$('editRoster').addEventListener('click',()=>openEditor(state.activeId));
$('drawButton').addEventListener('click',startDraw);
$('resetRound').addEventListener('click',async()=>{if(rolling||!active())return;const c=active();if(c.called.length&&!await ask('开始新一轮？','本轮已点状态将重置，历史点名记录会保留。','开始新一轮'))return;beginNewRound();notify(`已开始第 ${c.round} 轮点名`);});
for(const id of ['noRepeat','autoStop','sound'])$(id).addEventListener('click',()=>{if(rolling)return;state.settings[id]=!state.settings[id];if(id==='sound')initAudio();persist();renderStats();if(id==='noRepeat'&&!lastStudent)idleStage();});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b||rolling)return;switchFilter(b.dataset.filter);});$('search').addEventListener('input',renderRoster);
for(const id of ['namesInput','groupAInput','groupBInput'])$(id).addEventListener('input',updateEditorCount);
$('editorForm').addEventListener('submit',async e=>{
 e.preventDefault();const name=$('classNameInput').value.trim();if(!name){$('classNameInput').focus();return;}let students;try{students=assignGroups(parseNames($('namesInput').value),$('groupAInput').value,$('groupBInput').value);}catch(error){updateEditorCount();notify(error.message);return;}if(students.length>3000){notify('每个班级最多支持 3000 位同学');return;}
 const c=state.classes.find(x=>x.id===editingId);const rosterChanged=c&&JSON.stringify(c.students.map(s=>[s.name,s.gender]))!==JSON.stringify(students.map(s=>[s.name,s.gender]));
 if(rosterChanged&&c.called.length&&!await ask('更新班级名单？','名单变化后将开始新一轮。已有点名记录仍会保留。','保存并更新'))return;
 if(c){c.name=name;if(rosterChanged){c.students=students;c.called=[];c.round+=c.history.length?1:0;}else{c.students=c.students.map((student,index)=>({...student,groups:students[index].groups}));}c.demo=false;state.activeId=c.id;}else{const n={id:uid(),name,students,called:[],history:[],round:1,demo:false};state.classes.push(n);state.activeId=n.id;}
 filter='all';lastStudent=null;$('search').value='';persist();$('editorDialog').close();resetButton();renderAll();notify(`已保存「${name}」`);
});
$('deleteClass').addEventListener('click',async()=>{const c=state.classes.find(x=>x.id===editingId);if(!c)return;if(!await ask('删除这个班级？',`「${c.name}」的名单和所有点名记录都将删除。你可以先导出全部数据备份。`,'删除班级'))return;state.classes=state.classes.filter(x=>x.id!==c.id);state.activeId=state.classes[0]?.id||null;lastStudent=null;filter='all';persist();$('editorDialog').close();resetButton();renderAll();notify('班级已删除');});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$('confirmCancel').addEventListener('click',()=>closeConfirm(false));$('confirmOk').addEventListener('click',()=>closeConfirm(true));$('confirmDialog').addEventListener('cancel',e=>{e.preventDefault();closeConfirm(false);});
$('importRoster').addEventListener('click',()=>$('rosterFile').click());$('rosterFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw new Error('名单文件请控制在 2 MB 以内');const text=await file.text();$('namesInput').value=text;updateEditorCount();notify('已载入名单，请检查后保存');}catch(error){notify(error.message||'文件读取失败');}finally{e.target.value='';}});
$('backup').addEventListener('click',()=>{download(JSON.stringify(state,null,2),`Xue点名器_全部班级_${dateStamp()}.json`,'application/json');notify('备份已导出，可在另一台设备导入');});$('restore').addEventListener('click',()=>$('backupFile').click());
$('backupFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10e6)throw new Error('备份文件请控制在 10 MB 以内');const next=validateState(JSON.parse(await file.text()));if(!await ask('导入全部班级数据？',`备份包含 ${next.classes.length} 个班级，将替换当前浏览器的全部名单、设置和记录。建议先导出当前数据。`,'导入并替换'))return;state=next;filter='all';lastStudent=null;$('search').value='';persist();resetButton();renderAll();notify('已导入全部班级与点名记录');}catch(error){notify(error instanceof SyntaxError?'无法识别文件，请导入Xue点名器导出的 JSON 备份':error.message||'备份文件无效');}finally{e.target.value='';}});
$('historyButton').addEventListener('click',showHistory);$('exportHistory').addEventListener('click',()=>{const c=active();if(!c)return;const rows=[['班级','姓名','轮次','点名时间'],...c.history.map(h=>[c.name,h.name,h.round,new Date(h.time).toLocaleString('zh-CN',{hour12:false})])];download('\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),`${safeName(c.name)}_点名记录.csv`,'text/csv;charset=utf-8');});
$('exitFocus').addEventListener('click',toggleFullscreen);$('fullscreen').addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('focus-mode');});document.body.addEventListener('dblclick',e=>{if(document.body.classList.contains('focus-mode')&&!e.target.closest('button'))toggleFullscreen();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('sidebar').classList.contains('open')){openMenu(false);$('menu').focus();return;}if(e.key==='Escape'&&document.body.classList.contains('focus-mode')){toggleFullscreen();return;}if(e.target.closest('input,textarea,select,button,a')||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.code==='Space'){e.preventDefault();startDraw();}else if(e.key.toLowerCase()==='n')$('resetRound').click();else if(e.key.toLowerCase()==='f')toggleFullscreen();});
window.addEventListener('pagehide',()=>{cancelDraw();floating?.close();});
setupFloating();
renderAll();$('storageStatus').textContent=storageProblem?'暂未保存，请导出备份':'数据保存在此浏览器';if(storageProblem)notify('未能读取已保存数据，请检查浏览器设置或导入备份。');

function syncFloating(){floating?.render();}
function cancelDraw(){
 if(!rolling)return;
 timerOwner.clearInterval(rollTimer);timerOwner.clearTimeout(autoTimer);rolling=false;rollTimer=null;autoTimer=null;
 lastStudent=null;resetButton();renderAll();
}
function beginNewRound(){if(rolling||!active())return;newRound(active());lastStudent=null;persist();resetButton();renderAll();}
function switchClass(id){if(rolling||!state.classes.some(c=>c.id===id))return;state.activeId=id;filter='all';lastStudent=null;$('search').value='';persist();resetButton();renderAll();}
function switchFilter(next){if(rolling||!['all','male','female','A','B'].includes(next))return;filter=next;lastStudent=null;resetButton();renderStats();renderRoster();idleStage();}
function floatingSnapshot(){
 const c=active();return{classes:state.classes.map(c=>({id:c.id,name:c.name})),activeId:state.activeId,hasClass:!!c,filter,rolling,result:$('drawCard').classList.contains('result'),name:$('nameDisplay').textContent,caption:$('stageCaption').textContent,subtitle:$('stageSubtitle').textContent,round:c?.round||1,called:c?.called.length||0,total:c?.students.length||0,remaining:pool().length,noRepeat:state.settings.noRepeat};
}
function showFloatingGuide(error=''){
 const supported=floatingSupported();$('floatingError').textContent=error;
 $('floatingGuideIntro').textContent=supported?'开启后先显示小胶囊，点击展开点名，结束后可收起。浏览器仍会保留系统外框和最小尺寸限制。':'当前浏览器未提供桌面悬浮窗功能。请用电脑端新版 Chrome 或 Edge 打开；网页点名功能仍可正常使用。';
 $('launchFloating').disabled=!supported;
 if(!$('floatingGuide').open)$('floatingGuide').showModal();
}
async function launchFloating(){
 if(rolling)return;initAudio();$('floatingError').textContent='';
 // No await before requestWindow(): preserve the actual click's user activation.
 $('floatingGuide').close();const opened=floating.open();
 if(await opened){$('floatingButtonText').textContent='返回悬浮窗';$('openFloating').setAttribute('aria-pressed','true');}
}
function setupFloating(){
 floating=new FloatingPanel({getSnapshot:floatingSnapshot,onDraw:startDraw,onReset:beginNewRound,onClassChange:switchClass,onFilterChange:switchFilter,onClose:()=>{cancelDraw();$('floatingButtonText').textContent='悬浮点名';$('openFloating').setAttribute('aria-pressed','false');},onError:reason=>showFloatingGuide(reason==='unsupported'?'':'未能开启悬浮窗。请使用电脑端 Chrome 或 Edge，通过 HTTPS 网站打开，并直接点击「开启悬浮窗」重试。')});
 $('openFloating').setAttribute('aria-pressed','false');
 $('openFloating').addEventListener('click',()=>{if(floatingSupported())launchFloating();else showFloatingGuide();});
 $('launchFloating').addEventListener('click',launchFloating);
 let prompt=true;try{prompt=localStorage.getItem('xinran-floating-prompt')!=='off';}catch{}
 $('showFloatingPrompt').checked=prompt;$('showFloatingPrompt').addEventListener('change',e=>{try{localStorage.setItem('xinran-floating-prompt',e.target.checked?'on':'off');}catch{notify('浏览器未能保存提醒偏好');}});
 if(prompt&&floatingSupported())showFloatingGuide();
}
