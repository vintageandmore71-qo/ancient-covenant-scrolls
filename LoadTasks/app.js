(function () {
  'use strict';

  const STORE_KEY = 'loadTasksWorkspaceV2';
  const SESSION_FILES = new Map();

  const PROJECT_TYPES = [
    'Load Main', 'LoadPlay', 'LoadStudio', 'Load Tasks', 'Standalone Book PWA',
    'AI Editor', 'Voice Tool', 'Safe Player', 'Browser Extension or Load Browser Concept',
    'Mock User or Test Mode', 'GitHub or Deployment', 'Other'
  ];

  const MASTER_CHECKLIST = {
    'Load Main': ['opens PWA projects like real apps', 'opens HTML without raw code', 'offline file support', 'media playback', 'book tools', 'import export', 'splash page', 'top toolbar', 'hard refresh', 'diagnostics'],
    'LoadPlay': ['streaming catalog rows', 'creator upload', 'viewer sign in', 'developer sign in', 'subscriber pages', 'YouTube compliant channel support', 'profanity guardrails', 'nudity guardrails', 'test mode', 'mock subscribers', 'red accent replaced only when requested', 'API key area'],
    'LoadStudio': ['scene cards', 'timeline playback', 'character generator', 'character library', 'voice manipulation', 'wardrobe system', 'lighting filters', 'marketplace structure', 'AI image generation', 'provider fallback', 'package export', 'reopen editable package', 'diagnostics'],
    'Load Tasks': ['splash page first screen', 'PWA validator', 'task extractor', 'false positive detector', 'fix studio', 'version control', 'rollback export', 'developer handoff', 'GitHub export', 'dyslexia friendly mode'],
    'Standalone Book PWA': ['real standalone PWA', 'cover image included', 'full text included', 'images included', 'charts included when promised', 'quizzes functional', 'manifest', 'service worker', 'offline cache', 'navigation works'],
    'Mock User or Test Mode': ['internal test mode label', 'synthetic profiles', 'synthetic likes', 'synthetic watch history', 'export demo data', 'reset demo data', 'no fake testimonials', 'non human profiles allowed'],
    'AI Editor': ['provider key area', 'provider fallback', 'image file proof', 'no false image generation claims', 'prompt history', 'asset export'],
    'GitHub or Deployment': ['GitHub-ready zip', 'commit message', 'deploy checklist', 'GitHub Pages path check', 'rollback zip', 'optional direct push']
  };

  const CLAIM_PATTERNS = [
    { label: 'Complete build claim', pattern: /\b(complete|completed|fully built|final build|everything included|all done)\b/i },
    { label: 'All buttons work', pattern: /\b(all buttons work|buttons are functional|pages are functional|navigation works)\b/i },
    { label: 'Standalone PWA', pattern: /\b(standalone pwa|installable|manifest|service worker|offline)\b/i },
    { label: 'Images included', pattern: /\b(images included|cover included|splash included|charts included|assets included)\b/i },
    { label: 'Security added', pattern: /\b(security added|csp|sandbox|validated|safe upload|blocked unsafe)\b/i },
    { label: 'Export working', pattern: /\b(export working|download fixed|zip export|github ready|downloadable)\b/i }
  ];

  const TASK_PATTERNS = [
    { title: 'Standalone PWA package', keywords: ['standalone pwa', 'manifest', 'service worker', 'offline', 'installable'], priority: 'Critical', verify: 'Check manifest.json, service-worker.js, icons, and start_url.' },
    { title: 'Splash page first screen', keywords: ['splash page', 'front screen', 'first page', 'first screen'], priority: 'Critical', verify: 'Confirm splash image exists and index.html references it first.' },
    { title: 'Load-style buttons and setup', keywords: ['buttons', 'button types', 'premium modern', 'similar setup', 'toolbar'], priority: 'High', verify: 'Inspect UI classes, navigation, and action buttons.' },
    { title: 'Upload and validate build files', keywords: ['upload', 'site evaluation', 'validator', 'validate', 'zip'], priority: 'Critical', verify: 'Upload ZIP and scan contents.' },
    { title: 'Track unfinished work', keywords: ['what left', 'tasks', 'track', 'outstanding'], priority: 'High', verify: 'Extract tasks and status labels.' },
    { title: 'Detect broken features', keywords: ['broken', 'what broke', 'fixes', 'restore', 'rollback'], priority: 'Critical', verify: 'Run analyzer and compare versions.' },
    { title: 'Export fixed version', keywords: ['export', 'download fixed', 'fixed version', 'zip file'], priority: 'Critical', verify: 'Generate fixed package ZIP.' },
    { title: 'GitHub-ready export', keywords: ['github', 'deploy', 'pages', 'repo', 'commit'], priority: 'High', verify: 'Generate GitHub package and optional API push preview.' },
    { title: 'Dyslexia-friendly interface', keywords: ['dyslexia', 'readable', 'large text', 'simple'], priority: 'High', verify: 'Check settings toggles and CSS modes.' },
    { title: 'No false positives', keywords: ['false positive', 'do not claim', 'confirm', 'verified'], priority: 'Critical', verify: 'Run claim checker and completion lock.' },
    { title: 'Images, charts, or cover included', keywords: ['image', 'images', 'chart', 'charts', 'cover'], priority: 'High', verify: 'Scan asset folder and references.' },
    { title: 'Mock user test mode', keywords: ['mock users', 'test mode', 'synthetic', 'subscribers', 'likes'], priority: 'Normal', verify: 'Check test mode templates and simulation labels.' },
    { title: 'Safety and content guardrails', keywords: ['profanity', 'nudity', 'guardrails', 'safe', 'sandbox', 'csp'], priority: 'Critical', verify: 'Scan policies, CSP, forms, and external scripts.' }
  ];

  let state = loadState();
  let current = {
    uploadedFiles: [],
    zipEntries: [],
    textNotes: '',
    analysis: null,
    project: state.activeProject || defaultProject()
  };

  function defaultProject() {
    return {
      id: 'project-' + Date.now(),
      name: 'Load Tasks',
      type: 'Load Tasks',
      priority: 'Critical',
      versionName: 'v1',
      stableVersion: '',
      strictComplete: true,
      status: 'Needs QA',
      createdAt: new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn(error);
    }
    return { projects: [], versions: [], tasks: [], reports: [], settings: {} };
  }

  function saveState() {
    state.activeProject = current.project;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    renderAll();
  }

  function $(selector, root = document) { return root.querySelector(selector); }
  function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function init() {
    injectIcons();
    fillProjectTypes();
    bindEvents();
    applySettings();
    renderAll();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  }

  function fillProjectTypes() {
    const select = $('#projectType');
    select.innerHTML = PROJECT_TYPES.map(type => `<option>${escapeHtml(type)}</option>`).join('');
    select.value = current.project.type;
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const route = event.target.closest('[data-route]');
      if (route) {
        showView(route.dataset.view);
        event.preventDefault();
      }
      const action = event.target.closest('[data-action]');
      if (action) {
        runAction(action.dataset.action);
        event.preventDefault();
      }
    });

    $('#homeButton').addEventListener('click', () => {
      document.body.classList.remove('app-open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('#hardRefresh').addEventListener('click', () => {
      renderAll();
      toast('Interface refreshed. Local project data preserved.');
    });

    $('#projectForm').addEventListener('submit', event => {
      event.preventDefault();
      current.project = {
        ...current.project,
        name: $('#projectName').value.trim() || 'Untitled Build',
        type: $('#projectType').value,
        versionName: $('#versionName').value.trim() || 'v1',
        stableVersion: $('#stableVersion').value.trim(),
        priority: $('#priority').value,
        strictComplete: $('#strictComplete').checked,
        updatedAt: new Date().toISOString()
      };
      if (!state.projects.find(p => p.id === current.project.id)) state.projects.push(current.project);
      else state.projects = state.projects.map(p => p.id === current.project.id ? current.project : p);
      saveState();
      toast('Project profile saved.');
    });

    const drop = $('#dropZone');
    const input = $('#fileInput');
    drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragging'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
    drop.addEventListener('drop', event => {
      event.preventDefault(); drop.classList.remove('dragging');
      handleFiles(event.dataTransfer.files);
    });
    input.addEventListener('change', event => handleFiles(event.target.files));

    $('#analyzeFilesBtn').addEventListener('click', analyzeCurrentUpload);
    $('#loadSampleBtn').addEventListener('click', loadSampleBuild);
    $('#extractTasksBtn').addEventListener('click', () => extractTasks($('#notesInput').value));
    $('#appendLoadMasterBtn').addEventListener('click', appendLoadMasterChecklist);
    $('#clearNotesBtn').addEventListener('click', () => { $('#notesInput').value = ''; toast('Notes cleared.'); });
    $('#runValidatorBtn').addEventListener('click', runValidator);
    $('#buildFixedZipBtn').addEventListener('click', exportFixedZip);
    $('#exportRollbackBtn').addEventListener('click', exportRollbackZip);
    $('#markStableBtn').addEventListener('click', () => markVersion('Stable'));
    $('#markBrokenBtn').addEventListener('click', () => markVersion('Broken'));
    $('#compareVersionsBtn').addEventListener('click', compareLatestVersions);
    $('#exportGithubZipBtn').addEventListener('click', exportGithubReadyZip);
    $('#previewGithubBtn').addEventListener('click', previewGithubPush);
    $('#pushGithubBtn').addEventListener('click', pushGithubFiles);

    $('#dyslexiaMode').addEventListener('change', updateSettings);
    $('#largeTextMode').addEventListener('change', updateSettings);
    $('#reducedMotionMode').addEventListener('change', updateSettings);
    $('#simpleMode').addEventListener('change', updateSettings);
    $('#exportWorkspaceBtn').addEventListener('click', exportWorkspace);
    $('#importWorkspaceBtn').addEventListener('click', () => $('#workspaceImportFile').click());
    $('#workspaceImportFile').addEventListener('change', importWorkspace);
    $('#resetWorkspaceBtn').addEventListener('click', resetWorkspace);
  }

  function showView(view) {
    document.body.classList.add('app-open');
    $all('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    $all('[data-route]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'handoff') updateHandoffPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    current.uploadedFiles.push(...files);
    files.forEach(file => SESSION_FILES.set(file.name, file));
    renderUploadedFiles();
    toast(`${files.length} file added to intake.`);
  }

  function renderUploadedFiles() {
    const list = $('#uploadedFilesList');
    if (!current.uploadedFiles.length) {
      list.innerHTML = '<div class="empty-state">No files uploaded yet.</div>';
      return;
    }
    list.innerHTML = current.uploadedFiles.map(file => `
      <div class="file-item">
        <strong>${escapeHtml(file.name)}</strong>
        <div class="badge-row"><span class="badge info">${formatBytes(file.size)}</span><span class="badge">${escapeHtml(file.type || 'unknown type')}</span></div>
      </div>`).join('');
  }

  async function analyzeCurrentUpload() {
    if (!current.uploadedFiles.length) {
      toast('Upload at least one file first.');
      return;
    }
    current.zipEntries = [];
    const textParts = [];

    for (const file of current.uploadedFiles) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.zip')) {
        try {
          const entries = await parseZip(await file.arrayBuffer());
          current.zipEntries.push(...entries.map(entry => ({ ...entry, sourceZip: file.name })));
        } catch (error) {
          current.zipEntries.push({ name: file.name, error: 'ZIP could not be parsed: ' + error.message, size: file.size });
        }
      } else if (isTextFile(lower)) {
        textParts.push(await file.text());
        current.zipEntries.push({ name: file.name, text: await file.text(), size: file.size, method: 'loose-file' });
      } else {
        current.zipEntries.push({ name: file.name, size: file.size, method: 'loose-file', binary: true });
      }
    }

    if (textParts.length) {
      current.textNotes += '\n' + textParts.join('\n\n');
      $('#notesInput').value = ($('#notesInput').value + '\n' + textParts.join('\n\n')).trim();
      extractTasks($('#notesInput').value, false);
    }
    runValidator();
    saveVersion('Needs QA');
    showView('validator');
    toast('Upload analyzed. Validator results are ready.');
  }

  function isTextFile(name) {
    return /\.(html?|css|js|json|md|txt|csv|svg|xml|webmanifest)$/i.test(name);
  }

  function appendLoadMasterChecklist() {
    const type = $('#projectType').value || current.project.type || 'Load Tasks';
    const items = MASTER_CHECKLIST[type] || MASTER_CHECKLIST['Load Tasks'];
    const text = `\n\nLoad master checklist for ${type}:\n` + items.map(item => `- ${item}`).join('\n');
    $('#notesInput').value += text;
    extractTasks($('#notesInput').value, false);
    toast('Master checklist added.');
  }

  function extractTasks(rawText, showNotice = true) {
    const text = (rawText || '').trim();
    if (!text) {
      toast('Paste notes first.');
      return [];
    }
    current.textNotes = text;
    const tasks = [];
    const lower = text.toLowerCase();

    TASK_PATTERNS.forEach(pattern => {
      const hit = pattern.keywords.some(keyword => lower.includes(keyword));
      if (hit) tasks.push(makeTask(pattern.title, pattern.priority, pattern.verify, 'Pattern matched: ' + pattern.keywords.filter(k => lower.includes(k)).join(', ')));
    });

    text.split(/\n+/).map(line => line.trim()).filter(Boolean).forEach(line => {
      if (/^(add|fix|remove|include|make sure|verify|build|create|upload|export|compress|replace|do not|no |must|should)\b/i.test(line) || /^[-*]\s+/.test(line)) {
        const clean = line.replace(/^[-*]\s+/, '').slice(0, 140);
        if (!tasks.find(task => task.title.toLowerCase() === clean.toLowerCase())) {
          tasks.push(makeTask(clean, /critical|must|do not|no false|standalone|security/i.test(line) ? 'Critical' : 'Normal', 'Manual verification or file scan required.', line));
        }
      }
    });

    const claims = CLAIM_PATTERNS.filter(claim => claim.pattern.test(text)).map(claim => makeTask('Verify claim: ' + claim.label, 'Critical', 'Check actual files before accepting claim.', 'Claim found in pasted notes.'));
    tasks.push(...claims);

    const existing = new Set(state.tasks.map(task => task.title + task.source));
    tasks.forEach(task => {
      if (!existing.has(task.title + task.source)) state.tasks.push(task);
    });
    saveState();
    if (showNotice) toast(`${tasks.length} tasks or claims extracted.`);
    return tasks;
  }

  function makeTask(title, priority, verify, source) {
    return {
      id: 'task-' + cryptoRandom(),
      title,
      projectType: current.project.type,
      priority,
      status: 'Not proven',
      verification: verify,
      source,
      createdAt: new Date().toISOString()
    };
  }

  function runValidator() {
    const entries = current.zipEntries || [];
    const notes = $('#notesInput').value || current.textNotes || '';
    const analysis = analyzeEntries(entries, notes);
    current.analysis = analysis;
    state.reports.unshift({ id: 'report-' + cryptoRandom(), createdAt: new Date().toISOString(), project: current.project.name, score: analysis.score, summary: analysis.summary });
    saveState();
    renderValidation();
    toast(`Validator complete. Score: ${analysis.score}.`);
    return analysis;
  }

  function analyzeEntries(entries, notes) {
    const files = entries.filter(entry => !entry.name.endsWith('/'));
    const names = files.map(entry => normalizePath(entry.name));
    const textByName = new Map(files.filter(f => typeof f.text === 'string').map(f => [normalizePath(f.name), f.text]));
    const nameSet = new Set(names);
    const byBase = base => names.find(name => name.endsWith('/' + base) || name === base);
    const hasIndex = !!byBase('index.html');
    const rootIndex = nameSet.has('index.html');
    const manifestPath = byBase('manifest.json') || byBase('site.webmanifest');
    const swPath = byBase('service-worker.js') || byBase('sw.js');
    const readmePath = names.find(n => /readme/i.test(n));
    const securityPath = names.find(n => /security/i.test(n));
    const iconFiles = names.filter(name => /assets\/icons|icons\//i.test(name) || /icon.*\.(png|jpg|jpeg|webp|svg)$/i.test(name));
    const imageFiles = names.filter(name => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name));
    const videoFiles = names.filter(name => /\.(mp4|webm|mov|m4v)$/i.test(name));
    const audioFiles = names.filter(name => /\.(mp3|wav|m4a|ogg)$/i.test(name));
    const chartFiles = names.filter(name => /chart|graph|survey|data/i.test(name));

    const categories = [];
    let score = 0;
    const add = (id, title, status, points, max, items) => {
      categories.push({ id, title, status, points, max, items: items.filter(Boolean) });
      score += points;
    };

    const structureItems = [];
    if (!hasIndex) structureItems.push('Missing index.html. This can cause the build to open as files or code instead of an app.');
    if (hasIndex && !rootIndex) structureItems.push('index.html exists inside a nested folder. GitHub Pages may need the folder root adjusted.');
    if (!manifestPath) structureItems.push('Missing manifest.json or webmanifest.');
    if (!swPath) structureItems.push('Missing service worker file.');
    if (!iconFiles.length) structureItems.push('Missing app icons.');
    add('structure', 'PWA structure', structureItems.length ? 'warn' : 'good', Math.max(0, 24 - structureItems.length * 5), 24, structureItems.length ? structureItems : ['Core PWA files were found.']);

    const manifestItems = [];
    let manifest = null;
    if (manifestPath && textByName.has(manifestPath)) {
      try { manifest = JSON.parse(textByName.get(manifestPath)); } catch (error) { manifestItems.push('Manifest file exists but is not valid JSON.'); }
      if (manifest) {
        ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons'].forEach(key => { if (!manifest[key]) manifestItems.push(`Manifest missing ${key}.`); });
        if (manifest.display && !/standalone|fullscreen|minimal-ui/i.test(manifest.display)) manifestItems.push('Manifest display should be standalone, fullscreen, or minimal-ui.');
      }
    } else manifestItems.push('Manifest could not be read.');
    add('manifest', 'Manifest readiness', manifestItems.length ? 'warn' : 'good', Math.max(0, 12 - manifestItems.length * 2), 12, manifestItems.length ? manifestItems : ['Manifest has required app fields.']);

    const swItems = [];
    if (swPath && textByName.has(swPath)) {
      const sw = textByName.get(swPath);
      if (!/install/i.test(sw)) swItems.push('Service worker does not show an install handler.');
      if (!/fetch/i.test(sw)) swItems.push('Service worker does not show a fetch handler.');
      if (!/cache/i.test(sw)) swItems.push('Service worker does not show cache logic.');
    } else swItems.push('Service worker could not be read.');
    add('offline', 'Offline support', swItems.length ? 'warn' : 'good', Math.max(0, 12 - swItems.length * 3), 12, swItems.length ? swItems : ['Install, fetch, and cache logic found.']);

    const assetItems = findBrokenReferences(textByName, nameSet);
    if (!imageFiles.length && /image|cover|splash|chart/i.test(notes)) assetItems.push('Notes mention images, covers, splash, or charts, but no image assets were found.');
    if (/chart|graph|survey/i.test(notes) && !chartFiles.length) assetItems.push('Notes mention charts, graphs, or surveys, but no chart-related files were found.');
    add('assets', 'Assets and references', assetItems.length ? 'warn' : 'good', Math.max(0, 14 - assetItems.length * 2), 14, assetItems.length ? assetItems.slice(0, 12) : [`${imageFiles.length} image assets, ${audioFiles.length} audio assets, and ${videoFiles.length} video assets found.`]);

    const functionItems = findDeadControls(textByName);
    add('controls', 'Buttons, links, and pages', functionItems.length ? 'warn' : 'good', Math.max(0, 10 - functionItems.length * 2), 10, functionItems.length ? functionItems.slice(0, 12) : ['No obvious dead buttons or empty links found in readable HTML.']);

    const securityItems = scanSecurity(textByName, names);
    add('security', 'Security scanner', securityItems.length ? (securityItems.some(i => /credential|redirect|external script|unsafe/i.test(i)) ? 'bad' : 'warn') : 'good', Math.max(0, 14 - securityItems.length * 3), 14, securityItems.length ? securityItems.slice(0, 12) : ['No obvious unsafe upload patterns found in readable files.']);

    const promiseItems = validatePromises(notes, { names, hasIndex, manifestPath, swPath, iconFiles, imageFiles, chartFiles, readmePath, securityPath });
    add('promises', 'Promised features vs actual files', promiseItems.length ? 'bad' : 'good', Math.max(0, 14 - promiseItems.length * 3), 14, promiseItems.length ? promiseItems.slice(0, 14) : ['No missing promised file evidence found.']);

    const rawItems = [];
    if (!hasIndex) rawItems.push('No index.html found. High raw-code or incomplete-source risk.');
    if (names.some(n => /package\.json$/.test(n)) && !names.some(n => /dist\/|build\//.test(n)) && names.some(n => /src\//.test(n))) rawItems.push('Looks like unbuilt source. Run the build step and export dist or build output.');
    if (hasIndex && !rootIndex) rawItems.push('Nested app folder may be uploaded at the wrong root.');
    add('raw', 'Raw-code and deployment risk', rawItems.length ? 'warn' : 'good', Math.max(0, 10 - rawItems.length * 3), 10, rawItems.length ? rawItems : ['No obvious raw-code deployment risk found.']);

    score = Math.max(0, Math.min(100, Math.round(score)));
    const failed = categories.flatMap(c => c.items.filter(item => !/found|No obvious|Core|Manifest has|Install/.test(item))).length;
    const status = score >= 90 && !failed ? 'Ready for Upload' : score >= 75 ? 'Needs QA' : score >= 50 ? 'Needs Developer' : 'Do Not Deploy';
    const cannotComplete = current.project.strictComplete && (status !== 'Ready for Upload' || promiseItems.length || securityItems.some(i => /credential|redirect|external script|unsafe/i.test(i)));

    return {
      id: 'analysis-' + cryptoRandom(),
      score, status, cannotComplete, categories,
      fileCount: files.length, imageCount: imageFiles.length, audioCount: audioFiles.length, videoCount: videoFiles.length,
      summary: { hasIndex, rootIndex, manifestPath, swPath, iconCount: iconFiles.length, readmePath, securityPath },
      safeFixes: buildSafeFixes({ hasIndex, manifestPath, swPath, iconFiles, readmePath, securityPath, rootIndex }),
      developerFixes: buildDeveloperFixes(categories, promiseItems, securityItems),
      createdAt: new Date().toISOString()
    };
  }

  function findBrokenReferences(textByName, nameSet) {
    const broken = [];
    const refs = [];
    for (const [name, text] of textByName) {
      if (!/\.(html?|css)$/i.test(name)) continue;
      const regex = /(src|href)=['"]([^'"#][^'"]+)['"]|url\(([^)]+)\)/gi;
      let match;
      while ((match = regex.exec(text))) {
        let raw = (match[2] || match[3] || '').trim().replace(/^['"]|['"]$/g, '');
        if (!raw || /^(https?:|data:|mailto:|tel:|javascript:|#)/i.test(raw)) continue;
        if (raw.includes('?')) raw = raw.split('?')[0];
        if (raw.includes('#')) raw = raw.split('#')[0];
        refs.push({ from: name, raw });
      }
    }
    refs.forEach(ref => {
      const resolved = normalizePath(resolvePath(ref.from, ref.raw));
      const base = normalizePath(ref.raw).split('/').pop();
      if (!nameSet.has(resolved) && !Array.from(nameSet).some(n => n.endsWith('/' + base) || n === base)) {
        broken.push(`Missing referenced asset from ${ref.from}: ${ref.raw}`);
      }
    });
    return Array.from(new Set(broken));
  }

  function findDeadControls(textByName) {
    const issues = [];
    for (const [name, text] of textByName) {
      if (!/\.html?$/i.test(name)) continue;
      const emptyLinks = text.match(/href=["']#["']/gi) || [];
      if (emptyLinks.length) issues.push(`${name} has ${emptyLinks.length} href="#" link(s).`);
      const disabled = text.match(/<button[^>]*disabled/gi) || [];
      if (disabled.length) issues.push(`${name} has ${disabled.length} disabled button(s).`);
      const buttons = text.match(/<button\b[^>]*>/gi) || [];
      const scripts = (text.match(/<script\b/gi) || []).length;
      if (buttons.length > 3 && scripts === 0 && !/app\.js|main\.js|bundle\.js/.test(text)) issues.push(`${name} has many buttons but no readable script reference.`);
      const duplicateIds = findDuplicateIds(text);
      duplicateIds.forEach(id => issues.push(`${name} has duplicate id: ${id}`));
    }
    return issues;
  }

  function findDuplicateIds(text) {
    const ids = [];
    const seen = new Set();
    const dup = new Set();
    const regex = /id=["']([^"']+)["']/gi;
    let match;
    while ((match = regex.exec(text))) ids.push(match[1]);
    ids.forEach(id => { if (seen.has(id)) dup.add(id); else seen.add(id); });
    return Array.from(dup);
  }

  function scanSecurity(textByName, names) {
    const issues = [];
    for (const [name, text] of textByName) {
      if (/\.html?$/i.test(name)) {
        const externalScripts = Array.from(text.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)/gi)).map(m => m[1]);
        externalScripts.forEach(src => issues.push(`${name} uses external script: ${src}`));
        if (/window\.location|location\.href|meta\s+http-equiv=["']refresh/i.test(text)) issues.push(`${name} contains redirect-capable code. Review before upload.`);
        if (/<form/i.test(text) && /(password|token|secret|api[_-]?key)/i.test(text)) issues.push(`${name} may collect credentials or API keys. Verify local-only handling.`);
        if (!/Content-Security-Policy/i.test(text)) issues.push(`${name} has no visible CSP meta tag. Consider adding a CSP for static hosting.`);
      }
      if (/\.js$/i.test(name)) {
        if (/eval\(|new Function\(/i.test(text)) issues.push(`${name} uses eval-like code. Review before publishing.`);
        if (/localStorage\.setItem\([^,]+,\s*(token|api|secret)/i.test(text)) issues.push(`${name} may store sensitive token data in localStorage.`);
      }
    }
    if (names.some(name => /\.html?$/.test(name)) && names.some(name => /\.php$|\.exe$|\.bat$|\.sh$/i.test(name))) issues.push('Package contains executable or server-side files. Review before public upload.');
    return Array.from(new Set(issues));
  }

  function validatePromises(notes, evidence) {
    const issues = [];
    const lower = (notes || '').toLowerCase();
    const requires = (words) => words.some(w => lower.includes(w));
    if (requires(['standalone pwa', 'pwa']) && (!evidence.hasIndex || !evidence.manifestPath || !evidence.swPath)) issues.push('Notes promise a standalone PWA, but required PWA files are missing.');
    if (requires(['splash page', 'front screen']) && !evidence.names.some(n => /splash|front|hero|cover/i.test(n))) issues.push('Notes promise a splash/front screen, but no splash-like asset name was found.');
    if (requires(['cover image', 'cover png']) && !evidence.names.some(n => /cover/i.test(n))) issues.push('Notes promise a cover image, but no cover-named file was found.');
    if (requires(['charts', 'chart', 'survey']) && !evidence.chartFiles.length) issues.push('Notes promise charts or survey data, but no chart-related file was found.');
    if (requires(['images included', 'all images', 'image']) && !evidence.imageFiles.length) issues.push('Notes mention images, but no image assets were found.');
    if (requires(['security', 'safe', 'sandbox', 'csp']) && !evidence.securityPath) issues.push('Notes mention security, but no security guide or security file was found.');
    if (requires(['readme', 'instructions', 'directions']) && !evidence.readmePath) issues.push('Notes require directions or README, but no README file was found.');
    if (requires(['github']) && !evidence.names.some(n => /github|deploy|workflow|pages/i.test(n))) issues.push('Notes mention GitHub, but no GitHub or deployment guide file was found.');
    return issues;
  }

  function buildSafeFixes(evidence) {
    const fixes = [];
    if (!evidence.manifestPath) fixes.push({ id: 'manifest', title: 'Add missing manifest.json', type: 'auto', description: 'Creates an installable PWA manifest using Load Tasks defaults.' });
    if (!evidence.swPath) fixes.push({ id: 'sw', title: 'Add missing service-worker.js', type: 'auto', description: 'Creates offline cache shell for static PWA files.' });
    if (!evidence.readmePath) fixes.push({ id: 'readme', title: 'Add README_OPEN_FIRST.md', type: 'auto', description: 'Adds opening, deployment, and troubleshooting directions.' });
    if (!evidence.securityPath) fixes.push({ id: 'security', title: 'Add SECURITY.md', type: 'auto', description: 'Adds safe upload, CSP, and token handling rules.' });
    if (!evidence.iconFiles.length) fixes.push({ id: 'icons', title: 'Add placeholder app icons', type: 'auto', description: 'Adds Load Tasks fallback icons if package has none.' });
    if (evidence.hasIndex && !evidence.rootIndex) fixes.push({ id: 'nested', title: 'Flag nested root issue', type: 'instruction', description: 'Package likely needs the nested app folder uploaded as root.' });
    return fixes;
  }

  function buildDeveloperFixes(categories, promiseItems, securityItems) {
    const fixes = [];
    categories.forEach(category => {
      if (category.status !== 'good') category.items.forEach(item => fixes.push({ title: category.title, description: item, type: 'developer' }));
    });
    promiseItems.forEach(item => fixes.push({ title: 'Promised feature gap', description: item, type: 'developer' }));
    securityItems.forEach(item => {
      if (/external script|credential|redirect|eval|token/i.test(item)) fixes.push({ title: 'Security review required', description: item, type: 'developer' });
    });
    return fixes;
  }

  function renderAll() {
    syncForm();
    renderUploadedFiles();
    renderDashboard();
    renderTasks();
    renderValidation();
    renderFixes();
    renderVersions();
    updateHandoffPreview();
  }

  function syncForm() {
    $('#projectName').value = current.project.name || 'Load Tasks';
    $('#projectType').value = current.project.type || 'Load Tasks';
    $('#versionName').value = current.project.versionName || 'v1';
    $('#stableVersion').value = current.project.stableVersion || '';
    $('#priority').value = current.project.priority || 'Normal';
    $('#strictComplete').checked = current.project.strictComplete !== false;
  }

  function renderDashboard() {
    const versions = state.versions || [];
    const broken = versions.filter(v => v.status === 'Broken').length;
    const stable = versions.filter(v => v.status === 'Stable').length;
    const openTasks = state.tasks.filter(t => !/verified|done|complete/i.test(t.status)).length;
    const score = current.analysis ? current.analysis.score : 0;
    $('#overallScore').textContent = score;
    $('#dashboardMetrics').innerHTML = [
      ['Active builds', versions.length], ['Broken builds', broken], ['Stable versions', stable], ['Open tasks', openTasks]
    ].map(([label, value]) => `<div class="metric-card"><strong>${value}</strong><span>${label}</span></div>`).join('');

    const summary = $('#currentBuildSummary');
    if (!current.analysis) summary.innerHTML = 'No build uploaded yet. Start with Upload Build or Paste Notes.';
    else summary.innerHTML = `
      <div class="badge-row"><span class="badge ${badgeClass(current.analysis.status)}">${escapeHtml(current.analysis.status)}</span><span class="badge info">${current.analysis.fileCount} files</span><span class="badge warn">${current.analysis.score} score</span></div>
      <p>Manifest: ${escapeHtml(current.analysis.summary.manifestPath || 'missing')}</p>
      <p>Service worker: ${escapeHtml(current.analysis.summary.swPath || 'missing')}</p>
      <p>Icons: ${current.analysis.summary.iconCount}</p>
      <p>Completion lock: ${current.analysis.cannotComplete ? 'Complete status blocked until verified.' : 'Ready status allowed after final manual QA.'}</p>`;

    $('#nextBestAction').textContent = current.analysis ? nextActionText(current.analysis) : 'Upload a PWA ZIP or paste a build plan to begin verification.';
  }

  function nextActionText(analysis) {
    if (analysis.score < 50) return 'Do not deploy. Send the developer repair prompt and restore the last stable version.';
    if (analysis.cannotComplete) return 'Do not mark complete. Review missing promises, security warnings, and structure gaps first.';
    if (analysis.score < 90) return 'Run manual QA on buttons, upload flow, export flow, and mobile installation before upload.';
    return 'Export the GitHub-ready package and perform a final hosted PWA install test.';
  }

  function renderTasks() {
    const tasks = state.tasks || [];
    $('#taskList').innerHTML = tasks.length ? tasks.map(task => `
      <div class="task-item">
        <strong>${escapeHtml(task.title)}</strong>
        <div class="badge-row"><span class="badge ${badgeClass(task.status)}">${escapeHtml(task.status)}</span><span class="badge warn">${escapeHtml(task.priority)}</span><span class="badge info">${escapeHtml(task.projectType)}</span></div>
        <span>${escapeHtml(task.verification || '')}</span>
        <small>${escapeHtml(task.source || '')}</small>
      </div>`).join('') : '<div class="empty-state">No extracted tasks yet.</div>';
  }

  function renderValidation() {
    const analysis = current.analysis;
    if (!analysis) {
      $('#scoreBoard').innerHTML = '<div class="empty-state">No validation run yet.</div>';
      $('#validationResults').innerHTML = '';
      return;
    }
    $('#scoreBoard').innerHTML = [
      ['Score', analysis.score], ['Status', analysis.status], ['Complete allowed', analysis.cannotComplete ? 'No' : 'Yes']
    ].map(([label, value]) => `<div class="score-card"><strong>${escapeHtml(String(value))}</strong><span>${label}</span></div>`).join('');
    $('#validationResults').innerHTML = analysis.categories.map(category => `
      <article class="result-card ${category.status}">
        <h3>${escapeHtml(category.title)} <span class="badge ${badgeClass(category.status)}">${category.points}/${category.max}</span></h3>
        <ul>${category.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </article>`).join('');
  }

  function renderFixes() {
    const analysis = current.analysis;
    $('#safeFixList').innerHTML = analysis && analysis.safeFixes.length ? analysis.safeFixes.map(fix => `<div class="fix-item"><strong>${escapeHtml(fix.title)}</strong><p>${escapeHtml(fix.description)}</p><span class="badge ${fix.type === 'auto' ? 'good' : 'warn'}">${escapeHtml(fix.type)}</span></div>`).join('') : '<div class="empty-state">No safe auto-fixes available yet.</div>';
    $('#developerFixList').innerHTML = analysis && analysis.developerFixes.length ? analysis.developerFixes.map(fix => `<div class="fix-item"><strong>${escapeHtml(fix.title)}</strong><p>${escapeHtml(fix.description)}</p></div>`).join('') : '<div class="empty-state">No developer-required fixes listed yet.</div>';
  }

  function renderVersions() {
    const versions = state.versions || [];
    $('#versionList').innerHTML = versions.length ? versions.map(version => `
      <div class="version-item">
        <strong>${escapeHtml(version.name)}</strong>
        <div class="badge-row"><span class="badge ${badgeClass(version.status)}">${escapeHtml(version.status)}</span><span class="badge warn">Score ${version.score}</span><span class="badge info">${version.fileCount} files</span></div>
        <small>${new Date(version.createdAt).toLocaleString()}</small>
      </div>`).join('') : '<div class="empty-state">No saved versions yet.</div>';
  }

  function renderHandoffText() {
    const analysis = current.analysis;
    const tasks = state.tasks.slice(0, 30);
    const lines = [];
    lines.push('# Load Tasks Developer Handoff');
    lines.push('');
    lines.push(`Project: ${current.project.name}`);
    lines.push(`Project type: ${current.project.type}`);
    lines.push(`Version: ${current.project.versionName}`);
    lines.push(`Status: ${analysis ? analysis.status : 'Not validated'}`);
    lines.push(`Score: ${analysis ? analysis.score : 'No score yet'}`);
    lines.push('');
    lines.push('Locked rule: Do not mark this build complete unless the required files, promised features, PWA structure, export readiness, and remaining risks have been verified.');
    lines.push('');
    lines.push('## Missing or risky items');
    if (analysis) analysis.categories.forEach(cat => { if (cat.status !== 'good') cat.items.forEach(item => lines.push(`- ${cat.title}: ${item}`)); });
    else lines.push('- No validator has run yet.');
    lines.push('');
    lines.push('## Extracted tasks');
    if (tasks.length) tasks.forEach(task => lines.push(`- [${task.status}] ${task.title}. Verify: ${task.verification}`));
    else lines.push('- No tasks extracted yet.');
    lines.push('');
    lines.push('## Required final report from developer');
    ['Files changed', 'Modules added', 'What was fixed', 'What remains incomplete', 'Security risks remaining', 'How to open the PWA', 'How to verify install and offline mode'].forEach(item => lines.push(`- ${item}`));
    return lines.join('\n');
  }

  function updateHandoffPreview() {
    $('#handoffPreview').textContent = renderHandoffText();
  }

  function runAction(action) {
    const map = {
      'download-report': () => downloadText('Load_Tasks_Report.md', buildMarkdownReport()),
      'download-json': () => downloadText('Load_Tasks_Report.json', JSON.stringify({ project: current.project, analysis: current.analysis, tasks: state.tasks }, null, 2)),
      'download-csv': () => downloadText('Load_Tasks_Tasks.csv', buildTasksCsv()),
      'download-claude': () => downloadText('Load_Tasks_Claude_Repair_Prompt.txt', buildClaudePrompt()),
      'download-qa': () => downloadText('Load_Tasks_QA_Checklist.md', buildQaChecklist()),
      'download-github-issue': () => downloadText('Load_Tasks_GitHub_Issue.md', buildGithubIssue())
    };
    if (map[action]) map[action]();
  }

  function buildMarkdownReport() {
    const analysis = current.analysis;
    const lines = [];
    lines.push('# Load Tasks Build Report');
    lines.push('');
    lines.push(`Project: ${current.project.name}`);
    lines.push(`Type: ${current.project.type}`);
    lines.push(`Version: ${current.project.versionName}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Score: ${analysis ? analysis.score : 'Not validated'}`);
    lines.push(`Status: ${analysis ? analysis.status : 'Not validated'}`);
    lines.push('');
    if (analysis) {
      analysis.categories.forEach(cat => {
        lines.push(`## ${cat.title}`);
        lines.push(`Status: ${cat.status}. Points: ${cat.points}/${cat.max}`);
        cat.items.forEach(item => lines.push(`- ${item}`));
        lines.push('');
      });
      lines.push('## Safe fixes');
      analysis.safeFixes.forEach(fix => lines.push(`- ${fix.title}: ${fix.description}`));
      lines.push('');
      lines.push('## Developer-required fixes');
      analysis.developerFixes.forEach(fix => lines.push(`- ${fix.title}: ${fix.description}`));
    } else lines.push('No validator has run yet.');
    return lines.join('\n');
  }

  function buildTasksCsv() {
    const rows = [['title','projectType','priority','status','verification','source']];
    state.tasks.forEach(t => rows.push([t.title, t.projectType, t.priority, t.status, t.verification, t.source]));
    return rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function buildClaudePrompt() {
    return `FIX THIS LOAD BUILD WITHOUT FALSE POSITIVES\n\n${renderHandoffText()}\n\nDeveloper instructions:\n- Do not redesign unless requested.\n- Preserve existing working features.\n- Return a complete standalone PWA ZIP.\n- Include index.html, manifest.json, service-worker.js, CSS, JS, assets, icons, README, and security notes.\n- Confirm only what you can verify from files.\n- If a function cannot be completed, label it incomplete instead of saying complete.\n- Do not deliver source fragments only.\n- The build must open as an app/site, not raw code.`;
  }

  function buildQaChecklist() {
    return `# Load Tasks QA Checklist\n\n- Open hosted app over HTTPS.\n- Confirm splash page appears first.\n- Confirm Open Dashboard works.\n- Confirm Upload Build accepts ZIP files.\n- Confirm Paste Notes extracts tasks.\n- Confirm Run Validator produces a score.\n- Confirm missing manifest and service worker are detected.\n- Confirm Fix Studio lists safe fixes.\n- Confirm report exports download.\n- Confirm GitHub-ready ZIP exports.\n- Confirm dyslexia-friendly mode changes text and spacing.\n- Confirm app can be added to home screen.\n- Confirm offline reload works after first hosted load.\n- Confirm no build can be marked complete unless verified.`;
  }

  function buildGithubIssue() {
    return `# Load build requires repair and verification\n\n${renderHandoffText()}\n\nAcceptance criteria:\n- App opens as a standalone PWA.\n- Splash image appears first.\n- Required files exist.\n- Buttons and navigation work.\n- Missing features are either implemented or labeled incomplete.\n- Security risks are documented.\n- Final ZIP is upload-ready.`;
  }

  function saveVersion(status) {
    const analysis = current.analysis || { score: 0, fileCount: current.zipEntries.length, categories: [] };
    const version = {
      id: 'version-' + cryptoRandom(),
      name: current.project.versionName || 'v' + (state.versions.length + 1),
      project: current.project.name,
      type: current.project.type,
      status,
      score: analysis.score || 0,
      fileCount: current.zipEntries.length,
      fileNames: current.zipEntries.map(e => e.name),
      analysis,
      createdAt: new Date().toISOString()
    };
    state.versions.unshift(version);
    saveState();
  }

  function markVersion(status) {
    if (!current.analysis) { toast('Run validator before marking version status.'); return; }
    saveVersion(status);
    toast(`Current version marked ${status}.`);
  }

  function compareLatestVersions() {
    const [a, b] = state.versions;
    if (!a || !b) { $('#compareOutput').textContent = 'Upload or save at least two versions first.'; return; }
    const setA = new Set(a.fileNames || []);
    const setB = new Set(b.fileNames || []);
    const added = [...setA].filter(x => !setB.has(x));
    const removed = [...setB].filter(x => !setA.has(x));
    $('#compareOutput').textContent = `Comparing ${a.name} to ${b.name}\n\nAdded files:\n${added.join('\n') || 'None'}\n\nRemoved files:\n${removed.join('\n') || 'None'}\n\nScore change: ${a.score - b.score}`;
  }

  async function exportFixedZip() {
    const files = await currentFilesForExport(true);
    const blob = buildZipBlob(files);
    downloadBlob('Load_Tasks_Fixed_Package.zip', blob);
    toast('Fixed ZIP exported. Safe fixes only were applied.');
  }

  async function exportRollbackZip() {
    const files = await currentFilesForExport(false);
    files['LOAD_TASKS_ROLLBACK_REPORT.md'] = stringToBytes(buildMarkdownReport());
    downloadBlob('Load_Tasks_Rollback_Package.zip', buildZipBlob(files));
  }

  async function exportGithubReadyZip() {
    const files = await currentFilesForExport(false);
    files['LOAD_TASKS_REPORT.md'] = stringToBytes(buildMarkdownReport());
    files['LOAD_TASKS_QA_CHECKLIST.md'] = stringToBytes(buildQaChecklist());
    files['LOAD_TASKS_GITHUB_ISSUE.md'] = stringToBytes(buildGithubIssue());
    files['LOAD_TASKS_COMMIT_MESSAGE.txt'] = stringToBytes(`Validate and repair ${current.project.name} ${current.project.versionName}`);
    files['LOAD_TASKS_DEPLOY_CHECKLIST.md'] = stringToBytes(buildDeployChecklist());
    downloadBlob('Load_Tasks_GitHub_Ready_Package.zip', buildZipBlob(files));
    toast('GitHub-ready ZIP exported.');
  }

  function buildDeployChecklist() {
    return `# Deployment Checklist\n\n- Upload files from the app root, not a parent folder.\n- Confirm index.html is at the repository root or configured publish folder.\n- Confirm manifest.json and service-worker.js paths are correct.\n- Confirm assets folder is included.\n- Open the hosted URL over HTTPS.\n- Add to home screen or install app.\n- Test offline after first load.\n- Keep the rollback ZIP before pushing changes.`;
  }

  async function currentFilesForExport(applySafeFixes) {
    const files = {};
    if (current.zipEntries.length) {
      for (const entry of current.zipEntries) {
        if (entry.name.endsWith('/') || entry.error) continue;
        if (entry.data) files[entry.name] = entry.data;
        else if (entry.text) files[entry.name] = stringToBytes(entry.text);
      }
    } else {
      files['README_OPEN_FIRST.md'] = stringToBytes('No uploaded build files were available. This export contains Load Tasks report files only.');
    }
    if (applySafeFixes) {
      const analysis = current.analysis;
      if (!analysis || analysis.safeFixes.some(f => f.id === 'manifest')) files['manifest.json'] = stringToBytes(JSON.stringify(sampleManifest(), null, 2));
      if (!analysis || analysis.safeFixes.some(f => f.id === 'sw')) files['service-worker.js'] = stringToBytes(sampleServiceWorker());
      if (!analysis || analysis.safeFixes.some(f => f.id === 'readme')) files['README_OPEN_FIRST.md'] = stringToBytes(buildOpeningGuide());
      if (!analysis || analysis.safeFixes.some(f => f.id === 'security')) files['SECURITY.md'] = stringToBytes(buildSecurityGuide());
    }
    return files;
  }

  function sampleManifest() {
    return { name: current.project.name || 'Load Project', short_name: 'Load', start_url: './index.html', scope: './', display: 'standalone', background_color: '#050712', theme_color: '#ffd400', icons: [] };
  }
  function sampleServiceWorker() {
    return `const CACHE_NAME = 'load-project-cache-v1';\nconst APP_SHELL = ['./','./index.html','./manifest.json'];\nself.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); });\nself.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });`;
  }
  function buildOpeningGuide() {
    return `# Open This PWA\n\n1. Upload the unzipped folder to HTTPS hosting such as GitHub Pages, Netlify, or Vercel.\n2. Open the hosted index.html URL.\n3. On iPad or iPhone, use Share then Add to Home Screen.\n4. On desktop Chrome or Edge, use Install App if offered.\n5. If the app opens as raw code, index.html is missing, the wrong folder was uploaded, or an unbuilt source folder was delivered.`;
  }
  function buildSecurityGuide() {
    return `# Security Notes\n\n- Do not run arbitrary uploaded HTML without sandboxing.\n- Do not save GitHub tokens or API keys to localStorage.\n- Use Content Security Policy on hosted versions.\n- Block hidden redirects, credential capture forms, and unexpected external scripts.\n- Keep a rollback ZIP before pushing changes.`;
  }

  function previewGithubPush() {
    const owner = $('#ghOwner').value.trim();
    const repo = $('#ghRepo').value.trim();
    const branch = $('#ghBranch').value.trim() || 'main';
    const folder = $('#ghPath').value.trim().replace(/^\/+|\/+$/g, '');
    if (!owner || !repo) { toast('Enter GitHub owner and repo first.'); return; }
    const names = current.zipEntries.map(e => (folder ? folder + '/' : '') + e.name).slice(0, 80);
    $('#githubPreview').textContent = `Target: ${owner}/${repo}\nBranch: ${branch}\nFolder: ${folder || '(repo root)'}\n\nFiles prepared:\n${names.join('\n') || 'No uploaded files yet.'}\n\nA rollback ZIP should be exported before direct push.`;
  }

  async function pushGithubFiles() {
    const owner = $('#ghOwner').value.trim();
    const repo = $('#ghRepo').value.trim();
    const branch = $('#ghBranch').value.trim() || 'main';
    const folder = $('#ghPath').value.trim().replace(/^\/+|\/+$/g, '');
    const token = $('#ghToken').value.trim();
    if (!owner || !repo || !token) { toast('Owner, repo, and session token are required for direct push.'); return; }
    if (!confirm('Direct GitHub push will update repository files. Export a rollback ZIP first. Continue?')) return;
    const files = await currentFilesForExport(false);
    const entries = Object.entries(files).slice(0, 80);
    for (const [path, data] of entries) {
      const target = encodeURIComponent((folder ? folder + '/' : '') + path).replace(/%2F/g, '/');
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${target}`;
      let sha = null;
      try {
        const existing = await fetch(url + `?ref=${encodeURIComponent(branch)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
        if (existing.ok) sha = (await existing.json()).sha;
      } catch (error) {}
      const body = { message: `Update ${path} from Load Tasks`, content: bytesToBase64(data), branch };
      if (sha) body.sha = sha;
      const response = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { toast(`GitHub push stopped at ${path}.`); return; }
    }
    $('#ghToken').value = '';
    toast('GitHub push completed for prepared files. Token cleared.');
  }

  function updateSettings() {
    state.settings = {
      dyslexiaMode: $('#dyslexiaMode').checked,
      largeTextMode: $('#largeTextMode').checked,
      reducedMotionMode: $('#reducedMotionMode').checked,
      simpleMode: $('#simpleMode').checked
    };
    saveState();
    applySettings();
  }

  function applySettings() {
    const s = state.settings || {};
    $('#dyslexiaMode').checked = !!s.dyslexiaMode;
    $('#largeTextMode').checked = !!s.largeTextMode;
    $('#reducedMotionMode').checked = !!s.reducedMotionMode;
    $('#simpleMode').checked = !!s.simpleMode;
    document.body.classList.toggle('dyslexia', !!s.dyslexiaMode);
    document.body.classList.toggle('large-text', !!s.largeTextMode);
    document.body.classList.toggle('reduced-motion', !!s.reducedMotionMode);
    document.body.classList.toggle('simple-mode', !!s.simpleMode);
  }

  function exportWorkspace() {
    downloadText('Load_Tasks_Workspace.json', JSON.stringify(state, null, 2));
  }
  async function importWorkspace(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      state = JSON.parse(await file.text());
      saveState();
      applySettings();
      toast('Workspace imported.');
    } catch (error) { toast('Workspace import failed.'); }
  }
  function resetWorkspace() {
    if (!confirm('Reset local Load Tasks workspace? This cannot be undone unless you exported a backup.')) return;
    localStorage.removeItem(STORE_KEY);
    state = loadState();
    current = { uploadedFiles: [], zipEntries: [], textNotes: '', analysis: null, project: defaultProject() };
    saveState();
    toast('Workspace reset.');
  }

  function loadSampleBuild() {
    current.zipEntries = [
      { name: 'index.html', text: '<!doctype html><html><head><link rel="manifest" href="manifest.json"><script src="app.js"></script></head><body><img src="assets/images/splash.jpg"><button id="start">Start</button></body></html>', data: stringToBytes('sample') },
      { name: 'manifest.json', text: JSON.stringify(sampleManifest(), null, 2), data: stringToBytes(JSON.stringify(sampleManifest())) },
      { name: 'service-worker.js', text: sampleServiceWorker(), data: stringToBytes(sampleServiceWorker()) },
      { name: 'assets/images/splash.jpg', data: new Uint8Array([1,2,3]), binary: true },
      { name: 'README_OPEN_FIRST.md', text: buildOpeningGuide(), data: stringToBytes(buildOpeningGuide()) }
    ];
    $('#notesInput').value = 'Build a standalone PWA with splash page, buttons, manifest, service worker, GitHub-ready export, and no false positives.';
    extractTasks($('#notesInput').value, false);
    runValidator();
    saveVersion('Needs QA');
    showView('validator');
  }

  async function parseZip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const eocdOffset = findEndOfCentralDirectory(bytes);
    if (eocdOffset < 0) throw new Error('End of central directory not found.');
    const total = view.getUint16(eocdOffset + 10, true);
    const centralOffset = view.getUint32(eocdOffset + 16, true);
    let pos = centralOffset;
    const entries = [];
    for (let i = 0; i < total; i++) {
      if (view.getUint32(pos, true) !== 0x02014b50) break;
      const method = view.getUint16(pos + 10, true);
      const compressedSize = view.getUint32(pos + 20, true);
      const uncompressedSize = view.getUint32(pos + 24, true);
      const fileNameLength = view.getUint16(pos + 28, true);
      const extraLength = view.getUint16(pos + 30, true);
      const commentLength = view.getUint16(pos + 32, true);
      const localOffset = view.getUint32(pos + 42, true);
      const name = decodeBytes(bytes.slice(pos + 46, pos + 46 + fileNameLength));
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      const entry = { name, method, compressedSize, uncompressedSize, size: uncompressedSize };
      if (!name.endsWith('/')) {
        try {
          let data;
          if (method === 0) data = compressed;
          else if (method === 8) data = await inflateRaw(compressed);
          else throw new Error('Unsupported ZIP compression method ' + method);
          entry.data = data;
          if (isTextFile(name.toLowerCase()) && data.length < 1800000) entry.text = decodeBytes(data);
          else entry.binary = true;
        } catch (error) { entry.error = error.message; }
      }
      entries.push(entry);
      pos += 46 + fileNameLength + extraLength + commentLength;
    }
    return entries;
  }

  function findEndOfCentralDirectory(bytes) {
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) return i;
    }
    return -1;
  }
  async function inflateRaw(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('Browser cannot decompress ZIP deflate entries. Try Chrome, Edge, or Safari 17 plus.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function buildZipBlob(files) {
    const names = Object.keys(files).sort();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const name of names) {
      const data = files[name] instanceof Uint8Array ? files[name] : stringToBytes(String(files[name]));
      const nameBytes = stringToBytes(name);
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true); lv.setUint16(8, 0, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length);
      localParts.push(local);
      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
      central.set(nameBytes, 46); centralParts.push(central);
      offset += local.length;
    }
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, names.length, true); ev.setUint16(10, names.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  function crc32(data) {
    const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    }));
    let crc = -1;
    for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  }

  function normalizePath(path) { return String(path || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, ''); }
  function resolvePath(from, ref) {
    if (ref.startsWith('/')) return normalizePath(ref);
    const parts = normalizePath(from).split('/'); parts.pop();
    for (const part of ref.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  }
  function decodeBytes(bytes) { return new TextDecoder('utf-8').decode(bytes); }
  function stringToBytes(text) { return new TextEncoder().encode(text); }
  function bytesToBase64(bytes) {
    let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunk));
    return btoa(binary);
  }
  function cryptoRandom() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function formatBytes(bytes) { if (!bytes) return '0 B'; const units = ['B','KB','MB','GB']; let size = bytes; let unit = 0; while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; } return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
  function badgeClass(status) { return /ready|stable|good|verified|yes/i.test(status) ? 'good' : /broken|bad|do not|no|blocked|missing/i.test(status) ? 'bad' : /warn|needs|not proven|critical|normal/i.test(status) ? 'warn' : 'info'; }
  function downloadText(filename, text) { downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' })); }
  function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200); }

  function injectIcons() {
    const icons = {
      home: '<path d="M4 11.5 12 5l8 6.5V21h-5v-6H9v6H4v-9.5Z"/>',
      refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"/>',
      dashboard: '<path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z"/>',
      upload: '<path d="M12 16V4m0 0 5 5m-5-5-5 5M4 16v4h16v-4"/>',
      notes: '<path d="M6 3h9l3 3v15H6V3Zm8 0v5h5M8 12h8M8 16h8M8 8h3"/>',
      shield: '<path d="M12 3 20 7v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Zm-3 9 2 2 5-5"/>',
      wrench: '<path d="M21 7.5a6 6 0 0 1-7.7 7.7L7 21l-4-4 5.8-6.3A6 6 0 0 1 16.5 3L13 6.5 14.5 8 18 4.5c1.8.6 3 1.7 3 3Z"/>',
      version: '<path d="M12 8v5l3 2M4 12a8 8 0 1 0 2.3-5.7M4 4v6h6"/>',
      handoff: '<path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3ZM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3Zm0 2c-2.7 0-5 1.3-5 3v2h10v-2c0-1.7-2.3-3-5-3Zm8 0c-.8 0-1.5.1-2.2.4 1.3.9 2.2 2 2.2 3.6v1h5v-2c0-1.7-2.3-3-5-3Z"/>',
      github: '<path d="M12 2a10 10 0 0 0-3.2 19c.5.1.7-.2.7-.5v-2c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.2-4.7-5A3.9 3.9 0 0 1 6.6 8c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.9 1.1A10 10 0 0 1 12 6c.8 0 1.7.1 2.4.3 2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.8c0 3.9-2.4 4.7-4.7 5 .4.3.8 1 .8 2v2.9c0 .3.2.6.8.5A10 10 0 0 0 12 2Z"/>',
      report: '<path d="M5 3h14v18H5V3Zm4 5h6M9 12h6M9 16h4"/>'
    };
    document.querySelectorAll('[data-icon]').forEach(el => {
      const path = icons[el.dataset.icon] || icons.dashboard;
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    });
  }

  init();
})();
