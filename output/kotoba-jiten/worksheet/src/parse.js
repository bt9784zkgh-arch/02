const fs=require('fs');
const md=fs.readFileSync('/home/user/02/output/kotoba-jiten/worksheet/worksheet-plan.md','utf8');
const arts=s=>(s.match(/`(m-[a-z0-9-]+)`/g)||[]).map(x=>x.slice(1,-1));
const cells=l=>{l=l.trim().replace(/^\||\|$/g,'');const o=[];let d=0,c='';for(const ch of l){if(ch==='{')d++;if(ch==='}')d--;if(ch==='|'&&!d){o.push(c.trim());c=''}else c+=ch}o.push(c.trim());return o};
const parts=md.split(/^### ステージ(\d)「(.+?)」（(.+?)）\s*$/m);
const stages=[];
for(let i=1;i<parts.length;i+=4){
  const n=+parts[i], word=parts[i+1], meta=parts[i+2]; let body=parts[i+3].split(/^---|^## 3/m)[0];
  const st={n,word,color:meta.match(/#[0-9A-F]{6}/)[0],colorName:meta.split(' ')[0]};
  const sec=name=>{const m=body.split(/^\*\*(.+?)\*\*.*$/m);for(let k=1;k<m.length;k+=2)if(m[k]===name)return m[k+1];return ''};
  const intro=sec('はじめに');
  st.trace=intro.match(/なぞる ことば: (.+)$/m)[1].replace(/（字数.*$/,'').trim();
  st.traceSmall=/字数が多い/.test(intro);
  st.imi=intro.match(/いみ: (.+)$/m)[1].trim();
  const nk=intro.match(/3つの なかま: (.+)$/m)[1].split('／');
  st.nakama=nk.map(s=>({label:s.replace(/^[●▲■]\s*/,'').replace(/（`.*$/,'').trim(),art:arts(s)}));
  const ex=intro.match(/小さな見本: カード「(.+?)」（(.+?)）に、点線の雲「(.+?)」.*下に「(.+?)」/);
  if(ex) st.sample={text:ex[1],art:arts(ex[2]),cloud:ex[3],note:ex[4]};
  const tab=t=>t.split('\n').filter(l=>/^\|/.test(l)).slice(2).map(cells);
  st.m1=tab(sec('もんだい1')).map(c=>({pos:c[0],text:c[1],ok:c[2].startsWith('〇'),rei:/れい/.test(c[2]),art:arts(c[3])}));
  st.m2=tab(sec('もんだい2')).map(c=>{const L=c[0].match(/^(\d) (.+)$/),R=c[3].match(/^(\S) (.+)$/);return {lk:L[1],ltext:L[2],lart:arts(c[1]),ans:c[2][0],rei:/れい/.test(c[2]),rk:R[1],rtext:R[2],rart:arts(c[4])}});
  const s3=sec('もんだい3');
  const sc=s3.match(/ばめん: (.+)$/m)[1];
  st.m3={scene:sc.replace(/（`.*$/,'').trim(),art:arts(sc.split('点線')[0]),cloud:(sc.match(/点線の雲「(.+?)」/)||[])[1],
    opts:tab(s3).map(c=>({pos:c[0],text:c[1],ok:c[2]==='〇',art:arts(c[3])})),hint:s3.match(/ヒント: (.+)$/m)[1].trim()};
  const s4=sec('もんだい4');
  st.m4={rei:s4.match(/れい: (.+?)（した）/)[1].trim(),extra:(s4.match(/指示の下に1行たす: 「(.+?)」/)||[])[1],
    cards:s4.match(/選べる カード: (.+)$/m)[1].split(/）／/).map(s=>{const m=s.match(/^(.+?)（(.+?)・([A-Z]+\d+)）?$/);return {text:m[1].trim(),art:arts(m[2]),id:m[3]}}),
    clouds:((s4.match(/雲をつけてよい.*?: (.+)$/m)||[])[1]||'').match(/「(.+?)」/g)};
  if(st.m4.clouds) st.m4.clouds=st.m4.clouds.map(s=>s.slice(1,-1));
  stages.push(st);
}
fs.writeFileSync('data.json',JSON.stringify(stages,null,1));
console.log(stages.length);
