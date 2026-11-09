const {chromium}=require('playwright');
(async()=>{const [,,html,pdf,shots]=process.argv;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:794,height:1123}});
await p.goto('file://'+html);await p.evaluate(()=>document.fonts.ready);
// はみ出しチェック
const ov=await p.evaluate(()=>[...document.querySelectorAll('.page')].map((pg,i)=>{const m=pg.querySelector('main');const f=pg.querySelector('footer');return {i:i+1,over: pg.scrollHeight-pg.clientHeight, mainOver: m? m.scrollHeight-m.clientHeight:0}}));
console.log(JSON.stringify(ov));
await p.pdf({path:pdf,format:'A4',printBackground:true,preferCSSPageSize:true});
if(shots){const n=await p.locator('.page').count();for(let i=0;i<n;i++){await p.locator('.page').nth(i).screenshot({path:`${shots}/p${String(i+1).padStart(2,'0')}.png`});}}
await b.close();})();
