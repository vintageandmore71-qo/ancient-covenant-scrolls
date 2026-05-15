(function () {
  'use strict';

  var _runs = {};
  var _runCounter = 0;

  // Detect the type of work a pipeline step performs from its name and provider list
  function _detectStepType(stepName) {
    var n = (stepName || '').toLowerCase();
    if (n.indexOf('script') >= 0 || n.indexOf('prompt') >= 0 || n.indexOf('story') >= 0 ||
        n.indexOf('continuity') >= 0 || n.indexOf('director') >= 0 || n.indexOf('llm') >= 0) return 'llm';
    if (n.indexOf('lip') >= 0 || n.indexOf('sync') >= 0) return 'lipsync';
    if (n.indexOf('voice') >= 0 || n.indexOf('tts') >= 0 || n.indexOf('speech') >= 0 ||
        n.indexOf('narrat') >= 0) return 'tts';
    if (n.indexOf('sfx') >= 0 || n.indexOf('sound effect') >= 0 || n.indexOf('foley') >= 0) return 'sfx';
    if (n.indexOf('music') >= 0) return 'music';
    if (n.indexOf('subtitle') >= 0 || n.indexOf('stt') >= 0 || n.indexOf('transcri') >= 0) return 'stt';
    if (n.indexOf('video') >= 0 || n.indexOf('animate') >= 0 || n.indexOf('motion') >= 0 ||
        n.indexOf('i2v') >= 0) return 'video';
    if (n.indexOf('image') >= 0 || n.indexOf('scene') >= 0 || n.indexOf('character') >= 0 ||
        n.indexOf('photo') >= 0 || n.indexOf('visual') >= 0 || n.indexOf('look') >= 0) return 'image';
    if (n.indexOf('assembl') >= 0 || n.indexOf('mix') >= 0 || n.indexOf('render') >= 0 ||
        n.indexOf('export') >= 0 || n.indexOf('composit') >= 0) return 'assemble';
    if (n.indexOf('upscale') >= 0 || n.indexOf('enhance') >= 0 || n.indexOf('restor') >= 0) return 'upscale';
    if (n.indexOf('separat') >= 0 || n.indexOf('demucs') >= 0 || n.indexOf('spleeter') >= 0) return 'audio-sep';
    return 'unknown';
  }

  // Pick the best available provider: prefer one that has a key or endpoint configured,
  // then fall back to any known no-auth provider, then the first known entry.
  function _selectProvider(providerIds) {
    var reg = window.LoadProviderRegistry;
    if (!reg) return providerIds[0] || null;

    var noAuthTypes = ['browser-api', 'wasm', 'local'];

    for (var i = 0; i < providerIds.length; i++) {
      var id = providerIds[i];
      var p = reg.getProvider(id);
      if (!p) continue;
      var s = reg.getProviderSettings ? reg.getProviderSettings(id) : null;
      if (s && (s.apiKey || s.endpoint)) return id;
    }
    for (var j = 0; j < providerIds.length; j++) {
      var id2 = providerIds[j];
      var p2 = reg.getProvider(id2);
      if (!p2) continue;
      if (p2.accessType && noAuthTypes.indexOf(p2.accessType) >= 0) return id2;
      if (!p2.requiresApiKey && !p2.requiresLocalEndpoint) return id2;
    }
    for (var k = 0; k < providerIds.length; k++) {
      if (reg.getProvider(providerIds[k])) return providerIds[k];
    }
    return null;
  }

  // Poll a job until done. Uses exponential backoff capped at 16 s.
  function _pollUntilDone(jobRef, maxWaitMs, intervalMs) {
    var maxWait = maxWaitMs || 300000;
    var interval = intervalMs || 4000;
    var elapsed = 0;
    var reg = window.LoadProviderRegistry;

    return new Promise(function (resolve, reject) {
      function attempt() {
        if (elapsed >= maxWait) {
          reject(new Error('pollUntilDone: timeout after ' + elapsed + 'ms — ' + jobRef.provider));
          return;
        }
        reg.pollJobResult({jobId: jobRef.jobId, providerId: jobRef.provider})
          .then(function (r) {
            if (r && r.done) { resolve(r); return; }
            elapsed += interval;
            setTimeout(attempt, interval);
            if (interval < 16000) interval = Math.min(Math.round(interval * 1.5), 16000);
          })
          .catch(function (e) { reject(e); });
      }
      attempt();
    });
  }

  // Execute a single pipeline step and return a settled result.
  function _runStep(step, inputs, runId) {
    var reg = window.LoadProviderRegistry;
    if (!reg) return Promise.reject(new Error('LoadProviderRegistry not loaded'));

    var run = _runs[runId];
    if (run && run.aborted) return Promise.reject(new Error('pipeline aborted'));

    var providers = step.providers || [];
    var providerId = _selectProvider(providers);
    if (!providerId) return Promise.reject(new Error('No available provider for step: ' + step.name));

    var type = _detectStepType(step.name);
    var request = Object.assign({providerId: providerId}, inputs);
    var callPromise;

    switch (type) {
      case 'llm':
        callPromise = reg.callLLM(request);
        break;
      case 'image':
        callPromise = reg.generateImage(request);
        break;
      case 'video':
        callPromise = reg.generateVideo(request);
        break;
      case 'tts':
        callPromise = reg.generateSpeech(request);
        break;
      case 'lipsync':
        callPromise = reg.generateLipSync
          ? reg.generateLipSync(request)
          : Promise.reject(new Error('generateLipSync not available'));
        break;
      case 'music':
        callPromise = reg.generateMusic
          ? reg.generateMusic(request)
          : reg.searchMusic(request);
        break;
      case 'sfx':
        callPromise = reg.generateMusic
          ? reg.generateMusic(Object.assign({}, request, {type: 'sfx'}))
          : reg.searchSFX(request);
        break;
      case 'stt':
        callPromise = reg.transcribeAudio(request);
        break;
      case 'assemble':
        // Assembly is handled by the calling application (ffmpeg-wasm etc.).
        // The orchestrator passes inputs through so the caller can act on them.
        return Promise.resolve({ok: true, type: 'assemble', provider: providerId, inputs: inputs, step: step.step});
      default:
        callPromise = Promise.reject(new Error('Unknown step type for step: ' + step.name));
    }

    return callPromise.then(function (result) {
      // If provider returned a job ref, poll until the asset is ready.
      if (result && result.jobId &&
          (result.type === 'image-job' || result.type === 'video-job' || result.type === 'transcript-job')) {
        return _pollUntilDone({jobId: result.jobId, provider: result.provider || providerId});
      }
      return result;
    });
  }

  var LoadOrchestrator = {

    // Run a full pipeline.
    // pipelineId  — pipeline key in LoadPipelineRegistry
    // inputs      — starting context: { prompt, text, blob, image, audio, video, ... }
    // onProgress  — optional function(stepNum, stepName, status, result)
    //               status = 'running' | 'ok' | 'error'
    // Returns Promise<{ runId, pipelineId, steps, finalResult }>
    runPipeline: function (pipelineId, inputs, onProgress) {
      var plReg = window.LoadPipelineRegistry;
      if (!plReg) return Promise.reject(new Error('LoadPipelineRegistry not loaded'));

      var pipeline = plReg.getPipeline(pipelineId);
      if (!pipeline) return Promise.reject(new Error('Pipeline not found: ' + pipelineId));

      var runId = 'run-' + (++_runCounter) + '-' + Date.now();
      _runs[runId] = {pipelineId: pipelineId, aborted: false, steps: []};
      var run = _runs[runId];

      var stepResults = [];
      var ctx = Object.assign({}, inputs || {});

      var steps = (pipeline.orderedSteps || []).slice().sort(function (a, b) { return a.step - b.step; });

      function doStep(idx) {
        if (idx >= steps.length) {
          var last = stepResults[stepResults.length - 1] || null;
          return Promise.resolve({runId: runId, pipelineId: pipelineId, steps: stepResults, finalResult: last && last.result});
        }

        var step = steps[idx];
        if (typeof onProgress === 'function') onProgress(step.step, step.name, 'running', null);

        return _runStep(step, ctx, runId).then(function (result) {
          var entry = {step: step.step, name: step.name, provider: result && result.provider, status: 'ok', result: result};
          stepResults.push(entry);
          run.steps.push(entry);

          // Thread outputs into the context for the next step.
          if (result) {
            if (result.url)     ctx.previousUrl     = result.url;
            if (result.text)    ctx.previousText    = result.text;
            if (result.blob)    ctx.previousBlob    = result.blob;
            if (result.dataURL) ctx.previousDataURL = result.dataURL;

            if (result.type === 'text')                    ctx.prompt     = result.text;
            if (result.type === 'image')                   ctx.image      = result.url || result.dataURL;
            if (result.type === 'audio')                   ctx.audio      = result.url || result.blob;
            if (result.type === 'video')                   ctx.video      = result.url;
            if (result.type === 'transcript')              ctx.transcript = result.text;
            if (result.type === 'diarization')             ctx.diarization = result.data;
          }

          if (typeof onProgress === 'function') onProgress(step.step, step.name, 'ok', result);
          return doStep(idx + 1);

        }).catch(function (err) {
          var entry = {step: step.step, name: step.name, status: 'error', error: err && err.message};
          stepResults.push(entry);
          run.steps.push(entry);
          if (typeof onProgress === 'function') onProgress(step.step, step.name, 'error', {error: err && err.message});
          // Continue to next step — partial pipeline output is still useful.
          return doStep(idx + 1);
        });
      }

      return doStep(0);
    },

    // Run a single step from a pipeline without running the whole pipeline.
    // stepNum matches the step.step field (1-based).
    runStep: function (pipelineId, stepNum, inputs) {
      var plReg = window.LoadPipelineRegistry;
      if (!plReg) return Promise.reject(new Error('LoadPipelineRegistry not loaded'));

      var pipeline = plReg.getPipeline(pipelineId);
      if (!pipeline) return Promise.reject(new Error('Pipeline not found: ' + pipelineId));

      var step = (pipeline.orderedSteps || []).filter(function (s) { return s.step === stepNum; })[0];
      if (!step) return Promise.reject(new Error('Step ' + stepNum + ' not in pipeline ' + pipelineId));

      var runId = 'step-' + (++_runCounter) + '-' + Date.now();
      _runs[runId] = {pipelineId: pipelineId, aborted: false, steps: []};
      return _runStep(step, inputs || {}, runId);
    },

    // Poll a job reference until it is done.
    // jobRef: { jobId, provider }
    pollUntilDone: function (jobRef, maxWaitMs, intervalMs) {
      return _pollUntilDone(jobRef, maxWaitMs, intervalMs);
    },

    // Return the best available provider from a list.
    selectProvider: function (providerIds) {
      return _selectProvider(providerIds);
    },

    // Signal a running pipeline to stop after the current step.
    abortPipeline: function (runId) {
      if (_runs[runId]) _runs[runId].aborted = true;
    },

    // Return the live step log for a run.
    getRunStatus: function (runId) {
      return _runs[runId] || null;
    },

    // Forward to LoadPipelineRegistry.listPipelines().
    listPipelines: function () {
      var plReg = window.LoadPipelineRegistry;
      return (plReg && plReg.listPipelines) ? plReg.listPipelines() : [];
    }
  };

  window.LoadOrchestrator = LoadOrchestrator;

}());
