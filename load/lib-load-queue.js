// Load — Generation Queue (reliability addendum #4)
//
// Persistent job lifecycle for image / animation / video / audio / voice
// / package-export jobs. Jobs are stored in LoadDB.kv under the prefix
// 'queue-' so they survive page reloads. Status transitions follow the
// nine spec values; nothing else is allowed.
//
// Public API:
//   window.LoadQueue.STATUSES                              - 9 spec strings
//   window.LoadQueue.enqueue(spec)        -> Promise<job>  - status='Queued'
//   window.LoadQueue.update(jobId, patch) -> Promise<job>  - validates status
//   window.LoadQueue.cancel(jobId)        -> Promise<job>  - sets 'Cancelled'
//   window.LoadQueue.retry(jobId)         -> Promise<job>  - sets 'Retrying' + bumps attempts
//   window.LoadQueue.get(jobId)           -> Promise<job|null>
//   window.LoadQueue.all()                -> Promise<[job]>
//   window.LoadQueue.recent(n)            -> Promise<[job]>
//   window.LoadQueue.subscribe(fn)        -> unsubscribe()  - notifies on every status change
//   window.LoadQueue.clearComplete()      -> Promise<n>     - removes Complete + Cancelled jobs
//
// Job shape:
//   { jobId, kind, intent, prompt, status, progress, attempts, error,
//     result, threadId, sceneId, createdAt, updatedAt }

(function () {
'use strict';

var KEY_PREFIX = 'queue-';
var STATUSES = ['Queued','Preparing','Generating','Saving','Attaching to scene','Complete','Failed','Cancelled','Retrying'];
var SUBS = [];

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }

function notify(job) {
  SUBS.forEach(function (fn) { try { fn(job); } catch (_) {} });
}

function genJobId() {
  return 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function enqueue(spec) {
  var db = getDB(); if (!db) return Promise.reject(new Error('LoadDB unavailable'));
  if (!spec || typeof spec !== 'object') return Promise.reject(new Error('spec must be an object'));
  var nowIso = new Date().toISOString();
  var job = {
    jobId: genJobId(),
    kind: spec.kind || 'unknown',
    intent: spec.intent || '',
    prompt: spec.prompt || '',
    status: 'Queued',
    progress: 0,
    attempts: 0,
    error: null,
    result: null,
    threadId: spec.threadId || '',
    sceneId: spec.sceneId || '',
    provider: spec.provider || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    meta: spec.meta || null
  };
  return db.put('kv', KEY_PREFIX + job.jobId, job).then(function () { notify(job); return job; });
}

function get(jobId) {
  var db = getDB(); if (!db) return Promise.resolve(null);
  return db.get('kv', KEY_PREFIX + jobId).catch(function () { return null; });
}

function update(jobId, patch) {
  var db = getDB(); if (!db) return Promise.reject(new Error('LoadDB unavailable'));
  return db.get('kv', KEY_PREFIX + jobId).then(function (job) {
    if (!job) throw new Error('job not found: ' + jobId);
    if (patch && typeof patch.status === 'string' && STATUSES.indexOf(patch.status) === -1) {
      throw new Error('invalid status: ' + patch.status);
    }
    Object.keys(patch || {}).forEach(function (k) { job[k] = patch[k]; });
    job.updatedAt = new Date().toISOString();
    return db.put('kv', KEY_PREFIX + jobId, job).then(function () { notify(job); return job; });
  });
}

function cancel(jobId) {
  return get(jobId).then(function (job) {
    if (!job) throw new Error('job not found: ' + jobId);
    if (job.status === 'Complete' || job.status === 'Cancelled') return job;
    return update(jobId, { status: 'Cancelled' });
  });
}

function retry(jobId) {
  return get(jobId).then(function (job) {
    if (!job) throw new Error('job not found: ' + jobId);
    var attempts = (typeof job.attempts === 'number' ? job.attempts : 0) + 1;
    return update(jobId, { status: 'Retrying', attempts: attempts, error: null });
  });
}

function all() {
  var db = getDB(); if (!db) return Promise.resolve([]);
  return db.getAll('kv', 2000).then(function (rows) {
    return rows
      .filter(function (r) { return typeof r.key === 'string' && r.key.indexOf(KEY_PREFIX) === 0 && r.value && r.value.jobId; })
      .map(function (r) { return r.value; })
      .sort(function (a, b) { return (a.createdAt < b.createdAt) ? 1 : -1; });
  });
}

function recent(n) {
  return all().then(function (list) { return list.slice(0, n || 50); });
}

function subscribe(fn) {
  if (typeof fn !== 'function') return function () {};
  SUBS.push(fn);
  return function () { var i = SUBS.indexOf(fn); if (i >= 0) SUBS.splice(i, 1); };
}

function clearComplete() {
  var db = getDB(); if (!db) return Promise.resolve(0);
  return all().then(function (list) {
    var doomed = list.filter(function (j) { return j.status === 'Complete' || j.status === 'Cancelled'; });
    return Promise.all(doomed.map(function (j) { return db.delete('kv', KEY_PREFIX + j.jobId); }))
      .then(function () { return doomed.length; });
  });
}

if (typeof window !== 'undefined') {
  window.LoadQueue = {
    STATUSES: STATUSES.slice(),
    enqueue: enqueue,
    get: get,
    update: update,
    cancel: cancel,
    retry: retry,
    all: all,
    recent: recent,
    subscribe: subscribe,
    clearComplete: clearComplete
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STATUSES: STATUSES, enqueue: enqueue, get: get, update: update, cancel: cancel, retry: retry, all: all, recent: recent, subscribe: subscribe, clearComplete: clearComplete };
}
})();
