// Load — Security Scanner library
// Implements Load_Main_Claude_Handoff_Report Section 10 / Part E.
//
// Exposes window.LoadSafetyScanner with three public functions:
//   scanFileName(name)            -> issues[]   (filename-only checks)
//   scanContent(name, text)       -> issues[]   (filename + text content checks)
//   scanZip(zip, opts) -> Promise<{ issues, byFile, blockers, blockExport,
//                                    summary, securityReport }>
//
// Each issue follows the exact shape required by Section 10:
//   { issue, file, severity, recommendedFix, blocksExport }
//
// Severity levels: BLOCKER, HIGH, MEDIUM, LOW, INFO.
// Block export by default when ANY BLOCKER issue is present.

(function(){
'use strict';

var LEVELS = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

// ---- file-extension blockers ----
var EXEC_RX = /\.(exe|bat|cmd|sh|app|dmg|msi|com|scr|jar|ps1|vbs|wsf)$/i;
var DOT_ENV_RX = /(^|\/)\.env(\.|$)/i;

// ---- text-content patterns ----
var PATTERNS = [
  // BLOCKERs
  { id: 'api-key', severity: 'BLOCKER', blocksExport: true,
    rx: /(api[_-]?key|secret|access[_-]?token|auth[_-]?token|bearer\s+token)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i,
    issue: 'Hard-coded API key or secret detected',
    fix: 'Remove the key from the package; require user entry in Settings at runtime.' },
  { id: 'credential-form', severity: 'BLOCKER', blocksExport: true,
    rx: /<form[\s\S]{0,400}?(type\s*=\s*["']password["']|name\s*=\s*["'](?:password|cvv|card[_-]?number|api[_-]?key|ssn|social[_-]?security)["'])[\s\S]*?<\/form>/i,
    issue: 'Credential / payment / API-key capture form detected',
    fix: 'Remove or replace with a settings prompt the user opts into.' },
  { id: 'malicious-redirect', severity: 'BLOCKER', blocksExport: true,
    rx: /(?:window\.location|location\.href|location\.replace|top\.location)\s*=\s*['"]https?:\/\/[^'"]+['"]/i,
    test: function(s){
      // Only flag when the redirect URL is clearly hostile (verify/login/account/secure language nearby).
      if (!this.rx.test(s)) return false;
      return /\b(verify|secure|login|account|update|password|wallet|signin|sign-in)\b/i.test(s);
    },
    issue: 'Malicious-looking redirect script detected',
    fix: 'Remove the redirect or move it to a user-initiated action.' },
  { id: 'path-traversal', severity: 'BLOCKER', blocksExport: true,
    rx: /(?:href|src|url|path)\s*=\s*["'][^"']*\.\.\/[^"']*\.\.\/|\.\.\/\.\.\/(?:etc|root|home|var|usr|sys|windows|users|appdata|library)\b/i,
    issue: 'Path traversal attempt detected',
    fix: 'Replace with a relative path that stays inside the package root.' },
  { id: 'external-script', severity: 'BLOCKER', blocksExport: true,
    rx: /<script[^>]+src\s*=\s*["']https?:\/\/[^"']+["']/i,
    issue: 'Dangerous external script tag detected',
    fix: 'Inline the script or remove it. Offline PWAs must not depend on external CDNs.' },
  { id: 'sw-network-hijack', severity: 'BLOCKER', blocksExport: true,
    rx: /self\.addEventListener\s*\(\s*["']fetch["'][\s\S]*?fetch\s*\(\s*["']https?:\/\/(?!localhost)[^"']+["']/i,
    issue: 'Service worker forwards every fetch to an external URL',
    fix: 'Restrict the SW fetch handler to local resources or trusted origins only.' },

  // HIGHs
  { id: 'javascript-url', severity: 'HIGH', blocksExport: false,
    rx: /(?:href|src|action)\s*=\s*["']javascript:/i,
    issue: 'javascript: URL detected (XSS risk)',
    fix: 'Replace with an event handler bound via addEventListener.' },
  { id: 'absolute-local-path', severity: 'HIGH', blocksExport: false,
    rx: /(?:href|src|url|window\.open\()\s*=?\s*["'](?:file:\/\/|\/Users\/|\/home\/|C:\\\\|D:\\\\)/i,
    issue: 'Absolute local-filesystem path detected',
    fix: 'Replace with a relative path or remove.' },
  { id: 'large-data-url', severity: 'HIGH', blocksExport: false,
    test: function(s){
      var m = s.match(/data:(?:image|application)\/[^;,]+;base64,([A-Za-z0-9+/=]+)/);
      return !!(m && m[1] && m[1].length > 200000);
    },
    issue: 'Very large embedded data: URL (>150 KB) detected',
    fix: 'Move the asset to assets/ and reference by relative path.' },
  { id: 'inline-event-handler', severity: 'LOW', blocksExport: false,
    rx: /\son(click|change|input|load|error|submit|blur|focus|keydown|keyup|mouseover|mouseout)\s*=\s*["']/i,
    issue: 'Inline DOM event handler attribute detected',
    fix: 'Bind via addEventListener for stricter Content Security Policy support.' },

  // MEDIUMs
  { id: 'hidden-iframe', severity: 'MEDIUM', blocksExport: false,
    rx: /<iframe[^>]+(?:hidden|style\s*=\s*["'][^"']*display\s*:\s*none|width\s*=\s*["']?0|height\s*=\s*["']?0)/i,
    issue: 'Hidden iframe detected',
    fix: 'Remove or make the iframe explicit and visible.' },
  { id: 'tracking-pixel', severity: 'MEDIUM', blocksExport: false,
    rx: /<img[^>]+(width\s*=\s*["']?1["']?\s+height\s*=\s*["']?1|src\s*=\s*["'][^"']*(?:track|pixel|beacon|analytics)[^"']*)/i,
    issue: 'Tracking pixel pattern detected',
    fix: 'Remove. Load packages should not include third-party tracking.' },
  { id: 'external-stylesheet', severity: 'MEDIUM', blocksExport: false,
    rx: /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:\/\//i,
    issue: 'External stylesheet — offline mode may break',
    fix: 'Inline or self-host the stylesheet inside the package.' }
];

function makeIssue(p, file){
  return {
    issue: p.issue,
    file: file || '',
    severity: p.severity,
    recommendedFix: p.fix,
    blocksExport: !!p.blocksExport
  };
}

function scanFileName(name){
  var issues = [];
  if (EXEC_RX.test(name)) {
    issues.push({
      issue: 'Executable file present in package',
      file: name,
      severity: 'BLOCKER',
      recommendedFix: 'Remove. PWAs must not bundle native executables.',
      blocksExport: true
    });
  }
  if (DOT_ENV_RX.test(name)) {
    issues.push({
      issue: 'Hidden environment file (.env) bundled',
      file: name,
      severity: 'BLOCKER',
      recommendedFix: 'Remove. Secrets must not ship with the package.',
      blocksExport: true
    });
  }
  // .DS_Store / Thumbs.db / .git is INFO not BLOCKER
  if (/(^|\/)(\.DS_Store|Thumbs\.db|\.git\/)/i.test(name)) {
    issues.push({
      issue: 'OS / VCS metadata file in package',
      file: name,
      severity: 'INFO',
      recommendedFix: 'Optional cleanup; remove during build.',
      blocksExport: false
    });
  }
  return issues;
}

function scanContent(name, text){
  if (text == null) return [];
  if (typeof text !== 'string') {
    try { text = new TextDecoder('utf-8', { fatal: false }).decode(text); }
    catch (e) { return []; }
  }
  var issues = scanFileName(name);
  for (var i = 0; i < PATTERNS.length; i++) {
    var p = PATTERNS[i];
    var hit = false;
    if (typeof p.test === 'function') hit = p.test(text);
    else if (p.rx) hit = p.rx.test(text);
    if (hit) issues.push(makeIssue(p, name));
  }
  return issues;
}

function summarize(issues){
  var counts = { BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  issues.forEach(function(it){ counts[it.severity] = (counts[it.severity] || 0) + 1; });
  return counts;
}

function scanZip(zip, opts){
  opts = opts || {};
  var maxSize = opts.maxFileBytes || (5 * 1024 * 1024);
  var names = Object.keys(zip.files || {});
  var promises = names.map(function(name){
    var f = zip.files[name];
    if (f.dir) return Promise.resolve({ name: name, issues: [] });
    var nameIssues = scanFileName(name);
    var isText = /\.(html?|htm|js|mjs|css|json|txt|md|xml|svg|webmanifest|ts|jsx|tsx|csv|tsv|env)$/i.test(name);
    if (!isText) {
      // Binary — only filename + size checks.
      return f.async('uint8array').then(function(bytes){
        if (bytes.length > maxSize) {
          nameIssues.push({
            issue: 'Oversized file (' + (bytes.length / 1024 / 1024).toFixed(1) + ' MB)',
            file: name,
            severity: 'LOW',
            recommendedFix: 'Compress or omit if not required at runtime.',
            blocksExport: false
          });
        }
        return { name: name, issues: nameIssues };
      });
    }
    return f.async('string').then(function(text){
      var contentIssues = scanContent(name, text);
      if (text.length > maxSize) {
        contentIssues.push({
          issue: 'Oversized text file (' + (text.length / 1024 / 1024).toFixed(1) + ' MB)',
          file: name,
          severity: 'LOW',
          recommendedFix: 'Split the file or compress before bundling.',
          blocksExport: false
        });
      }
      return { name: name, issues: contentIssues };
    });
  });
  return Promise.all(promises).then(function(perFile){
    var allIssues = [];
    var byFile = {};
    perFile.forEach(function(r){
      if (r.issues.length) byFile[r.name] = r.issues;
      r.issues.forEach(function(i){ allIssues.push(i); });
    });
    var blockers = allIssues.filter(function(i){ return i.blocksExport; });
    var summary = summarize(allIssues);
    var report = {
      tool: 'Load Safety Scanner',
      spec: 'Load_Main_Claude_Handoff_Report Section 10 (Part E)',
      generatedAt: new Date().toISOString(),
      blockExport: blockers.length > 0,
      counts: summary,
      blockers: blockers.map(stripFile),
      issues: allIssues.map(stripFile)
    };
    return {
      issues: allIssues,
      byFile: byFile,
      blockers: blockers,
      blockExport: blockers.length > 0,
      summary: summary,
      securityReport: report
    };
  });
}
function stripFile(i){
  return {
    issue: i.issue,
    file: i.file,
    severity: i.severity,
    recommendedFix: i.recommendedFix,
    blocksExport: i.blocksExport
  };
}

window.LoadSafetyScanner = {
  LEVELS: LEVELS,
  scanFileName: scanFileName,
  scanContent: scanContent,
  scanZip: scanZip,
  summarize: summarize
};
})();
