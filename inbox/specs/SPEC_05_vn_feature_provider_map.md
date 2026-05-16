# VN_Feature_Provider_Map.docx

VN VIDEO EDITOR
Feature Map &amp; Open Source Provider Reference
Source: VN Help Centre — uid.notion.site   |   Compiled: May 2026
PART 1 — Full Feature List (From Screenshots)
Every feature visible across all 4 VN Help Centre screenshots, grouped by category.

Core Video Editing
Video Editing
Video Transitions
Add Video Clips
Trim Videos Precisely
Split and Adjust Video Clip Duration
Change Video Ratio
Select In/Out Animation
Apply to All Clips on the Same Track (Filter, FX, Transition)

Picture in Picture &amp; Layers
Add PiP / Sticker Feature
Switch PiP and Main Track
Multiple Recordings
Stickers &amp; Texts Quick Duration Extension

Visual Effects &amp; Filters
Mosaic
Magnifier
Blur
Reverse Video
Replace Background Image / Color

Export &amp; Project Management
Export Audio Only
Resolution Control
FPS / Smoothness Control
Project Management
VN Project Sharing / Importing

PART 2 — Open Source &amp; Free Providers by Feature
Matched to each VN feature. All providers are free tier or fully open source.

Core Video Editing

VN Feature
Provider
Notes
URL

Video Editing Engine
FFmpeg
Core open source video processing. Powers most web editors.
ffmpeg.org

Video Transitions
FFmpeg xfade
Built-in transition filters. 30+ types.
ffmpeg.org/xfade

Trim Precisely
FFmpeg
Frame-accurate cutting with -ss and -to flags.
ffmpeg.org

Split &amp; Adjust Duration
FFmpeg / Remotion
Programmatic clip splitting.
remotion.dev

Change Video Ratio
FFmpeg scale + pad
Crop and pad to any aspect ratio.
ffmpeg.org

In/Out Animation
LottieFiles / GSAP
Animate clip entrance and exit.
lottiefiles.com

Apply FX to All Clips
FFmpeg filter_complex
Apply filters across entire timeline.
ffmpeg.org

Picture in Picture &amp; Layers

VN Feature
Provider
Notes
URL

PiP / Sticker Feature
FFmpeg overlay
Overlay filter places any clip over another.
ffmpeg.org

Switch PiP / Main Track
FFmpeg map
Remap input streams to reorder layers.
ffmpeg.org

Multiple Recordings
MediaRecorder API
Browser native. Record multiple tracks.
developer.mozilla.org

Sticker Duration Extension
Fabric.js
Canvas-based object duration control.
fabricjs.com

Visual Effects &amp; Filters

VN Feature
Provider
Notes
URL

Mosaic / Pixelate
FFmpeg pixelize
Built-in pixelize filter for mosaic effect.
ffmpeg.org

Magnifier
WebGL / Fabric.js
Zoom lens effect via canvas transforms.
fabricjs.com

Blur
FFmpeg gblur
Gaussian blur filter. Region or full frame.
ffmpeg.org

Reverse Video
FFmpeg reverse
Simple -vf reverse flag.
ffmpeg.org

Replace BG Image
Mediapipe Selfie Seg
Free Google library for background removal.
mediapipe.dev

Replace BG Color
Chroma key / FFmpeg
colorkey filter removes specific colour.
ffmpeg.org

Export &amp; Project Management

VN Feature
Provider
Notes
URL

Export Audio Only
FFmpeg
-vn flag strips video, exports audio alone.
ffmpeg.org

Resolution Control
FFmpeg scale
Output to any resolution. 720p / 1080p / 4K.
ffmpeg.org

FPS Control
FFmpeg -r
Set output framerate. 24/30/60fps.
ffmpeg.org

Project Management
IndexedDB / Supabase
Store projects locally or in free cloud DB.
supabase.com

Project Sharing
Supabase Storage
Free file storage and sharing via URL.
supabase.com

Project Import
File API
Browser native file import. No library needed.
developer.mozilla.org

PART 3 — Asset Libraries Needed
Non-code assets required to match VN feature set fully.

Asset Type
Provider
Notes
URL

Transition Animations
Mixkit
Free video transition packs.
mixkit.co

Sticker Packs
LottieFiles
Animated stickers as JSON. API access.
lottiefiles.com

Text Animations
LottieFiles
Animated title and text overlays.
lottiefiles.com

Fonts
Google Fonts
Free fonts via API.
fonts.google.com

Filters / LUTs
Uncut.video
Free colour grade LUT files.
uncut.video

Sound FX
Freesound.org
Open source SFX library.
freesound.org

Background Music
Pixabay Music
Free, no attribution needed.
pixabay.com/music

BG Removal Model
Mediapipe
Free Google AI body segmentation.
mediapipe.dev

PART 4 — Build Priority Order
Build in this sequence. Each layer unlocks the next.

Priority
Feature
Provider
Why First

1
Core editing + trim + split
FFmpeg / ffmpeg.wasm
Everything else depends on this

2
Transitions
FFmpeg xfade
Basic flow between clips

3
PiP / Layers
FFmpeg overlay
Multi-track capability

4
Blur + Mosaic + Reverse
FFmpeg filters
Quick wins, same engine

5
BG Removal
Mediapipe
High value feature

6
Stickers + Text Anim
LottieFiles API
Visual polish

7
Export controls
FFmpeg -r -scale
Resolution and FPS output

8
Project save/share
Supabase
User retention feature

VN Feature Map — Load Cap Build Reference   |   May 2026