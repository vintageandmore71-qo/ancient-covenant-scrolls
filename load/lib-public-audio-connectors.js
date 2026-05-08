// Load — Public audio connectors (optional / future-now-built)
// Copyright (c) 2026 LBond. All Rights Reserved.
//
// URL-paste audio import for free / public-domain / Creative-
// Commons sources. Every connector requires explicit license +
// source metadata before attach so rights.json never silently
// claims "platform-original" for third-party audio.
//
// MVP rule: no API keys. Each connector accepts a direct media
// URL the user already obtained from the source's own search UI,
// fetches it client-side, runs the same magic-byte verifier the
// AI Chat Studio import path uses, and returns a normalized
// payload ready to feed into attachToScene.
//
// Connectors (all FREE; off by default per CLAUDE.md):
//   freesound          — Freesound CC0 / CC-BY URL paste
//   pixabay            — Pixabay sound / music URL paste
//   opengameart        — OpenGameArt CC0 / CC-BY URL paste
//   internet-archive   — Internet Archive public-domain audio
//   wikimedia          — Wikimedia Commons audio
//   openverse          — Openverse (CC search) audio
//
// Plus a procedural ambience generator that needs no network
// access (rain / wind / fire / room-tone / crowd-bed).
//
// HF-audio, local-audio-server, FFmpeg.wasm-mux are scaffolded
// off — the UI surfaces them as "audio provider needed" until
// the user wires a backend.
//
// Public API:
//   window.LoadPublicAudio.list()
//     -> [{ id, name, host, defaultLicense, requiresLicense, hint }]
//   window.LoadPublicAudio.fromUrl(connectorId, url, meta)
//     -> Promise<{ blob, proof, source, license, connectorId, name }>
//   window.LoadPublicAudio.proceduralAmbience(kind, durationSec)
//     -> Promise<{ blob, proof, kind, durationSec }>
//   window.LoadPublicAudio.statusFor(featureId)
//     -> 'available' | 'audio provider needed' | 'audio muxing future'

