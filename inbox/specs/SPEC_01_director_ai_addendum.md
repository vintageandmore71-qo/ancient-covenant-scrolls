# LoadStudio_Director_AI_Production_System_Addendum.docx

LOADSTUDIO
Director-Level AI Production System Addendum
Character Stability, AI Video, Sound, Voice, Prompting, and Provider Strategy
Locked build-plan addendum for LoadStudio. The system must function as a production-direction layer, not a generic chatbot or basic prompt form.
Executive Summary
The screenshots add one major requirement: LoadStudio AI cannot be a basic prompt tool. It must become a director-level cinematic AI system focused on accuracy, character stability, scene continuity, video generation, sound, voice, and production control.
The new AI standard should be: The user does not just prompt LoadStudio. The user directs it.
LoadStudio should understand production language: lighting, pacing, edit rhythm, camera movement, emotional tone, character continuity, sound design, music cues, wardrobe, props, settings, shot types, scene order, and final packaging.
Honest Build Reality

Category
Can Be Built Now
Requires Integration

LoadStudio Core OS
PWA interface, data models, local save, import/export, diagnostics, scene builder, character system, prompt engine.
Backend sync only if cloud accounts are needed.

Character Stability
Reference sets, approved/rejected takes, prompt locks, continuity reports, manual review, consistency scoring fields.
High-accuracy face/identity checking needs vision models, local engine, or provider APIs.

Text/Image to Video
Prompt generation, provider routing, scene attachment fields, saved video prompts, status labels.
Actual generated video requires video model/provider or Local Engine.

AI Image Editing
UI, image edit queue, inpaint/outpaint prompts, provider-ready metadata.
Real edits require provider/local model output file, blob, or URL.

Sound and Voice
SFX prompts, cue sheets, user audio import, browser TTS placeholders, fictional voice profiles.
Real voice transformation or AI SFX generation needs models, providers, or device permissions.

