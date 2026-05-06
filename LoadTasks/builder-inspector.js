
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
  function bind(){ document.addEventListener('click', function(event){ if(event.target.closest('#builderInspectBtn,[data-builder-inspector-action="inspect"]')){ event.preventDefault(); event.stopPropagation(); inspect(); return false; } if(event.target.closest('#builderClearBtn,[data-builder-inspector-action="clear"]')){ event.preventDefault(); event.stopPropagation(); clear(); return false; } if(event.target.closest('#builderDownloadInventoryBtn,#builderDownloadInventoryBtnBottom,#builderDownloadInventoryBtnTop,[data-builder-inspector-action="download"]')){ event.preventDefault(); event.stopPropagation(); download(); return false; } }, true); const input=$('#builderZipInput'); if(input) input.addEventListener('change',()=>{ const f=input.files&&input.files[0]; setStatus(f?'Selected: '+f.name:'Choose a ZIP package, then tap Inspect Package.', f?'info':'gray'); }); setStatus('Builder Inspector ready. Choose a ZIP package.', 'info'); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  window.LoadTasksBuilderInspector={inspect, clear, download};
})();


/* v5.11 PWA Builder Metadata Viewer extension */
(function(){
  if (!window.LoadTasksBuilderInspector) {
    window.LoadTasksBuilderInspector = {};
  }

  const state = window.__LoadTasksMetadataState = {
    manifestPath: '',
    manifest: null,
    metadataReport: '',
    lastError: ''
  };

  function $(selector) { return document.querySelector(selector); }
  function safe(selector, value) {
    const el = $(selector);
    if (el) el.textContent = String(value ?? 'Not found');
  }
  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }
  function setMetaStatus(message, level='blue') {
    const el = $('#builderMetadataStatus');
    if (el) {
      el.textContent = message;
      el.className = 'badge ' + level;
    }
  }
  function bytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function readUInt16(view, offset) { return view.getUint16(offset, true); }
  function readUInt32(view, offset) { return view.getUint32(offset, true); }

  function findEOCD(view) {
    for (let i = view.byteLength - 22, min = Math.max(0, view.byteLength - 65557); i >= min; i--) {
      if (readUInt32(view, i) === 0x06054b50) return i;
    }
    return -1;
  }

  function decode(bytes) {
    try { return new TextDecoder('utf-8').decode(bytes); }
    catch (e) { return Array.from(bytes).map(b => String.fromCharCode(b)).join(''); }
  }

  function norm(path) {
    return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');
  }

  function parseCentralDirectory(buffer) {
    const view = new DataView(buffer);
    const eocd = findEOCD(view);
    if (eocd < 0) throw new Error('ZIP directory not found.');
    const total = readUInt16(view, eocd + 10);
    const centralOffset = readUInt32(view, eocd + 16);
    let ptr = centralOffset;
    const entries = [];
    for (let i = 0; i < total && ptr < view.byteLength; i++) {
      if (readUInt32(view, ptr) !== 0x02014b50) break;
      const compression = readUInt16(view, ptr + 10);
      const compressedSize = readUInt32(view, ptr + 20);
      const size = readUInt32(view, ptr + 24);
      const nameLen = readUInt16(view, ptr + 28);
      const extraLen = readUInt16(view, ptr + 30);
      const commentLen = readUInt16(view, ptr + 32);
      const localHeaderOffset = readUInt32(view, ptr + 42);
      const nameStart = ptr + 46;
      const path = norm(decode(new Uint8Array(buffer.slice(nameStart, nameStart + nameLen))));
      if (path && !path.endsWith('/')) {
        entries.push({ path, compression, compressedSize, size, localHeaderOffset });
      }
      ptr = nameStart + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function extractTextFile(buffer, entry) {
    const view = new DataView(buffer);
    const local = entry.localHeaderOffset;
    if (readUInt32(view, local) !== 0x04034b50) throw new Error('Local file header not found for ' + entry.path);
    const nameLen = readUInt16(view, local + 26);
    const extraLen = readUInt16(view, local + 28);
    const dataStart = local + 30 + nameLen + extraLen;
    const dataEnd = dataStart + entry.compressedSize;
    const raw = buffer.slice(dataStart, dataEnd);

    if (entry.compression === 0) {
      return new TextDecoder('utf-8').decode(raw);
    }

    if (entry.compression === 8 && typeof DecompressionStream !== 'undefined') {
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const decompressed = await new Response(stream).arrayBuffer();
      return new TextDecoder('utf-8').decode(decompressed);
    }

    throw new Error('Cannot read compressed manifest in this browser yet. Compression method: ' + entry.compression);
  }

  function findManifestEntry(entries) {
    return entries.find(e => /(^|\/)manifest\.(json|webmanifest)$/i.test(e.path)) ||
           entries.find(e => /(^|\/)manifest\.json$/i.test(e.path));
  }

  function findServiceWorker(entries) {
    return entries.find(e => /(^|\/)(service-worker|sw)\.js$/i.test(e.path));
  }

  function findIndex(entries) {
    return entries.find(e => /(^|\/)index\.html$/i.test(e.path));
  }

  function renderMetadata(manifest, manifestPath, entries) {
    safe('#metaAppName', manifest.name || 'Missing');
    safe('#metaShortName', manifest.short_name || 'Missing');
    safe('#metaDescription', manifest.description || 'Missing');
    safe('#metaThemeColor', manifest.theme_color || 'Missing');
    safe('#metaBackgroundColor', manifest.background_color || 'Missing');
    safe('#metaStartUrl', manifest.start_url || 'Missing');
    safe('#metaDisplayMode', manifest.display || 'Missing');
    safe('#metaIconCount', Array.isArray(manifest.icons) ? manifest.icons.length : 0);

    const pathBox = $('#metaManifestPath');
    if (pathBox) {
      pathBox.textContent = [
        'Manifest path: ' + manifestPath,
        'Readable: yes',
        'Status: metadata displayed. No files changed.'
      ].join('\n');
    }

    const icons = $('#metaIconList');
    if (icons) {
      if (Array.isArray(manifest.icons) && manifest.icons.length) {
        icons.innerHTML = manifest.icons.map(icon => `
          <div class="builder-requirement pass">
            <strong>${escapeHtml(icon.sizes || 'size missing')}</strong>
            <span>${escapeHtml(icon.src || 'src missing')} · ${escapeHtml(icon.type || 'type missing')}</span>
          </div>
        `).join('');
      } else {
        icons.innerHTML = '<div class="builder-requirement warn"><strong>Needs Review</strong><span>No icons array found in manifest.</span></div>';
      }
    }

    const sw = findServiceWorker(entries);
    const index = findIndex(entries);
    const notes = [];
    notes.push(index ? 'index.html found: ' + index.path : 'index.html not found.');
    notes.push(sw ? 'service worker found: ' + sw.path : 'service worker not found.');
    notes.push(manifest.start_url ? 'start_url: ' + manifest.start_url : 'start_url missing.');
    notes.push(manifest.display ? 'display mode: ' + manifest.display : 'display mode missing.');
    notes.push('Cloudflare/GitHub readiness: root path still depends on where index.html is located.');

    const ready = $('#metaReadinessNotes');
    if (ready) ready.textContent = notes.join('\n');

    state.manifestPath = manifestPath;
    state.manifest = manifest;
    state.metadataReport = [
      'PWA Metadata Report',
      '',
      'Manifest path: ' + manifestPath,
      'App name: ' + (manifest.name || 'Missing'),
      'Short name: ' + (manifest.short_name || 'Missing'),
      'Description: ' + (manifest.description || 'Missing'),
      'Theme color: ' + (manifest.theme_color || 'Missing'),
      'Background color: ' + (manifest.background_color || 'Missing'),
      'Start URL: ' + (manifest.start_url || 'Missing'),
      'Display: ' + (manifest.display || 'Missing'),
      'Icons: ' + (Array.isArray(manifest.icons) ? manifest.icons.length : 0),
      '',
      'Readiness notes:',
      ...notes.map(n => '- ' + n),
      '',
      'Status: Read-only metadata viewer. No files changed.'
    ].join('\n');
  }

  function renderMetadataUnavailable(message, manifestPath = '') {
    safe('#metaAppName', 'Not available');
    safe('#metaShortName', 'Not available');
    safe('#metaDescription', 'Not available');
    safe('#metaThemeColor', 'Not available');
    safe('#metaBackgroundColor', 'Not available');
    safe('#metaStartUrl', 'Not available');
    safe('#metaDisplayMode', 'Not available');
    safe('#metaIconCount', 'Not available');

    const pathBox = $('#metaManifestPath');
    if (pathBox) {
      pathBox.textContent = [
        manifestPath ? 'Manifest path: ' + manifestPath : 'Manifest path: not found',
        'Readable: no',
        'Reason: ' + message
      ].join('\n');
    }

    const ready = $('#metaReadinessNotes');
    if (ready) ready.textContent = 'Metadata could not be read. The file inspector still works. No files were changed.';

    setMetaStatus('Needs Review', 'orange');
    state.metadataReport = 'PWA Metadata Report\n\nMetadata unavailable.\nReason: ' + message + '\n\nStatus: No files changed.';
  }

  async function inspectMetadataFromSelectedZip() {
    const input = document.querySelector('#builderZipInput');
    if (!input || !input.files || !input.files[0]) {
      setMetaStatus('Choose ZIP first', 'orange');
      renderMetadataUnavailable('Choose a ZIP package first.');
      return;
    }

    try {
      setMetaStatus('Reading', 'blue');
      const buffer = await input.files[0].arrayBuffer();
      const entries = parseCentralDirectory(buffer);
      const manifestEntry = findManifestEntry(entries);

      if (!manifestEntry) {
        renderMetadataUnavailable('No manifest.json or manifest.webmanifest found.');
        return;
      }

      let text;
      try {
        text = await extractTextFile(buffer, manifestEntry);
      } catch (error) {
        renderMetadataUnavailable(error.message || String(error), manifestEntry.path);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        renderMetadataUnavailable('Manifest exists but JSON could not be parsed.', manifestEntry.path);
        return;
      }

      renderMetadata(parsed, manifestEntry.path, entries);
      setMetaStatus('Read', 'green');
    } catch (error) {
      renderMetadataUnavailable(error.message || String(error));
    }
  }

  function downloadMetadataReport() {
    if (!state.metadataReport) {
      renderMetadataUnavailable('Inspect a ZIP package before downloading metadata.');
    }
    const blob = new Blob([state.metadataReport || 'No metadata report yet.'], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Load_Tasks_PWA_Metadata_Report.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }

  document.addEventListener('click', function(event) {
    const inspect = event.target.closest('#builderInspectBtn, [data-builder-inspector-action="inspect"]');
    if (inspect) {
      setTimeout(inspectMetadataFromSelectedZip, 150);
    }

    const download = event.target.closest('#builderDownloadMetadataBtn,#builderDownloadMetadataBtnBottom,#builderDownloadMetadataBtnTop,[data-builder-inspector-action="download-metadata"]');
    if (download) {
      event.preventDefault();
      event.stopPropagation();
      downloadMetadataReport();
      return false;
    }
  }, true);

  const input = document.querySelector('#builderZipInput');
  if (input) {
    input.addEventListener('change', () => {
      setMetaStatus('Not read', 'gray');
    });
  }
})();


/* v5.13 PWA Builder Readiness Summary */
(function(){
  function $(selector) { return document.querySelector(selector); }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = String(value);
  }

  function setBadge(selector, text, level) {
    const el = $(selector);
    if (el) {
      el.textContent = text;
      el.className = 'badge ' + (level || 'gray');
    }
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }

  function parseInspectorReportText() {
    const box = $('#builderInspectorReport');
    const text = box ? box.textContent || '' : '';
    return {
      text,
      hasReport: text.includes('PWA Builder Inspector Report'),
      nested: /nested folder/i.test(text),
      missingIndex: /index\.html not found/i.test(text) || /index\.html:\s*Needs Review/i.test(text),
      missingManifest: /manifest file not found/i.test(text) || /manifest:\s*Needs Review/i.test(text),
      missingServiceWorker: /service worker not found/i.test(text) || /service worker:\s*Needs Review/i.test(text),
      missingIcons: /icons not found/i.test(text) || /icons:\s*Needs Review/i.test(text),
      imageCount: numberAfter(text, 'Images:'),
      videoCount: numberAfter(text, 'Videos:'),
      audioCount: numberAfter(text, 'Audio:'),
      iconCount: numberAfter(text, 'Icons:'),
      totalFiles: numberAfter(text, 'Total files:'),
      totalSizeText: lineAfter(text, 'Total size:')
    };
  }

  function numberAfter(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(escaped + '\\s*([0-9]+)', 'i'));
    return match ? Number(match[1]) : 0;
  }

  function lineAfter(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(escaped + '\\s*([^\\n]+)', 'i'));
    return match ? match[1].trim() : 'Not found';
  }

  function buildIssues(data) {
    const issues = [];

    if (!data.hasReport) {
      issues.push({
        level: 'gray',
        title: 'No package inspected',
        detail: 'Upload one ZIP and tap Inspect Package.',
        next: 'Inspect one package first.'
      });
      return issues;
    }

    if (data.missingIndex) {
      issues.push({
        level: 'red',
        title: 'Missing index.html',
        detail: 'The package may not open as a site or PWA.',
        next: 'Add or restore index.html before deployment.'
      });
    }

    if (data.missingManifest) {
      issues.push({
        level: 'orange',
        title: 'Missing manifest',
        detail: 'The app may not install properly as a PWA.',
        next: 'Add manifest.json or manifest.webmanifest.'
      });
    }

    if (data.missingServiceWorker) {
      issues.push({
        level: 'yellow',
        title: 'Missing service worker',
        detail: 'Offline behavior is not proven.',
        next: 'Add service-worker.js when offline support is required.'
      });
    }

    if (data.missingIcons) {
      issues.push({
        level: 'yellow',
        title: 'Missing icons',
        detail: 'Home Screen or app icons may not appear correctly.',
        next: 'Add app icons and confirm manifest icon paths.'
      });
    }

    if (data.nested) {
      issues.push({
        level: 'yellow',
        title: 'Nested app root',
        detail: 'index.html is inside a folder, so upload root may need review.',
        next: 'Use flatten/root readiness check before Cloudflare or GitHub upload.'
      });
    }

    if (data.videoCount > 0 || data.audioCount > 0) {
      issues.push({
        level: 'blue',
        title: 'Media-rich package',
        detail: 'This package contains video or audio assets.',
        next: 'Use media path inspection before editing or deployment.'
      });
    }

    if (!issues.length) {
      issues.push({
        level: 'green',
        title: 'No critical structure blockers found',
        detail: 'The inspector did not find missing required PWA files.',
        next: 'Review metadata before editing.'
      });
    }

    return issues.slice(0, 3);
  }

  function renderReadiness() {
    const data = parseInspectorReportText();
    const issues = buildIssues(data);

    const severe = issues.find(i => i.level === 'red') || issues.find(i => i.level === 'orange') || issues.find(i => i.level === 'yellow') || issues[0];
    const status = !data.hasReport ? { label: 'Not inspected', level: 'gray' } :
      severe.level === 'red' ? { label: 'Not ready', level: 'red' } :
      severe.level === 'orange' ? { label: 'Needs repair', level: 'orange' } :
      severe.level === 'yellow' ? { label: 'Needs review', level: 'yellow' } :
      { label: 'Ready for next review', level: 'green' };

    setBadge('#builderReadinessStatus', status.label, status.level);
    setText('#builderReadinessLabel', status.label);
    setText('#builderNextBestAction', severe.next || 'Review metadata.');

    const top = $('#builderTopIssues');
    if (top) {
      top.innerHTML = issues.map(issue => `
        <div class="builder-issue-row issue-${esc(issue.level)}">
          <strong>${esc(issue.title)}</strong>
          <span>${esc(issue.detail)}</span>
          <small>Next: ${esc(issue.next)}</small>
        </div>
      `).join('');
    }

    const upload = $('#builderUploadReadiness');
    if (upload) {
      const notes = [
        'Readiness status: ' + status.label,
        'Total files: ' + (data.totalFiles || 'Not found'),
        'Package size: ' + (data.totalSizeText || 'Not found'),
        'Images: ' + data.imageCount,
        'Videos: ' + data.videoCount,
        'Audio: ' + data.audioCount,
        'Icons: ' + data.iconCount,
        data.nested ? 'Upload root note: index.html appears inside a nested folder.' : 'Upload root note: no nested root warning from inspector.',
        'Safe rule: No files were changed.'
      ];
      upload.textContent = notes.join('\n');
    }
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('#builderInspectBtn, [data-builder-inspector-action="inspect"]')) {
      setTimeout(renderReadiness, 350);
      setTimeout(renderReadiness, 900);
    }
  }, true);

  const observerTarget = $('#builderInspectorReport');
  if (observerTarget && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(renderReadiness);
    observer.observe(observerTarget, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderReadiness);
  } else {
    renderReadiness();
  }

  window.LoadTasksBuilderReadiness = { renderReadiness };
})();


