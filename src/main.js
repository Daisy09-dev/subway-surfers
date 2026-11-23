import * as THREE from 'three';
import { createRoadRushMusic } from './music.js';
import { createMultiplayer } from './multiplayer.js';
const roadMusic = createRoadRushMusic();

import { chooseQuestion, evaluateAnswer } from './quiz/questions.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// =====================================================================
// CONFIG – tweak the feel of the game here
// =====================================================================
let selectedLevel = 'beginner';
const LEVELS = { beginner:{speed:13,quizInterval:250}, intermediate:{speed:19,quizInterval:180}, pro:{speed:25,quizInterval:120} };
const CONFIG = {
  // Drop a rigged/animated GLB (e.g. from Meshy or Tripo) at this path to replace
  // the built-in runner. Clips whose names contain "run"/"walk", "jump" and
  // "roll"/"slide" are picked up automatically. Set to '' to always use the built-in runner.
  playerModel: 'assets/player.glb',
  playerModelHeight: 1.8,        // model is auto-scaled to this height (metres)
  playerModelRotationY: Math.PI, // most generated models face +Z; the runner runs toward -Z

  laneWidth: 2.4,
  startSpeed: 15,      // units per second
  maxSpeed: 36,
  acceleration: 0.22,  // speed gained per second
  gravity: 42,
  jumpVelocity: 13.5,  // peak ≈ 2.2 m: clears barriers, NOT trains (use the ramps)
  rollDuration: 0.7,
  movingTrainSpeed: 9,
};

// =====================================================================
// Constants & helpers
// =====================================================================
const LANE_W = CONFIG.laneWidth;
const TRAIN_H = 3.0;
const TRAIN_W = 2.1;
const RAMP_LEN = 7;
const TILE_LEN = 40;
const NUM_TILES = 6;
const SPAWN_AHEAD = 170;
const DESPAWN_BEHIND = 20;
const PLAYER_HALF_W = 0.32;
const PLAYER_HALF_D = 0.3;
const STAND_H = 1.75;
const ROLL_H = 0.9;
const TOP_SNAP = 0.45; // how far below a train roof you can be and still land on it

const laneX = (l) => (l - 1) * LANE_W;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weighted(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0 && weights[k] > 0) return k;
  }
  return 'low';
}

