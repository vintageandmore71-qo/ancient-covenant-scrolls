/* ═══════════════════════════════════════════════════════
   LOADPLAY — app.js
   Full YouTube-like PWA logic
═══════════════════════════════════════════════════════ */
'use strict';

/* ── DATA ──────────────────────────────────────────── */
const COLORS = [
  ['#7c3aed','#00e5ff'], ['#f97316','#ef4444'], ['#00c853','#00e5ff'],
  ['#ec4899','#8b5cf6'], ['#0ea5e9','#06b6d4'], ['#a3e635','#00c853'],
  ['#f59e0b','#ef4444'], ['#6366f1','#8b5cf6']
];

const CHANNELS = [
  { name:'TechCraft Studio', subs:'2.3M subscribers', color:COLORS[0] },
  { name:'DevFlow',          subs:'890K subscribers', color:COLORS[2] },
  { name:'Nile Docs',        subs:'1.4M subscribers', color:COLORS[3] },
  { name:'AfroCode',         subs:'560K subscribers', color:COLORS[4] },
  { name:'GameVault',        subs:'3.1M subscribers', color:COLORS[1] },
  { name:'WorldView',        subs:'4.2M subscribers', color:COLORS[5] },
  { name:'SoundWave',        subs:'1.8M subscribers', color:COLORS[6] },
  { name:'ScienceHouse',     subs:'720K subscribers', color:COLORS[7] }
];

const VIDEOS = [
  { id:1,  title:'Introduction to Offline-First PWA Development',         ch:0, views:'2.3M', ago:'3 days ago',  dur:'18:42', cat:'tech',      live:false },
  { id:2,  title:'Ancient African Mathematics and Number Systems',         ch:3, views:'1.1M', ago:'1 week ago',  dur:'24:10', cat:'education', live:false },
  { id:3,  title:'Top 10 Open-World Games You Must Play in 2025',         ch:4, views:'4.5M', ago:'2 days ago',  dur:'15:33', cat:'gaming',    live:false },
  { id:4,  title:'Ethiopian Jazz — Full Live Session 2025',                ch:6, views:'890K', ago:'5 hours ago', dur:'52:18', cat:'music',     live:true  },
  { id:5,  title:'How Service Workers Enable Offline Experiences',        ch:1, views:'760K', ago:'2 weeks ago', dur:'22:05', cat:'tech',      live:false },
  { id:6,  title:'The Nile Corridor — Origins of Civilization (Part 1)',  ch:2, views:'3.2M', ago:'1 month ago', dur:'46:30', cat:'education', live:false },
  { id:7,  title:'Building Reactive UIs with Vanilla JavaScript',         ch:1, views:'430K', ago:'4 days ago',  dur:'31:14', cat:'tech',      live:false },
  { id:8,  title:'Afrobeats Production Masterclass — Drums & Bass',       ch:6, views:'2.1M', ago:'6 days ago',  dur:'38:55', cat:'music',     live:false },
  { id:9,  title:'BREAKING — Open Source AI Summit Highlights',           ch:5, views:'980K', ago:'1 hour ago',  dur:'14:20', cat:'news',      live:false },
  { id:10, title:'Street Food Tour — Lagos to Accra',                     ch:5, views:'1.7M', ago:'3 weeks ago', dur:'27:44', cat:'travel',    live:false },
  { id:11, title:'WebAssembly Explained — Why It Matters',                ch:1, views:'540K', ago:'10 days ago', dur:'19:08', cat:'tech',      live:false },
  { id:12, title:'Kenyan Wildlife 4K Drone Footage — Maasai Mara',       ch:5, views:'5.6M', ago:'2 months ago',dur:'8:22',  cat:'travel',    live:false },
  { id:13, title:'Full Match Replay — AFCON Quarter Final 2025',         ch:4, views:'6.1M', ago:'Yesterday',   dur:'1:52:00',cat:'sports',   live:false },
  { id:14, title:'Jollof Wars — Nigerian vs Ghanaian — Blind Taste Test', ch:5, views:'2.8M', ago:'1 week ago',  dur:'12:40', cat:'cooking',   live:false },
  { id:15, title:'TypeScript 5.5 — New Features Deep Dive',              ch:0, views:'320K', ago:'2 days ago',  dur:'28:17', cat:'tech',      live:false },
  { id:16, title:'Amharic For Beginners — Full Course',                   ch:3, views:'940K', ago:'5 months ago',dur:'1:14:50',cat:'education',live:false },
];

