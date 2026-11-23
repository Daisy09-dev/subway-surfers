# ROAD RUSH — Development Documentation and Request-to-Implementation Record

**Project:** ROAD RUSH (formerly LTO Road Rush)  
**Repository:** https://github.com/Daisy09-dev/subway-surfers  
**Playable site:** https://lto-road-rush.vercel.app/  
**Documented:** 24 November 2026  
**Status:** Iterative educational game prototype. Deployments have reported READY, but end-to-end browser, mobile, and multiplayer playtesting has **not** been confirmed.

## 1. Purpose and origin

ROAD RUSH is a browser-based 3D endless runner adapted from the open-source [Subway Rush](https://github.com/AmineDehane/subway-surfers) project. The idea was to turn an arcade runner into an educational game about Philippine road safety, with interactive quizzes, difficulty choices, a motorcycle pursuer, meme-style checkpoint characters, obstacles, audio, and online two-player rooms.

This document records **what was requested, how it was translated into code, what was deployed, and what remains unverified**. The requests were given conversationally; the implementation was made through changes to files in this GitHub repository and Vercel production deployments. This is a development history, **not** evidence that every feature works perfectly on all devices.

## 2. Technology and architecture

| Component | Implementation | Main file |
| --- | --- | --- |
| 3D world and endless runner | Three.js renderer, scene, camera, geometry, player movement, collision detection, procedural obstacles | `src/main.js` |
| Interface and SEO | HTML/CSS, menu, difficulty selector, quiz, room controls, metadata | `index.html` |
| Road-safety questions | Data objects with topic, choices, answer index, explanation, and optional level | `src/quiz/questions.js` |
| Music | Original synthesized 108-BPM instrumental via Web Audio API | `src/music.js` |
| Multiplayer prototype | PeerJS WebRTC peer-to-peer data connection and six-character room codes | `src/multiplayer.js` |
| Search discovery | Crawl instructions and sitemap | `robots.txt`, `sitemap.xml` |
| Hosting | Static files deployed from GitHub to Vercel | `vercel.json` |

The browser loads the HTML and ES modules; the main game loop advances the runner, updates obstacles, animates pursuers, updates multiplayer state, positions the camera, and renders the Three.js scene.

## 3. Chronological record of feature requests

### A. Road-safety learning game

**Request / goal:** Build an LTO-themed runner where players learn while playing.

**Implementation:** Existing endless-runner movement (three lanes, jumping, rolling, coins, and collisions) was extended with distance-based quiz checkpoints. At a checkpoint, the run pauses; the player answers a multiple-choice question and receives feedback and an explanation. Correct answers award five bonus coins.

**Code:** `src/main.js` and `src/quiz/questions.js`.

**Important:** The questions are **unofficial practice questions**, not verified verbatim questions from the Philippine LTO examination. The game is not affiliated with or endorsed by the LTO.

### B. Rename the game and create difficulty levels

**Request:** “Change the name ROAD RUSH”; add **Beginner, Intermediate, Pro** with LTO exam questions.

**Implementation:** The visible site title became ROAD RUSH. The menu gained three difficulty radio buttons. Game settings currently include:

| Difficulty | Initial speed | Distance between quizzes |
| --- | ---: | ---: |
| Beginner | 13 | 250 |
| Intermediate | 19 | 180 |
| Pro | 25 | 120 |

Questions are filtered by the selected level in `chooseQuestion(previousId, random, level)`. The bank currently contains **14** general road-safety practice questions, with questions lacking an explicit level treated as Beginner.

**Limitation:** Official LTO exam wording, coverage, and current legal accuracy have not been independently verified. The question pools are small and can repeat.

### C. Add a motorcycle chaser

**Request:** “I want user chase by a bike” and later “make it appear.”

**Implementation:** `makeBikeChaser()` constructs a stylized motorcycle and helmeted rider from Three.js geometry. `updateBikeChaser()` positions it behind and offset from the runner and moves it closer during a crash. The camera position was adjusted to improve visibility.

**Limitation:** The bike is a visual pursuer, not a separate physics-driven opponent with capture or collision logic.

### D. Add online multiplayer with room codes

**Request:** “Implement online real-time multiplayer with room codes for ROAD RUSH.”

**Implementation:** `src/multiplayer.js` dynamically loads PeerJS from an external module URL, creates a six-character room code, and connects a host and guest through a WebRTC data channel. Position packets are transmitted periodically. `src/main.js` renders the other player as a simple cyan runner.

**Player workflow:** Create room → share code → second player joins → both start playing.

**Limitations:** Intended for two players. The connection depends on the external PeerJS signaling service and network conditions. The game does **not** synchronize obstacle generation, quizzes, scoring rules, or a shared race finish. Two-device gameplay has not been independently verified.

### E. Add background music and game-over meme sounds

**Request:** Add hip-hop background music and funny meme sounds.

**Implementation:** `src/music.js` synthesizes an original instrumental with oscillator-based bass, melody, drums, and volume/mute controls. `src/main.js` plays original descending cartoon “wah-wah” and “boing” game-over sounds and short checkpoint cues using Web Audio API.

**Rights consideration:** These are generated effects, **not** the exact recordings of commercial songs or viral TikTok sounds. Using specific protected recordings would require appropriate permissions or licenses.

### F. Make the game discoverable in Google

**Request:** “Make it searchable in google” with the phrase “ROAD RUSH road safety game.”

**Implementation:** Added a descriptive HTML title, meta description, canonical URL, Open Graph/Twitter metadata, VideoGame JSON-LD structured data, `robots.txt`, and `sitemap.xml`.

**Limitation:** These changes help discovery but do not guarantee indexing or a ranking. Site ownership verification and submission through Google Search Console are separate steps.

### G. Add meme characters at stations, then have them chase

**Request:** Meme/GIF pictures should **wait at certain road blocks**, pop out when reached, then join the chase.

**Implementation:** Earlier experiments used blocky 3D characters. These were replaced with camera-facing picture sprites and a screen-space animated overlay to improve visibility. The current code uses **original illustrated SVG placeholder faces**, not the exact user-provided images or real GIF files. The pictures bounce and tilt while following the player.

**Unlock points were lowered after feedback:**

| Pursuer | Current unlock score |
| --- | ---: |
| Dog meme-style character | 15 |
| Screaming meme-style character | 45 |

The logic is in `memeArt`, `memeMilestones`, `memeSprites`, and `updateMemeSprites()` in `src/main.js`.

### H. Make meme characters create obstacles

**Request:** Chasers should generate obstacles, and the player should **see the characters performing the action**, rather than reading an on-screen warning.

**Implementation:** The first iteration created a barrier and displayed a warning. The warning was removed in the next revision. The latest version animates an attack sequence:

1. An unlocked pursuer begins a throw after its cooldown.
2. The picture leans and bounces during the attack.
3. A colored 3D barrier projectile starts near the pursuer.
4. The projectile flies in an arc toward the player's lane.
5. On landing, the projectile is replaced with a real low barrier that participates in the normal collision system.
6. The player can jump over or switch lanes to avoid it.

**Code:** `memeObstacle()`, `updateMemeThrow()`, and `updateMemeSprites()` in `src/main.js`.

**Current timing:** Meme obstacles are attempted after approximately 95 score points per pursuer since its last successful throw. The projectile animation lasts approximately 0.95 seconds. Placement checks avoid directly overlapping another obstacle in the same lane. The existing runner physics determines whether the player collides.

**Limitation:** This is a stylized throw using animated picture movement and a 3D projectile. It is **not** a frame-by-frame GIF of a character physically lifting and placing an obstacle. Actual GIF assets and animation synchronization are possible future improvements.

## 4. How the implementation process worked

The practical workflow used for each request was:

1. **Interpret the requested behavior** in terms of game state, visual elements, interactions, and player feedback.
2. **Inspect the current repository files**, especially `src/main.js`, to find the relevant gameplay functions.
3. **Modify or add JavaScript/HTML modules** while retaining the runner, quiz, and existing audio.
4. **Commit changes to GitHub** with a descriptive commit message.
5. **Deploy the resulting commit to Vercel production**.
6. **Check the deployment state** (typically READY).
7. **Use player feedback to iterate**, such as lowering unlock scores, improving meme visibility, and replacing text warnings with visible throws.

**Critical distinction:** A GitHub commit confirms a source-code change. A Vercel READY deployment confirms a successful deployment state. Neither alone proves that the visual animation, browser audio, or multiplayer behavior passed real-device acceptance testing.

## 5. Selected GitHub change history

These commits illustrate the progression of the requests; they are not a complete `git log`.

| Feature / iteration | Commit |
| --- | --- |
| Original procedural music | `2467f20` |
| Integrate music with game | `d62cb6b` |
| Music controls | `04a9370` |
| Difficulty levels and rename | `6abac29` |
| Motorcycle pursuer | `6f3984c` |
| Online multiplayer rooms | `67f634c` |
| Search metadata and sitemap | `a30367b` |
| Funny game-over sting | `d831f69` |
| First 3D meme-style pursuers | `946a20b` |
| Meme picture sprites and milestones | `a79c3b1` |
| Earlier 30/80-point unlocks | `c6fa892` |
| Visibility overlay and 15/45 unlocks | `7343b7a` |
| Chasers generate targeted barriers | `ffda72a` |
| Visible throwing animation instead of text | `14f861f` |

For the authoritative and complete history, see the repository's [commit log](https://github.com/Daisy09-dev/subway-surfers/commits/main/).

## 6. Key functions for a code walkthrough

| Function | What to explain in a demonstration |
| --- | --- |
| `resetGame()` | Restores score, position, obstacles, pursuers, and checkpoint state |
| `startGame()` | Reads selected difficulty and starts the game |
| `updatePlaying(dt)` | Advances position, physics, collisions, coins, and quiz checkpoints |
| `spawnObstacle(type, lane, z)` | Builds a collidable road obstacle |
| `chooseQuestion(...)` | Picks a question from the chosen difficulty |
| `makeBikeChaser()` / `updateBikeChaser()` | Creates and moves the motorcycle |
| `updateMemeSprites(dt, t)` | Unlocks meme characters and animates their chase |
| `memeObstacle(m, i)` | Begins a barrier-throwing attack |
| `updateMemeThrow(m, i, dt)` | Animates the flying obstacle and places the collision barrier |
| `createMultiplayer(...)` | Creates or joins a PeerJS room and exchanges positions |
| `createRoadRushMusic()` | Produces original instrumental audio and mute/volume controls |
| `frame(timestamp)` | Runs the per-frame update and rendering pipeline |

## 7. How to run and demonstrate the game

**Play online:** https://lto-road-rush.vercel.app/

**Run locally:**

```bash
git clone https://github.com/Daisy09-dev/subway-surfers.git
cd subway-surfers
python3 -m http.server 8000
```

Open http://localhost:8000 in a browser.

**Suggested demonstration:** Start on Beginner; show movement and the quiz flow; reach 15 points to unlock the dog; reach 45 points to unlock the screaming character; keep running to observe their throws; show a collision and game-over sound; then demonstrate Create Room / Join Room using two separate devices if the connection succeeds.

## 8. Testing checklist

- [ ] Refresh the live site and confirm the latest deployment is served.
- [ ] Verify Beginner, Intermediate, and Pro start and display their intended question pools.
- [ ] Confirm the dog unlocks at 15 points and the screaming character at 45.
- [ ] Confirm both pictures are visible on desktop and mobile.
- [ ] Observe a projectile leave a pursuer and land as a real obstacle.
- [ ] Confirm a jump avoids a low barrier and collision causes the expected result.
- [ ] Confirm repeated throws do not create unavoidable overlapping barriers.
- [ ] Confirm audio starts after user interaction and respects mute/volume.
- [ ] Verify game-over sound plays once.
- [ ] Test Create Room / Join Room on two devices and disconnect/rejoin.
- [ ] Check that `robots.txt` and `sitemap.xml` load publicly.
- [ ] Submit sitemap to Google Search Console after verifying site ownership.

## 9. Known limitations and next steps

- **Artwork:** The current meme images are generated SVG illustrations; supplied screenshots have not been committed as GIF assets.
- **Animation:** Throwing is simulated by tilting an image and animating a 3D projectile; it is not a true character GIF action.
- **Multiplayer:** A visual two-player prototype, not a synchronized competitive race or authoritative multiplayer server.
- **Education:** Expand and verify the question bank using official, current LTO publications. Avoid labeling practice questions as actual LTO exam items.
- **Reliability:** Add automated tests, device testing, network error handling, and performance profiling.
- **Discoverability:** Google indexing is pending independent verification.
- **Accessibility:** Check keyboard focus, touch interactions, reduced-motion settings, and contrast.
- **Copyright:** Use only original or appropriately licensed image and audio assets.

## 10. Attribution and responsible use

The project was adapted from the open-source Subway Rush repository; preserve its original license and attribution as required by the repository's `LICENSE` file. Subsequent changes were guided by the project owner's conversational feature requests and implemented with AI-assisted code editing and GitHub/Vercel tools. This documentation distinguishes requested functionality, source-code implementation, deployment status, and testing gaps.

**Project name:** ROAD RUSH  
**Public site:** https://lto-road-rush.vercel.app/  
**Source code:** https://github.com/Daisy09-dev/subway-surfers
