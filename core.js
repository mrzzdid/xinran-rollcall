export const uid=()=>globalThis.crypto.randomUUID();
export function randomIndex(length){
  if(!Number.isInteger(length)||length<1)throw new Error('没有可抽取的学生');
  const range=4294967296, limit=range-range%length, buffer=new Uint32Array(1);
  do{crypto.getRandomValues(buffer);}while(buffer[0]>=limit);
  return buffer[0]%length;
}
export function parseNames(text){
  const students=[], lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  for(let line of lines){
    line=line.trim();if(!line)continue;
    // CSV and Excel rows may include a student number as the first column.
    const parts=line.split(/[,，\t]/).map(s=>s.trim().replace(/^"|"$/g,''));
    if(/^(姓名|name|student name)$/i.test(parts[0])||(/^(学号|序号|编号|id|number)$/i.test(parts[0])&&/^(姓名|name)$/i.test(parts[1]||'')))continue;
    if(parts.length>1&&/^\d+$/.test(parts[0]))parts.shift();
    const gender=parts.length>1?parts[parts.length-1].toLowerCase():'';
    const isGender=/^(男|女|male|female|m|f)$/.test(gender);
    if(isGender){
      const name=parts.slice(0,-1).join(' ').trim();
      if(name)students.push({id:uid(),name:name.slice(0,100),gender:/^(男|male|m)$/.test(gender)?'male':'female'});
    }else{
      for(const name of parts.flatMap(s=>s.split('、')).map(s=>s.trim()).filter(Boolean))students.push({id:uid(),name:name.slice(0,100),gender:'unknown'});
    }
  }
  return students;
}
export function eligibleStudents(cls,filter='all',noRepeat=true){
  const called=new Set(cls.called);
  return cls.students.filter(s=>(filter==='all'||s.gender===filter)&&(!noRepeat||!called.has(s.id)));
}
export function recordDraw(cls,student,timestamp=new Date().toISOString()){
  if(!cls.called.includes(student.id))cls.called.push(student.id);
  cls.history.unshift({id:uid(),studentId:student.id,name:student.name,round:cls.round,time:timestamp});
  cls.history=cls.history.slice(0,500);
}
export function newRound(cls){cls.round++;cls.called=[];}
export function validateState(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.classes)||raw.classes.length>100)throw new Error('备份格式不正确');
  const ids=new Set();
  const classes=raw.classes.map(c=>{
    if(!c||typeof c.id!=='string'||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||!Array.isArray(c.students)||c.students.length>3000)throw new Error('班级数据不完整');
    ids.add(c.id);const studentIds=new Set();
    const students=c.students.map(s=>{if(!s||typeof s.id!=='string'||studentIds.has(s.id)||typeof s.name!=='string'||!s.name.trim())throw new Error('学生数据不完整');studentIds.add(s.id);return{id:s.id,name:s.name.slice(0,100),gender:['male','female'].includes(s.gender)?s.gender:'unknown'};});
    return{id:c.id,name:c.name.trim().slice(0,40),students,called:Array.isArray(c.called)?[...new Set(c.called.filter(id=>studentIds.has(id)))]:[],round:Number.isSafeInteger(c.round)&&c.round>0?c.round:1,demo:!!c.demo,history:Array.isArray(c.history)?c.history.filter(h=>h&&typeof h.id==='string'&&typeof h.name==='string'&&typeof h.studentId==='string'&&Number.isSafeInteger(h.round)&&h.round>0&&Number.isFinite(Date.parse(h.time))).slice(0,500).map(h=>({id:h.id,name:h.name.slice(0,100),studentId:h.studentId,round:h.round,time:h.time})):[]};
  });
  return{version:1,classes,activeId:classes.some(c=>c.id===raw.activeId)?raw.activeId:classes[0]?.id||null,settings:{noRepeat:raw.settings?.noRepeat!==false,autoStop:raw.settings?.autoStop!==false,sound:raw.settings?.sound===true}};
}
export function csvCell(value){return '"'+String(value).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';}