const DESCRIPTIONS = [
  'An in-depth walkthrough covering architecture, service workers, cache strategies, and how to build truly resilient web applications that work without a network connection.',
  'Exploring ancient numeral systems from Egypt, Ethiopia, and Mali — and how they influenced modern mathematics.',
  'A curated countdown of the most immersive open-world titles released or updated this year.',
  'Live concert recorded in Addis Ababa featuring some of the finest jazz musicians from across the continent.',
  'Understanding how service workers intercept network requests and enable advanced caching strategies for offline-capable apps.',
  'A documentary series tracing the archaeological record along the Nile Valley — from Nubia through Egypt.',
  'Build fully interactive UIs without a framework. This tutorial covers reactivity, state management, and DOM diffing from scratch.',
  'Professional producers break down the science and feel behind Afrobeats rhythm production — beats, bass lines, and arrangement.',
  'Highlights and panel discussions from this year\'s open source AI summit featuring researchers and engineers.',
  'A food and culture journey along the West African coast.',
];

/* ── STATE ──────────────────────────────────────────── */
const state = {
  activeView:   'home',
  currentVideo: null,
  playerOpen:   false,
  importOpen:   false,
  sidebarOpen:  false,
  likedVideos:  new Set(),
  savedVideos:  new Set(),
  subscribedCh: new Set(),
  localVideos:  [],
  activeCategory: 'all',
  isPlaying:    false,
  volume:       1,
  progress:     0,
  progressInterval: null,
};

/* ── DOM REFS ──────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const splash        = $('splash');
const app           = $('app');
const menuBtn       = $('menuBtn');
const sidebar       = $('sidebar');
const sidebarOvl    = $('sidebarOverlay');
const mainContent   = $('mainContent');
const categoriesBar = $('categoriesBar');
const heroCard      = $('heroCard');
const trendingRow   = $('trendingRow');
const recommendedGrid = $('recommendedGrid');
const recentRow     = $('recentRow');

const playerModal   = $('playerModal');
const videoEl       = $('videoEl');
const fakeScreen    = $('fakeScreen');
const playPauseBtn  = $('playPauseBtn');
const playIcon      = $('playIcon');
const pauseIcon     = $('pauseIcon');
const progressTrack = $('progressTrack');
const progressFill  = $('progressFill');
const progressThumb = $('progressThumb');
const currentTimeEl = $('currentTime');
const durationEl    = $('durationEl');
const muteBtn       = $('muteBtn');
const volSlider     = $('volSlider');

const importModal   = $('importModal');
const fileInput     = $('fileInputHidden');
const fileInputDrop = $('fileInputDrop');
const dropZone      = $('dropZone');
const offlineBanner = $('offlineBanner');
const toastContainer= $('toastContainer');

/* ── INIT ──────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => {
    splash.classList.add('done');
    app.classList.remove('hidden');
    renderAll();
    registerSW();
    checkOnline();
    handleURLParams();
  }, 2400);
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function handleURLParams() {
  const p = new URLSearchParams(location.search);
  if (p.get('action') === 'import') openImport();
  if (p.get('view')) switchView(p.get('view'));
}

/* ── RENDER ────────────────────────────────────────── */
function renderAll() {
  renderHero();
  renderTrending();
  renderRecommended();
  renderRecent();
}

function getThumbBg(video) {
  const ch = CHANNELS[video.ch];
  const [c1, c2] = ch.color;
  const patterns = [
    `radial-gradient(ellipse 60% 50% at 30% 40%, ${c1}33, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 60%, ${c2}22, transparent 70%), linear-gradient(135deg, #0a1535, #0d1f4a)`,
    `linear-gradient(135deg, ${c1}44, ${c2}22, #080d1f)`,
    `radial-gradient(circle at 20% 80%, ${c2}44, transparent 55%), radial-gradient(circle at 80% 20%, ${c1}33, transparent 55%), #0a1535`,
    `conic-gradient(from 45deg, ${c1}22, ${c2}22, ${c1}11, #0d1128)`,
  ];
  return patterns[video.id % patterns.length];
}