// =====================================================================
// Renderer, scene, camera, lights
// =====================================================================
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const SKY = 0x9fd8ff;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 55, 170);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 4.3, 7.8);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.7));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 30, bottom: -30, near: 1, far: 90 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================================
// Procedural textures & materials
// =====================================================================
function canvasTexture(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}
function stripes(colA, colB) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = colA;
    g.fillRect(0, 0, w, h);
    g.fillStyle = colB;
    for (let x = -h; x < w + h; x += 64) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + h, 0);
      g.lineTo(x + h + 32, 0);
      g.lineTo(x + 32, h);
      g.fill();
    }
  });
}
const gravelTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#9a8f80';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    const v = 110 + Math.random() * 90;
    g.fillStyle = `rgb(${v},${v - 8},${v - 20})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
}, 8, 6);
const windowsTex = canvasTexture(128, 256, (g, w, h) => {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);
  for (let y = 12; y < h - 10; y += 28) {
    for (let x = 10; x < w - 10; x += 30) {
      g.fillStyle = Math.random() < 0.3 ? '#fff1b8' : '#5d7088';
      g.fillRect(x, y, 18, 16);
    }
  }
});

const std = (o) => new THREE.MeshStandardMaterial(o);
const MAT = {
  gravel: std({ map: gravelTex, roughness: 1 }),
  bed: std({ color: 0x6b5847, roughness: 1 }),
  rail: std({ color: 0xc9ced6, metalness: 0.8, roughness: 0.3 }),
  sleeper: std({ color: 0x5a4030, roughness: 0.9 }),
  wall: std({ color: 0xb9b3a8, roughness: 0.95 }),
  wallTop: std({ color: 0x8f8a80, roughness: 0.95 }),
  buildings: [0xf2c6a0, 0xd98e73, 0xa7c4d9, 0xe8dcc0, 0xc7a6d9, 0x9fd1b5, 0xf0a1a1].map(
    (c) => std({ color: c, map: windowsTex, roughness: 0.9 })
  ),
  trains: [0x2f7de1, 0xe24b3b, 0x2bb673, 0xf2a72e, 0x8e5bd6].map((c) =>
    std({ color: c, roughness: 0.45, metalness: 0.25 })
  ),
  trainDark: std({ color: 0x1d2533, roughness: 0.7 }),
  trainWindow: std({ color: 0x9fd0ff, emissive: 0x1a3550, roughness: 0.15, metalness: 0.3 }),
  headlight: new THREE.MeshBasicMaterial({ color: 0xfff3a0 }),
  headlightHot: new THREE.MeshBasicMaterial({ color: 0xff5533 }),
  ramp: std({ color: 0x8c929c, roughness: 0.8, metalness: 0.2 }),
  post: std({ color: 0x555c66, roughness: 0.6, metalness: 0.4 }),
  stripeRW: std({ map: stripes('#ffffff', '#e8262b'), roughness: 0.6 }),
  stripeYB: std({ map: stripes('#ffd21a', '#1b1b1b'), roughness: 0.6 }),
  coin: std({ color: 0xffc61a, emissive: 0xb07000, emissiveIntensity: 0.6, metalness: 0.35, roughness: 0.3 }),
  // built-in runner
  hoodie: std({ color: 0xff7a1a, roughness: 0.8 }),
  pants: std({ color: 0x2b4c8c, roughness: 0.85 }),
  skin: std({ color: 0xf1c27d, roughness: 0.7 }),
  cap: std({ color: 0xe8253b, roughness: 0.6 }),
  shoe: std({ color: 0xffffff, roughness: 0.6 }),
};

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
function box(mat, sx, sy, sz, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

// =====================================================================
// World tiles (ground, rails, walls, buildings) – recycled endlessly
// =====================================================================
const SLEEPERS_PER_LANE = 20;
const sleeperGeo = new THREE.BoxGeometry(1.9, 0.1, 0.35);
const groundGeo = new THREE.PlaneGeometry(70, TILE_LEN).rotateX(-Math.PI / 2);
const tiles = [];

function makeTile() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(groundGeo, MAT.gravel);
  ground.receiveShadow = true;
  g.add(ground);
  g.add(box(MAT.bed, LANE_W * 3 + 0.6, 0.04, TILE_LEN, 0, 0.02, 0, false));

  const sleepers = new THREE.InstancedMesh(sleeperGeo, MAT.sleeper, 3 * SLEEPERS_PER_LANE);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let l = 0; l < 3; l++) {
    g.add(box(MAT.rail, 0.1, 0.14, TILE_LEN, laneX(l) - 0.72, 0.1, 0, false));
    g.add(box(MAT.rail, 0.1, 0.14, TILE_LEN, laneX(l) + 0.72, 0.1, 0, false));
    for (let k = 0; k < SLEEPERS_PER_LANE; k++) {
      m.makeTranslation(laneX(l), 0.05, -TILE_LEN / 2 + (k + 0.5) * (TILE_LEN / SLEEPERS_PER_LANE));
      sleepers.setMatrixAt(i++, m);
    }
  }
  sleepers.receiveShadow = true;
  g.add(sleepers);

  const wallX = LANE_W * 1.5 + 0.9;
  for (const s of [-1, 1]) {
    g.add(box(MAT.wall, 0.5, 1.4, TILE_LEN, s * wallX, 0.7, 0));
    g.add(box(MAT.wallTop, 0.7, 0.15, TILE_LEN, s * wallX, 1.45, 0));
  }

  g.userData.buildings = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const b = box(MAT.buildings[0], 1, 1, 1, 0, 0, 0, false);
      b.userData = { side: s, slot: k };
      g.add(b);
      g.userData.buildings.push(b);
    }
  }
  randomizeBuildings(g);
  scene.add(g);
  return g;
}

function randomizeBuildings(tile) {
  for (const b of tile.userData.buildings) {
    const w = rand(6, 11);
    const h = rand(7, 24);
    const d = rand(7, 9.5);
    b.material = pick(MAT.buildings);
    b.scale.set(w, h, d);
    b.position.set(b.userData.side * (6.2 + w / 2 + rand(0, 2.5)), h / 2, -TILE_LEN / 2 + b.userData.slot * 10 + 5);
  }
}

for (let i = 0; i < NUM_TILES; i++) tiles.push(makeTile());

// =====================================================================
// Obstacles: trains, ramps, barriers
// =====================================================================
const rampShape = new THREE.Shape();
rampShape.moveTo(0, 0);
rampShape.lineTo(0, TRAIN_H);
rampShape.lineTo(RAMP_LEN, 0);
rampShape.closePath();
const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: TRAIN_W - 0.1, bevelEnabled: false });
rampGeo.rotateY(-Math.PI / 2); // shape x -> +z (toward the player), extrude depth -> -x
rampGeo.translate((TRAIN_W - 0.1) / 2, 0, 0);

// Train group origin = centre of the FRONT face at ground level; the body extends toward -z.
function makeTrain(L, withRamp, moving) {
  const g = new THREE.Group();
  const body = pick(MAT.trains);
  const bodyH = TRAIN_H - 0.35;
  g.add(box(body, TRAIN_W, bodyH, L, 0, 0.35 + bodyH / 2, -L / 2));
  g.add(box(MAT.trainDark, TRAIN_W - 0.3, 0.35, L - 0.6, 0, 0.175, -L / 2));
  for (const s of [-1, 1]) {
    g.add(box(MAT.trainWindow, 0.04, 0.7, L - 1.6, s * (TRAIN_W / 2 + 0.01), 2.05, -L / 2, false));
    g.add(box(MAT.trainDark, 0.04, 0.12, L - 0.4, s * (TRAIN_W / 2 + 0.01), 1.1, -L / 2, false));
  }
  g.add(box(MAT.trainWindow, TRAIN_W - 0.5, 0.8, 0.04, 0, 2.1, 0.01, false));
  g.add(box(MAT.trainDark, TRAIN_W - 0.4, 0.05, L - 0.4, 0, TRAIN_H + 0.02, -L / 2, false));
  const lightMat = moving ? MAT.headlightHot : MAT.headlight;
  for (const s of [-1, 1]) g.add(box(lightMat, 0.32, 0.22, 0.05, s * 0.65, 0.9, 0.02, false));
  if (withRamp) {
    const ramp = new THREE.Mesh(rampGeo, MAT.ramp);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    g.add(ramp);
  }
  return g;
}

function makeLowBarrier() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(box(MAT.post, 0.12, 1.0, 0.12, s * 0.95, 0.5, 0));
  g.add(box(MAT.stripeRW, 2.0, 0.42, 0.12, 0, 0.78, 0));
  g.add(box(MAT.post, 2.0, 0.1, 0.1, 0, 0.25, 0));
  return g;
}

function makeHighBarrier() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) g.add(box(MAT.post, 0.14, 2.9, 0.14, s * 1.05, 1.45, 0));
  g.add(box(MAT.stripeYB, 2.0, 1.35, 0.1, 0, 2.05, 0));
  return g;
}

const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.09, 24).rotateX(Math.PI / 2);

// =====================================================================
// Player (built-in blocky runner, optionally replaced by a GLB)
// =====================================================================
function makeRunner() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(MAT.hoodie, 0.7, 0.72, 0.42, 0, 1.17, 0));
  body.add(box(MAT.skin, 0.44, 0.44, 0.42, 0, 1.78, 0));
  body.add(box(MAT.cap, 0.48, 0.14, 0.46, 0, 2.0, 0));
  body.add(box(MAT.cap, 0.4, 0.05, 0.25, 0, 1.95, 0.3)); // cap brim (faces camera = backwards cap)
  const limb = (mat, w, h, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(box(mat, w, h, w, 0, -h / 2, 0));
    body.add(pivot);
    return pivot;
  };
  const armL = limb(MAT.hoodie, 0.18, 0.66, -0.45, 1.5);
  const armR = limb(MAT.hoodie, 0.18, 0.66, 0.45, 1.5);
  const legL = limb(MAT.pants, 0.24, 0.8, -0.18, 0.82);
  const legR = limb(MAT.pants, 0.24, 0.8, 0.18, 0.82);
  legL.add(box(MAT.shoe, 0.28, 0.14, 0.38, 0, -0.78, -0.05));
  legR.add(box(MAT.shoe, 0.28, 0.14, 0.38, 0, -0.78, -0.05));
  scene.add(root);
  return { root, body, armL, armR, legL, legR };
}
const runner = makeRunner();


// A stylized motorcycle rider follows the runner. All geometry is generated locally.
function makeBikeChaser() {
  const root = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({color:0x172335,roughness:0.7});
  const blue = new THREE.MeshStandardMaterial({color:0x1674d1,metalness:0.3,roughness:0.4});
  const silver = new THREE.MeshStandardMaterial({color:0xd5e6ef,metalness:0.65,roughness:0.3});
  const helmet = new THREE.MeshStandardMaterial({color:0xffd33d,roughness:0.5});
  function part(material,w,h,d,x,y,z) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;
  }
  for (const z of [-0.85,0.85]) {
    const tire=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.14,9,16),dark);
    tire.rotation.y=Math.PI/2;tire.position.set(0,0.48,z);tire.castShadow=true;root.add(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.15,12),silver);
    hub.rotation.z=Math.PI/2;hub.position.set(0,0.48,z);root.add(hub);
  }
  part(blue,0.65,0.35,1.4,0,0.94,0);
  part(dark,0.62,0.15,0.7,0,1.2,0.18);
  part(silver,1.12,0.12,0.12,0,1.45,-0.72);
  part(dark,0.5,0.85,0.38,0,1.75,0.16);
  part(helmet,0.52,0.48,0.5,0,2.38,-0.04);
  part(silver,0.4,0.12,0.07,0,2.38,-0.31);
  part(dark,0.22,0.72,0.2,-0.36,1.62,-0.28);
  part(dark,0.22,0.72,0.2,0.36,1.62,-0.28);
  root.scale.setScalar(0.85);
  scene.add(root);
  return root;
}
const bikeChaser = makeBikeChaser();
// Remote player is a simple cyan runner, positioned relative to the local player.
const remoteRoot = new THREE.Group();
const remoteMat = new THREE.MeshStandardMaterial({color:0x00e5ff,roughness:0.6});
const remoteHead = new THREE.Mesh(new THREE.BoxGeometry(0.43,0.43,0.43),remoteMat);
remoteHead.position.y=1.75;remoteRoot.add(remoteHead);
const remoteTorso = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.8,0.4),remoteMat);
remoteTorso.position.y=1.13;remoteRoot.add(remoteTorso);
for(const x of [-0.21,0.21]){
  const leg=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.8,0.3),remoteMat);
  leg.position.set(x,0.4,0);remoteRoot.add(leg);
}
remoteRoot.visible=false;scene.add(remoteRoot);
let remoteState=null;
const roomStatus=document.getElementById('room-status');
const multiplayer=createMultiplayer(data=>{remoteState=data;remoteRoot.visible=!!data;},msg=>{if(roomStatus)roomStatus.textContent=msg;});
document.getElementById('create-room')?.addEventListener('click',async e=>{
  e.stopPropagation();const code=await multiplayer.create();
  if(code)document.getElementById('room-code').value=code;
});
document.getElementById('join-room')?.addEventListener('click',e=>{
  e.stopPropagation();multiplayer.join(document.getElementById('room-code').value);
});
document.getElementById('leave-room')?.addEventListener('click',e=>{e.stopPropagation();multiplayer.close();});
let lastNetworkSend=0;
function updateMultiplayer(t){
  if(multiplayer.connected&&t-lastNetworkSend>0.075){
    lastNetworkSend=t;
    multiplayer.send({x:G.px,y:G.py,z:G.pz,score:G.score,state:G.state});
  }
  if(remoteState&&G.state!=='menu'&&G.state!=='over'){
    remoteRoot.visible=true;
    // Relative offset keeps the other racer visible even if their runs start at different times.
    const delta=Math.max(-7,Math.min(7,(remoteState.z-G.pz)*0.14));
    remoteRoot.position.lerp(new THREE.Vector3(remoteState.x,Math.max(0,remoteState.y),G.pz+delta-2),0.16);
  } else remoteRoot.visible=false;
}

function updateBikeChaser(dt,t) {
  bikeChaser.visible = G.state !== 'menu' && G.state !== 'over';
  if(!bikeChaser.visible)return;
  const catching = G.state === 'crashed';
  const targetZ = G.pz + (catching ? 1.5 : 3.0);
  const targetX = G.px + (catching ? 0.55 : 1.85);
  bikeChaser.position.x += (targetX-bikeChaser.position.x)*damp(5,dt);
  bikeChaser.position.z += (targetZ-bikeChaser.position.z)*damp(catching?5:3,dt);
  bikeChaser.position.y = 0.05+Math.sin(t*18)*0.035;
  bikeChaser.rotation.z = Math.sin(t*2.5)*0.035;
}

// Original animated 3D meme-style pursuers, unlocked by checkpoint progression.
// Not based on identifiable copyrighted meme characters or recordings.
// Checkpoint meme billboards: stand on road ahead, pop, then pursue the runner.
// The supplied screenshots are visual references; these are lightweight drawn sprites.
const memeArt=[
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" rx="24" fill="#efb56c"/><ellipse cx="110" cy="116" rx="78" ry="82" fill="#e7ba83"/><ellipse cx="54" cy="83" rx="28" ry="57" fill="#b9844f"/><ellipse cx="168" cy="83" rx="28" ry="57" fill="#b9844f"/><ellipse cx="81" cy="116" rx="9" ry="11" fill="#2b211d"/><ellipse cx="140" cy="116" rx="9" ry="11" fill="#2b211d"/><ellipse cx="110" cy="145" rx="24" ry="17" fill="#53392d"/><path d="M72 169 Q111 193 151 167" fill="none" stroke="#53392d" stroke-width="8" stroke-linecap="round"/><path d="M28 45 L8 4 M192 45 L213 4" stroke="#fff4db" stroke-width="8"/><text x="110" y="211" text-anchor="middle" font-size="18" font-weight="900" fill="#4b2d1d">DOGGO ALERT!</text></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" rx="24" fill="#39435f"/><path d="M40 122 Q15 9 110 11 Q209 9 180 126" fill="#33202b"/><ellipse cx="110" cy="113" rx="73" ry="88" fill="#efc6b2"/><path d="M33 96 Q30 4 107 14 Q192 0 189 93 L164 66 L62 67Z" fill="#2d1c28"/><ellipse cx="83" cy="108" rx="11" ry="14" fill="#fff"/><ellipse cx="139" cy="108" rx="11" ry="14" fill="#fff"/><circle cx="84" cy="109" r="5"/><circle cx="140" cy="109" r="5"/><ellipse cx="111" cy="159" rx="25" ry="36" fill="#5e2535"/><ellipse cx="111" cy="179" rx="12" ry="9" fill="#e67d91"/><text x="110" y="215" text-anchor="middle" font-size="19" font-weight="900" fill="#fff">AAAAAH!</text></svg>`
];
const memeMilestones=[15,45];
// Screen-space picture companions remain visible on mobile even when the 3D camera moves.
const memeOverlay=document.createElement('div');
memeOverlay.id='meme-chase-overlay';
Object.assign(memeOverlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'2',overflow:'hidden'});
document.body.appendChild(memeOverlay);
const memeCards=memeArt.map((svg,i)=>{
  const img=document.createElement('img');
  img.alt=i===0?'Chasing dog meme':'Chasing screaming meme';
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  Object.assign(img.style,{position:'absolute',bottom:i===0?'16%':'24%',left:i===0?'4%':'auto',right:i===1?'4%':'auto',width:'clamp(70px,19vw,150px)',height:'auto',filter:'drop-shadow(0 5px 9px #0009)',display:'none',transition:'transform 120ms linear'});
  memeOverlay.appendChild(img);return img;
});
const memeSprites=memeArt.map((svg,i)=>{
  const texture=new THREE.TextureLoader().load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.15,2.15),material);
  mesh.visible=false;mesh.position.set(i===0?-2.4:2.4,1.7,-memeMilestones[i]);
  scene.add(mesh);
  return {mesh,unlocked:false,pop:0,lastObstacle:-Infinity};
});
function resetMemeSprites(){
  memeSprites.forEach((m,i)=>{
    m.unlocked=false;m.pop=0;m.lastObstacle=-Infinity;
    m.mesh.visible=false;
    memeCards[i].style.display='none';
    m.mesh.position.set(i===0?-2.4:2.4,1.7,-memeMilestones[i]);
    m.mesh.scale.setScalar(1);
  });
}
function memeObstacle(m,i){
  // Pursuers throw a jumpable barrier into the runner's current lane.
  // Keep two other lanes open and give the runner time to react.
  const lane=G.lane;
  const z=G.pz-Math.max(34,G.speed*2.2);
  if(obstacles.some(o=>o.lane===lane&&o.zMin<z+9&&o.zMax>z-9))return false;
  const o=spawnObstacle('low',lane,z);
  o.memeCreated=true;
  o.mesh.traverse?.(part=>{
    if(part.isMesh&&part.material?.color)part.material.color.setHex(i===0?0xff7c2e:0xff33a8);
  });
  // Brief, visible warning showing where the obstacle was thrown.
  const warning=document.getElementById('meme-obstacle-warning')||(()=>{
    const el=document.createElement('div');el.id='meme-obstacle-warning';
    Object.assign(el.style,{position:'fixed',top:'17%',left:'50%',transform:'translateX(-50%)',zIndex:'20',background:'#d92727',color:'white',fontWeight:'900',padding:'10px 16px',borderRadius:'12px',pointerEvents:'none',textAlign:'center',fontSize:'clamp(13px,3.5vw,20px)',boxShadow:'0 4px 18px #0008'});
    document.body.appendChild(el);return el;
  })();
  warning.textContent=(i===0?'🐕 DOGGO':'😱 SCREAM')+' THREW A BARRIER! JUMP OR DODGE!';
  warning.style.display='block';
  warning.dataset.hideAt=String(performance.now()+1400);
  playOriginalChaseCue(i);
  return true;
}
function updateMemeSprites(dt,t){
  const active=G.state==='playing'||G.state==='crashed'||G.state==='quiz';
  memeSprites.forEach((m,i)=>{
    if(!active){m.mesh.visible=false;memeCards[i].style.display='none';return;}
    const milestone=memeMilestones[i];
    const distance=milestone-G.score;
    if(!m.unlocked&&distance<=0){
      m.unlocked=true;m.pop=1;playOriginalChaseCue(i);
    }
    m.mesh.visible=m.unlocked||distance<70;
    memeCards[i].style.display=m.unlocked?'block':'none';
    if(m.unlocked)memeCards[i].style.transform='translateY('+Math.round(Math.sin(t*9+i)*12)+'px) rotate('+Math.round(Math.sin(t*5+i)*7)+'deg) scale('+(1+m.pop*0.5)+')';
    if(!m.mesh.visible)return;
    if(!m.unlocked){
      m.mesh.position.set(i===0?-2.4:2.4,1.7,-milestone);
      m.mesh.scale.setScalar(1);
    }else{
      const tx=G.px+(i===0?-2.15:2.15),tz=G.pz+3.1+i*1.1;
      m.mesh.position.x+=(tx-m.mesh.position.x)*Math.min(1,dt*5);
      m.mesh.position.z+=(tz-m.mesh.position.z)*Math.min(1,dt*5);
      m.pop=Math.max(0,m.pop-dt*2);
      m.mesh.scale.setScalar(1+Math.sin(t*9+i)*0.08+m.pop*0.7);
      if(G.state==='playing'&&G.score-m.lastObstacle>95){
        if(memeObstacle(m,i))m.lastObstacle=G.score;
      }
    }
    m.mesh.position.y=1.65+Math.sin(t*8+i)*0.2;
    m.mesh.quaternion.copy(camera.quaternion);
  });
}
function playOriginalChaseCue(level){
  ensureAudio();if(!actx)return;
  const notes=level===0?[420,630,840]:[290,220,160];
  notes.forEach((freq,i)=>{
    const at=actx.currentTime+0.03+i*0.15;
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=level===0?'triangle':'sawtooth';
    o.frequency.setValueAtTime(freq,at);
    o.frequency.exponentialRampToValueAtTime(freq*0.75,at+0.15);
    g.gain.setValueAtTime(0.0001,at);
    g.gain.exponentialRampToValueAtTime(0.055,at+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,at+0.17);
    o.connect(g).connect(actx.destination);o.start(at);o.stop(at+0.18);
  });
}

