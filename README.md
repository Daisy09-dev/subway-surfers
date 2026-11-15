# Subway Rush 🚇

A 3D endless runner in the style of Subway Surfers, built with plain JavaScript and [three.js](https://threejs.org).
It runs in any modern browser on desktop and mobile. There's no build step and no install.

![gameplay](https://img.shields.io/badge/engine-three.js-black) ![license](https://img.shields.io/badge/license-MIT-green)

## How to play

| Action | Keyboard | Touch |
|---|---|---|
| Change lane | ← → or A D | Swipe left / right |
| Jump | ↑, W or Space | Swipe up |
| Roll / fast-drop | ↓ or S | Swipe down |

- **Red-white barriers** → jump over them
- **Yellow-black signs** → roll under them
- **Trains** are too tall to jump. Switch lanes, or run up a **grey ramp** to ride on top of them
- **Trains with red lights are moving toward you**
- Bumping into the side of a train makes you stumble. Do it twice within a few seconds and you're busted
- The game speeds up the longer you survive. Your best score is saved in your browser

## Run it locally

ES modules need a local web server. Opening `index.html` by double-clicking won't work.

```bash
# any one of these, from the repo folder
python3 -m http.server 8000
npx serve .
```

Then open <http://localhost:8000>.

## Put it online (GitHub Pages)

1. Go to **Settings → Pages** in this repo
2. Under *Source*, choose **Deploy from a branch** → `main` → `/ (root)` → **Save**
3. After about a minute the game is live at `https://<your-username>.github.io/subway-surfers/`

## Use your own 3D character (e.g. Meshy / Tripo / Mixamo)

1. Export your character as a **GLB** with animations included (one file, all clips)
2. Save it as `assets/player.glb`
3. Reload. It replaces the built-in runner automatically

Animations are matched by name: clips containing `run`/`walk` are used while running, `jump` in the air, and `roll`/`slide`/`crouch` when rolling.
If there's no roll clip, the character squashes down instead.
Size and facing are set in the `CONFIG` block at the top of `src/main.js` (`playerModelHeight`, `playerModelRotationY`).

## Tweak the game

Everything that controls the feel is in `CONFIG` at the top of [`src/main.js`](src/main.js): start and max speed, acceleration, gravity, jump height, roll time, and moving-train speed.

## Project structure

```
index.html        UI overlays + import map
src/main.js       the whole game (world, spawning, physics, input, camera)
vendor/three/     three.js r187 (MIT), vendored so the game works offline
assets/           put player.glb here
```

## Credits

- Game code: MIT
- [three.js](https://github.com/mrdoob/three.js) © three.js authors, MIT (`vendor/three/LICENSE`)
- Fan-made project inspired by *Subway Surfers*. Not affiliated with or endorsed by SYBO Games. All art is procedurally generated. No original game assets are used.
