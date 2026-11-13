// No npm dependencies required. Run: node scripts/verify-project.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const required = ['index.html','style.css','portal.css','app.js','portal.js','questions.js','assets/world-map.webp',
  'assets/station-01.webp','assets/station-02.webp','assets/station-03.webp',
  'assets/station-04.webp','assets/station-05.webp'];
const missing = required.filter(f => !fs.existsSync(path.join(root, f)));
if(missing.length) throw new Error('Missing required files: ' + missing.join(', '));
for(const file of required.filter(x=>x.endsWith('.webp'))){
  const data = fs.readFileSync(path.join(root,file));
  if(data.subarray(0,4).toString()!=='RIFF' || data.subarray(8,12).toString()!=='WEBP'){
    throw new Error('Invalid WebP asset: '+file);
  }
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const file of ['style.css','portal.css','app.js','portal.js','questions.js','assets/world-map.webp']){
  if(!html.includes(file)) throw new Error('HTML does not reference '+file);
}
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'questions.js'),'utf8'),context,{filename:'questions.js'});
const topics=context.window.ENGLISH_QUEST_TOPICS;
const expected=['Free Time','The Old House','Get Dressed','The Robot','At The Beach'];
if(!Array.isArray(topics) || topics.length!==5) throw new Error('Exactly five topics are required.');
const ids=new Set();
for(let t=0;t<topics.length;t++){
  const topic=topics[t];
  if(topic.title!==expected[t]) throw new Error(`Unexpected topic ${t+1}: ${topic.title}`);
  if(topic.questions.length!==20) throw new Error(`Topic ${topic.title} must have 20 questions`);
  for(const q of topic.questions){
    if(ids.has(q.id)) throw new Error('Duplicate question ID: '+q.id);
    ids.add(q.id);
    if(typeof q.prompt!=='string' || !q.prompt.trim() ||
       !Array.isArray(q.options) || q.options.length!==3 ||
       !Number.isInteger(q.correct) || q.correct<0 || q.correct>=q.options.length){
      throw new Error('Invalid question: '+q.id);
    }
  }
}
console.log(`PASS: ${topics.length} topics, ${ids.size} valid questions, and ${required.length} required files.`);

const portal=fs.readFileSync(path.join(root,'portal.js'),'utf8');
for(const route of ['home','topics','games','rewards','profile','teacher','login','settings']) {
  if (!portal.includes(`id:'${route}'`)) throw new Error('Missing navigation route: '+route);
}
for(const pathName of ['.github/workflows/deploy-pages.yml','portal.css','portal.js']){
  if(!fs.existsSync(path.join(root,pathName))) throw new Error('Missing deployment/portal file: '+pathName);
}
console.log('PASS: all 8 interactive navigation routes and Pages deployment workflow are present.');
