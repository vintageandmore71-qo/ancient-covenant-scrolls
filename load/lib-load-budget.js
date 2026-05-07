// Load — Provider Budget / Cost Guard (reliability addendum #8)
//
// Future-safe guard so paid providers never run by accident, and so a
// monthly USD cap blocks runaway use even after the user has opted in.
//
// A provider is considered "paid" when its registry row is
// providerType=cloud-optional AND its capabilities.free flag is NOT set.
// Free-tier providers (huggingface, cloudflare, together, openrouter
// :free, gemini free tier, etc.) are NOT paid — they only need a
// user-supplied free key.
//
// Public API:
//   window.LoadBudget.init()                            -> Promise<state>
//   window.LoadBudget.isPaid(providerId)                -> bool
//   window.LoadBudget.listPaid()                        -> [provider]
//   window.LoadBudget.setAllowPaid(on)                  -> Promise<bool>
//   window.LoadBudget.setMonthlyCapUsd(cap)             -> Promise<number>
//   window.LoadBudget.recordUse(providerId, costUsd)    -> Promise<bool>
//   window.LoadBudget.getRecentUse(limit)               -> Promise<[record]>
//   window.LoadBudget.getMonthlyTotalUsd()              -> Promise<number>
//   window.LoadBudget.checkPaidUse(providerId, costUsd) -> Promise<{allowed, reason, currentTotal, projectedTotal}>
//   window.LoadBudget.subscribe(fn)                     -> unsubscribe()
//   window.LoadBudget.getState()                        -> { allowPaid, monthlyCapUsd }