function makeGridCard(video, rank) {
  const ch = CHANNELS[video.ch];
  const [c1, c2] = ch.color;
  const initial = ch.name[0];
  const desc = DESCRIPTIONS[video.id % DESCRIPTIONS.length];
  const likes = (Math.floor(Math.random() * 90) + 10) + 'K';

  const div = document.createElement('div');
  div.className = 'gcard';
  div.dataset.id = video.id;
  div.innerHTML = `
    <div class="gcard-thumb">
      <div class="gcard-thumb-bg" style="background:${getThumbBg(video)};width:100%;height:100%;"></div>
      <div class="gcard-overlay">
        <div class="gcard-play"><svg viewBox="0 0 24 24" fill="white" width="20" height="20"><polygon points="5,3 19,12 5,21"/></svg></div>
      </div>
      ${rank ? `<div class="rank-badge">${rank}</div>` : ''}
      ${video.live ? '<div class="vcard-live">● LIVE</div>' : `<div class="gcard-duration">${video.dur}</div>`}
    </div>
    <div class="gcard-body">
      <div class="gcard-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${initial}</div>
      <div class="gcard-info">
        <div class="gcard-title">${video.title}</div>
        <div class="gcard-meta"><span class="gcard-ch">${ch.name}</span><br>${video.views} views · ${video.ago}</div>
      </div>
    </div>
  `;
  div.addEventListener('click', () => openPlayer(video, desc, likes));
  return div;
}

function makeScrollCard(video, rank) {
  const ch = CHANNELS[video.ch];
  const [c1, c2] = ch.color;
  const desc = DESCRIPTIONS[video.id % DESCRIPTIONS.length];
  const likes = (Math.floor(Math.random() * 90) + 10) + 'K';

  const div = document.createElement('div');
  div.className = 'vcard';
  div.dataset.id = video.id;
  div.innerHTML = `
    <div class="vcard-thumb">
      <div class="vcard-thumb-bg" style="background:${getThumbBg(video)};width:100%;height:100%;aspect-ratio:16/9;"></div>
      <div class="vcard-overlay">
        <div class="vcard-play"><svg viewBox="0 0 24 24" fill="white" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg></div>
      </div>
      ${rank ? `<div class="rank-badge">${rank}</div>` : ''}
      ${video.live ? '<div class="vcard-live">● LIVE</div>' : `<div class="vcard-duration">${video.dur}</div>`}
    </div>
    <div class="vcard-body">
      <div class="vcard-title">${video.title}</div>
      <div class="vcard-meta"><span class="vcard-ch">${ch.name}</span> · ${video.views} views · ${video.ago}</div>
    </div>
  `;
  div.addEventListener('click', () => openPlayer(video, desc, likes));
  return div;
}

function renderHero() {
  const v = VIDEOS[0];
  const ch = CHANNELS[v.ch];
  const [c1, c2] = ch.color;
  heroCard.innerHTML = `
    <div class="hero-thumb" style="aspect-ratio:16/9;position:relative;overflow:hidden;">
      <div class="hero-bg-anim" style="position:absolute;inset:0;background:${getThumbBg(v)};"></div>
      <div class="hero-grid"></div>
      <div class="hero-play-overlay" id="heroPlayOverlay">
        <div class="big-play-btn">
          <svg viewBox="0 0 24 24" fill="white" width="32" height="32"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
      <div class="hero-badge">FEATURED</div>
      <div class="hero-duration" style="position:absolute;bottom:10px;right:10px;">${v.dur}</div>
    </div>
    <div class="hero-info">
      <div class="hero-ch-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${ch.name[0]}</div>
      <div class="hero-meta">
        <div class="hero-title">${v.title}</div>
        <div class="hero-sub">${ch.name} · ${v.views} views · ${v.ago}</div>
      </div>
    </div>
  `;
  heroCard.addEventListener('click', () => openPlayer(v, DESCRIPTIONS[0], '87K'));
}

function renderTrending() {
  trendingRow.innerHTML = '';
  const trending = [...VIDEOS].sort((a,b) => parseFloat(b.views) - parseFloat(a.views)).slice(0,8);
  trending.forEach((v,i) => trendingRow.appendChild(makeScrollCard(v, i+1)));
}

function renderRecommended() {
  recommendedGrid.innerHTML = '';
  VIDEOS.slice(0, 8).forEach(v => recommendedGrid.appendChild(makeGridCard(v)));
}

function renderRecent() {
  recentRow.innerHTML = '';
  [...VIDEOS].reverse().slice(0,8).forEach(v => recentRow.appendChild(makeScrollCard(v)));
}