/* v5.14 PWA Builder Metadata Draft Plan */
(function(){
  const KEY = 'loadTasksMetadataDraftPlanV514';

  function $(selector) { return document.querySelector(selector); }

  function val(selector) {
    const el = $(selector);
    return el ? String(el.value || '').trim() : '';
  }

  function setVal(selector, value) {
    const el = $(selector);
    if (el) el.value = value || '';
  }

  function text(selector, value) {
    const el = $(selector);
    if (el) el.textContent = String(value || '');
  }

  function badge(textValue, level) {
    const el = $('#builderMetadataDraftStatus');
    if (el) {
      el.textContent = textValue;
      el.className = 'badge ' + (level || 'gray');
    }
  }

  function currentMetadataText(selector) {
    const el = $(selector);
    return el ? String(el.textContent || '').trim() : '';
  }

  function buildDraft() {
    return {
      appName: val('#draftAppName'),
      shortName: val('#draftShortName'),
      description: val('#draftDescription'),
      themeColor: val('#draftThemeColor'),
      backgroundColor: val('#draftBackgroundColor'),
      startUrl: val('#draftStartUrl'),
      displayMode: val('#draftDisplayMode'),
      createdAt: new Date().toISOString(),
      source: {
        appName: currentMetadataText('#metaAppName'),
        shortName: currentMetadataText('#metaShortName'),
        description: currentMetadataText('#metaDescription'),
        themeColor: currentMetadataText('#metaThemeColor'),
        backgroundColor: currentMetadataText('#metaBackgroundColor'),
        startUrl: currentMetadataText('#metaStartUrl'),
        displayMode: currentMetadataText('#metaDisplayMode')
      }
    };
  }

  function draftHasChanges(draft) {
    return ['appName','shortName','description','themeColor','backgroundColor','startUrl','displayMode'].some(key => draft[key]);
  }

  function draftReport(draft) {
    const rows = [
      ['App name', draft.source.appName, draft.appName],
      ['Short name', draft.source.shortName, draft.shortName],
      ['Description', draft.source.description, draft.description],
      ['Theme color', draft.source.themeColor, draft.themeColor],
      ['Background color', draft.source.backgroundColor, draft.backgroundColor],
      ['Start URL', draft.source.startUrl, draft.startUrl],
      ['Display mode', draft.source.displayMode, draft.displayMode]
    ];

    const changed = rows.filter(row => row[2]);
    const lines = [
      'PWA Metadata Draft Change Plan',
      '',
      'Status: Draft only. No ZIP files changed.',
      'Created: ' + draft.createdAt,
      '',
      'Proposed changes:'
    ];

    if (!changed.length) {
      lines.push('No draft changes entered yet.');
    } else {
      changed.forEach(row => {
        lines.push('- ' + row[0] + ':');
        lines.push('  Current: ' + (row[1] || 'Not read'));
        lines.push('  Draft: ' + row[2]);
      });
    }

    lines.push('', 'Next safe step: review this plan before adding any edit/apply function.');
    return lines.join('\n');
  }

  function renderDraft(draft) {
    const box = $('#metadataDraftPreview');
    if (box) box.textContent = draftReport(draft);
    badge(draftHasChanges(draft) ? 'Draft saved' : 'Draft only', draftHasChanges(draft) ? 'blue' : 'gray');
  }

  function saveDraft() {
    const draft = buildDraft();
    localStorage.setItem(KEY, JSON.stringify(draft));
    renderDraft(draft);
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setVal('#draftAppName', draft.appName);
      setVal('#draftShortName', draft.shortName);
      setVal('#draftDescription', draft.description);
      setVal('#draftThemeColor', draft.themeColor);
      setVal('#draftBackgroundColor', draft.backgroundColor);
      setVal('#draftStartUrl', draft.startUrl);
      setVal('#draftDisplayMode', draft.displayMode);
      renderDraft(draft);
    } catch (error) {
      localStorage.removeItem(KEY);
    }
  }

  function clearDraft() {
    ['#draftAppName','#draftShortName','#draftDescription','#draftThemeColor','#draftBackgroundColor','#draftStartUrl','#draftDisplayMode'].forEach(selector => setVal(selector, ''));
    localStorage.removeItem(KEY);
    text('#metadataDraftPreview', 'No draft plan saved yet.');
    badge('Draft only', 'gray');
  }

  function downloadDraft() {
    const draft = buildDraft();
    const content = draftReport(draft);
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Load_Tasks_Metadata_Draft_Change_Plan.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 300);
  }

  document.addEventListener('click', function(event) {
    if (event.target.closest('#saveMetadataDraftBtn')) {
      event.preventDefault();
      saveDraft();
      return;
    }
    if (event.target.closest('#clearMetadataDraftBtn')) {
      event.preventDefault();
      clearDraft();
      return;
    }
    if (event.target.closest('#downloadMetadataDraftBtn')) {
      event.preventDefault();
      downloadDraft();
      return;
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDraft);
  } else {
    loadDraft();
  }

  window.LoadTasksMetadataDraft = { saveDraft, clearDraft, downloadDraft, buildDraft };
})();
