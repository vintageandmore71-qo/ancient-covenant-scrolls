
(function () {
  "use strict";

  function sentenceSplit(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function detectChapters(text) {
    var lines = String(text || "").split(/\n+/);
    var chapters = [];
    var current = { title: "Opening", text: "" };

    lines.forEach(function (line) {
      var trimmed = line.trim();
      var isChapter =
        /^chapter\s+\d+/i.test(trimmed) ||
        /^chapter\s+[ivxlcdm]+/i.test(trimmed) ||
        /^part\s+\d+/i.test(trimmed) ||
        /^scene\s+\d+/i.test(trimmed);

      if (isChapter && current.text.trim()) {
        chapters.push(current);
        current = { title: trimmed, text: "" };
      } else {
        current.text += line + "\n";
      }
    });

    if (current.text.trim()) chapters.push(current);
    return chapters;
  }

  function chunkChapterIntoScenes(chapter, options) {
    options = options || {};
    var targetSentences = options.targetSentences || 10;
    var sentences = sentenceSplit(chapter.text);
    var scenes = [];

    for (var i = 0; i < sentences.length; i += targetSentences) {
      var chunk = sentences.slice(i, i + targetSentences).join(" ");
      if (!chunk.trim()) continue;

      scenes.push({
        id: "scene_" + String(Date.now()) + "_" + scenes.length,
        chapterTitle: chapter.title,
        sceneNumber: scenes.length + 1,
        title: chapter.title + " Scene " + (scenes.length + 1),
        sourceText: chunk,
        summary: summarizeChunk(chunk),
        characters: guessCharacters(chunk),
        location: guessLocation(chunk),
        timeOfDay: guessTimeOfDay(chunk),
        emotion: guessEmotion(chunk),
        visualPrompt: "",
        narration: "",
        dialogue: "",
        musicMood: "",
        sfx: "",
        captions: "",
        generated: {
          imageUrl: "",
          videoUrl: "",
          narrationAudioUrl: "",
          dialogueAudioUrl: ""
        },
        status: "needs-review"
      });
    }

    return scenes;
  }

  function summarizeChunk(text) {
    var sentences = sentenceSplit(text);
    return sentences.slice(0, 2).join(" ");
  }

  function guessCharacters(text) {
    var matches = String(text).match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || [];
    var stop = { The: true, A: true, An: true, And: true, But: true, Then: true, When: true, Chapter: true };
    var seen = {};
    var out = [];
    matches.forEach(function (m) {
      if (stop[m]) return;
      if (!seen[m]) {
        seen[m] = true;
        out.push(m);
      }
    });
    return out.slice(0, 6);
  }

  function guessLocation(text) {
    var lower = String(text).toLowerCase();
    if (lower.indexOf("house") >= 0) return "Interior house";
    if (lower.indexOf("street") >= 0) return "Street";
    if (lower.indexOf("forest") >= 0 || lower.indexOf("woods") >= 0) return "Woods";
    if (lower.indexOf("sea") >= 0 || lower.indexOf("ocean") >= 0) return "Water";
    if (lower.indexOf("city") >= 0) return "City";
    return "Unspecified location";
  }

  function guessTimeOfDay(text) {
    var lower = String(text).toLowerCase();
    if (lower.indexOf("morning") >= 0) return "Morning";
    if (lower.indexOf("noon") >= 0 || lower.indexOf("afternoon") >= 0) return "Afternoon";
    if (lower.indexOf("evening") >= 0) return "Evening";
    if (lower.indexOf("night") >= 0 || lower.indexOf("dark") >= 0) return "Night";
    return "Unspecified";
  }

  function guessEmotion(text) {
    var lower = String(text).toLowerCase();
    if (lower.indexOf("fear") >= 0 || lower.indexOf("afraid") >= 0) return "Tense";
    if (lower.indexOf("laugh") >= 0 || lower.indexOf("smile") >= 0) return "Warm";
    if (lower.indexOf("anger") >= 0 || lower.indexOf("angry") >= 0) return "Confrontational";
    if (lower.indexOf("cry") >= 0 || lower.indexOf("grief") >= 0) return "Sorrowful";
    return "Dramatic";
  }

  function buildSceneCards(text, options) {
    var chapters = detectChapters(text);
    var scenes = [];
    chapters.forEach(function (chapter) {
      scenes = scenes.concat(chunkChapterIntoScenes(chapter, options));
    });
    return scenes.map(enrichScene);
  }

  function enrichScene(scene) {
    scene.visualPrompt = buildVisualPrompt(scene);
    scene.narration = scene.summary;
    scene.dialogue = "";
    scene.musicMood = scene.emotion + " cinematic underscore";
    scene.sfx = "Subtle room tone, movement accents, environment sound";
    scene.captions = scene.narration;
    return scene;
  }

  function buildVisualPrompt(scene) {
    return [
      "Cinematic scene from a book adaptation.",
      "Scene:", scene.summary,
      "Location:", scene.location + ".",
      "Time of day:", scene.timeOfDay + ".",
      "Characters:", (scene.characters || []).join(", ") || "none specified.",
      "Mood:", scene.emotion + ".",
      "Style: polished cinematic realism, consistent character design, dramatic lighting, no text on image."
    ].join(" ");
  }

  window.SceneCardEngine = {
    detectChapters: detectChapters,
    buildSceneCards: buildSceneCards,
    buildVisualPrompt: buildVisualPrompt,
    sentenceSplit: sentenceSplit
  };
})();