// Optional GLB character
let glb = null; // { pivot, mixer, actions: {run, jump, roll}, current }
if (CONFIG.playerModel) {
  new GLTFLoader().load(
    CONFIG.playerModel,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      const inner = new THREE.Group();
      inner.add(model);
      let bb = new THREE.Box3().setFromObject(model);
      const size = bb.getSize(new THREE.Vector3());
      model.scale.setScalar(CONFIG.playerModelHeight / (size.y || 1));
      bb = new THREE.Box3().setFromObject(model);
      const c = bb.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -bb.min.y, -c.z);
      const pivot = new THREE.Group();
      pivot.add(inner);
      inner.rotation.y = CONFIG.playerModelRotationY;
      runner.root.add(pivot);
      runner.body.visible = false;

      const mixer = new THREE.AnimationMixer(model);
      const clips = gltf.animations || [];
      const find = (...names) => clips.find((cl) => names.some((n) => cl.name.toLowerCase().includes(n)));
      const actions = {};
      const runClip = find('run', 'sprint', 'jog', 'walk') || clips[0];
      const jumpClip = find('jump');
      const rollClip = find('roll', 'slide', 'crouch');
      if (runClip) actions.run = mixer.clipAction(runClip);
      if (jumpClip) actions.jump = mixer.clipAction(jumpClip);
      if (rollClip) actions.roll = mixer.clipAction(rollClip);
      if (actions.run) actions.run.play();
      glb = { pivot, mixer, actions, current: actions.run || null };
      console.info(`[runner] Loaded ${CONFIG.playerModel} with clips:`, clips.map((cl) => cl.name));
    },
    undefined,
    () => console.info(`[runner] No model at ${CONFIG.playerModel} – using the built-in runner.`)
  );
}

