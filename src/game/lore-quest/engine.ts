import * as THREE from 'three';
import type { AnswerEvent, Konspekt, QuizQuestion } from '../common/types';
import type { LoreQuestConfig } from './config';
import type {
  EncounterHud,
  LoreQuestHud,
  LoreQuestStatus,
} from './types';
import { realmForKonspekt, type CreatureDef, type RealmDef } from './realmData';

export interface LoreQuestEngineHandlers {
  onHudChange: (hud: LoreQuestHud) => void;
  onAnswer: (event: AnswerEvent) => void;
  onFinished: (summary: {
    score: number;
    coins: number;
    xp: number;
    questionsAsked: number;
    questionsCorrect: number;
    durationMs: number;
    perQuestion: AnswerEvent[];
    highlights: string[];
  }) => void;
}

export interface LoreQuestEngineOptions {
  canvas: HTMLCanvasElement;
  konspekt: Konspekt;
  questions: QuizQuestion[];
  fetchMoreQuestions?: (n: number) => Promise<QuizQuestion[]>;
  config: LoreQuestConfig;
  reducedMotion: boolean;
  handlers: LoreQuestEngineHandlers;
}

interface SceneCreature {
  def: CreatureDef;
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  defeated: boolean;
  hp: number;
  hpMax: number;
  isBoss: boolean;
  active: boolean; // bosses start inactive until N encounters won
  bobPhase: number;
}

interface ActiveEncounter {
  creature: SceneCreature;
  questionQueue: QuizQuestion[];
  currentIdx: number;
  current?: QuizQuestion;
  questionStartedAtMs: number;
  questionTimer: number;
  comboCorrect: number;
  lastResult: 'correct' | 'wrong' | null;
  lastExplanation?: string;
}

export class LoreQuestEngine {
  private readonly cfg: LoreQuestConfig;
  private readonly canvas: HTMLCanvasElement;
  private readonly handlers: LoreQuestEngineHandlers;
  private readonly reducedMotion: boolean;
  private readonly realm: RealmDef;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private player!: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerHead!: THREE.Mesh;
  private playerStaff!: THREE.Mesh;
  private playerFacing = new THREE.Vector3(0, 0, -1);

  private ground!: THREE.Mesh;
  private decorations: THREE.Object3D[] = [];
  private creatures: SceneCreature[] = [];
  private interactBeam!: THREE.Mesh;
  private interactPrompt!: THREE.Sprite;

