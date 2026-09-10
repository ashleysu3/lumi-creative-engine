export const creativeLabHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>LUMI Creative Lab</title>
<style>
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#191919;background:#f7f4ef}
  *{box-sizing:border-box} body{margin:0} button,input,textarea{font:inherit}
  .shell{max-width:1500px;margin:auto;padding:28px}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:22px}
  h1{margin:0;font-family:Georgia,serif;font-size:40px}.sub{max-width:760px;color:#62605c;line-height:1.5;margin-top:8px}
  .badge{background:#fff;border:1px solid #ded9d1;border-radius:999px;padding:9px 14px;font-size:13px}
  .grid{display:grid;grid-template-columns:minmax(380px, .9fr) minmax(0,1.45fr);gap:20px}.panel{background:white;border:1px solid #e1ddd6;border-radius:18px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.035)}
  label{display:block;font-weight:700;font-size:13px;margin:15px 0 7px}.hint{font-size:12px;color:#78736c;margin:5px 0 0}
  input,textarea{width:100%;border:1px solid #d8d3cb;border-radius:11px;padding:11px;background:#fff} textarea{min-height:430px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45}
  .buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.primary{background:#191919;color:white;border:none;border-radius:11px;padding:12px 16px;font-weight:800;cursor:pointer}.secondary{background:#f2eee8;color:#191919;border:1px solid #ddd7cf;border-radius:11px;padding:12px 16px;font-weight:700;cursor:pointer}.primary:disabled,.secondary:disabled{opacity:.45;cursor:not-allowed}
  .status{font-size:13px;margin-top:12px;color:#605b54;white-space:pre-wrap}.error{color:#9b2c2c}.success{color:#26633f}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.card{border:1px solid #e1ddd6;border-radius:15px;padding:15px;background:#fff}.route{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#77716a}.card h3{font-family:Georgia,serif;font-size:24px;line-height:1.05;margin:9px 0}.meta{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.pill{font-size:11px;background:#f2eee8;border-radius:999px;padding:5px 8px}.copy{font-size:13px;line-height:1.45;color:#4c4945}.score{font-weight:800}.renderBtn{margin-top:12px;width:100%}.preview{margin-top:12px;background:#f3f0eb;border-radius:12px;overflow:hidden;min-height:80px;display:grid;place-items:center}.preview img{width:100%;height:auto;display:block}.preview iframe{border:0;width:100%;aspect-ratio:4/5;background:white}
  .empty{border:1px dashed #cec7bd;border-radius:15px;padding:42px;text-align:center;color:#77716a}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:900px){.grid{grid-template-columns:1fr}.top{display:block}.badge{display:inline-block;margin-top:12px}.row{grid-template-columns:1fr}}
</style>
</head>
<body><div class="shell">
<div class="top"><div><h1>LUMI Creative Lab</h1><div class="sub">A standalone testing room for the new creative engine. Generate concepts, inspect the strategy, and render a selected creative without touching the live LUMI app.</div></div><div class="badge" id="health">Checking engine…</div></div>
<div class="grid">
  <section class="panel">
    <div class="row"><div><label>Model mode</label><select id="mode" style="width:100%;padding:11px;border:1px solid #d8d3cb;border-radius:11px"><option value="auto">AI when configured</option><option value="deterministic">Deterministic only</option></select></div><div><label>Engine token (optional)</label><input id="token" type="password" placeholder="Only if you set LUMI_ENGINE_TOKEN" /></div></div>
    <label>Optional founder/product image</label><input id="image" type="file" accept="image/*"/><div class="hint">For quick testing, this is converted in your browser and used as the uploaded hero asset. It is not saved by this page.</div>
    <label>Creative-engine input</label><textarea id="json"></textarea>
    <div class="buttons"><button class="primary" id="generate">Generate concepts</button><button class="secondary" id="reset">Reset LUMI sample</button></div>
    <div id="status" class="status"></div>
  </section>
  <section class="panel"><div id="results" class="empty">Generate a set and the concept cards will appear here.</div></section>
</div></div>
<script>
const sample={
 requestId:'lumi-lab-'+Date.now(),
 offer:{name:'Ads by Lumi',url:'https://www.adsbylumi.com',summary:'AI creative strategy software built specifically for Meta advertisers. It turns an actual offer into audience psychology, strategic angles, hooks, scripts, B-roll ideas and production-ready creative directions.',offerType:'SaaS software',uniqueMechanism:'LUMI starts with the actual offer and buyer psychology, then builds strategic creative directions instead of generic AI idea lists.',proof:[],claimsAllowed:[],claimsProhibited:['guaranteed performance','guaranteed ROAS']},
 audience:{description:'Business owners, marketers and Meta advertisers who know they need better ad creative but struggle to know what to make and are tired of generic AI output.',awarenessLevel:'solution aware',desires:['know exactly what ads to make','produce stronger creative faster','turn strategy into production-ready ideas'],pains:['staring at a blank page','generic AI ad ideas','making more content without a clear strategic reason'],objections:['AI creative all looks the same','I already have ChatGPT','I do not need another complicated ad tool'],customerLanguage:['What am I supposed to make ads about?','I need ideas that actually fit my offer.']},
 brand:{colors:{primary:['#191919'],secondary:['#f2eee8'],accent:['#d977a8'],background:['#ffffff'],prohibited:[]},typography:{headlineFamily:'Georgia',bodyFamily:'Inter',allowedWeights:[400,600,700],notes:['Editorial, elevated, intelligent']},photography:{founderLed:false,styleNotes:['editorial, real, premium SaaS without generic corporate stock'],avoid:['generic smiling laptop stock']},logoAssetIds:[],motifs:['subtle editorial rules','selective handwritten annotation'],avoid:['generic AI brains','robots','rocket icons','floating laptop mockups','generic SaaS gradients']},
 mediaAssets:[],
 angles:[
  {id:'angle-1',name:'The Blank Page Problem',coreThesis:'The hard part is not making an ad. It is knowing what the ad should actually say and show.',customerTruth:'You can open Canva or ChatGPT all day and still not know which creative idea deserves to be made.'},
  {id:'angle-2',name:'Generic AI Is Not Strategy',coreThesis:'More AI-generated ideas are not useful when they are disconnected from the actual offer and buyer psychology.',customerTruth:'You do not need 100 random hooks. You need the right strategic directions.'},
  {id:'angle-3',name:'From Offer To Production Plan',coreThesis:'A URL should be enough to turn the offer into a complete Meta creative system.',customerTruth:'You want to go from what do I make to a concrete shoot-and-design plan.'}
 ],requestedCreativeCount:8,preferredFormats:[],excludedFormats:[]
};
let lastInput=null,lastOutput=null;
const $=id=>document.getElementById(id);
function reset(){sample.requestId='lumi-lab-'+Date.now();$('json').value=JSON.stringify(sample,null,2);$('results').className='empty';$('results').textContent='Generate a set and the concept cards will appear here.';$('status').textContent='';lastInput=null;lastOutput=null}
function headers(){const h={'content-type':'application/json','x-lumi-model-mode':$('mode').value};const t=$('token').value.trim();if(t)h.authorization='Bearer '+t;return h}
async function health(){try{const r=await fetch('/health');const j=await r.json();$('health').textContent=j.ok?'Engine online · '+(j.modelProviderConfigured?'AI on':'deterministic'):'Engine unavailable'}catch{$('health').textContent='Engine unavailable'}}
async function fileData(){const f=$('image').files[0];if(!f)return null;return await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(f)})}
async function generate(){
 $('generate').disabled=true;$('status').className='status';$('status').textContent='Generating creative routes…';
 try{const input=JSON.parse($('json').value);const data=await fileData();if(data){input.brand.photography.founderLed=true;input.mediaAssets=[{id:'lab-upload',type:'image',url:data,founderPresent:true,faceVisible:true,tags:['founder','uploaded','lab'],textOverlaySuitability:85,trustPotential:95,orientation:'portrait',segments:[]}]}lastInput=input;
 const r=await fetch('/v1/creative/generate',{method:'POST',headers:headers(),body:JSON.stringify(input)});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.message||j.error||'Generation failed');lastOutput=j.data;renderCards(j.data);$('status').className='status success';$('status').textContent='Generated '+j.data.concepts.length+' concepts with engine v'+j.data.engineVersion+(j.data.warnings?.length?'\n'+j.data.warnings.join('\n'):'');
 }catch(e){$('status').className='status error';$('status').textContent=e.message||String(e)}finally{$('generate').disabled=false}}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderCards(out){const root=$('results');root.className='cards';root.innerHTML='';out.concepts.forEach((c,i)=>{const el=document.createElement('article');el.className='card';el.innerHTML='<div class="route">'+escapeHtml(c.route.archetypeId)+'</div><h3>'+escapeHtml(c.brief.headline)+'</h3><div class="meta"><span class="pill">'+escapeHtml(c.route.format)+'</span><span class="pill">'+escapeHtml(c.route.productionTreatmentId)+'</span><span class="pill">'+escapeHtml(c.route.styleId)+'</span><span class="pill score">QA '+escapeHtml(c.qa.qualityScore)+'</span></div><div class="copy">'+escapeHtml(c.brief.supportingCopy||c.route.singleBigIdea)+'</div><div class="copy" style="margin-top:8px"><b>Media:</b> '+escapeHtml(c.mediaMatch.source)+' · '+escapeHtml(c.mediaMatch.reason)+'</div><button class="primary renderBtn">Render this creative</button><div class="preview" id="preview-'+i+'"><span class="hint">Not rendered yet</span></div>';el.querySelector('button').onclick=()=>renderOne(i,el.querySelector('button'));root.appendChild(el)})}
async function renderOne(i,btn){if(!lastInput||!lastOutput)return;const c=lastOutput.concepts[i];btn.disabled=true;btn.textContent='Rendering…';const p=$('preview-'+i);p.innerHTML='<span class="hint">Composing creative…</span>';try{const r=await fetch('/v1/creative/render',{method:'POST',headers:headers(),body:JSON.stringify({creativeId:c.route.id,input:lastInput,renderPlan:c.renderPlan})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.message||j.error||'Render failed');const d=j.data;if(d.kind==='static'){p.innerHTML='<img alt="Rendered creative" src="'+escapeHtml(d.flattenedAsset.url)+'"/>'}else if(d.kind==='carousel'){p.innerHTML='';d.flattenedAssets.forEach(a=>{const img=document.createElement('img');img.src=a.url;p.appendChild(img)})}else{p.innerHTML='<div style="padding:18px;text-align:left"><b>Video production plan ready.</b><br><br>'+escapeHtml(d.productionSpec?.beats?.map(b=>b.purpose+': '+b.visual).join('\n')||'See response data.')+'</div>'}btn.textContent='Render again'}catch(e){p.innerHTML='<span class="error">'+escapeHtml(e.message||String(e))+'</span>';btn.textContent='Try render again'}finally{btn.disabled=false}}
$('generate').onclick=generate;$('reset').onclick=reset;reset();health();
</script>
</body></html>`;