function playGlbAction(name) {
  if (!glb) return;
  const next = glb.actions[name] || glb.actions.run;
  if (!next || next === glb.current) return;
  next.reset().fadeIn(0.12).play();
  if (glb.current) glb.current.fadeOut(0.12);
  glb.current = next;
}

// =====================================================================
// Audio (tiny synth blips, no files needed)
// =====================================================================
let actx = null;
function ensureAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch {
    actx = null;
  }
}
function beep(freq, dur = 0.08, type = 'square', vol = 0.04, slide = 1) {
  if (!actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Original cartoon-style game-over sting; no third-party meme audio samples.
function playMemeGameOver() {
  ensureAudio();
  if (!actx) return;
  const now=actx.currentTime+0.04;
  const notes=[392,311,247,175];
  notes.forEach((hz,i)=>{
    const start=now+i*0.21, duration=i===3?0.55:0.23;
    const osc=actx.createOscillator(),gain=actx.createGain();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(hz,start);
    osc.frequency.exponentialRampToValueAtTime(hz*0.72,start+duration);
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(0.075,start+0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    osc.connect(gain).connect(actx.destination);
    osc.start(start);osc.stop(start+duration+0.02);
  });
  // Short goofy 'boing' after the descending wah-wah.
  const start=now+0.94,osc=actx.createOscillator(),gain=actx.createGain();
  osc.type='triangle';
  osc.frequency.setValueAtTime(130,start);
  osc.frequency.exponentialRampToValueAtTime(520,start+0.13);
  osc.frequency.exponentialRampToValueAtTime(95,start+0.39);
  gain.gain.setValueAtTime(0.0001,start);
  gain.gain.exponentialRampToValueAtTime(0.09,start+0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001,start+0.4);
  osc.connect(gain).connect(actx.destination);
  osc.start(start);osc.stop(start+0.42);
}

// =====================================================================
// Game state
// =====================================================================
const ui = {
  score: document.getElementById('score-hud'),
  coins: document.getElementById('coins-hud'),
  best: document.getElementById('best-hud'),
  menu: document.getElementById('menu'),
  over: document.getElementById('over'),
  finalScore: document.getElementById('final-score'),
  finalCoins: document.getElementById('final-coins'),
  finalBest: document.getElementById('final-best'),
  newBest: document.getElementById('new-best'),
  flash: document.getElementById('flash'),
  loading: document.getElementById('loading'),
  quizOverlay: document.getElementById('quiz-overlay'),
  quizTopic: document.getElementById('quiz-topic'),
  quizProgress: document.getElementById('quiz-progress'),
  quizQuestion: document.getElementById('quiz-question'),
  quizChoices: document.getElementById('quiz-choices'),
  quizFeedback: document.getElementById('quiz-feedback'),
  quizNext: document.getElementById('quiz-next'),
};

function loadBest() {
  try {
    return Number(localStorage.getItem('subwayRushBest')) || 0;
  } catch {
    return 0;
  }
}
function saveBest(v) {
  try {
    localStorage.setItem('subwayRushBest', String(v));
  } catch {
    /* storage unavailable – keep best in memory only */
  }
}

const G = {
  state: 'menu', // menu | playing | crashed | over
  px: 0, py: 0, pz: 0, vy: 0,
  lane: 1, prevLane: 1,
  speed: CONFIG.startSpeed,
  grounded: true,
  rollTimer: 0,
  stumbleTimer: 0,
  crashTimer: 0,
  shake: 0,
  phase: 0,
  coins: 0,
  score: 0,
  best: loadBest(),
  nextRowZ: -45,
  laneEnd: [Infinity, Infinity, Infinity],
  overAt: 0,
  quizCount: 0,
  quizCorrect: 0,
  nextQuizScore: 150,
  lastQuestionId: null,
};
const obstacles = [];
const coins = [];
ui.best.textContent = `BEST ${G.best}`;

function resetGame() {
  for (const o of obstacles) scene.remove(o.mesh);
  obstacles.length = 0;
  for (const c of coins) scene.remove(c.mesh);
  coins.length = 0;
  Object.assign(G, {
    px: 0, py: 0, pz: 0, vy: 0, lane: 1, prevLane: 1,
    speed: LEVELS[selectedLevel].speed, grounded: true, rollTimer: 0, stumbleTimer: 0,
    crashTimer: 0, shake: 0, phase: 0, coins: 0, score: 0, nextRowZ: -45,
    laneEnd: [Infinity, Infinity, Infinity],
    quizCount: 0, quizCorrect: 0, nextQuizScore: LEVELS[selectedLevel].quizInterval, lastQuestionId: null,
  });
  tiles.forEach((t, i) => {
    t.position.z = TILE_LEN - i * TILE_LEN;
    randomizeBuildings(t);
  });
  bikeChaser.position.set(1.85,0,3.0);
  bikeChaser.visible = false;
  resetMemeSprites();
  const warning=document.getElementById('meme-obstacle-warning');if(warning)warning.style.display='none';
  runner.root.rotation.set(0, 0, 0);
  runner.root.position.set(0, 0, 0);
  runner.body.scale.set(1, 1, 1);
  if (glb) glb.pivot.scale.set(1, 1, 1);
  playGlbAction('run');
  spawnAhead();
}

function startGame() {
  selectedLevel = document.querySelector('input[name="difficulty"]:checked')?.value || selectedLevel;
  ensureAudio();
  resetGame();
  G.state = 'playing';
  roadMusic.resume();
  ui.menu.classList.add('hidden');
  ui.over.classList.add('hidden');
  ui.quizOverlay.classList.add('hidden');
  beep(520, 0.1, 'square', 0.04, 1.5);
}


// Quiz checkpoint: freeze gameplay until a choice is submitted.
// The UI is deliberately separate from the 3D physics and spawning logic.
let activeQuestion = null;
function showQuiz() {
  if (G.state !== 'playing') return;
  G.state = 'quiz';
  roadMusic.pause();

  activeQuestion = chooseQuestion(G.lastQuestionId, Math.random, selectedLevel);
  G.lastQuestionId = activeQuestion.id;
  G.quizCount++;
  ui.quizTopic.textContent = selectedLevel.toUpperCase() + ' · ' + activeQuestion.topic;
  ui.quizProgress.textContent = 'Checkpoint ' + G.quizCount + ' · ' + G.quizCorrect + ' correct';
  ui.quizQuestion.textContent = activeQuestion.prompt;
  ui.quizFeedback.textContent = '';
  ui.quizNext.classList.add('hidden');
  ui.quizChoices.replaceChildren();
  activeQuestion.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.className = 'quiz-choice';
    button.type = 'button';
    button.textContent = String.fromCharCode(65 + index) + '. ' + choice;
    button.addEventListener('click', () => answerQuiz(index), { once: true });
    ui.quizChoices.append(button);
  });
  ui.quizOverlay.classList.remove('hidden');
  ui.quizChoices.querySelector('button')?.focus();
}
function answerQuiz(index) {
  if (G.state !== 'quiz' || !activeQuestion || !ui.quizNext.classList.contains('hidden')) return;
  const result = evaluateAnswer(activeQuestion, index);
  if (result.correct) { G.quizCorrect++; G.coins += 5; }
  ui.quizFeedback.textContent = (result.correct ? 'Correct! +5 safety points. ' : 'Not quite. ') + result.explanation;
  for (const button of ui.quizChoices.children) button.disabled = true;
  ui.quizProgress.textContent = G.quizCorrect + ' / ' + G.quizCount + ' correct';
  ui.quizNext.classList.remove('hidden');
  ui.quizNext.focus();
}
ui.quizNext.addEventListener('click', () => {
  if (G.state !== 'quiz' || ui.quizNext.classList.contains('hidden')) return;
  activeQuestion = null;
  ui.quizOverlay.classList.add('hidden');
  G.state = 'playing';
  roadMusic.resume();
});

function gameOver() {
  roadMusic.pause();
  playMemeGameOver();
  G.state = 'over';
  G.overAt = performance.now();
  const isBest = G.score > G.best;
  if (isBest) {
    G.best = G.score;
    saveBest(G.best);
  }
  ui.finalScore.textContent = G.score;
  ui.finalCoins.textContent = G.coins;
  ui.finalBest.textContent = G.best;
  ui.best.textContent = `BEST ${G.best}`;
  ui.newBest.classList.toggle('hidden', !isBest);
  ui.over.classList.remove('hidden');
}

function flash(opacity = 0.45) {
  ui.flash.style.transition = 'none';
  ui.flash.style.opacity = opacity;
  requestAnimationFrame(() => {
    ui.flash.style.transition = 'opacity .35s';
    ui.flash.style.opacity = 0;
  });
}

function crash() {
  if (G.state !== 'playing') return;
  roadMusic.pause();
  G.state = 'crashed';
  G.crashTimer = 0.9;
  G.shake = 0.6;
  flash(0.55);
  beep(160, 0.45, 'sawtooth', 0.07, 0.35);
}

function stumble() {
  if (G.stumbleTimer > 0) {
    crash();
    return;
  }
  G.stumbleTimer = 3.5;
  G.shake = 0.35;
  flash(0.3);
  beep(220, 0.2, 'triangle', 0.06, 0.6);
}

// =====================================================================
// Spawning
// =====================================================================
function addCoin(x, y, z) {
  const mesh = new THREE.Mesh(coinGeo, MAT.coin);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  coins.push({ mesh, taken: false, lane: Math.round(x / LANE_W) + 1 });
}

function movingTrainAllowed(lane, z) {
  // A train driving toward the player must not sweep through anything already placed
  // in its lane, and nothing hard may be ahead in any lane (keeps every row escapable).
  return !obstacles.some((o) => (o.lane === lane && o.zMax > z - 1) || (o.hard && o.zMin > z));
}

function spawnObstacle(type, lane, z) {
  const x = laneX(lane);
  let o;
  if (type === 'low') {
    o = { type, lane, x, w: 2.0, y0: 0, y1: 1.0, zMin: z - 0.15, zMax: z + 0.15, hard: false, mesh: makeLowBarrier() };
    o.mesh.position.set(x, 0, z);
  } else if (type === 'high') {
    o = { type, lane, x, w: 2.0, y0: 1.35, y1: 2.75, zMin: z - 0.1, zMax: z + 0.1, hard: false, mesh: makeHighBarrier() };
    o.mesh.position.set(x, 0, z);
  } else {
    const L = Math.round(rand(14, 26));
    const ramp = type === 'ramp';
    const moving = type === 'moving';
    const front = ramp ? z - RAMP_LEN : z;
    o = {
      type, lane, x, w: TRAIN_W, y0: 0, y1: TRAIN_H - TOP_SNAP,
      zMin: front - L, zMax: front, walkTop: TRAIN_H, ramp, train: true,
      vz: moving ? CONFIG.movingTrainSpeed : 0, hard: !ramp,
      mesh: makeTrain(L, ramp, moving),
    };
    o.mesh.position.set(x, 0, front);
    if (moving) {
      // clear coins this train would drive through
      for (const c of coins) {
        if (c.lane === lane && c.mesh.position.z > z - 1) {
          c.taken = true;
          c.mesh.visible = false;
        }
      }
    }
  }
  o.prevZMax = o.zMax;
  scene.add(o.mesh);
  obstacles.push(o);
  G.laneEnd[lane] = Math.min(G.laneEnd[lane], o.zMin);
  return o;
}

function spawnRow(z) {
  const dist = -z;
  const diff = Math.min(1, dist / 1800);
  const free = [0, 1, 2].map((l) => z <= G.laneEnd[l] - 5);
  const lanes = shuffle([0, 1, 2].filter((l) => free[l]));
  if (!lanes.length) return;

  let hardCount = free.filter((f) => !f).length; // lanes still occupied by long trains
  const middleBusy = !free[1];
  const r = Math.random();
  const wanted = r < 0.38 - 0.12 * diff ? 1 : r < 0.85 ? 2 : 3;

  const placed = [];
  for (const lane of lanes.slice(0, wanted)) {
    const canHard = !middleBusy && hardCount < 2;
    const type = weighted({
      low: 0.26,
      high: 0.24,
      ramp: 0.2,
      train: canHard ? 0.2 + 0.1 * diff : 0,
      moving: canHard && dist > 250 && movingTrainAllowed(lane, z) ? 0.05 + 0.12 * diff : 0,
    });
    if (type === 'train' || type === 'moving') hardCount++;
    placed.push(spawnObstacle(type, lane, z));
  }
  placeCoins(z, placed, free);
}

function placeCoins(z, placed, free) {
  if (Math.random() < 0.2) return;
  const options = [];
  for (let l = 0; l < 3; l++) {
    const o = placed.find((p) => p.lane === l);
    if (!o) {
      if (free[l]) options.push({ l, kind: 'line' });
    } else if (o.type === 'low') options.push({ l, kind: 'arc', o });
    else if (o.type === 'high') options.push({ l, kind: 'under', o });
    else if (o.type === 'ramp') options.push({ l, kind: 'ramp', o }, { l, kind: 'ramp', o });
  }
  if (!options.length) return;
  const { l, kind, o } = pick(options);
  const x = laneX(l);
  if (kind === 'line') {
    for (let i = 0; i < 7; i++) addCoin(x, 1.0, z + 3 - i * 2.2);
  } else if (kind === 'arc') {
    for (let i = 0; i < 7; i++) {
      const dz = (i - 3) * 1.6;
      addCoin(x, 1.0 + 1.3 * (1 - (dz / 4.8) ** 2), z + dz);
    }
  } else if (kind === 'under') {
    for (let i = 0; i < 5; i++) addCoin(x, 0.55, z + 4 - i * 2);
  } else if (kind === 'ramp') {
    for (const u of [5.6, 4, 2.4, 0.8]) addCoin(x, TRAIN_H * (1 - u / RAMP_LEN) + 1, o.zMax + u);
    for (let zz = o.zMax - 1.5; zz > o.zMin + 1; zz -= 2.4) addCoin(x, TRAIN_H + 1, zz);
  }
}

function spawnAhead() {
  while (G.nextRowZ > G.pz - SPAWN_AHEAD) {
    spawnRow(G.nextRowZ);
    G.nextRowZ -= rand(17, 25) + G.speed * 0.35;
  }
}

// =====================================================================
// Physics helpers
// =====================================================================
function groundAt(px, pz, py) {
  let g = 0;
  for (const o of obstacles) {
    if (!o.train || Math.abs(px - o.x) > o.w / 2) continue;
    if (pz <= o.zMax + 0.2 && pz >= o.zMin - 0.2 && py >= o.walkTop - TOP_SNAP) g = Math.max(g, o.walkTop);
    if (o.ramp) {
      const u = pz - o.zMax;
      if (u >= 0 && u <= RAMP_LEN) {
        const h = o.walkTop * (1 - u / RAMP_LEN);
        if (py >= h - 0.7) g = Math.max(g, h);
      }
    }
  }
  return g;
}

function overlaps(o, px, py, pz, h) {
  return (
    px + PLAYER_HALF_W > o.x - o.w / 2 &&
    px - PLAYER_HALF_W < o.x + o.w / 2 &&
    py + h > o.y0 &&
    py < o.y1 &&
    pz + PLAYER_HALF_D > o.zMin &&
    pz - PLAYER_HALF_D < o.zMax
  );
}

// =====================================================================
// Input
// =====================================================================
function move(dir) {
  if (G.state !== 'playing') return;
  const nl = clamp(G.lane + dir, 0, 2);
  if (nl === G.lane) return;
  G.prevLane = G.lane;
  G.lane = nl;
  beep(380, 0.05, 'triangle', 0.03);
}
function jump() {
  if (G.state !== 'playing' || !G.grounded) return;
  G.vy = CONFIG.jumpVelocity;
  G.grounded = false;
  G.rollTimer = 0;
  beep(440, 0.12, 'square', 0.035, 1.8);
}
function roll() {
  if (G.state !== 'playing') return;
  if (!G.grounded) G.vy = -28; // fast drop, roll on landing
  G.rollTimer = CONFIG.rollDuration;
  beep(300, 0.12, 'triangle', 0.04, 0.5);
}

const musicToggle = document.getElementById('music-toggle');
const musicVolume = document.getElementById('music-volume');
musicToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  roadMusic.setMuted(!roadMusic.muted);
  musicToggle.textContent = roadMusic.muted ? '🔇 Music off' : '🎵 Music on';
  musicToggle.setAttribute('aria-pressed', String(!roadMusic.muted));
});
musicVolume?.addEventListener('input', (e) => roadMusic.setVolume(Number(e.target.value) / 100 * 0.5));

