import type { Language } from './story'
import { finaleSpeakers, type FinaleBilingual, type FinaleSave, type FinaleSpeaker } from './finale-story'

type Introduction = {
  speaker: FinaleSpeaker
  from: number
  to: number
  label: FinaleBilingual
  role: FinaleBilingual
  detail: FinaleBilingual
}
const firstMeeting = { zh: '认出旧人', en: 'A FAMILIAR FACE' }
const faceToFace = { zh: '面对面', en: 'FACE TO FACE' }
// Only facts revealed at this encounter; no future allegiances or ending information.
export const finaleIntroductions: Record<string, Introduction[]> = {
  'f5-voice': [
    { speaker: 'feidudu', from: 2, to: 2, label: { zh: '熟悉的身影', en: 'A FAMILIAR FACE' }, role: { zh: '镜馆里的旧识', en: 'An acquaintance from the mirror hall' }, detail: { zh: '熟悉的声音，把你留在了深渊的屏幕前。', en: 'A familiar voice stops you beside the screen in the Deep.' } },
    { speaker: 'niulai', from: 4, to: 6, label: firstMeeting, role: { zh: '组织 · 转运与对外许可', en: 'Institute · Transfers and external permits' }, detail: { zh: '病房门口拿夹板的人，第三章递过同意书；熟悉的转运流程在这里继续。', en: 'The attendant with the ward clipboard and the consent form in Chapter Three continues the same transfer process here.' } },
  ],
  'f5-cat-ambush': [
    { speaker: 'banana-cat', from: 5, to: 9, label: { zh: '再次见面', en: 'A FAMILIAR FACE' }, role: { zh: '组织 · 监控与通路', en: 'Institute · Surveillance and access routes' }, detail: { zh: '病房值班台的熟面孔。这里的镜头、门锁与路标，也在它的控制下。', en: 'The familiar attendant from the hospital. These cameras, locks and signs are under its control too.' } },
  ],
  'f5-film-kept': [
    { speaker: 'naidou', from: 1, to: 2, label: { zh: '床边的旧识', en: 'FROM THE WARD' }, role: { zh: '组织 · 设备与临床记录', en: 'Institute · Equipment and clinical records' }, detail: { zh: '曾在病床边接线、解释设备记录，也为研究员接好探针；录像补上了她没说的部分。', en: 'She connected the bedside pump and the researcher’s probe. The recording supplies what she left out.' } },
  ],
  'f5-naidou': [
    { speaker: 'naidou', from: 1, to: 2, label: faceToFace, role: { zh: '组织 · 设备与临床记录', en: 'Institute · Equipment and clinical records' }, detail: { zh: '病房里让你别拔线的奶豆，此刻守着同样的线路与备用开关。', en: 'The same Naidou who told you not to unplug the bedside lines now guards the console and backup switch.' } },
  ],
  'f5-bargain': [
    { speaker: 'niulai', from: 1, to: 3, label: faceToFace, role: { zh: '组织 · 转运与对外许可', en: 'Institute · Transfers and external permits' }, detail: { zh: '病房门口的转运负责人，又拿出第三章见过的同意书。', en: 'The ward transfer attendant holds out the consent form you saw in Chapter Three.' } },
  ],
}

export function finaleIntroduction(save: FinaleSave) {
  return finaleIntroductions[save.node]?.find(entry => save.line >= entry.from && save.line <= entry.to) ?? null
}

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
export function renderFinaleIntroduction(save: FinaleSave, language: Language): string {
  const intro = finaleIntroduction(save)
  if (!intro) return ''
  return `<aside class="finale-character-intro" data-character-intro="${intro.speaker}" aria-label="${language === 'zh' ? '出场人物介绍' : 'Character introduction'}"><p class="finale-intro-label">${escape(intro.label[language])}</p><div class="finale-intro-identity"><strong>${escape(finaleSpeakers[intro.speaker][language])}</strong><span>${escape(intro.role[language])}</span></div><p class="finale-intro-detail">${escape(intro.detail[language])}</p></aside>`
}
