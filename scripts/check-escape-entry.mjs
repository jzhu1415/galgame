import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {tsModuleUrl} from './ts-module.mjs';
const {renderHomePage}=await import(tsModuleUrl('src/home-page.ts'));
const {escapeSiteUrl}=await import(tsModuleUrl('src/escape-site.ts'));
for(const language of ['zh','en']){const html=renderHomePage(language,[]);assert(html.includes('href="'+escapeSiteUrl+'"'));assert(html.includes(language==='zh'?'逃离奶蛙':'Escape Naiwa'));assert(html.includes(language==='zh'?'“奶蛙致死的爱”':'“Naiwa’s Deadly Love”'));assert(html.includes('id="home-escape-title">'+(language==='zh'?'逃离奶蛙':'Escape Naiwa')+'</h2>'));}
assert(!readdirSync('src').some(file=>file.startsWith('frog-escape')));
for(const file of ['frog-escape-map.html','public/audio/frog-escape/manifest.json','sites/escape-hosting.json'])assert(!existsSync(file),file+' must belong to Escape-Naiwa');
assert(!readFileSync('vite.config.js','utf8').includes('frogEscapeMap'));
assert(!Object.keys(JSON.parse(readFileSync('package.json')).scripts).some(key=>key.startsWith('check:frog-escape')));
assert(existsSync('assets/models/naiwa-h25-refined.glb'),'the shared frozen character is retained');
console.log('Galgame retains the bilingual external escape introduction, without the escape implementation or build.');