window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
  if (G.state === 'quiz') return;
  if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 400)) {
    if (k === 'Enter' || k === 'Space') startGame();
    return;
  }
  if (k === 'ArrowLeft' || k === 'KeyA') move(-1);
  else if (k === 'ArrowRight' || k === 'KeyD') move(1);
  else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') jump();
  else if (k === 'ArrowDown' || k === 'KeyS') roll();
});

let gesture = null;
window.addEventListener('pointerdown', (e) => {
  ensureAudio();
  gesture = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', (e) => {
  if (!gesture || G.state !== 'playing') return;
  const dx = e.clientX - gesture.x;
  const dy = e.clientY - gesture.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  gesture = null; // fire once per swipe, as soon as it is long enough
  if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx));
  else if (dy < 0) jump();
  else roll();
});
window.addEventListener('pointerup', () => (gesture = null));
window.addEventListener('pointercancel', () => (gesture = null));

document.getElementById('play-btn').addEventListener('click', startGame);
ui.over.addEventListener('click', () => {
  if (performance.now() - G.overAt > 400) startGame();
});

// =====================================================================
// Update
// =====================================================================
const tmpLook = new THREE.Vector3();

function updatePlaying(dt) {
  G.speed = Math.min(CONFIG.maxSpeed, G.speed + CONFIG.acceleration * dt);
  const prevPz = G.pz;
  G.pz -= G.speed * dt;
  G.px += (laneX(G.lane) - G.px) * damp(16, dt);
  G.rollTimer = Math.max(0, G.rollTimer - dt);
  G.stumbleTimer = Math.max(0, G.stumbleTimer - dt);

  // moving trains
  for (const o of obstacles) {
    o.prevZMax = o.zMax;
    if (o.vz) {
      const d = o.vz * dt;
      o.zMax += d;
      o.zMin += d;
      o.mesh.position.z += d;
    }
  }

  // vertical physics
  const g = groundAt(G.px, G.pz, G.py);
  if (G.vy > 0 || G.py > g + 0.02) {
    G.vy -= CONFIG.gravity * dt;
    G.py += G.vy * dt;
    if (G.py <= g) {
      G.py = g;
      G.vy = 0;
      G.grounded = true;
    } else G.grounded = false;
  } else {
    G.py = g;
    G.vy = 0;
    G.grounded = true;
  }

  // collisions
  const h = G.rollTimer > 0 ? ROLL_H : STAND_H;
  for (const o of obstacles) {
    if (!overlaps(o, G.px, G.py, G.pz, h)) continue;
    const wasInFront = prevPz - PLAYER_HALF_D >= o.prevZMax - 0.25;
    if (o.train && !wasInFront) {
      // side bump while changing lanes: bounce back
      const side = Math.sign(G.px - o.x) || 1;
      G.px = o.x + side * (o.w / 2 + PLAYER_HALF_W + 0.02);
      G.lane = G.prevLane;
      stumble();
    } else {
      crash();
    }
    if (G.state !== 'playing') return;
  }

  // coins
  for (const c of coins) {
    if (c.taken) continue;
    const p = c.mesh.position;
    if (Math.abs(p.x - G.px) < 0.85 && Math.abs(p.z - G.pz) < 0.9 && Math.abs(p.y - (G.py + h / 2)) < 1.15) {
      c.taken = true;
      c.mesh.visible = false;
      G.coins++;
      beep(1320, 0.07, 'square', 0.025, 1.3);
    }
  }

  G.score = Math.floor(-G.pz);
  if (G.score >= G.nextQuizScore) {
    G.nextQuizScore += LEVELS[selectedLevel].quizInterval;
    showQuiz();
    return;
  }
  spawnAhead();
  recycle();
}