/* ── FILTER BY CATEGORY ───────────────────────────── */
function filterByCategory(cat) {
  state.activeCategory = cat;
  recommendedGrid.innerHTML = '';
  trendingRow.innerHTML = '';
  recentRow.innerHTML = '';

  const filtered = cat === 'all' ? VIDEOS : VIDEOS.filter(v => v.cat === cat);
  if (filtered.length === 0) {
    recommendedGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No videos found</h3>
        <p>Try a different category or import a local video.</p>
      </div>`;
    return;
  }
  filtered.slice(0,6).forEach(v => recommendedGrid.appendChild(makeGridCard(v)));
  const trending = [...filtered].sort((a,b) => parseFloat(b.views)-parseFloat(a.views)).slice(0,6);
  trending.forEach((v,i) => trendingRow.appendChild(makeScrollCard(v, i+1)));
  [...filtered].reverse().slice(0,6).forEach(v => recentRow.appendChild(makeScrollCard(v)));
}

/* ── PLAYER ─────────────────────────────────────────── */
function openPlayer(video, desc, likes) {
  const ch = CHANNELS[video.ch];
  const [c1, c2] = ch.color;
  state.currentVideo = video;
  state.playerOpen   = true;
  state.isPlaying    = false;
  clearInterval(state.progressInterval);
  state.progress = 0;

  // Reset video element
  videoEl.src = '';
  videoEl.style.display = 'none';
  fakeScreen.style.display = 'flex';

  // Populate UI
  $('playerTopbarTitle').textContent = video.title;
  $('playerVideoTitle').textContent  = video.title;
  $('playerStats').innerHTML = `<span>${video.views} views</span><span>${video.ago}</span>`;
  $('playerDesc').textContent = desc || '';
  $('playerLikes').textContent = likes || '0';
  $('playerChAv').textContent = ch.name[0];
  $('playerChAv').style.background = `linear-gradient(135deg,${c1},${c2})`;
  $('playerChName').textContent = ch.name;
  $('playerChSubs').textContent = ch.subs;
  $('fakeTitle').textContent = video.title;

  // Like / save state
  $('likeBtn').classList.toggle('active', state.likedVideos.has(video.id));
  $('saveBtn').classList.toggle('active', state.savedVideos.has(video.id));
  $('subBtn').className = 'sub-btn' + (state.subscribedCh.has(video.ch) ? ' subbed' : '');
  $('subBtn').textContent = state.subscribedCh.has(video.ch) ? 'Subscribed' : 'Subscribe';

  // Reset progress
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  durationEl.textContent = video.dur;
  setPlayState(false);

  playerModal.classList.remove('hidden');
  requestAnimationFrame(() => playerModal.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  playerModal.classList.remove('open');
  clearInterval(state.progressInterval);
  state.isPlaying = false;
  videoEl.pause();
  setTimeout(() => {
    playerModal.classList.add('hidden');
    videoEl.src = '';
    document.body.style.overflow = '';
    state.playerOpen = false;
  }, 350);
}

function setPlayState(playing) {
  state.isPlaying = playing;
  playIcon.classList.toggle('hidden', playing);
  pauseIcon.classList.toggle('hidden', !playing);
}

function togglePlay() {
  if (videoEl.src && !videoEl.paused !== undefined) {
    // Real video
    if (videoEl.paused) { videoEl.play(); setPlayState(true); }
    else { videoEl.pause(); setPlayState(false); }
    return;
  }
  // Fake progress simulation
  if (state.isPlaying) {
    clearInterval(state.progressInterval);
    setPlayState(false);
  } else {
    setPlayState(true);
    fakeScreen.style.display = 'none';
    state.progressInterval = setInterval(() => {
      state.progress = Math.min(state.progress + 0.003, 1);
      progressFill.style.width = (state.progress * 100) + '%';
      // fake time
      const total = parseDuration(state.currentVideo?.dur || '0:00');
      const cur = Math.floor(state.progress * total);
      currentTimeEl.textContent = formatTime(cur);
      if (state.progress >= 1) {
        clearInterval(state.progressInterval);
        setPlayState(false);
        state.progress = 0;
        progressFill.style.width = '0%';
        fakeScreen.style.display = 'flex';
      }
    }, 100);
  }
}

function parseDuration(str) {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  return (parts[0]||0)*60 + (parts[1]||0);
}
function formatTime(sec) {
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

/* Progress bar click */
progressTrack?.addEventListener('click', e => {
  const rect = progressTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  state.progress = Math.max(0, Math.min(1, pct));
  progressFill.style.width = (state.progress * 100) + '%';
  const total = parseDuration(state.currentVideo?.dur || '0:00');
  currentTimeEl.textContent = formatTime(Math.floor(state.progress * total));
  if (videoEl.duration) videoEl.currentTime = state.progress * videoEl.duration;
});

/* Real video events */
videoEl?.addEventListener('timeupdate', () => {
  if (!videoEl.duration) return;
  const pct = videoEl.currentTime / videoEl.duration;
  progressFill.style.width = (pct*100) + '%';
  currentTimeEl.textContent = formatTime(Math.floor(videoEl.currentTime));
  durationEl.textContent = formatTime(Math.floor(videoEl.duration));
});
videoEl?.addEventListener('play',  () => setPlayState(true));
videoEl?.addEventListener('pause', () => setPlayState(false));
videoEl?.addEventListener('ended', () => { setPlayState(false); progressFill.style.width='0%'; });

/* ── IMPORT LOCAL VIDEO ────────────────────────────── */
function openImport() {
  importModal.classList.remove('hidden');
  requestAnimationFrame(() => importModal.classList.add('open'));
}
function closeImport() {
  importModal.classList.remove('open');
  setTimeout(() => importModal.classList.add('hidden'), 220);
}

function loadLocalFile(file) {
  if (!file || !file.type.startsWith('video/')) {
    showToast('⚠️ Please select a valid video file');
    return;
  }
  closeImport();
  const url = URL.createObjectURL(file);
  const fakeVid = {
    id: Date.now(), title: file.name.replace(/\.[^/.]+$/, ''),
    ch: 0, views: 'Local', ago: 'Just now', dur: '--:--', cat:'local', live:false
  };
  state.localVideos.push(fakeVid);
  openPlayer(fakeVid, 'Local file imported from your device.', '0');
  setTimeout(() => {
    videoEl.src = url;
    videoEl.style.display = 'block';
    fakeScreen.style.display = 'none';
    videoEl.play().catch(()=>{});
  }, 400);
  showToast('✅ Video imported successfully');
}

/* ── DRAG & DROP ───────────────────────────────────── */
dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone?.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  loadLocalFile(e.dataTransfer.files[0]);
});
fileInput?.addEventListener('change', e => loadLocalFile(e.target.files[0]));
fileInputDrop?.addEventListener('change', e => loadLocalFile(e.target.files[0]));

/* ── LIKE / SAVE ────────────────────────────────────── */
$('likeBtn')?.addEventListener('click', () => {
  if (!state.currentVideo) return;
  const id = state.currentVideo.id;
  if (state.likedVideos.has(id)) { state.likedVideos.delete(id); showToast('Removed from liked'); }
  else { state.likedVideos.add(id); showToast('❤️ Added to liked'); }
  $('likeBtn').classList.toggle('active', state.likedVideos.has(id));
});

$('saveBtn')?.addEventListener('click', () => {
  if (!state.currentVideo) return;
  const id = state.currentVideo.id;
  if (state.savedVideos.has(id)) { state.savedVideos.delete(id); showToast('Removed from saved'); }
  else { state.savedVideos.add(id); showToast('🔖 Saved to library'); }
  $('saveBtn').classList.toggle('active', state.savedVideos.has(id));
});

$('subBtn')?.addEventListener('click', () => {
  if (!state.currentVideo) return;
  const ch = state.currentVideo.ch;
  if (state.subscribedCh.has(ch)) {
    state.subscribedCh.delete(ch);
    $('subBtn').textContent = 'Subscribe';
    $('subBtn').classList.remove('subbed');
    showToast('Unsubscribed');
  } else {
    state.subscribedCh.add(ch);
    $('subBtn').textContent = 'Subscribed';
    $('subBtn').classList.add('subbed');
    showToast(`🔔 Subscribed to ${CHANNELS[ch].name}`);
  }
});

$('shareBtn')?.addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({ title: state.currentVideo?.title, url: location.href }).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(location.href).then(() => showToast('🔗 Link copied!'));
  }
});

$('importInPlayerBtn')?.addEventListener('click', openImport);

/* ── SIDEBAR ─────────────────────────────────────── */
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOvl.classList.add('open');
  state.sidebarOpen = true;
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOvl.classList.remove('open');
  state.sidebarOpen = false;
}

menuBtn?.addEventListener('click', () => state.sidebarOpen ? closeSidebar() : openSidebar());
sidebarOvl?.addEventListener('click', closeSidebar);

/* Sidebar nav items */
$$('.sidebar-nav li').forEach(li => {
  li.addEventListener('click', () => {
    $$('.sidebar-nav li').forEach(x => x.classList.remove('active'));
    li.classList.add('active');
    switchView(li.dataset.view);
    closeSidebar();
  });
});

/* ── BOTTOM NAV ──────────────────────────────────── */
$$('.bnav-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.bnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchView(btn.dataset.view);
  });
});
$('fabUploadBtn')?.addEventListener('click', openImport);

/* ── VIEW SWITCHING ──────────────────────────────── */
function switchView(view) {
  state.activeView = view;
  // For now all views show the home content (full SPA routing would need more code)
  // But we scroll to top and show toast for non-home views
  mainContent.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view !== 'home') {
    showToast(`📂 ${view.charAt(0).toUpperCase()+view.slice(1)}`);
  }
}

/* ── SEARCH ─────────────────────────────────────── */
$('searchInput')?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderAll(); return; }
  const results = VIDEOS.filter(v =>
    v.title.toLowerCase().includes(q) || CHANNELS[v.ch].name.toLowerCase().includes(q)
  );
  recommendedGrid.innerHTML = '';
  trendingRow.innerHTML = '';
  recentRow.innerHTML = '';
  if (results.length === 0) {
    recommendedGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>No results for "${e.target.value}"</h3>
        <p>Try a different search term</p>
      </div>`;
    return;
  }
  results.forEach(v => recommendedGrid.appendChild(makeGridCard(v)));
  results.slice(0,6).forEach(v => trendingRow.appendChild(makeScrollCard(v)));
});

