# Portfolio site — open items

## Current phase (as of 2026-09-14)
Design/interaction work is **paused**. Moving to content population —
real copy + image assets across all projects — with a goal to publish
today. Everything below this line is deferred until after launch;
don't reopen these mid-content-pass unless something actively breaks.

New items from this decision:
- [x] Project list confirmed: all 4 go under UX Case Studies (Ameelio for Families, Ameelio for Attorneys, Migraine Mentor, Lyft "Take Back the Ride"). "Passion Projects, Etc." section dropped from the homepage entirely — nav still says UX/ME/ETC. per the original brand identity spec, but ETC. currently has no section to scroll to (dead anchor) until that's revisited.
- [x] Card images dropped from homepage cards for now (per your call) — cards are text-only, full container width. Real per-project thumbnails deferred to the image/redesign pass.
- [x] Headshot: using the real photo pulled from the old Wix About page (`assets/headshot.jpg`, 800×800 original).
- [x] Bio copy: pulled from Wix About page verbatim.
- [x] Email confirmed current: `elizabethogray@gmail.com`, wired as a real `mailto:` link on "Email Me".
- [ ] Resume: explicitly on ignore for now — link still goes to `href="#"`.
- [ ] Hosting/deploy target not chosen yet for the REAL final site — currently living on a Claude Artifact link as a WIP placeholder (see below).
- [ ] Favicon still open (see Misc below).

## Next round — design/interaction (post-launch)
- [ ] Overall scrolling pace
- [ ] Project cards
- [ ] Vertical spacing on landing page
- [ ] Integrating widget

