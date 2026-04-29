
(function () {
  "use strict";

  var state = {
    sourceFile: null,
    sourceText: "",
    scenes: [],
    characters: [],
    selectedSceneId: null
  };

  async function importBookFile(file) {
    state.sourceFile = file;
    state.sourceText = await window.BookTextExtractor.extractFromFile(file);
    state.scenes = window.SceneCardEngine.buildSceneCards(state.sourceText, { targetSentences: 10 });
    state.characters = window.CharacterBibleEngine.buildFromScenes(state.scenes);
    state.selectedSceneId = state.scenes[0] ? state.scenes[0].id : null;
    saveLocal();
    return state;
  }

  function updateScene(sceneId, patch) {
    var scene = state.scenes.find(function (s) { return s.id === sceneId; });
    if (!scene) return null;
    Object.keys(patch || {}).forEach(function (k) {
      scene[k] = patch[k];
    });
    saveLocal();
    return scene;
  }

  function updateCharacter(characterId, patch) {
    var c = state.characters.find(function (x) { return x.id === characterId; });
    if (!c) return null;
    Object.keys(patch || {}).forEach(function (k) {
      c[k] = patch[k];
    });
    saveLocal();
    return c;
  }

  async function generateSceneImage(sceneId) {
    var scene = state.scenes.find(function (s) { return s.id === sceneId; });
    if (!scene) throw new Error("Scene not found.");
    var prompt = window.CharacterBibleEngine.injectCharacterConsistency(scene, state.characters);
    var result = await window.AIProviderRouter.runTask({
      type: "image",
      prompt: prompt,
      width: 1280,
      height: 720
    });
    if (result.imageUrl) {
      scene.generated.imageUrl = result.imageUrl;
      scene.status = "ready";
      saveLocal();
    }
    return result;
  }

  async function generateSceneVideoTask(sceneId) {
    var scene = state.scenes.find(function (s) { return s.id === sceneId; });
    if (!scene) throw new Error("Scene not found.");
    var prompt = window.CharacterBibleEngine.injectCharacterConsistency(scene, state.characters);

    var result = await window.AIProviderRouter.runTask({
      type: "video",
      prompt: prompt,
      imageUrl: scene.generated.imageUrl,
      duration: window.LoadTimelineBridge.estimateDuration(scene)
    });

    if (result.videoUrl) {
      scene.generated.videoUrl = result.videoUrl;
      scene.status = "ready";
      saveLocal();
    }
    return result;
  }

  function sendSceneToTimeline(sceneId) {
    var scene = state.scenes.find(function (s) { return s.id === sceneId; });
    if (!scene) throw new Error("Scene not found.");
    return window.LoadTimelineBridge.sendSceneToTimeline(scene);
  }

  function saveLocal() {
    try {
      localStorage.setItem("load_book_to_video_state_v1", JSON.stringify(state));
    } catch (e) {}
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem("load_book_to_video_state_v1");
      if (raw) {
        var parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(function (k) { state[k] = parsed[k]; });
      }
    } catch (e) {}
    return state;
  }

  function getState() {
    return state;
  }

  window.LoadBookToVideoEngine = {
    importBookFile: importBookFile,
    updateScene: updateScene,
    updateCharacter: updateCharacter,
    generateSceneImage: generateSceneImage,
    generateSceneVideoTask: generateSceneVideoTask,
    sendSceneToTimeline: sendSceneToTimeline,
    getState: getState,
    loadLocal: loadLocal
  };

  loadLocal();
})();
