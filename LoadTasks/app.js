(function () {
  'use strict';

  const STORE_KEY = 'loadTasksWorkspaceV4';
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
    return { projects: [], versions: [], stableBuilds: [], tasks: [], reports: [], buildMemory: {}, settings: {} };
  }

  function saveState() {
    state.activeProject = current.project;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    renderAll();
  }

  function $(selector, root = document) { return root.querySelector(selector); }
  function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function bindIf(selector, eventName, handler) { const el = $(selector); if (el) el.addEventListener(eventName, handler); }

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
      const repair = event.target.closest('[data-repair-action]');
      if (repair) {
        handleRepairCardAction(repair.dataset.repairAction, repair.dataset.repairId);
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
    $('#createRepairPackBtn').addEventListener('click', createRepairPack);
    $('#guidedRepairBtn').addEventListener('click', startGuidedRepair);
    $('#applyAllSafeBtn').addEventListener('click', previewSafePatch);
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

    bindIf('#saveProjectMemoryBtn', 'click', saveProjectMemory);
    bindIf('#exportProjectMemoryBtn', 'click', exportProjectMemory);
    bindIf('#markVaultStableBtn', 'click', markVaultStable);
    bindIf('#exportStableVaultBtn', 'click', exportStableVaultReport);
    bindIf('#generateChangelogBtn', 'click', exportChangelog);
    bindIf('#compareBuildsV4Btn', 'click', compareBuildsV4);
    bindIf('#exportRollbackV4Btn', 'click', exportRollbackGuideV4);
    bindIf('#auditPromisesBtn', 'click', runPromiseAuditV2);
    bindIf('#exportFeatureMatrixBtn', 'click', exportFeatureMatrixV4);
    bindIf('#exportFalsePositiveBtn', 'click', exportFalsePositiveReportV4);
    bindIf('#generateCertificateBtn', 'click', () => renderLaunchCertificate(true));
    bindIf('#downloadCertificateBtn', 'click', downloadLaunchCertificate);
    bindIf('#downloadLaunchChecklistBtn', 'click', downloadLaunchChecklistV4);
    bindIf('#focusDoNextBtn', 'click', goToFocusNextAction);
    bindIf('#focusRefreshBtn', 'click', renderFocusMode);
    bindIf('#downloadProjectMemoryFromVersions', 'click', exportProjectMemory);
    bindIf('#downloadLaunchReadinessFromVersions', 'click', downloadLaunchCertificate);
  }

  function showView(view) {
    document.body.classList.add('app-open');
    $all('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    $all('[data-route]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    if (view === 'handoff') updateHandoffPreview();
    if (view === 'vault') renderProjectVault();
    if (view === 'library') { renderBuildPlanLibrary(); renderPromiseAudit(); }
    if (view === 'certificate') renderLaunchCertificate();
    if (view === 'focus') renderFocusMode();
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
    renderProjectVault();
    renderBuildPlanLibrary();
    renderPromiseAudit();
    renderLaunchCertificate();
    renderFocusMode();
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
    const safe = analysis ? buildRepairCommandItems('safe') : [];
    const review = analysis ? buildRepairCommandItems('review') : [];
    $('#safeFixList').innerHTML = safe.length ? safe.map(renderRepairCard).join('') : '<div class="empty-state">Run the validator to see safe repair actions.</div>';
    $('#developerFixList').innerHTML = review.length ? review.map(renderRepairCard).join('') : '<div class="empty-state">No review or developer-required fixes listed yet.</div>';
    $('#repairWizardText').textContent = analysis ? wizardTextForAnalysis(analysis) : 'Run the validator first. Then Load Tasks will show the next safe repair step.';
  }

  function renderRepairCard(item) {
    const actions = item.actions.map(action => `<button class="small-btn" data-repair-action="${escapeHtml(action)}" data-repair-id="${escapeHtml(item.id)}">${escapeHtml(actionLabel(action))}</button>`).join('');
    return `<div class="fix-item repair-card ${escapeHtml(item.levelClass)}">
      <div class="repair-card-head"><strong>${escapeHtml(item.title)}</strong><span class="badge ${badgeClass(item.confidence)}">${escapeHtml(item.confidence)}</span></div>
      <p>${escapeHtml(item.description)}</p>
      <small>Acceptance test: ${escapeHtml(item.acceptance)}</small>
      <div class="button-row repair-actions">${actions}</div>
    </div>`;
  }

  function actionLabel(action) {
    const labels = { explain: 'Explain', prepare: 'Prepare Fix', apply: 'Apply Safe Patch', task: 'Export Developer Task', issue: 'Create GitHub Issue' };
    return labels[action] || action;
  }

  function buildRepairCommandItems(group) {
    const analysis = current.analysis;
    if (!analysis) return [];
    const items = [];
    const names = (current.zipEntries || []).map(e => normalizePath(e.name));
    const hasNested = analysis.summary.hasIndex && !analysis.summary.rootIndex;
    const hasHtml = names.some(n => /\.html?$/i.test(n));
    const textMap = zipTextMap();
    const duplicateCount = countDuplicateIdIssues(textMap);
    const emptyLinkCount = countEmptyLinks(textMap);
    const missingCsp = countMissingCsp(textMap);
    const brokenRefs = findBrokenReferences(textMap, new Set(names));
    const hasApple = names.includes('apple-touch-icon.png');

    if (group === 'safe') {
      if (hasNested) items.push(repairItem('flatten', 'Flatten for GitHub Pages', 'Move the real app root to the export root, add .nojekyll, add 404.html, and write upload instructions.', 'Safe with Review', 'index.html, manifest.json, service-worker.js, assets, .nojekyll, and 404.html exist at export root.', ['explain','prepare','apply','task']));
      if (!analysis.summary.readmePath) items.push(repairItem('readme', 'Add README_OPEN_FIRST.md', 'Create clear opening, upload, and troubleshooting directions.', 'Safe', 'README_OPEN_FIRST.md exists in the export.', ['explain','prepare','apply']));
      if (!analysis.summary.securityPath) items.push(repairItem('security', 'Add SECURITY.md', 'Create safe upload, CSP, token, and rollback rules.', 'Safe', 'SECURITY.md exists in the export.', ['explain','prepare','apply']));
      if (!hasApple) items.push(repairItem('apple-icon', 'Fix iPad Home Screen icon', 'Copy an app icon to root as apple-touch-icon.png and add Apple icon metadata.', 'Safe with Review', 'apple-touch-icon.png opens directly from the hosted folder.', ['explain','prepare','apply','task']));
      if (!analysis.summary.manifestPath) items.push(repairItem('manifest', 'Add manifest.json', 'Create a basic standalone PWA manifest.', 'Safe', 'manifest.json is valid JSON and display is standalone.', ['explain','prepare','apply']));
      if (!analysis.summary.swPath) items.push(repairItem('sw', 'Add service-worker.js', 'Create a simple offline cache service worker.', 'Safe', 'service-worker.js has install, fetch, and cache logic.', ['explain','prepare','apply']));
    } else {
      if (duplicateCount) items.push(repairItem('duplicate-ids', 'Fix duplicate HTML IDs', `${duplicateCount} duplicate ID issue(s) found. Keep first ID and rename later duplicates.`, 'Safe with Review', 'No duplicate IDs remain and labels still point to valid IDs.', ['explain','prepare','apply','task','issue']));
      if (emptyLinkCount) items.push(repairItem('empty-links', 'Convert placeholder links', `${emptyLinkCount} placeholder link(s) or empty actions found. Convert safe anchors to buttons and create handler stubs.`, 'Instruction Only', 'No href="#" links remain unless intentionally documented.', ['explain','prepare','apply','task','issue']));
      if (missingCsp) items.push(repairItem('csp', 'Add Static PWA CSP', `${missingCsp} HTML file(s) have no visible Content Security Policy.`, 'Safe with Review', 'CSP meta tag exists and app still opens after upload.', ['explain','prepare','apply','task']));
      if (brokenRefs.length) items.push(repairItem('asset-paths', 'Repair asset paths', `${brokenRefs.length} missing asset reference(s) found. Repair only where one clear file match exists.`, 'Safe with Review', 'All repaired references point to real files.', ['explain','prepare','apply','task','issue']));
      (analysis.developerFixes || []).slice(0, 10).forEach((fix, index) => {
        const id = 'dev-' + index;
        if (!items.find(x => x.description === fix.description)) items.push(repairItem(id, fix.title, fix.description, 'Developer Required', 'Developer confirms implementation and QA passes.', ['explain','task','issue']));
      });
    }
    return items;
  }

  function repairItem(id, title, description, confidence, acceptance, actions) {
    return { id, title, description, confidence, acceptance, actions, levelClass: confidence.toLowerCase().replace(/\s+/g, '-') };
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


  function zipTextMap() {
    const map = new Map();
    (current.zipEntries || []).forEach(entry => {
      if (!entry.name.endsWith('/') && typeof entry.text === 'string') map.set(normalizePath(entry.name), entry.text);
    });
    return map;
  }

  function countDuplicateIdIssues(textMap) {
    let count = 0;
    for (const [name, text] of textMap) if (/\.html?$/i.test(name)) count += findDuplicateIds(text).length;
    return count;
  }

  function countEmptyLinks(textMap) {
    let count = 0;
    for (const [name, text] of textMap) if (/\.html?$/i.test(name)) count += (text.match(/href=["']#(["'])/gi) || []).length + (text.match(/href=["']javascript:void\(0\)["']/gi) || []).length;
    return count;
  }

  function countMissingCsp(textMap) {
    let count = 0;
    for (const [name, text] of textMap) if (/\.html?$/i.test(name) && !/Content-Security-Policy/i.test(text)) count++;
    return count;
  }

  function wizardTextForAnalysis(analysis) {
    if (!analysis) return 'Run the validator first.';
    if (analysis.score < 50) return 'Stop deployment. Create a repair pack and restore the last stable version.';
    if (analysis.safeFixes && analysis.safeFixes.length) return 'Apply safe patches first. Export a rollback ZIP before uploading changes.';
    if (analysis.developerFixes && analysis.developerFixes.length) return 'Export developer tasks. Do not mark complete until a person verifies risky work.';
    return 'Run hosted QA. Only mark complete after the live site opens and tests pass.';
  }

  function startGuidedRepair() {
    if (!current.analysis) { showView('validator'); toast('Run the validator first.'); return; }
    const lines = ['Guided Repair Wizard', '', 'Step 1: Export a rollback ZIP.', 'Step 2: Apply safe patches only.', 'Step 3: Create a repair pack.', 'Step 4: Upload repaired files to GitHub.', 'Step 5: Test the live URL.', 'Step 6: Mark verified only if the live test passes.', '', 'Next action: ' + wizardTextForAnalysis(current.analysis)];
    $('#repairLog').textContent = lines.join('\n');
    toast('Guided repair steps prepared.');
  }

  function handleRepairCardAction(action, id) {
    const item = [...buildRepairCommandItems('safe'), ...buildRepairCommandItems('review')].find(x => x.id === id) || repairItem(id, id, 'Developer task selected.', 'Developer Required', 'Developer verifies fix.', ['task']);
    if (action === 'explain') showRepairExplanation(item);
    if (action === 'prepare') prepareRepair(item);
    if (action === 'apply') applySingleRepair(item);
    if (action === 'task') downloadText(`Load_Tasks_Task_${safeFileName(item.id)}.md`, buildDeveloperTask(item));
    if (action === 'issue') downloadText(`GitHub_Issue_${safeFileName(item.id)}.md`, buildGithubIssueForItem(item));
  }

  function showRepairExplanation(item) {
    $('#repairLog').textContent = `${item.title}\n\nWhy it matters:\n${item.description}\n\nConfidence: ${item.confidence}\n\nAcceptance test:\n${item.acceptance}\n\nStatus after patch: Patched, Needs QA. Do not mark Complete until tested.`;
  }

  async function prepareRepair(item) {
    const files = await buildRepairedFiles([item.id], false);
    const changed = Object.keys(files).sort().slice(0, 80);
    $('#repairLog').textContent = `Prepared fix: ${item.title}\n\nFiles in preview:\n${changed.join('\n') || 'No files prepared.'}\n\nNo files have been uploaded yet. Export a repair pack or fixed ZIP after review.`;
  }

  async function applySingleRepair(item) {
    if (/Developer Required|Instruction Only/i.test(item.confidence) && !confirm('This item may require developer review. Export a repair package anyway?')) return;
    const files = await buildRepairedFiles([item.id], true);
    downloadBlob(`Load_Tasks_${safeFileName(item.id)}_Patch.zip`, buildZipBlob(files));
    $('#repairLog').textContent = `Patch exported for ${item.title}.\n\nStatus: Patched, Needs QA.\n\nUpload the patched files, then run the live site test before marking verified.`;
  }

  async function previewSafePatch() {
    if (!current.analysis) { toast('Run validator first.'); return; }
    const ids = buildRepairCommandItems('safe').map(i => i.id);
    const files = await buildRepairedFiles(ids, false);
    $('#repairLog').textContent = `Safe patch preview prepared.\n\nRepair IDs:\n${ids.join('\n') || 'None'}\n\nFiles that would be exported:\n${Object.keys(files).sort().join('\n')}`;
  }

  async function createRepairPack() {
    if (!current.analysis) { toast('Run validator first.'); return; }
    const ids = [...buildRepairCommandItems('safe'), ...buildRepairCommandItems('review')].filter(i => !/Developer Required/i.test(i.confidence)).map(i => i.id);
    const repaired = await buildRepairedFiles(ids, true);
    const pack = {};
    Object.entries(repaired).forEach(([path, data]) => { pack['repaired-files/' + path] = data; });
    pack['reports/repair-report.md'] = stringToBytes(buildMarkdownReport());
    pack['reports/developer-required-fixes.md'] = stringToBytes(buildDeveloperRequiredReport());
    pack['reports/qa-checklist.md'] = stringToBytes(buildRepairQaChecklist());
    pack['reports/github-upload-instructions.md'] = stringToBytes(buildDeployChecklist());
    pack['prompts/claude-repair-prompt.txt'] = stringToBytes(buildClaudePrompt());
    pack['prompts/human-developer-task-list.txt'] = stringToBytes(buildHumanDeveloperTaskList());
    pack['rollback/ROLLBACK_REPORT.md'] = stringToBytes(buildMarkdownReport());
    pack['manifest-of-changes.json'] = stringToBytes(JSON.stringify({ createdAt: new Date().toISOString(), project: current.project.name, appliedRepairIds: ids, status: 'Patched, Needs QA' }, null, 2));
    downloadBlob('Load_Tasks_Repair_Pack.zip', buildZipBlob(pack));
    $('#repairLog').textContent = 'Repair Pack exported. Status remains Patched, Needs QA until live testing passes.';
  }

  async function buildRepairedFiles(ids, includeReports) {
    let files = await currentFilesForExport(false);
    if (!Object.keys(files).length) files['README_OPEN_FIRST.md'] = stringToBytes(buildOpeningGuide());
    if (ids.includes('flatten')) files = applyFlattenForGithub(files);
    if (ids.includes('manifest')) files['manifest.json'] = stringToBytes(JSON.stringify(sampleManifest(), null, 2));
    if (ids.includes('sw')) files['service-worker.js'] = stringToBytes(sampleServiceWorker());
    if (ids.includes('readme')) files['README_OPEN_FIRST.md'] = stringToBytes(buildOpeningGuide());
    if (ids.includes('security')) files['SECURITY.md'] = stringToBytes(buildSecurityGuide());
    if (ids.includes('apple-icon')) files = applyAppleIconFix(files);
    if (ids.includes('duplicate-ids')) files = applyDuplicateIdFix(files);
    if (ids.includes('empty-links')) files = applyPlaceholderLinkFix(files);
    if (ids.includes('csp')) files = applyCspFix(files);
    if (ids.includes('asset-paths')) files = applyAssetPathFix(files);
    if (includeReports) {
      files['LOAD_TASKS_REPAIR_REPORT.md'] = stringToBytes(buildRepairSummary(ids));
      files['LOAD_TASKS_QA_CHECKLIST.md'] = stringToBytes(buildRepairQaChecklist());
    }
    return files;
  }

  function applyFlattenForGithub(files) {
    const names = Object.keys(files);
    if (files['index.html']) {
      files['.nojekyll'] = stringToBytes('');
      files['404.html'] = stringToBytes(simple404());
      files['GITHUB_PAGES_FIX_README.md'] = stringToBytes(buildDeployChecklist());
      return files;
    }
    const index = names.find(n => /\/index\.html$/i.test(n));
    if (!index) return files;
    const prefix = index.replace(/index\.html$/i, '');
    const out = {};
    Object.entries(files).forEach(([path, data]) => {
      if (path.startsWith(prefix)) out[path.slice(prefix.length)] = data;
      else out[path] = data;
    });
    out['.nojekyll'] = stringToBytes('');
    out['404.html'] = stringToBytes(simple404());
    out['GITHUB_PAGES_FIX_README.md'] = stringToBytes(buildDeployChecklist());
    return out;
  }

  function simple404() {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./index.html"><title>Load Tasks</title></head><body><p>Redirecting to the app.</p><p><a href="./index.html">Open app</a></p></body></html>';
  }

  function applyAppleIconFix(files) {
    const iconPath = Object.keys(files).find(n => /apple-touch-icon\.png$/i.test(n)) || Object.keys(files).find(n => /(180x180|192x192|icon).*\.png$/i.test(n));
    if (iconPath) files['apple-touch-icon.png'] = files[iconPath];
    Object.keys(files).filter(n => /\.html?$/i.test(n)).forEach(path => {
      let text = bytesToText(files[path]);
      if (!/<head[\s>]/i.test(text)) return;
      text = text.replace(/\s*<link[^>]+rel=["']apple-touch-icon["'][^>]*>\s*/gi, '\n');
      text = text.replace(/\s*<meta[^>]+name=["']apple-mobile-web-app-title["'][^>]*>\s*/gi, '\n');
      text = text.replace(/\s*<meta[^>]+name=["']apple-mobile-web-app-capable["'][^>]*>\s*/gi, '\n');
      const block = '\n  <link rel="apple-touch-icon" href="apple-touch-icon.png">\n  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">\n  <meta name="apple-mobile-web-app-title" content="Load Tasks">\n  <meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="mobile-web-app-capable" content="yes">\n';
      text = text.replace(/<\/head>/i, block + '</head>');
      files[path] = stringToBytes(text);
    });
    return files;
  }

  function applyDuplicateIdFix(files) {
    Object.keys(files).filter(n => /\.html?$/i.test(n)).forEach(path => {
      let text = bytesToText(files[path]);
      const seen = new Map();
      const changes = [];
      text = text.replace(/id=(["'])([^"']+)\1/gi, (m, quote, id) => {
        const count = seen.get(id) || 0;
        seen.set(id, count + 1);
        if (count === 0) return m;
        const next = `${id}_${count + 1}`;
        changes.push([id, next]);
        return `id=${quote}${next}${quote}`;
      });
      changes.forEach(([oldId, newId]) => {
        const labelRegex = new RegExp(`for=(["'])${escapeRegExp(oldId)}\\1`, 'i');
        text = text.replace(labelRegex, `for="${newId}"`);
      });
      if (changes.length) files[path] = stringToBytes(text);
    });
    return files;
  }

  function applyPlaceholderLinkFix(files) {
    const stub = `\n<script>\ndocument.querySelectorAll('[data-action]').forEach(function(button){\n  button.addEventListener('click', function(){\n    console.warn('Action needs implementation:', button.dataset.action);\n  });\n});\n</script>\n`;
    Object.keys(files).filter(n => /\.html?$/i.test(n)).forEach(path => {
      let text = bytesToText(files[path]);
      text = text.replace(/<a\b([^>]*)href=["']#(["'])([^>]*)>([\s\S]*?)<\/a>/gi, (m, before, q, after, label) => {
        const clean = stripTags(label).trim() || 'Action';
        const action = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unimplemented-action';
        return `<button type="button" data-action="${action}"${before}${after}>${label}</button>`;
      });
      if (!/Action needs implementation/i.test(text) && text.includes('data-action=')) text = text.replace(/<\/body>/i, stub + '</body>');
      files[path] = stringToBytes(text);
    });
    return files;
  }

  function applyCspFix(files) {
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';">`;
    Object.keys(files).filter(n => /\.html?$/i.test(n)).forEach(path => {
      let text = bytesToText(files[path]);
      if (!/Content-Security-Policy/i.test(text) && /<head[\s>]/i.test(text)) {
        text = text.replace(/<head([^>]*)>/i, `<head$1>\n  ${csp}`);
        files[path] = stringToBytes(text);
      }
    });
    return files;
  }

  function applyAssetPathFix(files) {
    const names = Object.keys(files).map(normalizePath);
    const set = new Set(names);
    Object.keys(files).filter(n => /\.(html?|css)$/i.test(n)).forEach(path => {
      let text = bytesToText(files[path]);
      text = text.replace(/(src|href)=(["'])([^"'#][^"']+)\2/gi, (m, attr, quote, ref) => {
        if (/^(https?:|data:|mailto:|tel:|javascript:)/i.test(ref)) return m;
        const clean = ref.split('?')[0].split('#')[0];
        const resolved = normalizePath(resolvePath(path, clean));
        if (set.has(resolved)) return m;
        const base = normalizePath(clean).split('/').pop();
        const matches = names.filter(n => n.endsWith('/' + base) || n === base);
        if (matches.length === 1) return `${attr}=${quote}${relativeFrom(path, matches[0])}${quote}`;
        return m;
      });
      files[path] = stringToBytes(text);
    });
    return files;
  }

  function relativeFrom(from, target) {
    const fromParts = normalizePath(from).split('/'); fromParts.pop();
    const targetParts = normalizePath(target).split('/');
    while (fromParts.length && targetParts.length && fromParts[0] === targetParts[0]) { fromParts.shift(); targetParts.shift(); }
    return '../'.repeat(fromParts.length) + targetParts.join('/');
  }

  function buildDeveloperTask(item) {
    return `# Developer Task: ${item.title}\n\nStatus: ${item.confidence}\n\nProblem:\n${item.description}\n\nAcceptance test:\n${item.acceptance}\n\nRule:\nDo not mark Complete until the live app test passes. If patched but not tested, mark Patched, Needs QA.`;
  }

  function buildGithubIssueForItem(item) {
    return `# ${item.title}\n\n## Evidence\n${item.description}\n\n## Confidence\n${item.confidence}\n\n## Acceptance criteria\n- ${item.acceptance}\n- Final status is not Complete until verification passes.\n\n## QA\n- Upload patched files.\n- Open the hosted site.\n- Test the affected feature.\n- Confirm no new break appeared.`;
  }

  function buildDeveloperRequiredReport() {
    const items = buildRepairCommandItems('review').filter(i => /Developer Required|Instruction Only/i.test(i.confidence));
    return '# Developer Required Fixes\n\n' + (items.length ? items.map(buildDeveloperTask).join('\n\n') : 'No developer-required fixes listed.');
  }

  function buildHumanDeveloperTaskList() {
    const items = buildRepairCommandItems('review');
    return items.length ? items.map(i => `- [ ] ${i.title}: ${i.description}. Acceptance: ${i.acceptance}`).join('\n') : 'No tasks generated.';
  }

  function buildRepairSummary(ids) {
    return `# Load Tasks Repair Summary\n\nProject: ${current.project.name}\nGenerated: ${new Date().toISOString()}\nStatus: Patched, Needs QA\n\nApplied repair IDs:\n${ids.map(id => '- ' + id).join('\n')}\n\nLocked rule: Do not mark Complete until the hosted app test passes.`;
  }

  function buildRepairQaChecklist() {
    return `# Repair QA Checklist\n\n- Open the hosted site over HTTPS.\n- Confirm index.html loads.\n- Confirm assets load.\n- Confirm PWA manifest loads.\n- Confirm service worker registers.\n- Confirm any repaired buttons are tested.\n- Confirm apple-touch-icon.png opens directly if icon repair was applied.\n- Confirm no duplicate IDs remain if duplicate ID repair was applied.\n- Confirm no href="#" placeholders remain unless documented.\n- Mark status Verified only after these tests pass.`;
  }

  function bytesToText(data) { return data instanceof Uint8Array ? decodeBytes(data) : String(data || ''); }
  function safeFileName(name) { return String(name || 'repair').replace(/[^a-z0-9_-]+/gi, '_'); }
  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function stripTags(value) { return String(value).replace(/<[^>]+>/g, ' '); }

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
      fileSizes: Object.fromEntries((current.zipEntries || []).map(e => [e.name, e.size || (e.text ? e.text.length : 0)])),
      contentSignals: buildContentSignals(current.zipEntries || []),
      analysis,
      projectId: current.project.id,
      liveUrl: current.project.liveUrl || '',
      githubPath: current.project.githubPath || '',
      knownBroken: current.project.knownBroken || '',
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


  function buildContentSignals(entries) {
    const signals = {};
    (entries || []).forEach(entry => {
      const name = normalizePath(entry.name);
      const size = entry.size || (entry.text ? entry.text.length : 0);
      const text = typeof entry.text === 'string' ? entry.text : '';
      signals[name] = {
        size,
        hasText: !!text,
        hasManifestLink: /rel=["']manifest["']/i.test(text),
        hasAppleIcon: /apple-touch-icon/i.test(text),
        hasCsp: /Content-Security-Policy/i.test(text),
        placeholderLinks: (text.match(/href=["']#["']|javascript:void\(0\)/gi) || []).length,
        buttonCount: (text.match(/<button\b/gi) || []).length,
        imageRefs: (text.match(/\.(png|jpg|jpeg|webp|gif|svg)/gi) || []).length
      };
    });
    return signals;
  }

  function saveProjectMemory() {
    current.project.liveUrl = ($('#projectLiveUrl') || {}).value || current.project.liveUrl || '';
    current.project.githubPath = ($('#projectGithubPath') || {}).value || current.project.githubPath || '';
    current.project.knownBroken = ($('#projectBrokenNotes') || {}).value || current.project.knownBroken || '';
    current.project.updatedAt = new Date().toISOString();
    state.projects = state.projects || [];
    const index = state.projects.findIndex(p => p.id === current.project.id);
    if (index >= 0) state.projects[index] = current.project;
    else state.projects.unshift(current.project);
    state.buildMemory = state.buildMemory || {};
    state.buildMemory[current.project.id] = {
      project: current.project,
      lastAnalysis: current.analysis || null,
      lastUpdated: new Date().toISOString(),
      tasks: (state.tasks || []).filter(t => t.projectType === current.project.type).slice(0, 80)
    };
    saveState();
    toast('Project memory saved.');
  }

  function renderProjectVault() {
    const live = $('#projectLiveUrl');
    if (!live) return;
    live.value = current.project.liveUrl || '';
    $('#projectGithubPath').value = current.project.githubPath || '';
    $('#projectBrokenNotes').value = current.project.knownBroken || '';

    const stable = state.stableBuilds || [];
    $('#stableVaultList').innerHTML = stable.length ? stable.map(item => `
      <div class="version-item stable-lock">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="badge-row"><span class="badge good">Stable</span><span class="badge info">Score ${escapeHtml(String(item.score || 0))}</span><span class="badge warn">${escapeHtml(item.project || current.project.name)}</span></div>
        <small>${escapeHtml(new Date(item.createdAt).toLocaleString())}</small>
      </div>`).join('') : '<div class="empty-state">No protected stable build yet.</div>';

    $('#versionTimeline').innerHTML = (state.versions || []).length ? state.versions.map((version, index) => `
      <div class="timeline-item">
        <span class="timeline-dot">${index + 1}</span>
        <div>
          <strong>${escapeHtml(version.name)}</strong>
          <div class="badge-row"><span class="badge ${badgeClass(version.status)}">${escapeHtml(version.status)}</span><span class="badge warn">Score ${escapeHtml(String(version.score || 0))}</span><span class="badge info">${escapeHtml(String(version.fileCount || 0))} files</span></div>
          <small>${escapeHtml(new Date(version.createdAt).toLocaleString())}</small>
        </div>
      </div>`).join('') : '<div class="empty-state">No versions saved yet. Upload and analyze a build first.</div>';
  }

  function markVaultStable() {
    if (!current.analysis) { toast('Run the validator before protecting a stable build.'); return; }
    const stable = {
      id: 'stable-' + cryptoRandom(),
      name: current.project.versionName || 'Stable Build',
      project: current.project.name,
      type: current.project.type,
      score: current.analysis.score || 0,
      fileCount: current.zipEntries.length,
      fileNames: current.zipEntries.map(e => e.name),
      analysis: current.analysis,
      createdAt: new Date().toISOString(),
      warning: 'Protected stable build. Do not overwrite without rollback.'
    };
    state.stableBuilds = state.stableBuilds || [];
    state.stableBuilds.unshift(stable);
    saveVersion('Stable');
    saveState();
    toast('Current build protected in Stable Build Vault.');
  }

  function exportProjectMemory() {
    saveProjectMemory();
    const memory = {
      project: current.project,
      activeAnalysis: current.analysis,
      versions: state.versions || [],
      stableBuilds: state.stableBuilds || [],
      tasks: state.tasks || [],
      reports: state.reports || [],
      exportedAt: new Date().toISOString()
    };
    downloadText('Load_Tasks_Project_Memory.json', JSON.stringify(memory, null, 2));
  }

  function exportStableVaultReport() {
    const lines = ['# Stable Build Vault Report', '', `Project: ${current.project.name}`, `Generated: ${new Date().toISOString()}`, ''];
    (state.stableBuilds || []).forEach(item => {
      lines.push(`## ${item.name}`);
      lines.push(`- Status: Stable`);
      lines.push(`- Score: ${item.score}`);
      lines.push(`- File count: ${item.fileCount}`);
      lines.push(`- Date: ${item.createdAt}`);
      lines.push('');
    });
    if (!(state.stableBuilds || []).length) lines.push('No stable builds protected yet.');
    downloadText('Load_Tasks_Stable_Build_Vault_Report.md', lines.join('\n'));
  }

  function compareBuildsV4() {
    const [latest, previous] = state.versions || [];
    const box = $('#buildComparisonV4');
    if (!latest || !previous) {
      if (box) box.textContent = 'Save at least two analyzed versions first.';
      toast('At least two versions are required.');
      return;
    }
    const latestSet = new Set(latest.fileNames || []);
    const previousSet = new Set(previous.fileNames || []);
    const added = [...latestSet].filter(file => !previousSet.has(file));
    const removed = [...previousSet].filter(file => !latestSet.has(file));
    const common = [...latestSet].filter(file => previousSet.has(file));
    const changedSize = common.filter(file => (latest.fileSizes || {})[file] !== (previous.fileSizes || {})[file]);
    const likely = inferLikelyBreakSource(latest, previous, added, removed, changedSize);
    const text = [
      `Comparing latest: ${latest.name}`,
      `Against previous: ${previous.name}`,
      '',
      `Score change: ${(latest.score || 0) - (previous.score || 0)}`,
      '',
      'Files added:',
      added.length ? added.join('\n') : 'None',
      '',
      'Files removed:',
      removed.length ? removed.join('\n') : 'None',
      '',
      'Files changed by size:',
      changedSize.length ? changedSize.join('\n') : 'None',
      '',
      'Likely break source:',
      likely,
      '',
      'Suggested repair order:',
      '1. Restore missing root files first.',
      '2. Check index.html, manifest.json, and service-worker.js.',
      '3. Check assets and icon paths.',
      '4. Run Repair Command Center.',
      '5. Export rollback before upload.'
    ].join('\n');
    if (box) box.textContent = text;
    return text;
  }

  function inferLikelyBreakSource(latest, previous, added, removed, changedSize) {
    const important = ['index.html','manifest.json','service-worker.js','app.js','styles.css'];
    const touchedImportant = important.filter(file => added.includes(file) || removed.includes(file) || changedSize.includes(file));
    if (removed.includes('index.html')) return 'index.html was removed or moved. This can cause a 404 or raw file view.';
    if (removed.some(file => /assets\/images|splash|cover/i.test(file))) return 'Splash, cover, or image asset may have been removed.';
    if (touchedImportant.length) return `Core app file changed: ${touchedImportant.join(', ')}. Review these first.`;
    if ((latest.score || 0) < (previous.score || 0)) return 'Validator score dropped. Review missing files and developer-required fixes.';
    return 'No single break source proven. Run full validator and inspect changed files.';
  }

  function exportChangelog() {
    const lines = ['# Load Tasks Version Changelog', '', `Generated: ${new Date().toISOString()}`, ''];
    (state.versions || []).forEach(version => {
      lines.push(`## ${version.name}`);
      lines.push(`- Status: ${version.status}`);
      lines.push(`- Score: ${version.score}`);
      lines.push(`- Files: ${version.fileCount}`);
      lines.push(`- Date: ${version.createdAt}`);
      if (version.knownBroken) lines.push(`- Known broken: ${version.knownBroken}`);
      lines.push('');
    });
    downloadText('Load_Tasks_Changelog.md', lines.join('\n'));
  }

  function exportRollbackGuideV4() {
    const stable = (state.stableBuilds || [])[0];
    const lines = ['# Rollback Guide', '', `Project: ${current.project.name}`, `Generated: ${new Date().toISOString()}`, ''];
    if (stable) {
      lines.push(`Last protected stable build: ${stable.name}`);
      lines.push(`Stable score: ${stable.score}`);
      lines.push('Use this stable build as the recovery target before applying new fixes.');
    } else {
      lines.push('No stable build has been protected yet. Mark a known working version stable before risky edits.');
    }
    lines.push('', 'Rollback steps:', '1. Stop uploading new fixes.', '2. Download or locate the last stable package.', '3. Replace the broken repo files with the stable files.', '4. Wait for GitHub Pages to rebuild.', '5. Test index.html, splash image, buttons, and Home Screen icon.', '6. Mark the restored version Stable only after live QA.');
    downloadText('Load_Tasks_Rollback_Guide.md', lines.join('\n'));
  }

  const V4_TEMPLATES = {
    'Load Main Master Plan': ['opens PWA projects like apps', 'opens HTML without raw code', 'offline workspace', 'media playback', 'book tools', 'export pipeline', 'splash page', 'hard refresh', 'diagnostics'],
    'LoadPlay Master Plan': ['streaming browse rows', 'creator channels', 'viewer sign in', 'developer sign in', 'subscriber pages', 'YouTube compliant embed rules', 'profanity guardrails', 'nudity guardrails', 'test mode', 'mock activity'],
    'LoadStudio Master Plan': ['scene cards', 'timeline playback', 'character library', 'voice manipulation', 'wardrobe tools', 'lighting filters', 'AI image proof rule', 'provider fallback', 'package export', 'reopen editable package'],
    'Standalone Book PWA Plan': ['cover included', 'full text included', 'images included', 'charts included if promised', 'quizzes functional', 'manifest', 'service worker', 'offline cache', 'navigation works'],
    'GitHub Pages Deployment Plan': ['index.html at published root', 'manifest at root', 'service worker at root', 'assets folder uploaded', '.nojekyll present', 'correct case-sensitive URL', '404 fallback present'],
    'Security Checklist': ['CSP', 'no hidden redirects', 'no credential capture forms', 'no unsafe external scripts', 'token not stored', 'rollback before push'],
    'Dyslexia-Friendly UX Checklist': ['large tap targets', 'plain labels', 'one task at a time', 'line spacing control', 'high contrast', 'reduced motion', 'next best action panel']
  };

  function renderBuildPlanLibrary() {
    const box = $('#buildPlanLibrary');
    if (!box) return;
    box.innerHTML = Object.entries(V4_TEMPLATES).map(([name, items]) => `
      <article class="panel template-card">
        <h2>${escapeHtml(name)}</h2>
        <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <div class="button-row">
          <button class="secondary-action" data-template-name="${escapeHtml(name)}" onclick="window.dispatchEvent(new CustomEvent('loadtasks-template', { detail: '${escapeHtml(name)}' }))">Add to Notes</button>
        </div>
      </article>`).join('');
  }

  window.addEventListener('loadtasks-template', event => {
    const name = event.detail;
    const items = V4_TEMPLATES[name] || [];
    const target = $('#notesInput');
    if (target) {
      target.value += `\n\n${name}\n` + items.map(item => `- ${item}`).join('\n');
      extractTasks(target.value, false);
      toast(`${name} added to notes.`);
    }
  });

  const PROMISE_AUDIT_PATTERNS = [
    { claim: 'Standalone PWA', terms: ['standalone pwa','installable','manifest','service worker'], evidence: () => current.analysis && current.analysis.summary.manifestPath && current.analysis.summary.swPath },
    { claim: 'Splash page included', terms: ['splash','front screen','first screen'], evidence: () => hasFileMatch(/splash|LOAD_TASKS_SPLASH|cover/i) },
    { claim: 'Icons included', terms: ['icon','icons','apple-touch-icon'], evidence: () => current.analysis && current.analysis.summary.iconCount > 0 },
    { claim: 'Offline support', terms: ['offline','cache','service worker'], evidence: () => current.analysis && current.analysis.summary.swPath },
    { claim: 'GitHub ready', terms: ['github ready','github pages','deploy'], evidence: () => hasFileMatch(/\.nojekyll|404\.html|GITHUB/i) },
    { claim: 'All buttons work', terms: ['all buttons work','buttons functional','all pages functional'], evidence: () => current.analysis && !JSON.stringify(current.analysis.categories || []).match(/href=\"#\"|duplicate id|no handler/i) },
    { claim: 'Images included', terms: ['images included','cover included','splash included'], evidence: () => current.analysis && current.analysis.summary.imageCount > 0 },
    { claim: 'Charts included', terms: ['charts included','graphs included','survey charts'], evidence: () => hasFileMatch(/chart|graph|survey/i) },
    { claim: 'Security added', terms: ['security added','csp','sandbox','safe upload'], evidence: () => hasTextMatch(/Content-Security-Policy|SECURITY|sandbox/i) },
    { claim: 'Export working', terms: ['export working','download fixed','zip export'], evidence: () => hasTextMatch(/downloadBlob|buildZipBlob|Export Fixed ZIP/i) }
  ];

  function hasFileMatch(pattern) {
    return (current.zipEntries || []).some(entry => pattern.test(normalizePath(entry.name)));
  }

  function hasTextMatch(pattern) {
    return (current.zipEntries || []).some(entry => typeof entry.text === 'string' && pattern.test(entry.text));
  }

  function runPromiseAuditV2() {
    const notes = (($('#notesInput') || {}).value || current.textNotes || '').toLowerCase();
    const rows = PROMISE_AUDIT_PATTERNS.map(item => {
      const claimed = item.terms.some(term => notes.includes(term));
      const proven = !!item.evidence();
      const status = !claimed ? 'Not claimed' : proven ? 'Verified' : 'Claim Not Proven';
      if (claimed && !proven) {
        const task = makeTask('Promise not proven: ' + item.claim, 'Critical', 'Find file evidence or mark incomplete.', 'Promise Audit v2');
        if (!state.tasks.find(t => t.title === task.title)) state.tasks.push(task);
      }
      return { claim: item.claim, claimed, proven, status };
    });
    state.promiseAudit = { rows, generatedAt: new Date().toISOString() };
    saveState();
    toast('Promise Audit v2 complete.');
  }

  function renderPromiseAudit() {
    const out = $('#promiseAuditOutput');
    const falseOut = $('#falsePositiveOutput');
    if (!out || !falseOut) return;
    const audit = state.promiseAudit || { rows: [] };
    out.innerHTML = audit.rows.length ? audit.rows.map(row => `
      <div class="audit-row"><strong>${escapeHtml(row.claim)}</strong><span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span></div>`).join('') : 'No promise audit has run yet.';
    const claims = buildFalsePositiveRows();
    falseOut.innerHTML = claims.length ? claims.map(row => `
      <div class="audit-row"><strong>${escapeHtml(row.claim)}</strong><span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span><small>${escapeHtml(row.evidence)}</small></div>`).join('') : 'No developer claims found in notes yet.';
  }

  function buildFalsePositiveRows() {
    const notes = (($('#notesInput') || {}).value || current.textNotes || '');
    const rows = [];
    CLAIM_PATTERNS.forEach(claim => {
      if (claim.pattern.test(notes)) {
        let status = 'Claim Not Proven';
        let evidence = 'No file evidence found yet.';
        if (/buttons/i.test(claim.label)) {
          const textMap = zipTextMap();
          const empty = countEmptyLinks(textMap);
          const dup = countDuplicateIdIssues(textMap);
          status = empty || dup ? 'Claim Not Proven' : current.analysis ? 'Needs Human Test' : 'Not enough evidence';
          evidence = `${empty} placeholder link issues and ${dup} duplicate ID issues detected.`;
        } else if (/Standalone/i.test(claim.label)) {
          const ok = current.analysis && current.analysis.summary.manifestPath && current.analysis.summary.swPath;
          status = ok ? 'Verified' : 'Missing';
          evidence = ok ? 'Manifest and service worker found.' : 'Manifest or service worker missing.';
        } else if (/Images/i.test(claim.label)) {
          const ok = current.analysis && current.analysis.summary.imageCount > 0;
          status = ok ? 'Verified' : 'Missing';
          evidence = ok ? `${current.analysis.summary.imageCount} image files found.` : 'No image assets found.';
        } else if (/Security/i.test(claim.label)) {
          const ok = hasTextMatch(/Content-Security-Policy|SECURITY|sandbox/i);
          status = ok ? 'Partially Present' : 'Claim Not Proven';
          evidence = ok ? 'Some security text or CSP found. Manual security review still required.' : 'No CSP or security file evidence found.';
        }
        rows.push({ claim: claim.label, status, evidence });
      }
    });
    return rows;
  }

  function exportFeatureMatrixV4() {
    const rows = [['Template','Required feature','Status']];
    Object.entries(V4_TEMPLATES).forEach(([name, items]) => items.forEach(item => rows.push([name, item, 'Required'])));
    downloadText('Load_Tasks_Feature_Matrix_v4.csv', rows.map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n'));
  }

  function exportFalsePositiveReportV4() {
    const lines = ['# False Positive Detector v2 Report', '', `Generated: ${new Date().toISOString()}`, ''];
    buildFalsePositiveRows().forEach(row => {
      lines.push(`## ${row.claim}`);
      lines.push(`- Status: ${row.status}`);
      lines.push(`- Evidence: ${row.evidence}`);
      lines.push('');
    });
    if (lines.length < 5) lines.push('No developer claims detected in pasted notes.');
    downloadText('Load_Tasks_False_Positive_Report_v2.md', lines.join('\n'));
  }

  function renderLaunchCertificate(forceGenerate = false) {
    const out = $('#launchCertificateOutput');
    const statusEl = $('#certificateStatus');
    if (!out || !statusEl) return;
    const cert = buildLaunchCertificate();
    statusEl.textContent = cert.status;
    statusEl.className = 'certificate-status ' + badgeClass(cert.status);
    out.textContent = cert.text;
    if (forceGenerate) toast('Launch readiness certificate refreshed.');
  }

  function buildLaunchCertificate() {
    const analysis = current.analysis;
    const critical = [];
    if (!analysis) critical.push('Validator has not run.');
    if (analysis && !analysis.summary.rootIndex) critical.push('index.html is not confirmed at published root.');
    if (analysis && !analysis.summary.manifestPath) critical.push('manifest.json is missing.');
    if (analysis && !analysis.summary.swPath) critical.push('service-worker.js is missing.');
    if (analysis && !analysis.summary.iconCount) critical.push('icons are missing.');
    if (analysis && analysis.score < 85) critical.push('PWA Reality Score is below 85.');
    const status = critical.length ? 'Not Ready' : 'Ready for Live QA';
    const lines = [
      '# Launch Readiness Certificate',
      '',
      `Project: ${current.project.name}`,
      `Type: ${current.project.type}`,
      `Version: ${current.project.versionName}`,
      `Generated: ${new Date().toISOString()}`,
      `Status: ${status}`,
      '',
      '## Evidence',
      `- PWA score: ${analysis ? analysis.score : 'No score'}`,
      `- index.html root: ${analysis && analysis.summary.rootIndex ? 'yes' : 'no'}`,
      `- manifest: ${analysis && analysis.summary.manifestPath ? analysis.summary.manifestPath : 'missing'}`,
      `- service worker: ${analysis && analysis.summary.swPath ? analysis.summary.swPath : 'missing'}`,
      `- icons: ${analysis ? analysis.summary.iconCount : 0}`,
      `- images: ${analysis ? analysis.summary.imageCount : 0}`,
      '',
      '## Critical blockers',
      critical.length ? critical.map(item => `- ${item}`).join('\n') : '- None from automated scan. Manual QA still required.',
      '',
      '## Required live QA',
      '- Open hosted site over HTTPS.',
      '- Confirm splash screen appears first.',
      '- Confirm navigation buttons work.',
      '- Confirm Add to Home Screen icon appears.',
      '- Confirm offline reload after first visit.',
      '- Confirm export buttons download files.',
      '',
      'Locked rule: Do not mark Complete until live QA passes.'
    ];
    return { status, text: lines.join('\n') };
  }

  function downloadLaunchCertificate() {
    downloadText('Load_Tasks_Launch_Readiness_Certificate.md', buildLaunchCertificate().text);
  }

  function downloadLaunchChecklistV4() {
    const text = `# Load Tasks Launch Checklist\n\n- index.html at published root\n- manifest.json loads\n- service-worker.js loads\n- assets folder uploaded\n- splash image visible\n- Home Screen icon visible\n- dashboard opens\n- validator runs\n- Repair Command Center opens\n- Project Vault opens\n- Focus Mode opens\n- export buttons download files\n- no build marked Complete unless verified\n`;
    downloadText('Load_Tasks_Launch_Checklist_v4.md', text);
  }

  function renderFocusMode() {
    const action = computeFocusAction();
    const target = $('#focusNextAction');
    if (!target) return;
    target.textContent = action.text;
    target.dataset.nextView = action.view;
    const health = $('#focusHealth');
    if (health) {
      const analysis = current.analysis;
      health.innerHTML = [
        ['Project', current.project.name],
        ['Status', analysis ? analysis.status : 'Not validated'],
        ['Score', analysis ? analysis.score : 0],
        ['Versions', (state.versions || []).length],
        ['Stable builds', (state.stableBuilds || []).length]
      ].map(([label, value]) => `<div class="metric-card"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`).join('');
    }
    const steps = $('#focusSteps');
    if (steps) {
      steps.innerHTML = computeFocusSteps().map(step => `<li>${escapeHtml(step)}</li>`).join('');
    }
  }

  function computeFocusAction() {
    if (!current.uploadedFiles.length && !(current.zipEntries || []).length) return { view: 'intake', text: 'Upload the latest build ZIP first.' };
    if (!current.analysis) return { view: 'validator', text: 'Run the validator so Load Tasks can see what is missing.' };
    if (current.analysis.score < 70) return { view: 'fix', text: 'Open Repair Command Center and apply only safe patches.' };
    if (!(state.stableBuilds || []).length) return { view: 'vault', text: 'Protect the current working version in the Stable Build Vault.' };
    if (current.analysis.cannotComplete) return { view: 'library', text: 'Run Promise Audit v2 and check claims that are not proven.' };
    return { view: 'certificate', text: 'Generate the Launch Readiness Certificate, then do live iPad QA.' };
  }

  function computeFocusSteps() {
    const action = computeFocusAction();
    const base = [
      'Do one step at a time.',
      action.text,
      'Export a rollback before uploading a repair.',
      'Test the hosted site after upload.',
      'Mark Verified only after the live test passes.'
    ];
    return base;
  }

  function goToFocusNextAction() {
    const action = computeFocusAction();
    showView(action.view);
  }


  async function exportFixedZip() {
    const ids = current.analysis ? buildRepairCommandItems('safe').map(i => i.id) : ['manifest','sw','readme','security','apple-icon'];
    const files = await buildRepairedFiles(ids, true);
    const blob = buildZipBlob(files);
    downloadBlob('Load_Tasks_Fixed_Package.zip', blob);
    toast('Fixed ZIP exported. Status remains Patched, Needs QA.');
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
      report: '<path d="M5 3h14v18H5V3Zm4 5h6M9 12h6M9 16h4"/>',
      vault: '<path d="M5 21V7l7-4 7 4v14H5Zm4-9h6M9 16h6"/>',
      library: '<path d="M4 5c2-1 4-1 6 0v14c-2-1-4-1-6 0V5Zm10 0c2-1 4-1 6 0v14c-2-1-4-1-6 0V5Z"/>',
      certificate: '<path d="M6 3h12v18l-6-3-6 3V3Zm3 5h6M9 12h6"/>',
      focus: '<path d="M12 3a9 9 0 1 0 9 9h-5a4 4 0 1 1-4-4V3Z"/>'
    };
    document.querySelectorAll('[data-icon]').forEach(el => {
      const path = icons[el.dataset.icon] || icons.dashboard;
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    });
  }

  init();
})();
