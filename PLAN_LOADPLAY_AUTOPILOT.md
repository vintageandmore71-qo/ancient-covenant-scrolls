LOADPLAY AUTOPILOT CONTENT ENGINE
Developer Handoff Addendum

Purpose

This addendum expands the LoadPlay Content Connector System into a built-in Autopilot Content Engine. The goal is to let LoadPlay constantly discover, generate, recycle, refresh, and pilot content while custom LoadPlay originals are being produced.

This is not blind auto-publishing. The system should automatically generate and recycle draft content, test site behavior, fill rows, rotate featured material, and prepare items for approval. Final publication still depends on rights rules and admin approval.

Core Product Idea

LoadPlay should have a built-in system that works like a programming assistant, content librarian, scheduler, and test pilot.

It should:

1. Discover new rights-cleared or open-license content from connected sources.
2. Generate metadata, thumbnails, summaries, collections, trailers, category rows, and playlist structures.
3. Recycle older approved content into fresh rows without pretending it is newly created.
4. Pilot the platform by simulating real catalog movement, homepage updates, viewer rows, recommendations, and content lifecycle states.
5. Keep the site active while original LoadPlay content is being created.
6. Require rights review before publishing anything risky or unknown.

Add New Admin Section

Admin > Autopilot Content Engine

This page should include:

- Autopilot status: On, Off, Demo Mode, Draft Only, Rights Review Only, Publish Approved Only
- Content refresh frequency: hourly, daily, weekly, manual
- Source selection: choose which connectors the engine can use
- Row selection: choose which LoadPlay rows the engine can update
- License safety level: strict, moderate, manual-only
- Content mode: discover, generate metadata, recycle, pilot test, publish approved
- Approval mode: manual approval required, publish only approved, never auto-publish unknown licenses
- Activity log
- Error log
- Last run timestamp
- Next scheduled run timestamp

Autopilot Modes

1. Demo Mode

Demo Mode is for testing only. It uses mock items, mock rows, and sample catalog movement.

Rules:

- Must display label: DEMO MODE ACTIVE
- Demo items must not be mixed with production content
- Demo items must not count as real views, real subscribers, real revenue, or real creator uploads
- Demo items can test rows, recommendations, watch progress, likes, saves, and discovery mechanics

2. Draft Only Mode

The engine can fetch and generate content drafts but cannot publish.

Use this while testing the connector system.

3. Rights Review Only Mode

The engine can send discovered items into Rights Review but cannot approve or publish.

Use this when adding new sources.

4. Publish Approved Only Mode

The engine can publish items that were previously approved by an admin.

This is the safest production mode.

5. Full Autopilot Mode

The engine can discover, draft, recycle, schedule, and publish approved content. It still cannot publish unknown, risky, or unapproved-license items.

What The Engine Should Generate

The system should generate or prepare the following:

1. Catalog rows

Examples:

- Public Domain Classics
- Documentary Vault
- Archive Discoveries
- Biography Shelf
- Kids Learning
- Nature and Space
- History Archive
- Music Discovery
- Audio Stories
- Newly Added
- Continue Watching
- Trending From Approved Library
- Rediscovered This Week

2. Metadata

For each item, the engine should generate:

- Short title if original title is too long
- Clean description
- Short synopsis
- Category mapping
- Tags
- Age suitability note
- Suggested row placement
- Search keywords
- Thumbnail recommendation
- Rights note
- Attribution text

3. Editorial collections

Examples:

- 10 public-domain films for Saturday night
- 12 archive documentaries about invention
- 8 public-domain animation selections for kids
- 15 historical videos for education
- 20 audio stories for background listening

4. Homepage rotations

The engine should rotate approved content into:

- Hero banner
- Featured row
- Newly Added row
- Archive Vault row
- Kids row
- Documentary row
- Music row
- Audio Stories row

5. Recycled content packages

Recycling means resurfacing approved content in a new context. It must not misrepresent old content as new.

Acceptable labels:

- Rediscovered
- From the Archive
- Staff Pick
- Public Domain Classic
- Educational Pick
- Historical Feature
- Weekend Watch
- Recently Featured

Do not use misleading labels such as:

- Brand New
- Just Released
- Original
- Exclusive

unless the content truly qualifies.

6. Pilot testing data

The engine should pilot the system by testing:

- Row population
- Empty-state behavior
- Duplicate detection
- Search results
- Category filtering
- Continue Watching
- My List
- Likes
- Saves
- View progress
- Profile preferences
- Thumbnail loading
- Player launch
- Rights report export
- Content lifecycle transitions

Data Models

Create an autopilotSettings object:

