
(function () {
  "use strict";

  var providers = [];

  function registerProvider(provider) {
    providers.push(provider);
  }

  async function runTask(task) {
    for (var i = 0; i < providers.length; i++) {
      var p = providers[i];
      if (!p.supports || p.supports(task.type)) {
        try {
          return await p.run(task);
        } catch (e) {
          console.warn("Provider failed:", p.name, e);
        }
      }
    }
    return localFallback(task);
  }

  async function localFallback(task) {
    if (task.type === "scene-summary") {
      return { text: task.inputText ? String(task.inputText).slice(0, 500) : "" };
    }
    if (task.type === "visual-prompt") {
      return { text: task.prompt || "" };
    }
    if (task.type === "tts") {
      return { error: "No TTS provider connected. Use existing Load sound recorder or browser SpeechSynthesis." };
    }
    if (task.type === "image") {
      return { error: "No image provider connected. Add Pollinations, Pixabay search, local image upload, or another free tier provider." };
    }
    if (task.type === "video") {
      return { error: "No video provider connected. Use generated still image plus pan/zoom as fallback." };
    }
    return { error: "No provider available." };
  }

  function pollinationsImageProvider() {
    return {
      name: "pollinations-image-free",
      supports: function (type) { return type === "image"; },
      run: async function (task) {
        var prompt = encodeURIComponent(task.prompt || "");
        var width = task.width || 1280;
        var height = task.height || 720;
        var url = "https://image.pollinations.ai/prompt/" + prompt + "?width=" + width + "&height=" + height + "&nologo=true";
        return { imageUrl: url, provider: "pollinations" };
      }
    };
  }

  window.AIProviderRouter = {
    registerProvider: registerProvider,
    runTask: runTask,
    pollinationsImageProvider: pollinationsImageProvider
  };

  registerProvider(pollinationsImageProvider());
})();