(function () {
'use strict';

var CONNECTORS = [
  { id: 'freesound',        name: 'Freesound',          host: 'freesound.org',          defaultLicense: 'cc-by',  requiresLicense: true,
    hint: 'Paste the direct download URL of a Freesound CC0 / CC-BY clip you have already vetted. Confirm the license per clip.' },
  { id: 'pixabay',          name: 'Pixabay',            host: 'pixabay.com',            defaultLicense: 'pixabay-content-license', requiresLicense: true,
    hint: 'Paste a Pixabay audio download URL. Pixabay license = free for many uses but not automatically cleared everywhere — confirm per asset.' },
  { id: 'opengameart',      name: 'OpenGameArt',        host: 'opengameart.org',        defaultLicense: 'cc0',    requiresLicense: true,
    hint: 'Paste the file URL from an OpenGameArt entry. License varies (CC0 / CC-BY / GPL / OGA-BY) — pick the matching one.' },
  { id: 'internet-archive', name: 'Internet Archive',   host: 'archive.org',            defaultLicense: 'public-domain', requiresLicense: true,
    hint: 'Paste a direct media URL from archive.org. Confirm the rights statement on the item page.' },
  { id: 'wikimedia',        name: 'Wikimedia Commons',  host: 'commons.wikimedia.org',  defaultLicense: 'cc-by-sa', requiresLicense: true,
    hint: 'Paste a direct file URL from upload.wikimedia.org. Most files are CC-BY-SA or public-domain — confirm the file page.' },
  { id: 'openverse',        name: 'Openverse',          host: 'openverse.org',          defaultLicense: 'cc-by',  requiresLicense: true,
    hint: 'Paste a direct media URL from an Openverse search result. License varies (CC0 / CC-BY / CC-BY-SA) — pick the one shown on the result.' }
];

var FUTURE_FEATURES = {
  'hf-audio':             'audio provider needed',
  'local-audio-server':   'audio provider needed',
  'ffmpeg-wasm-mux':      'audio muxing future'
};

function list() { return CONNECTORS.slice(); }
function statusFor(featureId) { return FUTURE_FEATURES[featureId] || 'available'; }

// Reuse AI Chat Studio's verifyAudioBlob if available, else inline.
function verifyAudioBlob(blob) {
  if (typeof window !== 'undefined' && typeof window.verifyAudioBlob === 'function') {
    return window.verifyAudioBlob(blob);
  }
  return new Promise(function (resolve, reject) {
    if (!blob || blob.size < 64) { reject(new Error('audio blob too small')); return; }
    blob.slice(0, 12).arrayBuffer().then(function (ab) {
      var b = new Uint8Array(ab);
      if (b[0]===0x52 && b[1]===0x49 && b[2]===0x46 && b[3]===0x46 && b[8]===0x57 && b[9]===0x41 && b[10]===0x56 && b[11]===0x45)
        return resolve({ kind: 'audio-blob', subKind: 'wav', mime: 'audio/wav', bytes: blob.size, magic: 'RIFF/WAVE' });
      if (b[0]===0x4F && b[1]===0x67 && b[2]===0x67 && b[3]===0x53)
        return resolve({ kind: 'audio-blob', subKind: 'ogg', mime: 'audio/ogg', bytes: blob.size, magic: 'OggS' });
      if (b[0]===0x49 && b[1]===0x44 && b[2]===0x33)
        return resolve({ kind: 'audio-blob', subKind: 'mp3', mime: 'audio/mpeg', bytes: blob.size, magic: 'ID3' });
      if (b[0]===0xFF && (b[1]===0xFB || b[1]===0xF3 || b[1]===0xF2))
        return resolve({ kind: 'audio-blob', subKind: 'mp3', mime: 'audio/mpeg', bytes: blob.size, magic: 'MPEG-frame' });
      if (b[4]===0x66 && b[5]===0x74 && b[6]===0x79 && b[7]===0x70)
        return resolve({ kind: 'audio-blob', subKind: 'm4a', mime: 'audio/mp4', bytes: blob.size, magic: 'ftyp' });
      if (b[0]===0x1A && b[1]===0x45 && b[2]===0xDF && b[3]===0xA3)
        return resolve({ kind: 'audio-blob', subKind: 'webm', mime: 'audio/webm', bytes: blob.size, magic: 'EBML' });
      reject(new Error('audio magic bytes not recognised'));
    }).catch(reject);
  });
}

function fromUrl(connectorId, url, meta) {
  meta = meta || {};
  var conn = CONNECTORS.filter(function (c) { return c.id === connectorId; })[0];
  if (!conn) return Promise.reject(new Error('unknown connector: ' + connectorId));
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return Promise.reject(new Error('connector "' + connectorId + '" needs an http(s):// URL'));
  }
  // Local-only mode blocks every cloud fetch.
  if (typeof window !== 'undefined' && window.LoadLocalOnly && typeof window.LoadLocalOnly.isOn === 'function' && window.LoadLocalOnly.isOn()) {
    return Promise.reject(new Error('Local-only mode is on — public audio connector "' + conn.name + '" blocked'));
  }
  if (conn.requiresLicense && !meta.license) {
    return Promise.reject(new Error(conn.name + ' requires a license — pick one before import (CC0 / CC-BY / etc.).'));
  }
  return fetch(url, { method: 'GET', cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error(conn.name + ' fetch HTTP ' + r.status);
    return r.blob();
  }).then(function (blob) {
    if (!blob || !blob.size) throw new Error(conn.name + ' returned no file');
    return verifyAudioBlob(blob).then(function (proof) {
      return {
        blob: blob,
        proof: proof,
        connectorId: conn.id,
        name: conn.name,
        source: meta.source || (conn.host + ' — ' + url),
        license: meta.license || conn.defaultLicense,
        sourceUrl: url
      };
    });
  });
}

// On-device procedural ambience — never needs network. Uses
// OfflineAudioContext to render a real WAV blob; keeps the same
// magic-byte proof shape as imported audio.
var KINDS = ['rain', 'wind', 'fire', 'room-tone', 'crowd-bed'];
function proceduralAmbience(kind, durationSec) {
  if (KINDS.indexOf(kind) === -1) return Promise.reject(new Error('unknown ambience kind: ' + kind));
  durationSec = Math.max(1, Math.min(60, durationSec || 6));
  var SR = 44100;
  var Ctx = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
  if (!Ctx) return Promise.reject(new Error('OfflineAudioContext not available'));
  var ctx = new Ctx(2, Math.floor(SR * durationSec), SR);
  // Base white noise.
  var src = ctx.createBufferSource();
  var buf = ctx.createBuffer(1, ctx.length, SR);
  var data = buf.getChannelData(0);
  for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  src.buffer = buf;
  var f = ctx.createBiquadFilter();
  switch (kind) {
    case 'rain':      f.type = 'highpass'; f.frequency.value = 2200; f.Q.value = 0.7; break;
    case 'wind':      f.type = 'bandpass'; f.frequency.value = 400;  f.Q.value = 0.6; break;
    case 'fire':      f.type = 'lowpass';  f.frequency.value = 800;  f.Q.value = 0.5; break;
    case 'room-tone': f.type = 'lowpass';  f.frequency.value = 240;  f.Q.value = 0.4; break;
    case 'crowd-bed': f.type = 'bandpass'; f.frequency.value = 900;  f.Q.value = 0.7; break;
  }
  var g = ctx.createGain(); g.gain.value = (kind === 'room-tone') ? 0.12 : (kind === 'crowd-bed' ? 0.22 : 0.28);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(0);
  return ctx.startRendering().then(function (rendered) {
    var blob = bufferToWav(rendered);
    if (blob.size < 2048) throw new Error('rendered ambience too small');
    return verifyAudioBlob(blob).then(function (proof) {
      return { blob: blob, proof: proof, kind: kind, durationSec: durationSec };
    });
  });
}

function bufferToWav(buffer) {
  var n = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  var bps = 2; var dataLen = len * n * bps;
  var ab = new ArrayBuffer(44 + dataLen); var v = new DataView(ab);
  function s(off, str) { for (var i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); }
  s(0,'RIFF'); v.setUint32(4, 36 + dataLen, true);
  s(8,'WAVE'); s(12,'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, n, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * n * bps, true);
  v.setUint16(32, n * bps, true); v.setUint16(34, 16, true);
  s(36,'data'); v.setUint32(40, dataLen, true);
  var off = 44;
  for (var i2 = 0; i2 < len; i2++) {
    for (var c = 0; c < n; c++) {
      var smp = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i2]));
      v.setInt16(off, smp < 0 ? smp * 0x8000 : smp * 0x7FFF, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

if (typeof window !== 'undefined') {
  window.LoadPublicAudio = {
    list: list, fromUrl: fromUrl,
    proceduralAmbience: proceduralAmbience, statusFor: statusFor,
    KINDS: KINDS
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { list: list, fromUrl: fromUrl, proceduralAmbience: proceduralAmbience, statusFor: statusFor, KINDS: KINDS };
}
})();