{
  "enabled": true,
  "mode": "publish_approved_only",
  "refreshFrequency": "daily",
  "licenseSafetyLevel": "strict",
  "allowedSources": ["internet_archive", "wikimedia", "nasa", "nps", "openverse"],
  "allowedRows": ["Public Domain Classics", "Documentaries", "Kids", "History", "Archive Vault"],
  "autoPublishApprovedOnly": true,
  "allowUnknownLicensePublishing": false,
  "allowDemoContentInProduction": false,
  "lastRun": null,
  "nextRun": null
}

Create an autopilotJob object:

{
  "jobId": "job_001",
  "type": "discover_content",
  "source": "internet_archive",
  "status": "queued",
  "createdAt": "",
  "startedAt": "",
  "completedAt": "",
  "itemsFound": 0,
  "itemsSavedToDraft": 0,
  "itemsSentToRightsReview": 0,
  "itemsPublished": 0,
  "errors": []
}

Create an autopilotGeneratedMetadata object:

{
  "contentId": "content_001",
  "generatedTitle": "",
  "generatedSummary": "",
  "generatedTags": [],
  "suggestedRows": [],
  "rightsRisk": "low",
  "ageSuitability": "general",
  "needsHumanReview": false,
  "generatedAt": ""
}

Create a recycledContentEvent object:

{
  "eventId": "recycle_001",
  "contentId": "content_001",
  "previousRows": ["Archive Vault"],
  "newRows": ["Rediscovered This Week"],
  "label": "Rediscovered",
  "reason": "Approved archive item with low rights risk and strong category fit",
  "createdAt": ""
}

Autopilot Rules

Rule 1: No blind publishing

The engine must not publish anything with unknown, custom, unclear, or risky rights.

Rule 2: Approved content may be recycled

Once content is approved, the engine may reuse it in different rows and collections.

Rule 3: Demo content stays separate

Demo or mock content cannot appear in production unless admin explicitly converts it into a real item with real rights metadata.

Rule 4: Every item needs a source trail

Every imported, recycled, or generated item must preserve:

- Provider
- Source URL
- License
- License URL
- Creator
- Attribution text
- Import date
- Approval state

Rule 5: Recycling must be honest

Old content can be resurfaced, but the labels must be truthful.

Rule 6: The system should fill empty rows

If a row is empty, Autopilot should suggest approved content for it.

Rule 7: The system should avoid duplicates

Use provider ID, source URL, title, and media URL to detect duplicates.

Rule 8: The system should protect brand quality

The engine should score content before suggesting it for visible rows.

Quality score criteria:

- Has thumbnail
- Has usable title
- Has clear license
- Has playable media URL
- Has category fit
- Has safe rating
- Has no broken source link

Suggested System Functions

Add functions such as:

- getAutopilotSettings()
- saveAutopilotSettings()
- runAutopilotNow()
- scheduleAutopilotRun()
- stopAutopilot()
- discoverContentFromEnabledSources()
- generateContentMetadata()
- suggestRowPlacement()
- recycleApprovedContent()
- createEditorialCollection()
- runPilotSimulation()
- fillEmptyRowsWithApprovedContent()
- detectDuplicateContent()
- scoreContentQuality()
- sendAutopilotItemsToDraft()
- sendAutopilotItemsToRightsReview()
- publishApprovedAutopilotItems()
- exportAutopilotActivityReport()

Scheduling

For a PWA-only MVP:

- Use manual Run Now button
- Use local scheduled checks when the app is open
- Store lastRun and nextRun locally
- Add visible warning: Browser-only scheduling runs only while the app is open

For production:

- Use backend cron jobs
- Use server-side workers
- Keep API keys server-side
- Run daily refresh jobs
- Store logs in database

Recommended schedule:

- Daily content discovery
- Weekly recycle refresh
- Weekly rights report export
- Manual publish approval
- Manual emergency stop

Admin UI Requirements

Autopilot dashboard cards:

1. Autopilot Status
2. Next Scheduled Run
3. Sources Enabled
4. Drafts Generated
5. Items Waiting for Rights Review
6. Approved Items Ready to Publish
7. Recycled Items This Week
8. Errors Needing Attention

Buttons:

- Run Autopilot Now
- Pause Autopilot
- Resume Autopilot
- Preview Next Run
- Generate Drafts Only
- Send Safe Items to Rights Review
- Publish Approved Items
- Recycle Approved Content
- Export Autopilot Report
- Clear Demo Data

Content Recycling System

Autopilot should be able to recycle content through these strategies:

1. Row Rotation

Move approved items between rows based on relevance.

2. Seasonal Collections

Create themed collections based on date or category.

Examples:

- Summer Learning
- Weekend Classics
- Black History Archive
- Family Documentary Night
- Space Week
- Nature Watch

3. Underused Content Resurfacing

If an approved item has not appeared in a row recently, suggest it again.

4. Category Repackaging

A public-domain documentary can appear in:

- Documentaries
- History
- Education
- Archive Vault

5. Thumbnail Refresh