## Project pages — status
- [x] **Ameelio for Families** — built (`ameelio-for-families.html`), real copy pulled from Wix (with your edits applied), all inline citation links preserved.
- [x] **Ameelio for Attorneys** — built (`ameelio-for-attorneys.html`), using the flexible-block approach: Research Plan as a label/value spec list, Research Artifacts, a plain narrative trust-issues section, MVP Design Directions, 2 numbered feature sections.
- [x] **Migraine Mentor** — built (`migraine-mentor.html`), no Problem/Solution or Impact (matches the original) — Background, Designs (6-image gallery), Process (3 captioned images).
- [x] **Take Back the Ride** — built (`take-back-the-ride.html`), added a new `<ul>` bullet-list style for the Research section (didn't exist before), plus a new spacing rule for consecutive paragraphs/lists within a block (`.project-block > p + p` etc.) — this was a real gap the multi-paragraph blocks exposed.
- [x] All 4 project pages now link to each other correctly: homepage cards → each project; "Next Project" cycles Families → Attorneys → Migraine Mentor → Take Back the Ride → back to Families.
- [ ] `project.html` (the generic lorem-ipsum template) is kept around on purpose as a reference — not linked from anywhere real.
- [ ] All images across all 4 pages are still placeholders — HTML comments above each `.block-image`/`.card-image` note which real filename belongs there. **Next phase: uploading real media, see below.**

## Image/asset inventory (from Wix, for your reference)
Full per-page filename list was posted in chat — ~19 of the Attorneys/Migraine Mentor images have no filename in Wix (empty alt text), only descriptive captions or nothing at all. Ask me to pull thumbnails of those if matching them to your local files by sight would help.

## Publishing
- [x] WIP site is live (private) as a Claude Artifact: https://claude.ai/code/artifact/cf63c4d6-c6dd-45bf-967b-9a243e9d0d86 — republished after every batch of changes so the link always reflects latest. Meant as a temporary stand-in, not the final host.
- [x] Fixed a real bug where a hand-maintained duplicate (`artifact-index.html`) had drifted out of sync with the real homepage, causing a stale "Ameelio for Families" link. Replaced with `build-artifact.py`, which generates the artifact copy (and cache-busted asset URLs, via `?v=<timestamp>`) automatically from the real source files — the two can't drift again. Always run `python3 build-artifact.py` before publishing.
- [ ] Card-width bug reported after a hard refresh — verified twice (locally and via the artifact's actually-served CSS) that the code itself renders correctly, so this looks like a caching layer beyond the code. Asked you to try a private/incognito window as a diagnostic; unresolved pending that result.

## Uploading real media (next phase)
- Each placeholder box in every project page has an HTML comment directly above it noting the real filename(s) that belong there (e.g. `<!-- image: quickreplies-1.png -->`), so matching your files to slots should be straightforward.
- Best way to send them: drop image files directly in chat, or give me local file paths if they're already organized somewhere. I'll copy each into `portfolio/assets/`, swap the matching placeholder `<div class="block-image">` for a real `<img>` (or background-image, matching how the headshot was done), rebuild, and republish.
- Doing this one project page at a time is probably easiest to keep track of, but whatever order is fine.
- [x] **Ameelio for Families hero done**: built a new reusable `.asset-gallery` / `.asset-frame` / `.asset` component (blue #9FACDF background, light-gray #E9E9E9 frame with divider-color inner stroke, 4px/8px radii per spec) — full-width strip above the intro text, replacing the old side-by-side image+text layout for this page only. Holds the 3 real hero videos (autoplay/muted/loop). Flex-wrap so it isn't locked to exactly 3 assets.
- [x] The 3 `.mov` files you provided had audio tracks and aren't a standard web-servable type — remuxed to `.mp4` using macOS's built-in `avconvert` (container change only, no quality loss, same file size) since this environment has no `ffmpeg`. If you supply video assets for other pages, either send `.mp4`/`.webm` directly or expect the same remux step.
- [x] **Ameelio for Attorneys hero + Research Artifacts done**: single hero video (landscape, 2140×1520) in the same `.asset-gallery` component (it already flexed to hold just one asset). The 3 Research Artifacts diagrams are enormous (up to 7156px wide) — didn't fit the phone-frame pattern, so built a new `.asset-frame--full`/`.asset--full` variant sized by width instead of height, stacked one per row.
- [x] **New sitewide feature: lightbox** (`assets/lightbox.js`) — click any `.asset` (image or video) to open it fullscreen with click-to-zoom (2.5x) and drag-to-pan; images use a `data-full` attribute to load a higher-resolution source than the inline thumbnail when one exists. Wired into all project pages, including retroactively on Ameelio for Families.
- [x] **Image optimization pipeline established**: for huge source diagrams, generate a compressed inline thumbnail (`sips`, resized to 1470px/2x + JPEG) in `assets/images/`, keep the untouched original in `assets/images/full/` for the lightbox's `data-full`. Reuse this pattern for any future oversized diagram assets.
- [x] **Migraine Mentor fully populated**: hero image, Designs (color palette), and Process section (needs-hierarchy + four-quadrants research boards, wireframe sketch, B&W wireframe grid, IA flow diagram, usability-test screenshot + GIF). Note: real filenames didn't match the placeholder comments left over from Wix (those were guesses) — mapped by visually comparing each file to what you'd sent in chat instead. Deleted the "Initial App Ideation" slot per your instruction, and dropped `quadrants_full.heic` (a blurry phone photo of the same board as `four quadrants.png`, which is the legible digital version) as a redundant duplicate — flag if you actually wanted both.
- [x] **Take Back the Ride mostly populated**: task analysis diagram, and a new **carousel component** (`assets/carousel.js`) for the 5-slide "building the recommendations" sequence — click-through prev/next instead of stacking 5 near-duplicate slides. Both Feature 1 images (emergency assistance, post-ride reporting) are in. Still a placeholder: "Sample slide of Lyft vs. Uber competitor analysis" — no matching asset was in the folder you sent. Cross-checked against the live old Wix page (`.../take-back-the-ride`): order and carousel placement already match — no changes made.
- [x] **Migraine Mentor image order/behavior pass** (cross-checked against the live old Wix page, `.../bontriage`):
  - Designs section was showing the wrong image (`migraine-mentor-colors.jpg`, a generic brand-moodboard placeholder unrelated to the product) instead of the 6 real app screenshots the old site actually has there. You sent the 6 real screenshots directly in chat; saved them to `assets/images/migraine-mentor-design-*.png` and replaced the Designs section with a 6-image `.asset-gallery` (wraps 3-per-row), matching the old site's grid. Deleted the old moodboard file — it's not used anywhere anymore.
  - Process section was one long stream of 7 stacked images; the old site actually groups it into distinct captioned sub-galleries. Rebuilt as two separate carousels (reusing `assets/carousel.js`, same component as Take Back the Ride): "Exploring the Problem Space" (needs-hierarchy, four-quadrants — 2 slides) and "Lo- and Mid-Fi Iterating & Remote Usability" (wireframe-sketch, bw, ui-flow, conducting-user-test, user-test-loop.gif — 5 slides). The old site's middle group ("Initial App Ideation...") stays dropped per your earlier call.
  - Note: `ui-flow.jpg`, `conducting-user-test.jpg`, and `user-test-loop.gif` don't actually appear on the old Wix page — they read as usability-testing material sent directly in chat to the earlier session rather than pulled from Wix. Left them grouped in the Lo/Mid-Fi carousel (least disruptive default) — flag if you'd rather they get their own caption/section.
  - Republished to the artifact (Version 13) with this pass included.
- [x] **Ameelio for Attorneys "Research Artifacts" converted to thumbnails**: the 3 huge diagrams (up to 7156px wide) were stacked full-width one after another — per your call, rebuilt as a row of 3 smaller width-sized thumbnails (new `.asset-gallery--thumbs`/`.asset-thumb` CSS) inside the existing `.asset-gallery` blue container, each with its own caption below it. Click-to-zoom via the existing lightbox still works (verified in browser — opens the full-res version). Republished (Version 14).
- [x] **New reusable component: carousel** (`.carousel`/`.carousel-slide`/`.carousel-controls`) for step-by-step content where stacking every frame would be repetitive. Same full-width frame styling as a single wide image; not lightbox-integrated for navigation (clicking the slide image still opens the zoom lightbox, arrows just advance slides).
- [x] **All 3 feature blocks on Ameelio for Families now use real screenshots** (`replies1-3.png`, `trust1-3.png`, `surveillance1-3.png`, found directly in the same Wix-assets folder as the hero videos) — each feature's single `.block-image` placeholder replaced with a 3-image `.asset-gallery`, one caption kept per group (not per image). Added: a `.project-block .asset-gallery` spacing override (32px above / 8px to caption, matching the old single-image rhythm) and a tiered mobile shrink (`.asset` height steps down at 768px/480px breakpoints) so a row of images never overflows on narrow screens.

## Typography
- [ ] Kerning pass on all text, particularly the project-page subheaders (subheader1 "block-title" / subheader2 "Problem"/"Solution"). Current letter-spacing is a flat 16% for these — check if it needs per-character kerning adjustment or a different tracking value once real content is in.

## Cards
- [x] Corner shape — now comes from the hand-drawn `card-stroke-default.svg` / `card-stroke-hovered.svg` (stretched 100%/100% per card), not a CSS border-radius. Wobble amount will vary slightly with each card's actual aspect ratio — accepted tradeoff.
- [x] Cards confirmed at full content-container width (735px, explicit `width:100%` added for robustness).
- [x] Hover now truly removes the default stroke (separate `::before`/`::after` layers cross-dissolving opacity 1↔0) instead of layering the hover stroke on top of a still-visible default.
- [ ] Card **image** corner radius (8px) is still a separate CSS value, independent of the stroke SVG — confirm it should stay at 8px.
- [ ] Card stroke crossfade duration (200ms ease) was a starting guess per your "not sure, start with something" — flag if it needs tweaking once you see it in daily use.
- [ ] Mobile card layout — still stacks image above text, full-width. Confirm direction or specify image-below instead.

## Hyperlinks
- [x] Built: default 0.5px line at text color, 4px below the baseline (measured empirically for 16px/150% line-height = 21px from box top — re-measure if that type spec ever changes elsewhere `.hyperlink` is used). Hover: red SVG slides in from the right over 200ms, slides out to the LEFT over 200ms on mouse-out, waits for an in-progress slide-in to finish before reversing. Applied to: Resume, Email Me, Website, award link, inline body links. NOT applied to nav links, whole-card links, or Next Project (they keep their own hover treatment).
- [x] Hover text color now switches to red (`--accent`). Since the underline uses `currentColor`, the default line also turns red on hover as a side effect — flag if you'd rather the line stay black and only the text go red.
- [ ] **Known limitation**: the animated hover SVG assumes a single-line link (built as `inline-block` so the phrase won't break mid-word — the surrounding paragraph still wraps normally around it). If a future link phrase is long enough to need to wrap internally across two lines, the sliding animation won't follow the wrap correctly. Flag this if a long link title ever comes up — will need a different technique for that specific case.

## Design tokens
- [x] Logged `--divider` (black @ 8%, the card-stroke color) in the color-reference block at the top of styles.css alongside the existing tokens, so all colors can be audited/reset from one place.

## Misc
- [ ] Favicon — still open (EG monogram vs. custom mark).
- [ ] `.block-image` placeholder — fixed 280px height for now; will likely need to flex once real images are in.
- [ ] Resume link — currently `href="#"`, needs a real file.
- [ ] `--nav-text-bottom: 56px` (nav gradient fade point) — computed from 24px padding + 32px logo height; re-check once nav copy/sizing is finalized.
- [ ] Extra 24px image padding — applied to standalone full-width images (widget placeholder, project block-images). NOT applied to thumbnail images inside cards/about (they sit beside text in a row). Confirm this is the right split, or extend to those too.

## Dev notes
- Local preview server is now `portfolio/devserver.py` (not plain `python -m http.server`) — it sends `Cache-Control: no-store` so edits show up on refresh instead of serving a stale cached copy. If you ever run the site locally yourself, use `python3 devserver.py` from inside `portfolio/`.
