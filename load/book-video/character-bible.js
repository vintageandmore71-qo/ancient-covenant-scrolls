
(function () {
  "use strict";

  function createCharacter(name, notes) {
    notes = notes || {};
    return {
      id: "char_" + slug(name) + "_" + Date.now(),
      name: name,
      age: notes.age || "",
      physicalDescription: notes.physicalDescription || "",
      skinTone: notes.skinTone || "",
      hair: notes.hair || "",
      clothingRules: notes.clothingRules || "",
      personality: notes.personality || "",
      voiceProfile: notes.voiceProfile || "",
      referenceImage: notes.referenceImage || "",
      masterPrompt: notes.masterPrompt || "",
      consistencyLock: true
    };
  }

  function slug(s) {
    return String(s || "character").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function buildFromScenes(scenes) {
    var names = {};
    scenes.forEach(function (scene) {
      (scene.characters || []).forEach(function (name) {
        if (!names[name]) names[name] = createCharacter(name);
      });
    });
    return Object.keys(names).map(function (k) { return names[k]; });
  }

  function characterPrompt(character) {
    var parts = [
      "Character consistency lock:",
      "Name: " + character.name,
      "Age: " + (character.age || "unspecified"),
      "Physical description: " + (character.physicalDescription || "to be defined"),
      "Skin tone: " + (character.skinTone || "to be defined"),
      "Hair: " + (character.hair || "to be defined"),
      "Clothing rules: " + (character.clothingRules || "to be defined"),
      "Personality: " + (character.personality || "to be defined"),
      "Voice profile: " + (character.voiceProfile || "to be defined"),
      "Use the same face, body, wardrobe rules, and visual identity in every scene."
    ];
    if (character.masterPrompt) parts.push("Master prompt: " + character.masterPrompt);
    return parts.join("\n");
  }

  function injectCharacterConsistency(scene, bible) {
    var charMap = {};
    bible.forEach(function (c) { charMap[c.name] = c; });

    var prompts = (scene.characters || [])
      .map(function (name) { return charMap[name] ? characterPrompt(charMap[name]) : ""; })
      .filter(Boolean);

    return scene.visualPrompt + "\n\n" + prompts.join("\n\n");
  }

  window.CharacterBibleEngine = {
    createCharacter: createCharacter,
    buildFromScenes: buildFromScenes,
    characterPrompt: characterPrompt,
    injectCharacterConsistency: injectCharacterConsistency
  };
})();
