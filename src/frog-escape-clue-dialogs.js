import {tr} from './frog-escape-i18n.js';

// Native dialogs keep keyboard entry and touch buttons out of gameplay input.
export function createClueDialogs({clues,onOpen,onClose,onSuccess,onFailure}) {
  const gate=document.querySelector('#escape-code-dialog'),note=document.querySelector('#escape-note-dialog');
  const input=document.querySelector('#escape-code-input'),error=document.querySelector('#escape-code-error');
  let message='';
  function refreshLanguage(){error.textContent=message?tr(message):'';}
  function close(){gate.close();note.close();message='';refreshLanguage();onClose();}
  function open(kind) {
    if(!clues)return;
    onOpen();message='';refreshLanguage();
    if(kind==='note'){clues.readNote?.();document.querySelector('#escape-note-code').textContent=clues.code;note.showModal();document.querySelector('#escape-note-close').focus();}
    else {input.value='';gate.showModal();input.focus();}
  }
  input.addEventListener('input',()=>{input.value=input.value.replace(/[^0-9]/g,'').slice(0,4);message='';refreshLanguage();});
  for(const button of document.querySelectorAll('[data-code-digit]'))button.addEventListener('click',()=>{if(input.value.length<4)input.value+=button.dataset.codeDigit;message='';refreshLanguage();});
  document.querySelector('#escape-code-delete').addEventListener('click',()=>{input.value=input.value.slice(0,-1);message='';refreshLanguage();});
  document.querySelector('#escape-code-form').addEventListener('submit',event=>{
    event.preventDefault();if(!gate.open||!clues)return;
    if(input.value.length!==4){message='请输入四位数字。';refreshLanguage();input.focus();return;}
    if(!onSuccess(input.value)){message='密码错误，请重试。';refreshLanguage();onFailure();input.value='';input.focus();return;}
    close();
  });
  for(const id of ['#escape-code-cancel','#escape-note-close'])document.querySelector(id).addEventListener('click',close);
  for(const modal of [gate,note]) {
    modal.addEventListener('cancel',event=>{event.preventDefault();close();});
    modal.addEventListener('click',event=>{if(event.target!==modal)return;const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  }
  return {open,refreshLanguage,dismiss(){gate.close();note.close();},get active(){return gate.open||note.open;}};
}