Suggest a new thumbnail from approved stills or connected stock sources.

6. Metadata Refresh

Improve poor titles, summaries, and tags without changing the source or rights metadata.

Pilot Mode

Pilot Mode should let the team test the platform as if it has an active programming department.

Pilot Mode should test:

- Does the homepage stay populated?
- Do rows change correctly?
- Does approved content publish correctly?
- Do rejected items stay out of the platform?
- Do unknown licenses get blocked?
- Do recycled items carry honest labels?
- Do player links work?
- Do categories and search work?
- Does the rights report capture every item?

Pilot Mode must generate a report:

{
  "pilotRunId": "pilot_001",
  "rowsTested": 12,
  "itemsMoved": 40,
  "itemsBlockedByRights": 7,
  "itemsPublished": 15,
  "duplicatesDetected": 3,
  "brokenMediaLinks": 2,
  "recommendations": []
}

Claude Implementation Prompt

Copy and paste this into Claude after the Content Connector System prompt:

Add an Autopilot Content Engine to the existing LoadPlay Content Connector System.

Do not rebuild LoadPlay.
Do not remove existing features.
Do not redesign the app.
Add this as a new Admin section called Autopilot Content Engine.

Purpose:
The Autopilot Content Engine should automatically discover, generate, recycle, schedule, and pilot LoadPlay content while original LoadPlay content is being produced.

This is not blind auto-publishing. The engine must automatically create drafts, update rows, recycle approved content, generate metadata, and test the platform, while keeping rights safety controls in place.

Required pages:
1. Admin > Autopilot Content Engine
2. Admin > Autopilot Activity Log
3. Admin > Autopilot Pilot Report

Required modes:
- Off
- Demo Mode
- Draft Only
- Rights Review Only
- Publish Approved Only
- Full Autopilot

Required controls:
- Enable/disable Autopilot
- Select connected sources
- Select target rows
- Choose refresh frequency: manual, hourly, daily, weekly
- Choose license safety level: strict, moderate, manual-only
- Run Autopilot Now
- Preview Next Run
- Generate Drafts Only
- Send Safe Items to Rights Review
- Publish Approved Items
- Recycle Approved Content
- Export Autopilot Report
- Clear Demo Data

Required behavior:
- Discover content from enabled connectors
- Generate clean titles, descriptions, summaries, tags, categories, and suggested row placement
- Send new content to Draft Catalog first
- Send risky or unclear content to Rights Review
- Publish only admin-approved items
- Recycle approved content into new rows using honest labels such as Rediscovered, From the Archive, Staff Pick, Public Domain Classic, Educational Pick, Historical Feature, Weekend Watch, or Recently Featured
- Never label recycled content as Brand New, Original, Exclusive, or Just Released unless it truly qualifies
- Fill empty rows with approved content suggestions
- Detect duplicates by provider ID, source URL, title, and media URL
- Score content quality before suggesting it for visible rows
- Keep demo content separate from production content
- Generate pilot reports that test row population, rights blocking, publishing, search, category filtering, player launch, and content lifecycle changes

Required data models:
- autopilotSettings
- autopilotJob
- autopilotGeneratedMetadata
- recycledContentEvent
- pilotReport

Required functions:
- getAutopilotSettings()
- saveAutopilotSettings()
- runAutopilotNow()
- scheduleAutopilotRun()
- stopAutopilot()
- discoverContentFromEnabledSources()
- generateContentMetadata()
- suggestRowPlacement()
- recycleApprovedContent()
- createEditorialCollection()
- runPilotSimulation()
- fillEmptyRowsWithApprovedContent()
- detectDuplicateContent()
- scoreContentQuality()
- sendAutopilotItemsToDraft()
- sendAutopilotItemsToRightsReview()
- publishApprovedAutopilotItems()
- exportAutopilotActivityReport()

Scheduling rules:
For PWA-only MVP, scheduling can run manually or while the app is open.
For production, prepare the architecture for backend cron jobs or server-side workers.
API keys should be server-side in production.

Safety rules:
- No blind publishing
- No unknown-license publishing without admin approval
- No demo content in production rows
- No fake claims that old content is new
- Every item must preserve provider, source URL, license, license URL, creator, attribution, import date, and approval state
- Unknown, custom, unclear, or risky rights must go to Rights Review

Final verification required:
Before delivering the zip, verify:
1. Autopilot page exists
2. Autopilot Activity Log exists
3. Pilot Report page exists
4. All six Autopilot modes exist
5. Run Autopilot Now works
6. Draft generation works
7. Rights Review handoff works
8. Publish Approved Items works only for approved items
9. Recycle Approved Content works
10. Demo content stays separate
11. Unknown licenses are blocked
12. Pilot report generates
13. Existing LoadPlay pages still work
14. Existing Content Connector System still works

Do not deliver the zip until every item above is actually implemented and verified.