Video Export
CinePWA package first, export readiness, package metadata.
MP4/WebM rendering needs MediaRecorder, FFmpeg, backend FFmpeg, or Local Engine.
1. Director-Level AI System
Script to scene, idea to scene, book to cinematic sequence, text to video, image to video, image to scene still, character to scene, scene to shot list, and shot list to visual sequence.
Prompt to cinematic image, prompt to cinematic video, music video generation, trailer generation, pilot episode generation, short film generation, and feature film assembly path.
Production controls for lighting, pacing, edit rhythm, camera movement, emotional tone, character continuity, sound design, music cues, wardrobe, props, settings, shot type, scene order, and final package.
2. Character Stability Engine
Lock character profile, reference image set, face notes, body type notes, skin tone notes, hair notes, wardrobe notes, era notes, expression range, allowed variations, and forbidden changes.
Support strict, moderate, and loose consistency modes.
Track approved takes, rejected takes, do-not-repeat mistakes, scene-to-scene comparisons, face consistency score, wardrobe consistency score, prompt lock phrases, negative prompt lock phrases, and output review panels.
Truth: perfect character consistency is difficult with free/open models. It can be improved with reference workflows, approved character sheets, prompt locks, manual review, and later Local Engine workflows using ComfyUI, IP-Adapter, ControlNet, LoRA, face reference workflows, and consistent seeds.
3. Text to Video Studio
Turn an idea, script excerpt, or scene card into a video generation prompt.
Generate short scene clips when a real provider or local engine is connected.
Save video prompts when no provider is connected.
Attach video result to scene, mark approved/maybe/rejected, export video asset, send to timeline, and save provider report.
Realistic MVP: high-quality video prompts and scene packages now. Actual text-to-video requires a provider or local engine.
4. Image to Video Studio
Upload image, select motion type, camera push-in, pan, breathing motion, hair/clothing motion, environmental motion, cinematic parallax, depth motion, and image-to-video prompt.
Preserve face, wardrobe, and composition.
Attach video result to scene and export as a video asset when a real provider or local engine exists.
Realistic MVP: interface and prompt generator now. Actual image-to-video generation requires provider access or local model support.
5. AI Video Stylizer
Support cinematic realism, anime-inspired, comic book, watercolor, motion comic, 2D animation, children’s illustration, documentary style, vintage film, noir, music video, prestige TV, and trailer look.
Maintain character identity during stylization as much as possible.
Stylization can break identity, so LoadStudio must warn users and offer strict identity preservation: preserve face, skin tone, body type, hair, wardrobe, era, and shot composition.
6. AI Sound Effects Generator
Generate sound prompts for footsteps, crowd, rain, thunder, doors, vehicles, ambience, room tone, marketplace crowd, wind, animal sounds, emotional stingers, transition sounds, and scene cues.
Attach SFX to scene, sync to timeline moment, loop ambience, and export cue sheet.
Realistic MVP: use local/imported sound libraries, Pixabay, Freesound, and prompt generation first. AI-generated SFX can be added later through AudioCraft/AudioGen, Hugging Face audio models, local open-source audio tools, or other provider integrations.
7. Voice Character Engine
Fictional narrator voices, child-style fictional voices, elder-style fictional voices, royal voice, villain voice, news reporter, animated creature, gentle storyteller, serious documentary narrator, comedy sidekick, and custom voice profiles.
Controls for tone, pitch, speed, warmth, breathiness, rasp, clarity, authority, sadness, fear, joy, intensity, dialogue delivery notes, scene assignment, and batch dialogue processing later.
Safety rule: do not promote unauthorized real-person voice cloning. Fictional voices only unless the user owns or has permission for the voice.
8. Video Outpainting and Frame Expansion
Convert vertical to widescreen, square to widescreen, extend background, fill missing side areas, create cinematic framing, preserve subject position, preserve face and body, generate outpaint prompt, and export new framing.
Realistic MVP: start with still-image outpainting prompt tools and layout preview. Real video outpainting needs advanced provider or local engine.
9. Professional Prompt Writer
Simple idea to cinematic prompt, scene prompt, character prompt, wardrobe prompt, location prompt, camera prompt, lighting prompt, negative prompt, motion prompt, image-to-video prompt, text-to-video prompt, sound prompt, voice prompt, continuity prompt, and provider-specific prompt formats.
This should be one of the strongest MVP features because it can work immediately without expensive providers.
10. Multilingual Production Support
Multilingual prompts, subtitles in multiple languages, voice language tags, script translation later, caption translation later, localization metadata, right-to-left language support later, language label per project, language label per scene, and subtitle export files.
Realistic MVP: multilingual metadata and subtitle fields first. Actual translation requires an LLM provider or local model.
11. Drag-and-Drop Production Board
Reorder scenes, drag assets to scenes, drag character to scene, drag voice to character, drag wardrobe to character, drag prop to scene, drag location to scene, drag music to scene, drag SFX to cue point, drag poster to project, and drag template to project.
This is buildable in browser JavaScript and should become a priority because it makes LoadStudio feel like a real production tool, not a form dashboard.
12. No False Success Guardrails
Never claim video generation worked unless a real video file, blob, or URL exists.
Never claim image generation worked unless a real image file, blob, or URL exists.
Never claim audio or voice generation worked unless a real playable audio file exists.
Never claim character stability is perfect. Use consistency scoring, approved takes, reference images, prompt locks, and manual review.
Paid providers must be optional and off by default.
External features must be labeled Integration Required until a real provider, local engine, or backend is connected.
Product Positioning To Add
LoadStudio is not for asking an AI to write a few lines. It is for directing the movie in your head.
Build the scene. Cast the character. Set the light. Shape the voice. Score the moment. Package the production.
You do not just prompt LoadStudio. You direct it.
Free/open-source/local-first routes first. Paid providers optional and off by default.
Do not promise no credits or no monthly fees universally unless every provider is truly free. The core PWA tools can work locally, while external provider costs must be transparent.
Recommended Build Strategy With ChatGPT and Claude
Phase 1: Build the real LoadStudio shell
Claude builds the app architecture: real pages, real navigation, real data models, IndexedDB/localStorage, import/export, package validator, scene builder, character studio, asset library, drag-and-drop board, prompt writer, AI provider registry, and diagnostics.
ChatGPT provides exact build prompts, implementation plans, acceptance checklists, and verification scripts.
Claude should verify each PR with screenshots, working tests, and no false-positive completion claims.
Phase 2: Build the prompt and package engine
Scene to image prompt, scene to video prompt, scene to SFX prompt, scene to voice prompt, character lock prompt, continuity negative prompt, provider-specific prompt formatter, export prompt pack, and save all prompts into prompt-log.json.
Phase 3: Add free/open/local providers
Pollinations where usable, AI Horde, Hugging Face routes where practical, browser TTS, user audio import, user SFX import, Pixabay/Freesound style Media Vault, and local Stable Diffusion or ComfyUI connector later.
Phase 4: Add high-stability character workflows
Character sheets, reference images, approved/rejected takes, prompt locks now, consistency report now, manual review now, ControlNet/IP-Adapter/face comparison later.
Phase 5: Add video generation as optional provider layer
Text-to-video, image-to-video, video stylization, video outpainting, audio generation, voice generation, and local engine rendering should be provider slots rather than MVP blockers.
Developer Prompt For Claude
Update the LoadStudio build plan and codebase to add the new Director-Level AI Production System requirements.
 