/* ── CATEGORIES ──────────────────────────────────── */
$$('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $$('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterByCategory(chip.dataset.cat);
  });
});

/* ── PLAYER CONTROLS ──────────────────────────────── */
playPauseBtn?.addEventListener('click', togglePlay);
$('fakePlayBtn')?.addEventListener('click', togglePlay);

$('playerClose')?.addEventListener('click', closePlayer);

$('fullscreenBtn')?.addEventListener('click', () => {
  const el = $('playerScreen');
  if (!document.fullscreenElement) el.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
});

muteBtn?.addEventListener('click', () => {
  videoEl.muted = !videoEl.muted;
  muteBtn.style.opacity = videoEl.muted ? '0.4' : '1';
});
volSlider?.addEventListener('input', e => {
  videoEl.volume = parseFloat(e.target.value);
  state.volume = videoEl.volume;
});

/* ── UPLOAD BUTTON ───────────────────────────────── */
$('uploadBtn')?.addEventListener('click', openImport);
$('importCancel')?.addEventListener('click', closeImport);
$('importModalOverlay')?.addEventListener('click', closeImport);

/* ── BACK GESTURE / ESC ──────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state.playerOpen) closePlayer();
    else if (importModal.classList.contains('open')) closeImport();
    else if (state.sidebarOpen) closeSidebar();
  }
  if (e.key === ' ' && state.playerOpen) { e.preventDefault(); togglePlay(); }
});

/* ── ONLINE/OFFLINE ──────────────────────────────── */
function checkOnline() {
  const update = () => {
    if (navigator.onLine) offlineBanner.classList.remove('show');
    else offlineBanner.classList.add('show');
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

/* ── TOAST ───────────────────────────────────────── */
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ── PWA INSTALL PROMPT ──────────────────────────── */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => showToast('📲 Add LoadPlay to your home screen!'), 5000);
});
window.addEventListener('appinstalled', () => showToast('✅ LoadPlay installed!'));

/* ── Load-style workspace tile routing (added v1.1) ───────────────────────── */
(function () {
  const map = {
    viewer:      'library',        // Viewer Profiles → Library / saved view
    creator:     'subscriptions',  // Creator Upload → Originals (creator surfaces)
    cleanstream: 'home',           // Clean Stream Rules → Featured (safety surfaces)
    devlab:      'history'         // Developer Lab → PWA Originals (where dev tools live)
  };
  document.querySelectorAll('.lp-ws-tile[data-tile]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const target = map[btn.getAttribute('data-tile')] || 'home';
      try { switchView(target); } catch (_) {}
      // Smooth-scroll past the splash hero into the streaming UI
      const app = document.querySelector('header.topnav');
      if (app) app.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
