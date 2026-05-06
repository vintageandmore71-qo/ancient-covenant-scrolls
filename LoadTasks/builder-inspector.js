
(function(){
  const state = { fileName: '', entries: [], summary: null, reportText: '' };
  const $ = (s) => document.querySelector(s);
  function setStatus(message, level='info') {
    const el = $('#builderVisibleStatus');
    if (el) { el.textContent = message; el.className = 'builder-visible-status status-' + level; }
    const badge = $('#builderInspectStatus');
    if (badge) { badge.textContent = message.length > 24 ? message.slice(0,24) : message; badge.className = 'badge ' + (level === 'error' ? 'red' : level === 'warn' ? 'orange' : level === 'success' ? 'green' : 'blue'); }
  }
  function escapeHtml(v){ return String(v||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function u16(v,o){ return v.getUint16(o,true); }
  function u32(v,o){ return v.getUint32(o,true); }
  function findEOCD(view){ for(let i=view.byteLength-22, min=Math.max(0, view.byteLength-65557); i>=min; i--){ if(u32(view,i)===0x06054b50) return i; } return -1; }
  function decode(bytes){ try { return new TextDecoder('utf-8').decode(bytes); } catch(e){ return Array.from(bytes).map(b=>String.fromCharCode(b)).join(''); } }
  function norm(p){ return String(p||'').replace(/\\/g,'/').replace(/^\/+/,''); }
  function type(path){ const l=String(path||'').toLowerCase(); if(/\.(png|jpg|jpeg|webp|gif|svg|avif)$/.test(l)) return l.includes('icon')||l.includes('favicon')?'icon':'image'; if(/\.(mp4|webm|mov|m4v|ogv)$/.test(l)) return 'video'; if(/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(l)) return 'audio'; if(/\.(html|htm)$/.test(l)) return 'html'; if(/\.css$/.test(l)) return 'css'; if(/\.(js|mjs)$/.test(l)) return 'js'; if(/\.(json|webmanifest)$/.test(l)) return 'json'; return 'other'; }
  function parseZip(buffer){
    const view = new DataView(buffer);
    const eocd = findEOCD(view);
    if(eocd < 0) throw new Error('ZIP directory not found.');
    const total = u16(view, eocd+10);
    const centralOffset = u32(view, eocd+16);
    let ptr = centralOffset;
    const entries = [];
    for(let i=0; i<total && ptr<view.byteLength; i++){
      if(u32(view,ptr)!==0x02014b50) break;
      const compressedSize = u32(view, ptr+20);
      const size = u32(view, ptr+24);
      const nameLen = u16(view, ptr+28);
      const extraLen = u16(view, ptr+30);
      const commentLen = u16(view, ptr+32);
      const nameStart = ptr+46;
      const name = norm(decode(new Uint8Array(buffer.slice(nameStart, nameStart+nameLen))));
      if(name && !name.endsWith('/')) entries.push({ path:name, name:name.split('/').pop(), size, compressedSize, type:type(name) });
      ptr = nameStart + nameLen + extraLen + commentLen;
    }
    return entries;
  }
  function root(paths){ const ix=paths.filter(p=>p.toLowerCase().endsWith('index.html')); if(!ix.length) return {path:'', message:'No index.html found.', nested:false}; const parts=ix[0].split('/'); if(parts.length===1) return {path:'/', message:'index.html is at the package root.', nested:false}; return {path:parts.slice(0,-1).join('/'), message:'index.html is inside a nested folder. Upload root may need review.', nested:true}; }
  function summary(fileName, entries){ const paths=entries.map(e=>e.path); const lower=paths.map(p=>p.toLowerCase()); const has=n=>lower.some(p=>p===n||p.endsWith('/'+n)); const count=t=>entries.filter(e=>e.type===t).length; return { fileName, totalFiles:entries.length, totalSize:entries.reduce((s,e)=>s+(e.size||0),0), root:root(paths), required:{index:has('index.html'), manifest:has('manifest.json')||has('manifest.webmanifest'), serviceWorker:has('service-worker.js')||has('sw.js'), assets:lower.some(p=>p.startsWith('assets/')||p.includes('/assets/')), icons:entries.some(e=>e.type==='icon'), css:entries.some(e=>e.type==='css'), js:entries.some(e=>e.type==='js')}, counts:{image:count('image'),video:count('video'),audio:count('audio'),icon:count('icon'),html:count('html'),css:count('css'),js:count('js'),json:count('json'),other:count('other')}}; }
  function bytes(n){ n=Number(n||0); if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
  function req(label, ok){ return `<div class="builder-requirement ${ok?'pass':'warn'}"><strong>${ok?'Passed':'Needs Review'}</strong><span>${escapeHtml(label)}</span></div>`; }
  function report(s){ const blockers=[]; if(!s.required.index) blockers.push('index.html not found.'); if(!s.required.manifest) blockers.push('manifest file not found.'); if(!s.required.serviceWorker) blockers.push('service worker not found.'); if(!s.required.icons) blockers.push('icons not found.'); if(s.root.nested) blockers.push('index.html appears inside a nested folder.'); return ['PWA Builder Inspector Report','',`Package: ${s.fileName}`,`Total files: ${s.totalFiles}`,`Total size: ${bytes(s.totalSize)}`,'','Detected root:',s.root.message,'','Media counts:',`Images: ${s.counts.image}`,`Videos: ${s.counts.video}`,`Audio: ${s.counts.audio}`,`Icons: ${s.counts.icon}`,'','Required file check:',`index.html: ${s.required.index?'Passed':'Needs Review'}`,`manifest: ${s.required.manifest?'Passed':'Needs Review'}`,`service worker: ${s.required.serviceWorker?'Passed':'Needs Review'}`,`assets folder: ${s.required.assets?'Passed':'Needs Review'}`,`icons: ${s.required.icons?'Passed':'Needs Review'}`,'','Top issue summary:',blockers.length?blockers.slice(0,3).map((b,i)=>(i+1)+'. '+b).join('\n'):'No critical package-structure blockers found by this inspector.','','Status:','Inspected only. No files were changed.'].join('\n'); }
  function render(){ const s=state.summary; if(!s) return; [['#builderTotalFiles',s.totalFiles],['#builderImageFiles',s.counts.image],['#builderVideoFiles',s.counts.video],['#builderAudioFiles',s.counts.audio],['#builderIconFiles',s.counts.icon],['#builderOtherFiles',s.counts.other]].forEach(([sel,val])=>{ const el=$(sel); if(el) el.textContent=val; }); const rf=$('#builderRequiredFiles'); if(rf) rf.innerHTML=[req('index.html',s.required.index),req('manifest.json or manifest.webmanifest',s.required.manifest),req('service-worker.js or sw.js',s.required.serviceWorker),req('assets folder',s.required.assets),req('icons',s.required.icons),req('CSS file',s.required.css),req('JavaScript file',s.required.js)].join(''); const rootBox=$('#builderRootSummary'); if(rootBox) rootBox.textContent=['Detected root: '+(s.root.path||'Not found'),s.root.message,s.root.nested?'Next step later: use flatten repair before deployment.':'Root placement looks clean.'].join('\n'); const tree=$('#builderFileTree'); if(tree) tree.innerHTML=state.entries.slice().sort((a,b)=>a.path.localeCompare(b.path)).map(e=>`<div class="file-tree-row file-type-${escapeHtml(e.type)}"><span>${escapeHtml(e.path)}</span><small>${escapeHtml(e.type)} · ${bytes(e.size||0)}</small></div>`).join(''); const rb=$('#builderInspectorReport'); if(rb) rb.textContent=state.reportText; }
  async function inspect(){ const input=$('#builderZipInput'); if(!input){ setStatus('ZIP input missing.', 'error'); return; } if(!input.files||!input.files[0]){ setStatus('Choose one ZIP package first.', 'warn'); return; } const file=input.files[0]; if(!file.name.toLowerCase().endsWith('.zip')){ setStatus('Choose a .zip file.', 'error'); return; } try{ setStatus('Reading ZIP file...', 'info'); const buffer=await file.arrayBuffer(); const entries=parseZip(buffer); const s=summary(file.name, entries); state.fileName=file.name; state.entries=entries; state.summary=s; state.reportText=report(s); render(); setStatus('Package inspected.', s.required.index?'success':'warn'); }catch(error){ console.error(error); setStatus('Inspection failed: '+(error.message||error), 'error'); const rb=$('#builderInspectorReport'); if(rb) rb.textContent='Inspection failed:\n'+(error.stack||error.message||error); } }
  function clear(){ state.fileName=''; state.entries=[]; state.summary=null; state.reportText=''; const input=$('#builderZipInput'); if(input) input.value=''; setStatus('Choose a ZIP package, then tap Inspect Package.', 'info'); ['#builderTotalFiles','#builderImageFiles','#builderVideoFiles','#builderAudioFiles','#builderIconFiles','#builderOtherFiles'].forEach(sel=>{ const el=$(sel); if(el) el.textContent='0'; }); const rf=$('#builderRequiredFiles'); if(rf) rf.textContent='Upload and inspect a ZIP to check required files.'; const rt=$('#builderRootSummary'); if(rt) rt.textContent='No package inspected yet.'; const tree=$('#builderFileTree'); if(tree) tree.textContent='Upload a ZIP and tap Inspect Package.'; const rb=$('#builderInspectorReport'); if(rb) rb.textContent='No report yet.'; }
  function download(){ if(!state.reportText){ setStatus('Inspect a package before downloading a report.', 'warn'); return; } const fileList=state.entries.map(e=>`- ${e.path} (${e.type}, ${bytes(e.size||0)})`).join('\n'); const blob=new Blob([state.reportText+'\n\nFile inventory:\n'+fileList],{type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Load_Tasks_PWA_Builder_Inventory_Report.md'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },300); }
  function bind(){ document.addEventListener('click', function(event){ if(event.target.closest('#builderInspectBtn,[data-builder-inspector-action="inspect"]')){ event.preventDefault(); event.stopPropagation(); inspect(); return false; } if(event.target.closest('#builderClearBtn,[data-builder-inspector-action="clear"]')){ event.preventDefault(); event.stopPropagation(); clear(); return false; } if(event.target.closest('#builderDownloadInventoryBtn,[data-builder-inspector-action="download"]')){ event.preventDefault(); event.stopPropagation(); download(); return false; } }, true); const input=$('#builderZipInput'); if(input) input.addEventListener('change',()=>{ const f=input.files&&input.files[0]; setStatus(f?'Selected: '+f.name:'Choose a ZIP package, then tap Inspect Package.', f?'info':'gray'); }); setStatus('Builder Inspector ready. Choose a ZIP package.', 'info'); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  window.LoadTasksBuilderInspector={inspect, clear, download};
})();