(function () {
'use strict';

var KEY_ALLOW = 'budget-allow-paid';
var KEY_CAP = 'budget-monthly-cap-usd';
var KEY_USE_PREFIX = 'budget-use-';
var SUBS = [];
var STATE = { allowPaid: false, monthlyCapUsd: 0 };
var INIT_PROMISE = null;

function getDB() { return (typeof window !== 'undefined' && window.LoadDB) ? window.LoadDB : null; }
function getRegistry() { return (typeof window !== 'undefined' && window.LoadProviderRegistry) ? window.LoadProviderRegistry : null; }

function isPaid(providerId) {
  var R = getRegistry(); if (!R) return false;
  var p = R.byId(providerId); if (!p) return false;
  if (p.providerType !== 'cloud-optional') return false;
  return !p.capabilities.free;
}

function listPaid() {
  var R = getRegistry(); if (!R) return [];
  return R.list().filter(function (p) { return p.providerType === 'cloud-optional' && !p.capabilities.free; });
}

// Three-bucket classification (per 5.7 user feedback):
//   'free'                       — built-in / free-api / local / prompt-only / user-imported,
//                                  OR cloud-optional with free flag and no requiresApiKey
//   'license-review-required'    — cloud-optional with free flag AND requiresApiKey
//                                  (free tier, but the user must verify the licence on each
//                                  imported / generated asset before commercial use)
//   'paid'                       — cloud-optional WITHOUT free flag (real money risk)
function classification(providerId) {
  var R = getRegistry(); if (!R) return 'unknown';
  var p = R.byId(providerId); if (!p) return 'unknown';
  if (p.providerType !== 'cloud-optional') return 'free';
  if (!p.capabilities.free) return 'paid';
  if (p.capabilities.requiresApiKey) return 'license-review-required';
  return 'free';
}

function listLicenseReviewRequired() {
  var R = getRegistry(); if (!R) return [];
  return R.list().filter(function (p) { return classification(p.providerId) === 'license-review-required'; });
}

function notify() {
  var snap = { allowPaid: STATE.allowPaid, monthlyCapUsd: STATE.monthlyCapUsd };
  SUBS.forEach(function (fn) { try { fn(snap); } catch (_) {} });
}

function init() {
  if (INIT_PROMISE) return INIT_PROMISE;
  var db = getDB();
  if (!db) { INIT_PROMISE = Promise.resolve(STATE); return INIT_PROMISE; }
  INIT_PROMISE = Promise.all([
    db.get('kv', KEY_ALLOW).catch(function () { return null; }),
    db.get('kv', KEY_CAP).catch(function () { return null; })
  ]).then(function (rows) {
    STATE.allowPaid = !!(rows[0] && rows[0].on);
    STATE.monthlyCapUsd = (rows[1] && typeof rows[1].cap === 'number') ? rows[1].cap : 0;
    return STATE;
  });
  return INIT_PROMISE;
}

function setAllowPaid(on) {
  on = !!on;
  STATE.allowPaid = on;
  notify();
  var db = getDB();
  if (!db) return Promise.resolve(on);
  return db.put('kv', KEY_ALLOW, { on: on, savedAt: new Date().toISOString() }).then(function () { return on; }).catch(function () { return on; });
}

function setMonthlyCapUsd(cap) {
  cap = Math.max(0, +cap || 0);
  STATE.monthlyCapUsd = cap;
  notify();
  var db = getDB();
  if (!db) return Promise.resolve(cap);
  return db.put('kv', KEY_CAP, { cap: cap, savedAt: new Date().toISOString() }).then(function () { return cap; }).catch(function () { return cap; });
}

function recordUse(providerId, costUsd) {
  var db = getDB(); if (!db) return Promise.resolve(false);
  var key = KEY_USE_PREFIX + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  var rec = { providerId: providerId || '', costUsd: Math.max(0, +costUsd || 0), at: new Date().toISOString() };
  return db.put('kv', key, rec).then(function () { return true; }).catch(function () { return false; });
}

function getRecentUse(limit) {
  var db = getDB(); if (!db) return Promise.resolve([]);
  return db.getAll('kv', 5000).then(function (rows) {
    return rows
      .filter(function (r) { return typeof r.key === 'string' && r.key.indexOf(KEY_USE_PREFIX) === 0 && r.value && r.value.at; })
      .map(function (r) { return r.value; })
      .sort(function (a, b) { return (a.at < b.at) ? 1 : -1; })
      .slice(0, limit || 100);
  });
}

function getMonthlyTotalUsd(year, month) {
  var now = new Date();
  var y = (year != null) ? year : now.getFullYear();
  var m = (month != null) ? month : now.getMonth();
  return getRecentUse(10000).then(function (records) {
    return records.filter(function (r) {
      var d = new Date(r.at);
      return d.getFullYear() === y && d.getMonth() === m;
    }).reduce(function (s, r) { return s + (r.costUsd || 0); }, 0);
  });
}

// Returns { allowed: bool, reason: string, currentTotal?, projectedTotal? }
// Never auto-allows paid: when allowPaid is off, always returns false
// for paid providers. When allowPaid is on but a positive cap would be
// exceeded by adding costUsd, also returns false.
function checkPaidUse(providerId, costUsd) {
  if (!isPaid(providerId)) {
    return Promise.resolve({ allowed: true, reason: 'provider is not paid' });
  }
  if (!STATE.allowPaid) {
    return Promise.resolve({ allowed: false, reason: 'allowPaid is off (default) — paid providers blocked' });
  }
  var est = Math.max(0, +costUsd || 0);
  // Per 5.7 feedback #6: a monthly cap is required before any paid provider can run.
  if (STATE.monthlyCapUsd <= 0) {
    return Promise.resolve({ allowed: false, reason: 'monthly cap required — set a monthly USD cap before any paid provider can run' });
  }
  return getMonthlyTotalUsd().then(function (total) {
    var projected = total + est;
    if (projected > STATE.monthlyCapUsd) {
      return { allowed: false, reason: 'monthly cap $' + STATE.monthlyCapUsd.toFixed(2) + ' would be exceeded (current $' + total.toFixed(2) + ' + est $' + est.toFixed(2) + ' = $' + projected.toFixed(2) + ')', currentTotal: total, projectedTotal: projected };
    }
    return { allowed: true, reason: 'within cap', currentTotal: total, projectedTotal: projected };
  });
}

function subscribe(fn) {
  if (typeof fn !== 'function') return function () {};
  SUBS.push(fn);
  return function () { var i = SUBS.indexOf(fn); if (i >= 0) SUBS.splice(i, 1); };
}

function getState() { return { allowPaid: STATE.allowPaid, monthlyCapUsd: STATE.monthlyCapUsd }; }

if (typeof window !== 'undefined') {
  window.LoadBudget = {
    init: init,
    isPaid: isPaid,
    listPaid: listPaid,
    listLicenseReviewRequired: listLicenseReviewRequired,
    classification: classification,
    setAllowPaid: setAllowPaid,
    setMonthlyCapUsd: setMonthlyCapUsd,
    recordUse: recordUse,
    getRecentUse: getRecentUse,
    getMonthlyTotalUsd: getMonthlyTotalUsd,
    checkPaidUse: checkPaidUse,
    subscribe: subscribe,
    getState: getState
  };
  init();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { init: init, isPaid: isPaid, listPaid: listPaid, setAllowPaid: setAllowPaid, setMonthlyCapUsd: setMonthlyCapUsd, recordUse: recordUse, getRecentUse: getRecentUse, getMonthlyTotalUsd: getMonthlyTotalUsd, checkPaidUse: checkPaidUse, subscribe: subscribe, getState: getState };
}
})();
