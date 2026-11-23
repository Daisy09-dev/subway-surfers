# ROAD RUSH 🚦

**Run. Dodge. Learn the rules of the road.**

> **Development history:** [Read the full request-to-implementation documentation](docs/DEVELOPMENT_DOCUMENTATION.md), including feature requests, code walkthroughs, deployment milestones, testing checklist, and limitations.


LTO Road Rush is a browser-based **3D endless runner with road-safety quiz checkpoints**, adapted from the open-source [Subway Rush](https://github.com/AmineDehane/subway-surfers) project. It combines arcade gameplay with short questions about safe road behavior and, eventually, verified Philippine Land Transportation Office (LTO) rules.

> **Project status: playable prototype / work in progress.** The current questions are general road-safety examples, **not an official LTO exam bank**. Do not use the prototype as an authoritative source for traffic laws, penalties, or licensing requirements.

## The idea

A fast-paced three-lane runner becomes a learning tool. The player dodges hazards, jumps barriers, slides under signs, and collects coins. At regular distance checkpoints, gameplay **pauses** and a multiple-choice road-safety question appears. Answering correctly awards bonus points; every answer includes a brief explanation. The game resumes after the player continues.

The goal is to make traffic-safety learning approachable for students, new drivers, and anyone reviewing road rules without turning the game into a static questionnaire.

## Scope

### Implemented in this prototype
- Three-lane 3D endless-runner mechanics, jumping, sliding, obstacles, coins, and increasing speed (inherited from the original game).
- Desktop keyboard and mobile swipe controls.
- Road-safety checkpoint approximately every 250 distance points, beginning at 150.
- Multiple-choice questions with immediate explanations and a **+5 coin bonus** for correct answers.
- Gameplay paused while the player answers; a running correct-answer counter.
- Browser-local high score from the original runner.
- Structured question data in a dedicated module, separate from 3D rendering and collision logic.

### Planned, not yet implemented
- Curated, officially sourced Philippine LTO question sets, reviewed for current wording and rules.
- Categories for signs, right-of-way, licensing, road markings, and defensive driving.
- Difficulty levels, topic progress, and a results/learning dashboard.
- More Philippine-road-themed scenery and hazards, audio/accessibility improvements, and testing on more devices.
- Optional offline learning mode and question content versioning.

### Out of scope for the first release
- Official LTO accreditation, certification, or exam simulation.
- Real driving instruction, enforcement, penalties, or legal advice.
- Accounts, personal data collection, and server-side leaderboards.

## Gameplay loop

```text
Start run → Dodge / jump / slide / collect
                  ↓
          Reach checkpoint
                  ↓
        Freeze the runner
                  ↓
         Answer 1 question
                  ↓
        Feedback + explanation
                  ↓
          Resume the run
                  ↺
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Change lane | ← / → or A / D | Swipe left / right |
| Jump | ↑, W or Space | Swipe up |
| Roll / fast drop | ↓ or S | Swipe down |
| Answer quiz | Click a choice | Tap a choice |

## Run locally

No build tools or package installation are required. Use a local HTTP server because the app uses JavaScript ES modules:

```bash
git clone https://github.com/Daisy09-dev/subway-surfers.git
cd subway-surfers
python3 -m http.server 8000
```

Visit **http://localhost:8000**.

### Deploy with GitHub Pages

In repository **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then save. Once GitHub Pages deploys, the intended address is:

https://daisy09-dev.github.io/subway-surfers/

## Deploy

### Vercel (recommended)

1. Connect the **Vercel** integration and import `Daisy09-dev/subway-surfers` from GitHub.
2. Choose **Other** as the framework preset if prompted. This is a static site with no package install or build step.
3. Keep the project root as `./`, and deploy. The included `vercel.json` sets the output directory to the repository root.
4. Enable Git-based automatic deployments for future changes to `main`.

### Docker (optional)

```bash
docker build -t lto-road-rush .
docker run --rm -p 8080:80 lto-road-rush
```

Open **http://localhost:8080**. The container serves the existing HTML, JavaScript modules, assets, and vendored Three.js through Nginx. It does not require a Node.js runtime.

> These are deployment instructions, not confirmation of a live deployment. Verify the hosted URL and complete a browser playthrough before publishing it as ready.

## Clean project structure

```text
subway-surfers/
├── index.html              # Canvas, HUD, menus, accessible quiz overlay
├── src/
│   ├── main.js             # Existing Three.js runner and checkpoint integration
│   └── quiz/
│       └── questions.js    # Question content, selection, answer evaluation
├── assets/                 # Optional player.glb and art assets
├── vendor/three/           # Bundled Three.js dependency
├── LICENSE                 # Original MIT license
└── README.md               # Product concept, scope, usage and credits
```

### Development guidelines

- **Keep question content separate from game logic.** Each question has a stable ID, topic, prompt, choices, answer index, and explanation.
- **Keep rendering separate from scoring.** The quiz module exports pure functions; the runner controls pausing and UI.
- **Do not hardcode legal penalties or licensing rules** without a dated, official source and review.
- Use clear variable names, short functions, accessible labels, and avoid unnecessary dependencies.
- Test desktop/mobile input, checkpoint pause/resume, collision handling, and answer feedback before release.
- Prefer incremental refactoring of the inherited `src/main.js` over rewriting the physics engine without tests.

## Educational content and verification

The initial examples cover STOP signs, pedestrians, helmets, distracted driving, turning, and emergency vehicles. They are general safety questions and should be checked before public use.

For future LTO-specific questions, prioritize:
- [LTO official website](https://lto.gov.ph/) for current publications and guidance.
- [Official Gazette of the Philippines](https://www.officialgazette.gov.ph/) for the text of applicable laws.
- The actual statute or LTO issuance number, publication/update date, and source URL recorded alongside each question.

A future content review should distinguish **law**, **regulation**, **guidance**, and **gameplay simplification**. This project is independent and **not affiliated with or endorsed by the LTO**.

## Attribution and licensing

- **Original runner:** [AmineDehane/subway-surfers](https://github.com/AmineDehane/subway-surfers), MIT-licensed. This repository is a fork with educational gameplay additions.
- **Three.js:** © three.js contributors, MIT (bundled in `vendor/three/`).
- **Original game inspiration:** Subway Surfers by SYBO Games. This fan-made learning prototype is not affiliated with SYBO and does not use official Subway Surfers assets.
- **Educational adaptation:** Daisy09-dev.

See [LICENSE](LICENSE) for the repository's license.

## Roadmap

1. **MVP:** Quiz checkpoints, clear explanations, and rewards — initial implementation committed.
2. **Content quality:** Review questions against official LTO materials and add source metadata.
3. **Philippine road setting:** Introduce road signs and themed obstacles without compromising gameplay clarity.
4. **Learning analytics:** End-of-run accuracy, category feedback, and accessible review mode.
5. **Quality assurance:** Automated tests for quiz logic, mobile usability, and regression testing.

**Mission:** Help players remember road-safety principles through engaging, repeatable practice—not just memorizing answers.
