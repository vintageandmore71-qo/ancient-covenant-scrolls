
(function () {
  "use strict";

  function sendSceneToTimeline(scene) {
    var payload = {
      id: scene.id,
      title: scene.title,
      type: "book-scene",
      duration: estimateDuration(scene),
      narration: scene.narration,
      captions: scene.captions,
      imageUrl: scene.generated && scene.generated.imageUrl,
      videoUrl: scene.generated && scene.generated.videoUrl,
      audioUrl: scene.generated && scene.generated.narrationAudioUrl,
      meta: {
        chapterTitle: scene.chapterTitle,
        characters: scene.characters,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        emotion: scene.emotion
      }
    };

    if (window.LoadMediaEditor && typeof window.LoadMediaEditor.addSceneClip === "function") {
      return window.LoadMediaEditor.addSceneClip(payload);
    }

    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("load:add-scene-to-timeline", { detail: payload }));
      return payload;
    }

    return payload;
  }

  function estimateDuration(scene) {
    var text = scene.narration || scene.summary || "";
    var words = String(text).split(/\s+/).filter(Boolean).length;
    var seconds = Math.max(5, Math.ceil(words / 2.4));
    return Math.min(seconds, 45);
  }

  window.LoadTimelineBridge = {
    sendSceneToTimeline: sendSceneToTimeline,
    estimateDuration: estimateDuration
  };
})();