  private mats = {
    player: new THREE.MeshStandardMaterial({ color: 0xa9b8ff, roughness: 0.4, metalness: 0.2 }),
    playerHead: new THREE.MeshStandardMaterial({ color: 0xf2d0b1, roughness: 0.7 }),
    staff: new THREE.MeshStandardMaterial({ color: 0x6c5ce7, emissive: 0x2a1d6e, emissiveIntensity: 0.4 }),
    bossAura: new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, opacity: 0.18 }),
  };
  private geos = {
    body: new THREE.CapsuleGeometry(0.32, 0.7, 6, 12),
    head: new THREE.SphereGeometry(0.28, 18, 16),
    staff: new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10),
    creature: new THREE.IcosahedronGeometry(0.6, 1),
    bossAura: new THREE.RingGeometry(1.6, 1.9, 32),
    interactRing: new THREE.RingGeometry(0.5, 0.58, 32),
  };

  private playerHp: number;
  private playerHpMax: number;
  private coins = 0;
  private gems = 0;
  private xp = 0;
  private encountersCompleted = 0;
  private bossDefeated = false;
  private answers: AnswerEvent[] = [];
  private hint: string | undefined;
  private hintTimer = 0;

  private encounter: ActiveEncounter | null = null;

  private questionPool: QuizQuestion[];
  private questionCursor = 0;
  private fetchMoreQuestions?: (n: number) => Promise<QuizQuestion[]>;
  private prefetching = false;

  private status: LoreQuestStatus = 'EXPLORING';
  private destroyed = false;
  private rafId: number | null = null;
  private lastTimeMs = 0;
  private startedAtMs = 0;
  private elapsedMs = 0;

  // input
  private keyState = new Set<string>();
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private blurHandler: () => void;
  private resizeObserver?: ResizeObserver;

  private lastHud: LoreQuestHud | null = null;

  constructor(opts: LoreQuestEngineOptions) {
    this.canvas = opts.canvas;
    this.cfg = opts.config;
    this.handlers = opts.handlers;
    this.reducedMotion = opts.reducedMotion;
    this.realm = realmForKonspekt(opts.konspekt);
    this.questionPool = [...opts.questions];
    this.fetchMoreQuestions = opts.fetchMoreQuestions;
    this.playerHp = this.cfg.playerHpBase;
    this.playerHpMax = this.cfg.playerHpBase;

    this.keyDownHandler = (e) => this.onKeyDown(e);
    this.keyUpHandler = (e) => this.onKeyUp(e);
    this.blurHandler = () => {
      this.keyState.clear();
      if (this.status === 'EXPLORING' || this.status === 'ENCOUNTER') {
        this.setStatus('PAUSED');
      }
    };

    this.initThree();
    this.initWorld();
    this.bindInput();
    this.emitHud();
  }

  // ----- public -----

  start() {
    if (this.destroyed) return;
    this.startedAtMs = performance.now();
    this.lastTimeMs = this.startedAtMs;
    this.setStatus('EXPLORING');
    this.tick();
  }
  pause() {
    if (this.status === 'EXPLORING' || this.status === 'ENCOUNTER') {
      this.setStatus('PAUSED');
    }
  }
  resume() {
    if (this.status === 'PAUSED') {
      this.setStatus(this.encounter ? 'ENCOUNTER' : 'EXPLORING');
      this.lastTimeMs = performance.now();
    }
  }
  togglePause() {
    if (this.status === 'PAUSED') this.resume();
    else this.pause();
  }
  endNow(reason: 'user' | 'finished') {
    if (reason === 'user') this.finish();
  }
  destroy() {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('blur', this.blurHandler);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
    for (const g of Object.values(this.geos)) g.dispose();
    for (const m of Object.values(this.mats)) {
      if (m instanceof THREE.Material) m.dispose();
    }
    for (const c of this.creatures) {
      c.bodyMat.dispose();
    }
  }

  answerCurrentQuestion(optionId: string) {
    if (!this.encounter || !this.encounter.current) return;
    this.processAnswer(optionId, false);
  }

  // ----- init -----

  private initThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.reducedMotion;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.realm.skyColor);
    this.scene.fog = new THREE.Fog(this.realm.skyColor, 30, 90);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.camera.position.set(0, 8, 10);
    this.camera.lookAt(0, 1, 0);

    const ambient = new THREE.AmbientLight(this.realm.ambientColor, 0.55);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(-8, 14, 6);
    dir.castShadow = !this.reducedMotion;
    if (dir.castShadow) {
      dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.left = -25;
      dir.shadow.camera.right = 25;
      dir.shadow.camera.top = 25;
      dir.shadow.camera.bottom = -25;
      dir.shadow.camera.near = 1;
      dir.shadow.camera.far = 60;
    }
    this.scene.add(dir);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
  }

  private initWorld() {
    // Ground (large disk)
    const groundGeo = new THREE.CircleGeometry(this.cfg.worldRadius, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: this.realm.groundColor,
      roughness: 0.95,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Decorations: scatter scenery props
    const decoCount = 36;
    for (let i = 0; i < decoCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * (this.cfg.worldRadius - 8);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      let prop: THREE.Object3D;
      switch (this.realm.scenery) {
        case 'forest':
          prop = this.buildTree();
          break;
        case 'ruins':
          prop = this.buildColumn();
          break;
        case 'lab':
          prop = this.buildPillar();
          break;
        case 'glacier':
          prop = this.buildIceSpire();
          break;
      }
      prop.position.set(x, 0, z);
      prop.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.85 + Math.random() * 0.4;
      prop.scale.setScalar(s);
      this.scene.add(prop);
      this.decorations.push(prop);
    }

    // Center pedestal for boss
    const pedestalGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.8, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f2a,
      roughness: 0.7,
      metalness: 0.2,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.4, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = !this.reducedMotion;
    this.scene.add(pedestal);

    // Player
    this.player = new THREE.Group();
    this.playerBody = new THREE.Mesh(this.geos.body, this.mats.player);
    this.playerBody.position.y = 0.65;
    this.playerBody.castShadow = true;
    this.playerHead = new THREE.Mesh(this.geos.head, this.mats.playerHead);
    this.playerHead.position.y = 1.45;
    this.playerHead.castShadow = true;
    this.playerStaff = new THREE.Mesh(this.geos.staff, this.mats.staff);
    this.playerStaff.position.set(0.32, 0.95, 0);
    this.playerStaff.rotation.z = -0.2;
    this.playerStaff.castShadow = true;
    this.player.add(this.playerBody);
    this.player.add(this.playerHead);
    this.player.add(this.playerStaff);
    this.player.position.set(0, 0, this.cfg.worldRadius * 0.5);
    this.scene.add(this.player);

    // Interaction beam (a ring under player when near a creature)
    this.interactBeam = new THREE.Mesh(
      this.geos.interactRing,
      new THREE.MeshBasicMaterial({ color: 0xfff097, transparent: true, opacity: 0.9 }),
    );
    this.interactBeam.rotation.x = -Math.PI / 2;
    this.interactBeam.visible = false;
    this.scene.add(this.interactBeam);

    // Floating prompt sprite (uses canvas texture)
    const prompt = makeSprite('E — взаимодействие');
    prompt.position.set(0, 2.2, 0);
    prompt.visible = false;
    this.interactPrompt = prompt;
    this.scene.add(prompt);

    // Creatures: 3 normal scattered + boss in center
    const cdefs = this.realm.creatures;
    const ringRadius = this.cfg.worldRadius * 0.55;
    for (let i = 0; i < cdefs.length; i++) {
      const angle = (i / cdefs.length) * Math.PI * 2 + Math.PI / cdefs.length;
      const px = Math.cos(angle) * ringRadius;
      const pz = Math.sin(angle) * ringRadius;
      const creature = this.buildCreature(cdefs[i], false);
      creature.group.position.set(px, 0, pz);
      this.scene.add(creature.group);
      this.creatures.push(creature);
    }
    const bossCreature = this.buildCreature(this.realm.boss, true);
    bossCreature.group.position.set(0, 0.9, 0);
    bossCreature.active = false;
    bossCreature.group.visible = false;
    this.scene.add(bossCreature.group);
    this.creatures.push(bossCreature);
  }

  private buildCreature(def: CreatureDef, isBoss: boolean): SceneCreature {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: def.emissive,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(this.geos.creature, mat);
    body.scale.setScalar(def.scale * (isBoss ? 1.4 : 1.0));
    body.position.y = 0.9;
    body.castShadow = !this.reducedMotion;
    group.add(body);

    // eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.1, 0.5 * def.scale);
    eyeR.position.set(0.18, 1.1, 0.5 * def.scale);
    group.add(eyeL);
    group.add(eyeR);

    if (isBoss) {
      const aura = new THREE.Mesh(this.geos.bossAura, this.mats.bossAura);
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.05;
      group.add(aura);
    }
    return {
      def,
      group,
      bodyMat: mat,
      defeated: false,
      hp: isBoss ? this.cfg.bossHpBase : this.cfg.creatureHpBase,
      hpMax: isBoss ? this.cfg.bossHpBase : this.cfg.creatureHpBase,
      isBoss,
      active: !isBoss,
      bobPhase: Math.random() * Math.PI * 2,
    };
  }

  private buildTree(): THREE.Object3D {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = !this.reducedMotion;
    group.add(trunk);
    const crownGeo = new THREE.ConeGeometry(0.8, 1.8, 8);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x1d6b3a, roughness: 0.9 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 2.0;
    crown.castShadow = !this.reducedMotion;
    group.add(crown);
    return group;
  }
  private buildColumn(): THREE.Object3D {
    const geo = new THREE.CylinderGeometry(0.35, 0.4, 2.2, 10);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa39d8c, roughness: 0.85 });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 1.1;
    m.castShadow = !this.reducedMotion;
    return m;
  }
  private buildPillar(): THREE.Object3D {
    const geo = new THREE.BoxGeometry(0.6, 1.6, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a4b78,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x152545,
      emissiveIntensity: 0.4,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 0.8;
    m.castShadow = !this.reducedMotion;
    return m;
  }
  private buildIceSpire(): THREE.Object3D {
    const geo = new THREE.ConeGeometry(0.45, 1.7, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xa6e1ff,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x163a55,
      emissiveIntensity: 0.3,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 0.85;
    m.castShadow = !this.reducedMotion;
    return m;
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ----- input -----

  private bindInput() {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('blur', this.blurHandler);
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.destroyed) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      this.togglePause();
      e.preventDefault();
      return;
    }
    if (this.status === 'ENCOUNTER' && this.encounter?.current) {
      const idx = ['1', '2', '3', '4'].indexOf(k);
      if (idx >= 0 && idx < this.encounter.current.options.length) {
        const opt = this.encounter.current.options[idx];
        this.processAnswer(opt.id, false);
        e.preventDefault();
        return;
      }
    }
    if (this.status === 'EXPLORING' && (k === 'e' || k === ' ' || k === 'spacebar')) {
      this.tryInteract();
      e.preventDefault();
      return;
    }
    this.keyState.add(k);
  }
  private onKeyUp(e: KeyboardEvent) {
    this.keyState.delete(e.key.toLowerCase());
  }

  // ----- loop -----

  private tick = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.tick);
    const now = performance.now();
    let frameMs = now - this.lastTimeMs;
    this.lastTimeMs = now;
    if (frameMs > 100) frameMs = 100;

    if (this.status === 'PAUSED' || this.status === 'RESULTS') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const dt = frameMs / 1000;
    this.elapsedMs += frameMs;

    if (this.status === 'EXPLORING') {
      this.updateMovement(dt);
      this.updateInteractHint();
    } else if (this.status === 'ENCOUNTER') {
      this.updateEncounter(dt);
    }
    this.updateCreatures(dt);
    this.updateCamera();
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint = undefined;
    }
    this.emitHud();

    // Prefetch
    if (
      !this.prefetching &&
      this.fetchMoreQuestions &&
      this.questionPool.length - this.questionCursor <= 3
    ) {
      this.prefetching = true;
      this.fetchMoreQuestions(5)
        .then((more) => this.questionPool.push(...more))
        .catch(() => {
          /* ignore */
        })
        .finally(() => {
          this.prefetching = false;
        });
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateMovement(dt: number) {
    const k = this.keyState;
    let vx = 0;
    let vz = 0;
    if (k.has('w') || k.has('arrowup')) vz -= 1;
    if (k.has('s') || k.has('arrowdown')) vz += 1;
    if (k.has('a') || k.has('arrowleft')) vx -= 1;
    if (k.has('d') || k.has('arrowright')) vx += 1;
    const len = Math.hypot(vx, vz);
    if (len > 0) {
      vx /= len;
      vz /= len;
      const sp = this.cfg.movementSpeed;
      const nx = this.player.position.x + vx * sp * dt;
      const nz = this.player.position.z + vz * sp * dt;
      const inside = Math.hypot(nx, nz) < this.cfg.worldRadius - 1.2;
      if (inside) {
        this.player.position.x = nx;
        this.player.position.z = nz;
      }
      // Face movement direction
      this.playerFacing.set(vx, 0, vz).normalize();
      this.player.rotation.y = Math.atan2(vx, vz);
      this.playerBody.rotation.z = Math.sin(this.elapsedMs / 110) * 0.12;
    } else {
      this.playerBody.rotation.z = 0;
    }
  }

  private updateCreatures(dt: number) {
    for (const c of this.creatures) {
      if (c.defeated) continue;
      if (!c.active) continue;
      c.bobPhase += dt * 1.5;
      c.group.position.y = c.isBoss ? 0.9 + Math.sin(c.bobPhase) * 0.25 : Math.sin(c.bobPhase) * 0.18;
      c.group.rotation.y += dt * 0.4;
    }
  }

  private nearestActiveCreature(): { c: SceneCreature; dist: number } | null {
    let best: { c: SceneCreature; dist: number } | null = null;
    for (const c of this.creatures) {
      if (c.defeated || !c.active) continue;
      const dx = c.group.position.x - this.player.position.x;
      const dz = c.group.position.z - this.player.position.z;
      const dist = Math.hypot(dx, dz);
      if (!best || dist < best.dist) best = { c, dist };
    }
    return best;
  }

  private updateInteractHint() {
    const near = this.nearestActiveCreature();
    if (near && near.dist <= this.cfg.interactDistance) {
      this.interactBeam.visible = true;
      this.interactBeam.position.set(near.c.group.position.x, 0.05, near.c.group.position.z);
      this.interactBeam.rotation.z += 0.05;
      this.interactPrompt.visible = true;
      this.interactPrompt.position.set(near.c.group.position.x, 2.4, near.c.group.position.z);
    } else {
      this.interactBeam.visible = false;
      this.interactPrompt.visible = false;
    }
  }

  private tryInteract() {
    const near = this.nearestActiveCreature();
    if (!near || near.dist > this.cfg.interactDistance) {
      this.flashHint('Подойдите ближе к существу');
      return;
    }
    this.startEncounter(near.c);
  }

  private flashHint(msg: string) {
    this.hint = msg;
    this.hintTimer = 1.6;
  }

  // ----- encounter -----

  private startEncounter(creature: SceneCreature) {
    const queue: QuizQuestion[] = [];
    const want = creature.isBoss ? 5 : 2;
    for (let i = 0; i < want && this.questionCursor < this.questionPool.length; i++) {
      queue.push(this.questionPool[this.questionCursor++]);
    }
    if (queue.length === 0) {
      this.flashHint('Вопросы закончились — возвращайтесь к конспекту');
      return;
    }
    this.encounter = {
      creature,
      questionQueue: queue,
      currentIdx: 0,
      current: queue[0],
      questionStartedAtMs: this.elapsedMs,
      questionTimer: this.cfg.encounterTimerSec,
      comboCorrect: 0,
      lastResult: null,
    };
    this.setStatus('ENCOUNTER');
  }

  private updateEncounter(dt: number) {
    if (!this.encounter || !this.encounter.current) return;
    this.encounter.questionTimer -= dt;
    if (this.encounter.questionTimer <= 0) {
      this.processAnswer(null, true);
    }
    // Wobble the creature in encounter for menace
    const c = this.encounter.creature;
    c.bobPhase += dt * 2.4;
    c.group.position.y = (c.isBoss ? 0.9 : 0) + Math.sin(c.bobPhase) * 0.25;
  }

  private processAnswer(selectedId: string | null, timedOut: boolean) {
    if (!this.encounter || !this.encounter.current) return;
    const q = this.encounter.current;
    const correct = selectedId !== null && selectedId === q.correctOptionId;
    const ms = this.elapsedMs - this.encounter.questionStartedAtMs;
    const ans: AnswerEvent = {
      questionId: q.id,
      selectedOptionId: selectedId,
      correct,
      timeToAnswerMs: ms,
      difficulty: q.difficulty,
    };
    this.answers.push(ans);
    this.handlers.onAnswer(ans);

    if (correct) {
      const speedBonus = Math.max(0, this.cfg.encounterTimerSec - ms / 1000) * 1.5;
      const dmg = Math.round(
        this.cfg.damagePerCorrectBase + speedBonus + q.difficulty * 3,
      );
      this.encounter.creature.hp = Math.max(0, this.encounter.creature.hp - dmg);
      this.encounter.comboCorrect += 1;
      this.encounter.lastResult = 'correct';
      this.coins += this.cfg.coinsPerCorrect + q.difficulty;
      this.xp += this.cfg.xpPerCorrect + q.difficulty * 3;
      this.gems += this.encounter.creature.isBoss ? 2 : 0;
    } else {
      const dmg = Math.round(
        this.cfg.damagePerWrongBase + q.difficulty * 2 + (timedOut ? 4 : 0),
      );
      this.playerHp = Math.max(0, this.playerHp - dmg);
      this.encounter.comboCorrect = 0;
      this.encounter.lastResult = 'wrong';
    }
    this.encounter.lastExplanation = q.explanation;

    if (this.encounter.creature.hp <= 0) {
      this.onCreatureDefeated(this.encounter.creature);
      this.endEncounter(true);
      return;
    }
    if (this.playerHp <= 0) {
      this.endEncounter(false);
      return;
    }
    // Next question
    this.encounter.currentIdx += 1;
    if (this.encounter.currentIdx >= this.encounter.questionQueue.length) {
      // ran out of queued questions, refill from pool
      if (this.questionCursor < this.questionPool.length) {
        this.encounter.questionQueue.push(this.questionPool[this.questionCursor++]);
      } else {
        // Creature flees if we ran out of questions mid-fight
        this.flashHint('Существо ускользнуло — нужно больше вопросов');
        this.endEncounter(false);
        return;
      }
    }
    this.encounter.current = this.encounter.questionQueue[this.encounter.currentIdx];
    this.encounter.questionStartedAtMs = this.elapsedMs;
    this.encounter.questionTimer = this.cfg.encounterTimerSec;
  }

  private onCreatureDefeated(creature: SceneCreature) {
    creature.defeated = true;
    creature.group.visible = false;
    if (!creature.isBoss) {
      this.encountersCompleted += 1;
      if (
        this.encountersCompleted >= this.cfg.encountersBeforeBoss &&
        !this.creatures.find((c) => c.isBoss && c.active)
      ) {
        const boss = this.creatures.find((c) => c.isBoss);
        if (boss) {
          boss.active = true;
          boss.group.visible = true;
          this.flashHint(`Появился ${boss.def.name}! Подойдите к центру.`);
        }
      } else {
        this.flashHint(
          `Победа! ${this.encountersCompleted}/${this.cfg.encountersBeforeBoss}`,
        );
      }
    } else {
      this.bossDefeated = true;
      this.flashHint('Босс повержен! Сессия завершена.');
      this.finish();
    }
  }

  private endEncounter(_victory: boolean) {
    this.encounter = null;
    if (this.playerHp <= 0) {
      // Respawn near start, restore HP fully
      this.playerHp = this.playerHpMax;
      this.player.position.set(0, 0, this.cfg.worldRadius * 0.5);
      this.flashHint('Вы ослабли и отступили в безопасное место.');
    }
    if (this.bossDefeated) return;
    this.setStatus('EXPLORING');
  }

  private updateCamera() {
    const target = this.player.position;
    const offset = new THREE.Vector3(0, 7.5, 9);
    const desired = target.clone().add(offset);
    this.camera.position.lerp(desired, 0.12);
    this.camera.lookAt(target.x, 1.2, target.z);
  }

  // ----- finish -----

  private finish() {
    if (this.status === 'RESULTS') return;
    const durationMs = this.elapsedMs;
    const correct = this.answers.filter((a) => a.correct).length;
    const ratio = this.answers.length ? correct / this.answers.length : 0;
    const score = Math.round(correct * 200 + this.coins * 5 + (this.bossDefeated ? 1000 : 0));
    const highlights: string[] = [];
    if (this.bossDefeated) highlights.push('Босс зоны повержен');
    if (ratio >= 0.9 && this.answers.length >= 4) highlights.push('Точность ≥ 90%');
    if (this.gems > 0) highlights.push(`Получено ${this.gems} самоцветов`);
    this.handlers.onFinished({
      score,
      coins: this.coins,
      xp: this.xp,
      questionsAsked: this.answers.length,
      questionsCorrect: correct,
      durationMs,
      perQuestion: this.answers,
      highlights,
    });
    this.setStatus('RESULTS');
  }

  // ----- HUD -----

  private setStatus(status: LoreQuestStatus) {
    this.status = status;
    this.emitHud();
  }

  private emitHud() {
    const encounter: EncounterHud | undefined = this.encounter && this.encounter.current
      ? {
          creatureId: this.encounter.creature.def.id,
          creatureName: this.encounter.creature.def.name,
          creatureHp: this.encounter.creature.hp,
          creatureHpMax: this.encounter.creature.hpMax,
          question: this.encounter.current,
          questionStartedAtMs: this.encounter.questionStartedAtMs,
          timerSec: Math.max(0, this.encounter.questionTimer),
          timerMaxSec: this.cfg.encounterTimerSec,
          comboCorrect: this.encounter.comboCorrect,
          lastResult: this.encounter.lastResult,
          lastExplanation: this.encounter.lastExplanation,
        }
      : undefined;
    const hud: LoreQuestHud = {
      status: this.status,
      playerHp: this.playerHp,
      playerHpMax: this.playerHpMax,
      zoneName: this.realm.zoneName,
      realmName: this.realm.realmName,
      questionsAsked: this.answers.length,
      questionsCorrect: this.answers.filter((a) => a.correct).length,
      coins: this.coins,
      gems: this.gems,
      xp: this.xp,
      encountersCompleted: this.encountersCompleted,
      encountersRequired: this.cfg.encountersBeforeBoss,
      bossDefeated: this.bossDefeated,
      encounter,
      hint: this.hint,
    };
    if (!hudEquals(this.lastHud, hud)) {
      this.handlers.onHudChange(hud);
      this.lastHud = hud;
    }
  }
}

function hudEquals(a: LoreQuestHud | null, b: LoreQuestHud) {
  if (!a) return false;
  return (
    a.status === b.status &&
    a.playerHp === b.playerHp &&
    a.coins === b.coins &&
    a.gems === b.gems &&
    a.xp === b.xp &&
    a.encountersCompleted === b.encountersCompleted &&
    a.bossDefeated === b.bossDefeated &&
    a.questionsAsked === b.questionsAsked &&
    a.questionsCorrect === b.questionsCorrect &&
    a.encounter?.question.id === b.encounter?.question.id &&
    Math.round((a.encounter?.timerSec ?? 0) * 4) ===
      Math.round((b.encounter?.timerSec ?? 0) * 4) &&
    a.encounter?.creatureHp === b.encounter?.creatureHp &&
    a.hint === b.hint
  );
}

function makeSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(11,15,26,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,213,74,0.8)';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = '#fff097';
  ctx.font = 'bold 48px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}
