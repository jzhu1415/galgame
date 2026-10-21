import {tr,escapeLanguage} from './frog-escape-i18n.js';

// Guidance follows the player's furthest real progress. Earlier suggestions
// can be skipped; the guide never adds an unlock or victory requirement.
export function createEscapeGuide({player,inventory,clues,progress,chest}) {
  const completed=new Set();
  const has=kind=>inventory.slots.some(item=>item?.kind===kind);
  function update({difficulty,active,won=false}) {
    const visible=!!(active&&clues&&progress&&(difficulty==='easy'||difficulty==='normal'));
    if(!visible)return {visible:false};
    if(player.y>=.1||clues.codeKnown||clues.codeSolved)completed.add('stairs');
    if(clues.codeKnown)completed.add('note');
    if(has('shedKey')||chest?.insertedKey)completed.add('key');
    if(chest&&!chest.locked&&chest.insertedKey&&chest.amount>.7)completed.add('chest');
    if(progress.cuttersClaimed)completed.add('cutters');
    if(progress.rearRoute)completed.add('yard');
    if(progress.fence.cut)completed.add('fence');
    if(won)completed.add('exit');
    const steps=[
      {id:'stairs',title:'离开地下室',hint:'沿楼梯上一层。移动时留意奶蛙，遇到危险可以躲进床底或关好衣柜。'},
      {id:'note',title:'找到并阅读密码纸条',hint:'密码可直接尝试输入。需要线索时，再上二楼搜索主卧床头柜抽屉，打开后对准纸条阅读。'},
      {id:'key',title:'取得工具箱钥匙',hint:difficulty==='easy'?'搜索二楼浴室的马桶，拾取工具箱钥匙。':'搜索屋内可打开的抽屉和柜格，工具箱钥匙每局随机藏在其中。'},
      {id:'chest',title:'前往工具棚，打开工具箱',hint:chest?.insertedKey?'钥匙已插好。对准工具箱互动，打开箱盖。':has('shedKey')?'打开一层正门，前往前院右侧工具棚。密码可直接尝试，或从二楼主卧纸条获取。选中钥匙、对准箱锁使用，再打开箱盖。':'钥匙已拾取过，但现在不在物品栏。先找回丢下的工具箱钥匙，再去前院工具棚开箱。'},
      {id:'cutters',title:'拿到箱内的断线钳',hint:'打开工具箱，对准里面的断线钳拾取。物品栏已满时，先丢下不需要的物品。'},
      {id:'yard',title:'带上工具进入后院',hint:has('boltCutters')?'从工具棚带上撬棍，回二楼打碎面向后院的大窗并跳出去；也可击倒奶蛙、拿腰间钥匙，通过一层厨房后门。':'断线钳已拿到过。先找回丢下的断线钳；进入后院可从二楼朝后院的大窗破窗跳出，或拿奶蛙腰间钥匙走厨房后门。'},
      {id:'fence',title:'剪开北侧逃生栅栏',hint:has('boltCutters')?'走到后院最北侧正中的栅栏，选中断线钳，对准栅栏使用。':progress.cuttersClaimed?'先找回丢下的断线钳，再去后院最北侧正中的栅栏。':'需要断线钳才能剪栅栏。可先去前院工具棚，用工具箱钥匙开箱取出，再返回后院。'},
      {id:'exit',title:'穿过缺口，逃离古堡',hint:'穿过刚剪开的栅栏缺口，继续向外走，双脚落地后即可逃脱。'},
    ].map(step=>({...step,done:completed.has(step.id)}));
    const furthest=Math.max(clues.codeSolved?1:-1,...steps.map((step,index)=>step.done?index:-1));
    for(const [index,step] of steps.entries())step.skipped=!step.done&&(index<furthest||index===1&&clues.codeSolved);
    const current=steps.find(step=>!step.done&&!step.skipped)??null;
    return {visible,steps,current,completed:steps.filter(step=>step.done||step.skipped).length,total:steps.length};
  }
  return {update};
}

export function createEscapeGuideHud({root,guide,touch}) {
  if(!root)return {render(){},togglePlan(){}};
  const nodes=Object.fromEntries(['heading','count','current','hint','controls','progress','list','summary','announcement'].map(id=>[id,root.querySelector(`[data-guide-${id}]`)]));
  let previous='',announced='';
  function render(state) {
    const view=guide.update(state);
    if(root.hidden===view.visible)root.hidden=!view.visible;
    if(!view.visible)return;
    const snapshot=JSON.stringify([escapeLanguage(),view.steps.map(step=>[step.done,step.skipped]),view.current?.hint]);
    if(snapshot===previous)return;
    previous=snapshot;
    const controls=tr(touch?'摇杆移动 · 滑动转头 · 点按互动 · 在物品栏选中工具后点按“使用”。':'WASD 移动 · E 互动 · 1–7 选物品 · 右键使用工具 · 撬棍左键挥击 · 空格跳跃。');
    const heading=tr('新手任务'),current=tr(view.current?.title??'全部任务已完成'),hint=tr(view.current?.hint??'你已完成逃脱指引。');
    const rows=view.steps.map(step=>`<li${step.id===view.current?.id?' aria-current="step"':''} data-done="${step.done}" data-skipped="${step.skipped}"><span aria-hidden="true">${step.done?'✓':step.skipped?'↷':String(view.steps.indexOf(step)+1).padStart(2,'0')}</span> ${tr(step.title)}${step.done?`<span class="escape-sr-only"> · ${tr('已完成')}</span>`:step.skipped?`<small> · ${tr('已跳过')}</small>`:''}</li>`).join('');
    nodes.heading.textContent=heading;nodes.count.textContent=`${view.completed} / ${view.total}`;
    nodes.current.textContent=current;nodes.hint.textContent=hint;nodes.controls.textContent=controls;
    nodes.progress.max=view.total;nodes.progress.value=view.completed;nodes.progress.setAttribute('aria-label',tr('新手任务进度'));
    nodes.summary.textContent=(touch?'':'H · ')+tr('全部步骤与操作');nodes.list.innerHTML=rows;
    root.setAttribute('aria-label',heading);
    const announcement=`${view.completed} / ${view.total} · ${current}`;
    if(announced!==announcement){announced=announcement;nodes.announcement.textContent=announcement;}
  }
  return {render,togglePlan(){
    if(root.hidden)return;
    const plan=root.querySelector('details');plan.open=!plan.open;
    if(plan.open){const current=nodes.list.querySelector('[aria-current="step"]');root.scrollTop=Math.max(0,(current?.offsetTop??0)-(root.offsetTop??0)-40);}
    else root.scrollTop=0;
  }};
}
