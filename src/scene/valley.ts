import * as THREE from "three";
import { poseAt, STOP_IDS } from "./path";
import { BAT_VERT, GEOMETRY_FRAG, GEOMETRY_VERT, INK_FRAG, INK_VERT } from "./shaders";
import { sstep } from "./terrain";
import { INK, PALETTE } from "./ink";
import { BRIDGE, MOON, SCRIBE, TOWER_TOP, WATCH } from "./landmarks";
import type { Kit } from "./kit";
import { buildWalkers } from "./walkers";
import { buildWorld } from "./world";

const NEAR = 1;
const FAR = 1400;
const SWARM_STOP = STOP_IDS.indexOf("swarm");
if (SWARM_STOP < 0) throw new Error('No section has the id "swarm", so the bats would never take flight');

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function createValley(canvas: HTMLCanvasElement, kit: Kit) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    powerPreference: "high-performance",
  });
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const world = buildWorld(kit);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, NEAR, FAR);

  const light = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
  const geometryUniforms = { uLight: { value: light } };
  const material = (instanced: boolean) =>
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: GEOMETRY_VERT,
      fragmentShader: GEOMETRY_FRAG,
      uniforms: geometryUniforms,
      defines: instanced ? { INSTANCED: 1 } : {},
      side: THREE.DoubleSide,
    });
  const plain = material(false);
  const instanced = material(true);

  const batUniforms = {
    uLight: { value: light },
    uTime: { value: 0 },
    uSwarm: { value: 0 },
    uRoost: { value: TOWER_TOP.clone().add(new THREE.Vector3(0, -8, 0)) },
    uTargets: {
      value: [
        new THREE.Vector3(SCRIBE.x, 20, SCRIBE.z),
        new THREE.Vector3(BRIDGE.x, 12, BRIDGE.z),
        new THREE.Vector3(WATCH.x, 36, WATCH.z),
      ],
    },
  };
  const batMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: BAT_VERT,
    fragmentShader: GEOMETRY_FRAG,
    uniforms: batUniforms,
    side: THREE.DoubleSide,
  });

  const bats = new THREE.Mesh(world.bats, batMaterial);
  bats.frustumCulled = false;
  world.pines.material = instanced;
  world.wheel.material = plain;
  world.lord.body.material = plain;
  world.lord.head.material = plain;
  scene.add(
    new THREE.Mesh(world.terrain, plain),
    new THREE.Mesh(world.buildings, plain),
    new THREE.Mesh(world.backdrop, plain),
    world.pines,
    world.wheel,
    world.lord.group,
    bats,
  );
  const walkers = buildWalkers(kit, plain);
  scene.add(walkers.group);

  const target = new THREE.WebGLRenderTarget(2, 2, {
    count: 2,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthTexture: new THREE.DepthTexture(2, 2),
  });

  const ink = {
    tData: { value: target.textures[0] },
    tNormal: { value: target.textures[1] },
    tDepth: { value: target.depthTexture },
    uRes: { value: new THREE.Vector2(2, 2) },
    uScale: { value: 1 },
    uTime: { value: 0 },
    uNear: { value: NEAR },
    uFar: { value: FAR },
    uInvViewProj: { value: new THREE.Matrix4() },
    uCam: { value: new THREE.Vector3() },
    uMoon: { value: new THREE.Vector3() },
    uPal: { value: PALETTE.map(rgb) },
    uInk: { value: rgb(INK.ink) },
    uSkyTop: { value: rgb(INK.skyTop) },
    uSkyBot: { value: rgb(INK.skyBot) },
    uFog: { value: rgb(INK.fog) },
    uMist: { value: rgb(INK.mist) },
    uChalk: { value: rgb(INK.chalk) },
    uGlow: { value: rgb(INK.glow) },
    uWobble: { value: INK.wobble },
    uLine: { value: INK.line },
    uInkAlpha: { value: INK.inkAlpha },
    uGrain: { value: INK.grain },
    uFogDensity: { value: INK.fogDensity },
    uMistAmt: { value: INK.mistAmt },
    uShadeLo: { value: INK.shadeLo },
    uShadeHi: { value: INK.shadeHi },
    uBoil: { value: INK.boil },
    uVignette: { value: INK.vignette },
  };
  const inkScene = new THREE.Scene();
  const inkCamera = new THREE.Camera();
  const inkQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: INK_VERT,
      fragmentShader: INK_FRAG,
      uniforms: ink,
      depthTest: false,
      depthWrite: false,
    }),
  );
  inkQuad.frustumCulled = false;
  inkScene.add(inkQuad);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  let tops: number[] = [];
  let sections: HTMLElement[] = [];
  let viewportH = 1;
  const presence: string[] = [];
  let sizedFor = "";
  let scale = 0;
  let dirty = true;
  let drawnAt = -1;
  let settling = true;
  let running = false;

  // Assigning canvas.width clears the canvas, so a size that has not changed must not be assigned again.
  function measure() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    viewportH = h;
    const nextScale = Math.min(window.devicePixelRatio || 1, 1.75);
    const resized = `${w}x${h}` !== sizedFor || nextScale !== scale;
    if (resized) {
      if (nextScale !== scale) renderer.setPixelRatio(nextScale);
      renderer.setSize(w, h, false);
      sizedFor = `${w}x${h}`;
      scale = nextScale;
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      target.setSize(size.x, size.y);
      ink.uRes.value.copy(size);
      ink.uScale.value = scale;
      camera.aspect = w / h;
    }
    dirty = true;
    sections = STOP_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Section #${id} is missing, so every later camera stop would be off by one`);
      return el;
    });
    tops = sections.map((el) => el.offsetTop);
    if (resized && running) draw(0);
  }

  function scrollProgress() {
    const y = window.scrollY;
    const last = tops.length - 1;
    if (last < 1) return 0;
    if (y <= tops[0]) return 0;
    for (let i = 0; i < last; i++) {
      if (y < tops[i + 1]) {
        const f = (y - tops[i]) / (tops[i + 1] - tops[i]);
        return i + sstep(0.36, 0.98, f);
      }
    }
    return last;
  }

  function fadeSections() {
    const y = window.scrollY;
    const last = sections.length - 1;
    sections.forEach((el, i) => {
      const d = (y - tops[i]) / viewportH;
      const arriving = i === 0 ? 1 : sstep(-0.42, -0.1, d);
      const leaving = i === last ? 1 : 1 - sstep(0.85, 1.15, d);
      const o = Math.min(arriving, leaving).toFixed(3);
      if (presence[i] === o) return;
      presence[i] = o;
      el.style.setProperty("--presence", o);
      el.toggleAttribute("data-away", Number(o) < 0.4);
    });
  }

  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const moon = new THREE.Vector3();
  let eased = -1;
  let frame = 0;
  let last = performance.now();
  let clock = 0;

  function render(now: number) {
    frame = requestAnimationFrame(render);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // With reduced motion the picture depends only on the scroll position, the layout and the lord's head settling.
    if (still.matches && !dirty && !settling && window.scrollY === drawnAt) return;
    draw(dt);
  }

  function draw(dt: number) {
    dirty = false;
    drawnAt = window.scrollY;
    if (!still.matches) clock += dt;

    const wanted = scrollProgress();
    eased = eased < 0 || still.matches ? wanted : eased + (wanted - eased) * (1 - Math.exp(-dt * 3.2));
    fadeSections();

    const fov = poseAt(eased, camera.aspect, pos, look);
    pos.x += Math.sin(clock * 0.21) * 0.35;
    pos.y += Math.sin(clock * 0.17 + 1.3) * 0.25;
    camera.fov = fov;
    camera.position.copy(pos);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    batUniforms.uTime.value = clock;
    batUniforms.uSwarm.value = sstep(SWARM_STOP - 0.5, SWARM_STOP + 0.1, eased) * (1 - sstep(SWARM_STOP + 1.4, SWARM_STOP + 2.4, eased));
    world.wheel.rotation.z = -clock * 0.5;
    walkers.update(clock, still.matches ? 0 : dt, still.matches);
    const lord = world.lord;
    lord.group.rotation.z = Math.sin(clock * 0.7) * 0.018;
    lord.group.rotation.x = Math.sin(clock * 0.53 + 1) * 0.012;
    const gaze = Math.atan2(pos.x - lord.group.position.x, pos.z - lord.group.position.z);
    const turn = THREE.MathUtils.clamp(gaze, -1, 1);
    lord.head.rotation.y += (turn - lord.head.rotation.y) * (1 - Math.exp(-dt * 2.5));
    settling = Math.abs(turn - lord.head.rotation.y) > 1e-4;
    lord.head.rotation.x = -0.08 + Math.sin(clock * 0.4) * 0.03;

    ink.uTime.value = clock;
    ink.uCam.value.copy(pos);
    ink.uInvViewProj.value
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .invert();
    moon.copy(MOON).project(camera);
    ink.uMoon.value.set(
      ((moon.x * 0.5 + 0.5) * ink.uRes.value.x) / ink.uScale.value,
      ((moon.y * 0.5 + 0.5) * ink.uRes.value.y) / ink.uScale.value,
      moon.z < 1 ? 1 : 0,
    );

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(inkScene, inkCamera);
  }

  function onVisibility() {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(render);
    }
  }

  measure();
  running = true;
  const resizer = new ResizeObserver(measure);
  resizer.observe(document.body);
  window.addEventListener("resize", measure);
  document.addEventListener("visibilitychange", onVisibility);
  frame = requestAnimationFrame(render);

  return function dispose() {
    cancelAnimationFrame(frame);
    resizer.disconnect();
    window.removeEventListener("resize", measure);
    document.removeEventListener("visibilitychange", onVisibility);
    for (const root of [scene, inkScene]) {
      root.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    }
    for (const m of [plain, instanced, batMaterial, inkQuad.material]) m.dispose();
    target.dispose();
    renderer.dispose();
  };
}