Do not treat LoadStudio AI as a generic chatbot. LoadStudio AI must function as a production-direction layer for film, TV, animation, documentary, music videos, CinePWA projects, and Load Play preparation.
 
Add these modules as real app sections with working local data models, UI panels, saved state, export metadata, and Integration Required labels where external providers are needed:
 
1. Director AI System
2. Character Stability Engine
3. Text to Video Studio
4. Image to Video Studio
5. AI Video Stylizer
6. AI Sound Effects Generator
7. Voice Character Engine
8. Video Outpainting / Frame Expansion
9. Professional Prompt Writer
10. Multilingual Production Support
11. Drag-and-Drop Production Board
12. Provider Routing and No False Success Guardrails
 
Critical rules:
- Never claim video generation worked unless a real video file, blob, or URL exists.
- Never claim image generation worked unless a real image file, blob, or URL exists.
- Never claim audio or voice generation worked unless a real playable audio file exists.
- Never claim character stability is perfect. Use consistency scoring, approved takes, reference images, prompt locks, and manual review.
- Paid providers must be optional and off by default.
- MVP must prioritize free/open-source/local-first routes.
- External features must be labeled Integration Required until a real provider/local engine/backend is connected.
 
Add these data files or fields:
- director-ai.json
- character-stability.json
- provider-routing.json
- prompt-log.json
- generation-report.json
- continuity-report.json
- asset-declarations.json
- rights.json updates
- scene fields for videoPrompt, motionPrompt, sfxPrompt, voicePrompt, outpaintPrompt, stylePrompt, consistencyScore, approvedTakeStatus, providerStatus, and generatedAssetProof.
 
Update UI:
- Add dashboard cards for each new module.
- Add a Director AI panel.
- Add Character Stability panel with reference images, approved/rejected takes, strict/moderate/loose modes.
- Add Text to Video and Image to Video panels with prompt generation and provider status.
- Add Video Stylizer and Video Outpainting panels with Integration Required labels.
- Add SFX Generator and Voice Character Engine panels.
- Add Drag-and-Drop Board for scenes, assets, characters, wardrobe, voices, props, locations and music.
- Add Provider Report panel showing provider tried, result, failure reason, fallback, and saved asset path.
 
Verification required:
- Every new section must open.
- Every button must do something real locally or open the correct tool panel.
- Every external provider feature must show Integration Required.
- All JSON files must validate.
- Export package must include the new data files.
- No false positives in final report.