function recycle() {
  const camZ = G.pz + 8;
  for (const t of tiles) {
    if (t.position.z - TILE_LEN / 2 > camZ) {
      t.position.z -= NUM_TILES * TILE_LEN;
      randomizeBuildings(t);
    }
  }
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].zMin > G.pz + DESPAWN_BEHIND) {
      scene.remove(obstacles[i].mesh);
      obstacles.splice(i, 1);
    }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].mesh.position.z > G.pz + DESPAWN_BEHIND) {
      scene.remove(coins[i].mesh);
      coins.splice(i, 1);
    }
  }
}

function animateRunner(dt, t) {
  const r = runner;
  r.root.position.set(G.px, G.py, G.pz);
  const rolling = G.rollTimer > 0;
  const k = damp(18, dt);

  if (G.state === 'quiz') return;
  if (G.state === 'crashed' || G.state === 'over') {
    r.root.rotation.x += (1.25 - r.root.rotation.x) * damp(6, dt);
    if (glb) glb.mixer.update(0);
    return;
  }

  r.root.rotation.z = clamp((G.px - laneX(G.lane)) * 0.12, -0.35, 0.35);
  if (G.state === 'menu') {
    // idle bounce on the menu screen
    G.phase += dt * 3;
  } else {
    G.phase += dt * (6 + G.speed * 0.6);
  }
  const s = Math.sin(G.phase);

  // built-in runner pose
  if (rolling) {
    r.body.scale.y += (0.5 - r.body.scale.y) * k;
    r.legL.rotation.x = r.legR.rotation.x = -1.4;
    r.armL.rotation.x = r.armR.rotation.x = -2.2;
  } else if (!G.grounded) {
    r.body.scale.y += (1 - r.body.scale.y) * k;
    r.legL.rotation.x = -1.0;
    r.legR.rotation.x = 0.5;
    r.armL.rotation.x = r.armR.rotation.x = -2.6;
  } else {
    r.body.scale.y += (1 - r.body.scale.y) * k;
    const amp = G.state === 'menu' ? 0.15 : 0.95;
    r.legL.rotation.x = s * amp;
    r.legR.rotation.x = -s * amp;
    r.armL.rotation.x = -s * amp * 0.9;
    r.armR.rotation.x = s * amp * 0.9;
  }
  r.body.position.y = G.grounded && !rolling ? Math.abs(s) * 0.07 : 0;

  // GLB character
  if (glb) {
    const want = rolling ? 'roll' : !G.grounded ? 'jump' : 'run';
    playGlbAction(want);
    if (glb.actions.run) glb.actions.run.timeScale = G.state === 'menu' ? 0.4 : G.speed / CONFIG.startSpeed;
    const sy = rolling && !glb.actions.roll ? 0.55 : 1;
    glb.pivot.scale.y += (sy - glb.pivot.scale.y) * k;
    glb.mixer.update(dt);
  }
}

