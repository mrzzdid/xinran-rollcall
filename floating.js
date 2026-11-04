// A real operating-system picture-in-picture window; never substitute a page overlay.
export const floatingSupported=()=>typeof window.documentPictureInPicture?.requestWindow==='function';
const floatingCSS=`
:root{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#303840;background:#edf0f1;font-synthesis:none}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 15% 0%,#fff,#eef0f1 75%);padding:17px}button,select{font:inherit;color:inherit}button{cursor:pointer;border:0}button:disabled,select:disabled{opacity:.4;cursor:not-allowed}button:focus-visible,select:focus-visible{outline:2px solid #81988b;outline-offset:3px}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.brand{font-size:12px;font-weight:600;letter-spacing:.6px}.badge{font-size:8px;color:#84958a;background:#e3ebe5;border:1px solid #d9e3dc;padding:4px 7px;border-radius:20px}.selectors{display:flex;gap:7px}select{min-width:0;background:#ffffffb0;border:1px solid white;border-radius:8px;padding:8px;font-size:10px;max-width:100%;outline-offset:1px}#floatingClass{flex:1;width:60%}#floatingFilter{width:90px}.card{background:linear-gradient(130deg,#ffffffed,#ffffff70);border:1px solid #fff;box-shadow:0 8px 30px #29373f08;border-radius:16px;margin-top:12px;padding:20px 14px;text-align:center;min-height:145px;display:flex;flex-direction:column;justify-content:center}.caption{font-size:9px;color:#949fa7;line-height:1.5}.name{font-size:clamp(27px,9vw,42px);font-weight:550;line-height:1.3;letter-spacing:1px;margin:12px 0;overflow-wrap:anywhere}.hint{font-size:9px;color:#8b989f;line-height:1.6}.result .name{color:#526e5a}.rolling .name{color:#8c969e}.row{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#8e999f;margin:12px 2px}.actions{display:flex;gap:8px}.draw{flex:1;border-radius:10px;padding:13px 8px;font-size:13px;color:#fff;background:linear-gradient(120deg,#48525b,#2b3239);box-shadow:0 4px 10px #29333f17}.reset{border:1px solid #dce2e6;border-radius:10px;background:#ffffff8c;padding:10px 11px;font-size:10px;min-width:71px}.reset.confirming{background:#e4eae5;border-color:#afbeb1;color:#546d59}.foot{font-size:8px;color:#9ba5ac;text-align:center;line-height:1.7;margin:12px 0 0}.foot button{font-size:8px;text-decoration:underline;color:#7d8d99;background:none;padding:0 3px}.reset-note{font-size:9px;line-height:1.5;color:#738979;margin:9px 0 0}.reset-note:empty{display:none}@media(max-height:315px){body{padding:10px}.header{margin-bottom:8px}.card{min-height:90px;margin-top:8px;padding:11px}.name{margin:7px 0;font-size:30px}.hint,.foot{display:none}.row{margin:8px 2px}.draw{padding:10px}.selectors select{padding:5px}}[hidden]{display:none!important}.launcher{height:100vh;display:flex;align-items:center;justify-content:center;padding:7px}.collapsed{padding:0;min-height:100vh;overflow:hidden;background:#ecefee}.capsule{display:flex;gap:12px;align-items:center;justify-content:center;min-width:156px;height:52px;padding:0 18px;border-radius:999px;border:1px solid #fff;background:linear-gradient(125deg,#ffffffed,#dce1e4d9);box-shadow:inset 0 1px 0 #fff,0 4px 14px #34414c16;backdrop-filter:blur(25px);font-size:12px;color:#424d53;transition:background .2s}.capsule:hover{background:#fff}.capsule-spark{font-size:25px;font-weight:300;line-height:1}.capsule-divider{width:1px;height:22px;background:#aeb7bf55}.capsule svg{width:15px;height:15px}.collapse-button{background:#e5ebe7;color:#788b7f;border:1px solid #d9e2dc;padding:5px 8px;border-radius:20px;font-size:9px;white-space:nowrap}@media(prefers-reduced-motion:reduce){*{animation:none!important}}
`;
export class FloatingPanel{
 constructor({getSnapshot,onDraw,onReset,onClassChange,onFilterChange,onClose,onError}){
  Object.assign(this,{getSnapshot,onDraw,onReset,onClassChange,onFilterChange,onClose,onError});this.window=null;this.collapsed=true;this.opening=false;this.resetPending=false;this.optionsSignature='';this.onPageHide=this.onPageHide.bind(this);
 }
 get isOpen(){return !!this.window&&!this.window.closed;}
 async open(){
  if(this.isOpen){this.window.focus();return true;}
  if(this.opening)return false;
  if(!floatingSupported()){this.onError('unsupported');return false;}
  this.opening=true;let opened=null;
  try{
   opened=await window.documentPictureInPicture.requestWindow({width:190,height:68,preferInitialWindowPlacement:true});
   this.window=opened;this.collapsed=true;this.resetPending=false;this.optionsSignature='';
   const doc=opened.document;doc.title='鑫然点名器 · 悬浮点名';doc.documentElement.lang='zh-CN';
   const style=doc.createElement('style');style.textContent=floatingCSS;doc.head.append(style);
   doc.body.className='collapsed';
   doc.body.innerHTML=`<div id="floatingLauncher" class="launcher"><button class="capsule" id="floatingExpand" aria-label="展开点名面板" title="展开点名面板"><span class="capsule-spark" aria-hidden="true">✳</span><span class="capsule-divider"></span><span>点名</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button></div><div id="floatingPanel" hidden><header class="header"><span class="brand">✳ 鑫然点名器</span><button class="collapse-button" id="floatingCollapse" aria-label="收起为胶囊" title="收起为胶囊">− 收起</button></header><div class="selectors"><select id="floatingClass" aria-label="切换班级"></select><select id="floatingFilter" aria-label="抽取范围"><option value="all">全部同学</option><option value="male">只抽男生</option><option value="female">只抽女生</option><option value="A">仅 A 组</option><option value="B">仅 B 组</option></select></div><section class="card" id="floatingCard"><div class="caption" id="floatingCaption"></div><div class="name" id="floatingName" role="status" aria-live="off"></div><div class="hint" id="floatingHint"></div></section><div class="row"><span id="floatingRound"></span><span id="floatingProgress"></span></div><div class="actions"><button class="draw" id="floatingDraw">开始点名</button><button class="reset" id="floatingReset">新一轮</button></div><p class="reset-note" id="floatingResetNote"></p><p class="foot">拖动窗口标题栏调整位置 · 保留原网页标签页<br><button id="floatingClose">关闭悬浮窗</button></p></div>`;
   this.el=id=>doc.getElementById(id);
   this.el('floatingExpand').addEventListener('click',()=>this.setCollapsed(false));
   this.el('floatingCollapse').addEventListener('click',()=>this.setCollapsed(true));
   this.el('floatingDraw').addEventListener('click',()=>{this.resetPending=false;this.onDraw();});
   this.el('floatingClass').addEventListener('change',e=>{this.resetPending=false;this.onClassChange(e.target.value);});
   this.el('floatingFilter').addEventListener('change',e=>{this.resetPending=false;this.onFilterChange(e.target.value);});
   this.el('floatingReset').addEventListener('click',()=>{
    const s=this.getSnapshot();if(s.rolling||!s.hasClass)return;
    if(s.called&&!this.resetPending){this.resetPending=true;this.render();return;}
    this.resetPending=false;this.onReset();this.render();
   });
   this.el('floatingClose').addEventListener('click',()=>this.close());
   doc.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('select,input,textarea,button'))return;if(e.code==='Space'){e.preventDefault();if(this.collapsed){this.setCollapsed(false);return;}this.resetPending=false;this.onDraw();}});
   opened.addEventListener('pagehide',this.onPageHide,{once:true});this.render();return true;
  }catch(error){if(opened&&!opened.closed)opened.close();this.window=null;this.onError(error?.name||'failed');return false;}
  finally{this.opening=false;}
 }
 render(){
  if(!this.isOpen||!this.el)return;
  const s=this.getSnapshot();const signature=JSON.stringify(s.classes);
  if(signature!==this.optionsSignature){
   this.el('floatingClass').replaceChildren();
   for(const cls of s.classes){const option=this.window.document.createElement('option');option.value=cls.id;option.textContent=cls.name;this.el('floatingClass').append(option);}
   if(!s.classes.length){const option=this.window.document.createElement('option');option.textContent='请先在网页创建班级';option.value='';this.el('floatingClass').append(option);}
   this.optionsSignature=signature;
  }
  this.el('floatingClass').value=s.activeId||'';this.el('floatingClass').disabled=s.rolling||!s.hasClass;
  this.el('floatingFilter').value=s.filter;this.el('floatingFilter').disabled=s.rolling;
  this.el('floatingName').textContent=s.name;this.el('floatingName').setAttribute('aria-live',s.rolling?'off':'polite');
  this.el('floatingCaption').textContent=s.caption;
  this.el('floatingHint').textContent=s.rolling?'名字滚动中，点击停止即可定格':s.subtitle;
  this.el('floatingCard').className='card'+(s.rolling?' rolling':s.result?' result':'');
  this.el('floatingRound').textContent=`第 ${s.round} 轮 · ${s.noRepeat?'同轮不重复':'允许重复'}`;
  this.el('floatingProgress').textContent=`已点 ${s.called} / ${s.total} · 可抽 ${s.remaining}`;
  this.el('floatingDraw').textContent=s.rolling?'■ 停止 · 定格':s.remaining?'▶ '+(s.result?'再点一位':'开始点名'):'当前范围已点完';
  this.el('floatingDraw').disabled=!s.rolling&&!s.remaining;
  this.el('floatingCollapse').disabled=s.rolling;
  this.el('floatingReset').disabled=s.rolling||!s.hasClass;
  this.el('floatingReset').textContent=this.resetPending?'确认重置':'新一轮';
  this.el('floatingReset').classList.toggle('confirming',this.resetPending);
  this.el('floatingResetNote').textContent=this.resetPending?'再次点击「确认重置」开始新一轮；历史记录会保留。':'';
  this.el('floatingExpand').setAttribute('aria-expanded',String(!this.collapsed));
  this.el('floatingExpand').setAttribute('aria-controls','floatingPanel');
 }
 setCollapsed(collapsed){
  if(!this.window||this.window.closed)return;
  if(collapsed&&this.getSnapshot().rolling)return;
  this.collapsed=collapsed;this.resetPending=false;
  this.window.document.body.className=collapsed?'collapsed':'expanded';
  this.el('floatingLauncher').hidden=!collapsed;this.el('floatingPanel').hidden=collapsed;
  const width=collapsed?190:370,height=collapsed?68:400;
  // resizeTo takes outer dimensions and must run synchronously inside the actual click.
  const chromeWidth=Math.max(0,(this.window.outerWidth||this.window.innerWidth||width)-(this.window.innerWidth||width));
  const chromeHeight=Math.max(0,(this.window.outerHeight||this.window.innerHeight||height)-(this.window.innerHeight||height));
  try{this.window.resizeTo(width+chromeWidth,height+chromeHeight);}catch{}
  this.render();(collapsed?this.el('floatingExpand'):this.el('floatingDraw')).focus?.();
 }
 onPageHide(){this.window=null;this.el=null;this.resetPending=false;this.onClose();}
 close(){if(this.isOpen)this.window.close();}
}
