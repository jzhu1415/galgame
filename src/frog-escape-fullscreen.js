import {tr} from './frog-escape-i18n.js';

// Fullscreen the stable app root so native settings and outcome dialogs remain
// inside the fullscreen element. F11 remains native when the API is unavailable.
export function createEscapeFullscreen({root,doc=document,onChange=()=>{}}){
  const button=doc.querySelector('#escape-fullscreen'),status=doc.querySelector('#escape-fullscreen-status');
  const request=root.requestFullscreen??root.webkitRequestFullscreen,exit=doc.exitFullscreen??doc.webkitExitFullscreen;
  const available=typeof request==='function'&&typeof exit==='function'&&doc.fullscreenEnabled!==false;
  let pending=false,error='';
  const active=()=>(doc.fullscreenElement??doc.webkitFullscreenElement)===root;
  function refresh(){
    root.classList.toggle('is-fullscreen',active());
    if(button){button.textContent=tr(active()?'退出全屏 · F11':'全屏 · F11');button.disabled=!available;button.setAttribute('aria-pressed',String(active()));}
    if(status){status.textContent=tr(error||(!available?'当前浏览器不支持游戏全屏，可使用浏览器的全屏功能。':''));status.hidden=!status.textContent;}
  }
  async function toggle(){
    if(pending||!available)return false;
    pending=true;error='';
    try{if(active())await exit.call(doc);else await request.call(root);return true;}
    catch{error='未能切换全屏，请再次点击全屏按钮。';return false;}
    finally{pending=false;refresh();onChange();}
  }
  const change=()=>{refresh();onChange();};
  const key=event=>{if((event.code==='F11'||event.key==='F11')&&!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&available){event.preventDefault();void toggle();}};
  button?.addEventListener('click',toggle);doc.addEventListener('keydown',key,true);doc.addEventListener('fullscreenchange',change);doc.addEventListener('webkitfullscreenchange',change);refresh();
  return {toggle,refresh,get active(){return active();},dispose(){button?.removeEventListener('click',toggle);doc.removeEventListener('keydown',key,true);doc.removeEventListener('fullscreenchange',change);doc.removeEventListener('webkitfullscreenchange',change);}};
}
