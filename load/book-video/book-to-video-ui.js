
(function () {
  "use strict";

  var root = null;

  function open() {
    if (root) root.remove();
    root = document.createElement("div");
    root.className = "load-btv-overlay";
    root.innerHTML = template();
    document.body.appendChild(root);
    bind();
    render();
  }

  function close() {
    if (root) root.remove();
    root = null;
  }

  function template() {
    return [
      '<div class="load-btv-topbar">',
        '<button class="load-btv-close" id="btv-close">Back</button>',
        '<div>',
          '<div class="load-btv-title">Load Book-to-Video</div>',
          '<div class="load-btv-version">v1 scene card engine</div>',
        '</div>',
        '<button class="load-btv-btn primary" id="btv-import-btn">Import Book</button>',
        '<input id="btv-file" type="file" accept=".txt,.html,.htm,.pdf,.epub" style="display:none">',
      '</div>',
      '<div class="load-btv-main">',
        '<div class="load-btv-panel">',
          '<div class="load-btv-drop">',
            '<strong>Import a book file</strong>',
            '<div class="load-btv-small">TXT, HTML, PDF, EPUB</div>',
            '<button class="load-btv-btn primary" id="btv-import-btn-2">Choose File</button>',
          '</div>',
          '<h3>Characters</h3>',
          '<div id="btv-characters"></div>',
        '</div>',
        '<div class="load-btv-scene-list" id="btv-scenes"></div>',
        '<div class="load-btv-panel right">',
          '<h3>Selected Scene</h3>',
          '<div id="btv-inspector" class="load-btv-small">Select a scene card.</div>',
        '</div>',
      '</div>'
    ].join("");
  }

  function bind() {
    root.querySelector("#btv-close").addEventListener("click", close);
    root.querySelector("#btv-import-btn").addEventListener("click", chooseFile);
    root.querySelector("#btv-import-btn-2").addEventListener("click", chooseFile);
    root.querySelector("#btv-file").addEventListener("change", async function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      await window.LoadBookToVideoEngine.importBookFile(file);
      render();
    });
  }

  function chooseFile() {
    root.querySelector("#btv-file").click();
  }

  function render() {
    renderCharacters();
    renderScenes();
    renderInspector();
  }

  function renderCharacters() {
    var s = window.LoadBookToVideoEngine.getState();
    var box = root.querySelector("#btv-characters");
    box.innerHTML = "";

    if (!s.characters.length) {
      box.innerHTML = '<div class="load-btv-small">No characters detected yet.</div>';
      return;
    }

    s.characters.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "load-btv-character";
      el.innerHTML = [
        '<strong>' + esc(c.name) + '</strong>',
        '<textarea class="load-btv-textarea" data-char="' + c.id + '" data-field="physicalDescription" placeholder="Physical description">' + esc(c.physicalDescription) + '</textarea>',
        '<input class="load-btv-input" data-char="' + c.id + '" data-field="clothingRules" placeholder="Clothing rules" value="' + esc(c.clothingRules) + '">',
        '<input class="load-btv-input" data-char="' + c.id + '" data-field="voiceProfile" placeholder="Voice profile" value="' + esc(c.voiceProfile) + '">'
      ].join("");
      box.appendChild(el);
    });

    Array.prototype.forEach.call(box.querySelectorAll("[data-char]"), function (input) {
      input.addEventListener("input", function () {
        var patch = {};
        patch[input.dataset.field] = input.value;
        window.LoadBookToVideoEngine.updateCharacter(input.dataset.char, patch);
      });
    });
  }

  function renderScenes() {
    var s = window.LoadBookToVideoEngine.getState();
    var box = root.querySelector("#btv-scenes");
    box.innerHTML = "";

    if (!s.scenes.length) {
      box.innerHTML = '<div class="load-btv-scene-card">Import a book to create scene cards.</div>';
      return;
    }

    s.scenes.forEach(function (scene) {
      var card = document.createElement("div");
      card.className = "load-btv-scene-card" + (s.selectedSceneId === scene.id ? " active" : "");
      card.dataset.scene = scene.id;
      card.innerHTML = [
        '<div class="load-btv-scene-head">',
          '<div class="load-btv-scene-title">' + esc(scene.title) + '</div>',
          '<span class="load-btv-status ' + esc(scene.status) + '">' + esc(scene.status) + '</span>',
        '</div>',
        '<div class="load-btv-meta">',
          'Chapter: ' + esc(scene.chapterTitle) + '<br>',
          'Characters: ' + esc((scene.characters || []).join(", ")) + '<br>',
          'Location: ' + esc(scene.location) + '<br>',
          'Tone: ' + esc(scene.emotion),
        '</div>',
        '<p>' + esc(scene.summary) + '</p>',
        '<div class="load-btv-row">',
          '<button class="load-btv-btn" data-action="select">Edit</button>',
          '<button class="load-btv-btn" data-action="image">Generate Image</button>',
          '<button class="load-btv-btn" data-action="timeline">Send to Timeline</button>',
        '</div>'
      ].join("");

      box.appendChild(card);
    });

    Array.prototype.forEach.call(box.querySelectorAll(".load-btv-scene-card button"), function (btn) {
      btn.addEventListener("click", async function (e) {
        var card = e.target.closest(".load-btv-scene-card");
        var sceneId = card.dataset.scene;
        var action = btn.dataset.action;
        var state = window.LoadBookToVideoEngine.getState();

        if (action === "select") {
          state.selectedSceneId = sceneId;
          render();
        }

        if (action === "image") {
          btn.textContent = "Generating...";
          await window.LoadBookToVideoEngine.generateSceneImage(sceneId);
          render();
        }

        if (action === "timeline") {
          window.LoadBookToVideoEngine.sendSceneToTimeline(sceneId);
          btn.textContent = "Sent";
        }
      });
    });
  }

  function renderInspector() {
    var s = window.LoadBookToVideoEngine.getState();
    var box = root.querySelector("#btv-inspector");
    var scene = s.scenes.find(function (x) { return x.id === s.selectedSceneId; });

    if (!scene) {
      box.innerHTML = "Select a scene card.";
      return;
    }

    box.innerHTML = [
      '<label>Scene Summary</label>',
      '<textarea class="load-btv-textarea" data-field="summary">' + esc(scene.summary) + '</textarea>',
      '<label>Visual Prompt</label>',
      '<textarea class="load-btv-textarea" data-field="visualPrompt">' + esc(scene.visualPrompt) + '</textarea>',
      '<label>Narration</label>',
      '<textarea class="load-btv-textarea" data-field="narration">' + esc(scene.narration) + '</textarea>',
      '<label>Captions</label>',
      '<textarea class="load-btv-textarea" data-field="captions">' + esc(scene.captions) + '</textarea>',
      '<label>Music Mood</label>',
      '<input class="load-btv-input" data-field="musicMood" value="' + esc(scene.musicMood) + '">',
      '<label>SFX</label>',
      '<input class="load-btv-input" data-field="sfx" value="' + esc(scene.sfx) + '">'
    ].join("");

    Array.prototype.forEach.call(box.querySelectorAll("[data-field]"), function (input) {
      input.addEventListener("input", function () {
        var patch = {};
        patch[input.dataset.field] = input.value;
        window.LoadBookToVideoEngine.updateScene(scene.id, patch);
      });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.LoadBookToVideo = {
    open: open,
    close: close
  };
})();
