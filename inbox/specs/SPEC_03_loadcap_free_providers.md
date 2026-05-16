# LoadCap_Free_Providers.docx

FREE &amp; OPEN SOURCE
PROVIDER DIRECTORY
VN Video Editor — Feature by Feature
Every provider listed is free tier or fully open source. No paid tools.
1. Core Video Editing

VN Feature
Provider
What It Does
URL

Video Editing Engine
FFmpeg (ffmpeg.wasm)
Full video processing in the browser. No server needed.
ffmpegwasm.netlify.app

Trim Videos Precisely
FFmpeg -ss -to
Frame-accurate trimming with simple flags.
ffmpeg.org

Split Clip Duration
FFmpeg segment
Split clips at exact timestamps.
ffmpeg.org

Change Video Ratio
FFmpeg scale + pad
Resize and pad to 9:16, 1:1, 16:9 etc.
ffmpeg.org

Video Transitions
FFmpeg xfade
30+ built-in transitions. Fade, wipe, zoom, slide.
ffmpeg.org

Apply FX to All Clips
FFmpeg filter_complex
Chain filters across every clip in one pass.
ffmpeg.org

In/Out Animation
GSAP (GreenSock)
Free animation library. Clip entrance and exit.
gsap.com

Timeline UI
Remotion
React-based video timeline. Open source.
remotion.dev

2. Picture in Picture &amp; Layers

VN Feature
Provider
What It Does
URL

PiP Overlay
FFmpeg overlay filter
Place any clip over another at any position.
ffmpeg.org

Switch PiP / Main Track
FFmpeg -map
Remap and reorder video streams freely.
ffmpeg.org

Multiple Recordings
MediaRecorder API
Browser-native. Record multiple tracks natively.
developer.mozilla.org

Sticker Layer
Fabric.js
Canvas object model. Place stickers on video frames.
fabricjs.com

Sticker Duration Control
Fabric.js + timeline
Extend or shorten sticker visibility on timeline.
fabricjs.com

3. Visual Effects &amp; Filters

VN Feature
Provider
What It Does
URL

Mosaic / Pixelate
FFmpeg pixelize
Built-in pixelize filter. Censor or style regions.
ffmpeg.org

Blur (Full Frame)
FFmpeg gblur
Gaussian blur. Adjustable intensity.
ffmpeg.org

Blur (Region)
FFmpeg boxblur + overlay
Blur a specific region only. Track faces etc.
ffmpeg.org

Magnifier Effect
Fabric.js + WebGL
Zoom lens effect via canvas transforms.
fabricjs.com

Reverse Video
FFmpeg -vf reverse
Single flag. Reverses clip playback.
ffmpeg.org

Colour Filters / LUTs
FFmpeg lut3d
Apply colour grade LUT files to footage.
ffmpeg.org

Free LUT Files
Uncut.video
Free downloadable colour grade LUT packs.
uncut.video

Colour Filters
CineShader
Open source GLSL video filters.
cineshader.com

4. Background Replacement

VN Feature
Provider
What It Does
URL

Remove Background (AI)
Mediapipe Selfie Seg
Free Google AI. Removes background in real time.
mediapipe.dev

Remove Background (AI)
Background Removal.js
Open source JS library. Works in browser.
github.com/imgly/background-removal-js

Replace BG with Image
FFmpeg overlay
Composite new background behind subject.
ffmpeg.org

Replace BG with Colour
FFmpeg colorkey
Chroma key filter. Remove specific colour.
ffmpeg.org

Green Screen
FFmpeg chromakey
Standard green screen keying filter.
ffmpeg.org

5. Text, Titles &amp; Stickers

VN Feature
Provider
What It Does
URL

Animated Titles
LottieFiles
Animated text templates as JSON. API access.
lottiefiles.com

Animated Stickers
LottieFiles
Thousands of free animated stickers.
lottiefiles.com

Static Text Overlay
FFmpeg drawtext
Burn text directly onto video frames.
ffmpeg.org

Custom Fonts
Google Fonts
Hundreds of free fonts. Works via API.
fonts.google.com

Font Alternative
Bunny Fonts
Privacy-friendly Google Fonts mirror. API ready.
bunny.net/fonts

Subtitle Generation
OpenAI Whisper
Free open source auto-transcription model.
github.com/openai/whisper

Subtitle Styling
FFmpeg subtitles
Render styled subtitles onto video.
ffmpeg.org

6. Audio &amp; Music

VN Feature
Provider
What It Does
URL

Export Audio Only
FFmpeg -vn
Strip video, export audio track alone.
ffmpeg.org

Audio Editing
Tone.js
Web audio manipulation. Trim, mix, effects.
tonejs.github.io

Background Music
Pixabay Music
Free music. No attribution needed.
pixabay.com/music

Background Music
Free Music Archive
Genre browsing. Open licence tracks.
freemusicarchive.org

Background Music
ccMixter
Creative Commons music library.
ccmixter.org

Sound FX
Freesound.org
Largest open source SFX library.
freesound.org

Sound FX
ZapSplat
Free tier. All categories.
zapsplat.com

Sound FX
Mixkit SFX
Free. No account needed.
mixkit.co/free-sound-effects

7. Export &amp; Resolution

VN Feature
Provider
What It Does
URL

Resolution Control
FFmpeg -vf scale
Output to 720p, 1080p, 4K, any size.
ffmpeg.org

FPS / Smoothness
FFmpeg -r
Set output framerate. 24, 30, 60fps.
ffmpeg.org

File Format Control
FFmpeg -f
Export as MP4, MOV, WebM, GIF etc.
ffmpeg.org

GIF Export
FFmpeg palette + gif
High quality GIF with palette generation.
ffmpeg.org

Compression
FFmpeg -crf
Control file size vs quality balance.
ffmpeg.org

8. Project Management &amp; Sharing

VN Feature
Provider
What It Does
URL

Save Projects
IndexedDB (browser)
Free browser storage. No server needed.
developer.mozilla.org

Cloud Save
Supabase
Free tier. Postgres database + file storage.
supabase.com

Project Sharing
Supabase Storage
Share project files via URL. Free tier.
supabase.com

Project Import
File API (browser)
Native browser file import. No library needed.
developer.mozilla.org

User Accounts
Supabase Auth
Free authentication. Email, Google, Apple.
supabase.com

Quick Reference — Most Important Providers
If you only remember these, you can build everything:

Provider
Covers
URL

FFmpeg / ffmpeg.wasm
Editing, trim, split, transitions, blur, mosaic, reverse, export, audio, LUTs — covers 80% of all features
ffmpegwasm.netlify.app

LottieFiles
Animated titles, stickers, text effects
lottiefiles.com

Mediapipe
AI background removal
mediapipe.dev

Fabric.js
Canvas layers, PiP, sticker placement
fabricjs.com

Supabase
Project save, share, user accounts
supabase.com

Google Fonts
All font styles
fonts.google.com

Freesound.org
All sound effects
freesound.org

Pixabay Music
Background music
pixabay.com/music

OpenAI Whisper
Auto subtitles
github.com/openai/whisper

GSAP
Clip animations in/out
gsap.com

Load Cap — Free Provider Directory   |   VN Feature Map   |   May 2026