function updateCamera(dt, t) {
  const tx = G.px * 0.8;
  const ty = 5.1 + G.py * 0.6;
  camera.position.x += (tx - camera.position.x) * damp(8, dt);
  camera.position.y += (ty - camera.position.y) * damp(6, dt);
  camera.position.z = G.pz + 10.2;
  if (G.shake > 0) {
    G.shake = Math.max(0, G.shake - dt);
    camera.position.x += (Math.random() - 0.5) * G.shake;
    camera.position.y += (Math.random() - 0.5) * G.shake;
  }
  tmpLook.set(G.px * 0.85, 1.6 + G.py * 0.5, G.pz - 7);
  camera.lookAt(tmpLook);
  const portraitBoost = camera.aspect < 1 ? (1 - camera.aspect) * 30 : 0; // wider view on phones
  const fov = 62 + portraitBoost + (G.speed - CONFIG.startSpeed) * 0.35;
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  sun.position.set(G.px + 8, 22, G.pz + 6);
  sun.target.position.set(G.px, 0, G.pz - 12);
}

let lastScore = -1;
let lastCoins = -1;
function updateHud() {
  if (G.score !== lastScore) ui.score.textContent = (lastScore = G.score);
  if (G.coins !== lastCoins) ui.coins.textContent = (lastCoins = G.coins);
}

const timer = new THREE.Timer();
function frame(timestamp) {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();

  if (G.state === 'playing') updatePlaying(dt);
  else if (G.state === 'crashed') {
    G.crashTimer -= dt;
    if (G.crashTimer <= 0) gameOver();
  }

  for (const c of coins) if (!c.taken && G.state !== 'quiz') c.mesh.rotation.y += dt * 3;
  animateRunner(dt, t);
  updateBikeChaser(dt, t);
  updateMemeSprites(dt,t);
  const obstacleWarning=document.getElementById('meme-obstacle-warning');
  if(obstacleWarning&&performance.now()>Number(obstacleWarning.dataset.hideAt||0))obstacleWarning.style.display='none';
  updateMultiplayer(t);
  updateCamera(dt, t);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resetGame();
ui.loading.remove();
requestAnimationFrame(frame);

// Small debug handle (handy for testing in the console)
window.__game = { G, obstacles, coins, start: startGame, move, jump, roll, CONFIG };
