import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import {
  contextOfSection,
  FIXED_CALLOUTS,
  GamepadType,
  partPathFor,
  REBIND_CATALOG,
  RebindEntryDef,
  regionForPart,
} from '../data/catalog';
import { ControlGlyph, formatReadableBinding } from './ControlGlyph';
import { BindingsMap, getEffectivePath } from '../services/rebindEngine';
import { RotateCcw, Gamepad2, Eye, Sparkles, Lock, Unlock } from 'lucide-react';

interface GamepadStage3DProps {
  gamepadType: GamepadType;
  onGamepadTypeChange: (type: GamepadType) => void;
  bindings: BindingsMap;
  focusedEntry: RebindEntryDef | null;
  listeningEntry: RebindEntryDef | null;
  flashedBindingPath: string | null;
  activeContext: number;
  onContextChange: (ctx: number) => void;
  lang: 'ru' | 'en';
  onPartClicked: (partPath: string, defaultBindingPath: string) => void;
  onSelectEntryFromCallout: (entry: RebindEntryDef, startRebind?: boolean) => void;
  onPhysicalGamepadCapture?: (bindingPath: string) => void;
}

type PartKind = 'Button' | 'Shoulder' | 'Trigger' | 'Stick';

interface RigPart {
  path: string;
  kind: PartKind;
  mesh: THREE.Object3D;
  materials: THREE.MeshStandardMaterial[];
  restPosition: THREE.Vector3;
  restRotation: THREE.Quaternion;
  pivot: THREE.Vector3; // in parent space
  localCenter: THREE.Vector3; // in modelRoot space
  overviewNdc: THREE.Vector2; // projected in still overview pose (-1..1)
  press: number;
  tilt: THREE.Vector2;
  livePress: number;
  liveTilt: THREE.Vector2;
  glow: number;
  flashTime: number;
}

type CalloutSide = 'Left' | 'Right' | 'TopLeft' | 'TopRight' | 'Top' | 'Bottom';

interface CalloutLineItem {
  controlPath: string;
  text: string;
  note?: string;
  entry: RebindEntryDef | null;
}

interface CalloutGroup {
  part: string;
  side: CalloutSide;
  lines: CalloutLineItem[];
  restNdc: THREE.Vector2;
}

function kindOfPart(path: string): PartKind {
  if (path.endsWith('Trigger')) return 'Trigger';
  if (path.endsWith('Stick')) return 'Stick';
  if (path.endsWith('Shoulder')) return 'Shoulder';
  return 'Button';
}

function sideOfPart(part: string): CalloutSide {
  if (part === 'leftStick' || part === 'rightStick') return 'Bottom';
  switch (regionForPart(part)) {
    case 'TopLeft':
      return 'TopLeft';
    case 'TopRight':
      return 'TopRight';
    case 'FaceLeft':
      return 'Left';
    case 'FaceRight':
      return 'Right';
    default:
      return 'Top';
  }
}

// 0..1 phase -> quick press, hold, ease out, rest (exact DemoCurve from GamepadModelRig.cs)
function demoCurve(phase: number): number {
  if (phase < 0.12) {
    const t = phase / 0.12;
    return t * t * (3 - 2 * t);
  }
  if (phase < 0.42) return 1.0;
  if (phase < 0.6) {
    const t = (phase - 0.42) / 0.18;
    return 1.0 - t * t * (3 - 2 * t);
  }
  return 0.0;
}

export function partToDefaultBindingPath(partPath: string): string {
  if (partPath === 'leftStick') return '<Gamepad>/leftStickPress';
  if (partPath === 'rightStick') return '<Gamepad>/rightStickPress';
  if (partPath === 'touchpadButton') return '<DualShockGamepad>/touchpadButton';
  return `<Gamepad>/${partPath}`;
}

const CONTEXT_LABELS: Array<{ id: number; ru: string; en: string }> = [
  { id: 0, ru: 'Пешком + Меню', en: 'On Foot + Menus' },
  { id: 1, ru: 'Автомобиль', en: 'Car' },
  { id: 2, ru: 'Фокус животного', en: 'Animal Focus' },
  { id: 3, ru: 'Lucid Rush (QTE)', en: 'Lucid Rush QTE' },
];

export const GamepadStage3D: React.FC<GamepadStage3DProps> = ({
  gamepadType,
  onGamepadTypeChange,
  bindings,
  focusedEntry,
  listeningEntry,
  flashedBindingPath,
  activeContext,
  onContextChange,
  lang,
  onPartClicked,
  onSelectEntryFromCallout,
  onPhysicalGamepadCapture,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [connectedPadName, setConnectedPadName] = useState<string | null>(null);
  const [lockOrbit, setLockOrbit] = useState<boolean>(false);
  const [availableParts, setAvailableParts] = useState<Record<string, THREE.Vector2>>({});

  // Refs for real-time 60fps loop access without recreating Three.js scene
  const focusPartRef = useRef<string | null>(null);
  const focusStartRef = useRef<number>(0);
  const hoveredPartRef = useRef<string | null>(null);
  const lockOrbitRef = useRef<boolean>(false);
  const orbitRef = useRef<{ x: number; y: number; lastTime: number }>({
    x: 0,
    y: 0,
    lastTime: -100,
  });
  const partsMapRef = useRef<Map<string, RigPart>>(new Map());
  const modelRootRef = useRef<THREE.Group | null>(null);
  const listeningRef = useRef<RebindEntryDef | null>(null);
  const onPartClickedRef = useRef(onPartClicked);
  const onPhysicalCaptureRef = useRef(onPhysicalGamepadCapture);

  // Refs for SVG leader lines & dots updated at 60fps
  const wireRefs = useRef<Record<string, SVGLineElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const pulseRingRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    onPartClickedRef.current = onPartClicked;
  }, [onPartClicked]);

  useEffect(() => {
    onPhysicalCaptureRef.current = onPhysicalGamepadCapture;
  }, [onPhysicalGamepadCapture]);

  useEffect(() => {
    listeningRef.current = listeningEntry;
  }, [listeningEntry]);

  useEffect(() => {
    lockOrbitRef.current = lockOrbit;
  }, [lockOrbit]);

  // Determine currently focused 3D part from focusedEntry or listeningEntry
  const activeEntry = listeningEntry || focusedEntry;
  const focusedPart = useMemo(() => {
    if (!activeEntry) return null;
    const eff = getEffectivePath(activeEntry, 'Gamepad', bindings);
    return partPathFor(eff);
  }, [activeEntry, bindings]);

  useEffect(() => {
    if (focusPartRef.current !== focusedPart) {
      focusPartRef.current = focusedPart;
      focusStartRef.current = performance.now() * 0.001;
    }
  }, [focusedPart]);

  // Trigger flash on part when flashedBindingPath updates
  useEffect(() => {
    if (!flashedBindingPath) return;
    const pName = partPathFor(flashedBindingPath);
    if (!pName) return;
    const part = partsMapRef.current.get(pName);
    if (part) {
      part.flashTime = performance.now() * 0.001;
    }
  }, [flashedBindingPath]);

  // Build callout groups for the active context (exact logic from GamepadLayoutPanel.RebuildCallouts)
  const calloutGroups = useMemo<CalloutGroup[]>(() => {
    const byPart = new Map<string, CalloutGroup>();

    const addLine = (
      part: string,
      controlPath: string,
      text: string,
      note: string | undefined,
      entry: RebindEntryDef | null
    ) => {
      if (!availableParts[part]) return;
      let grp = byPart.get(part);
      if (!grp) {
        grp = {
          part,
          side: sideOfPart(part),
          lines: [],
          restNdc: availableParts[part] || new THREE.Vector2(0, 0),
        };
        byPart.set(part, grp);
      }
      if (grp.lines.some((l) => l.text === text && l.controlPath === controlPath)) {
        return;
      }
      grp.lines.push({ controlPath, text, note, entry });
    };

    for (const entry of REBIND_CATALOG) {
      if (contextOfSection(entry.section) !== activeContext) continue;
      const path = getEffectivePath(entry, 'Gamepad', bindings);
      if (!path) continue;
      const part = partPathFor(path);
      if (!part) continue;
      const label = lang === 'ru' ? entry.labelRu : entry.labelEn;
      const note = lang === 'ru' ? entry.noteRu : entry.noteEn;
      addLine(part, path, label, note, entry);

      // If entry has DualSense Touchpad alias and is at default <Gamepad>/select, also show on touchpadButton on PS5
      if (
        gamepadType === 'PlayStation' &&
        entry.hasTouchpadAlias &&
        path === entry.defaultPad &&
        availableParts['touchpadButton']
      ) {
        addLine(
          'touchpadButton',
          '<DualShockGamepad>/touchpadButton',
          label,
          note,
          entry
        );
      }
    }

    if (activeContext === 0) {
      for (const fc of FIXED_CALLOUTS) {
        addLine(
          fc.part,
          `<Gamepad>/${fc.part}`,
          lang === 'ru' ? fc.labelRu : fc.labelEn,
          undefined,
          null
        );
      }
    }

    return Array.from(byPart.values());
  }, [activeContext, bindings, availableParts, gamepadType, lang]);

  // Organize callouts by side and sort them by their restNdc coordinates (exact GamepadLayoutPanel order)
  const calloutsBySide = useMemo(() => {
    const sides: Record<CalloutSide, CalloutGroup[]> = {
      TopLeft: [],
      TopRight: [],
      Top: [],
      Left: [],
      Right: [],
      Bottom: [],
    };
    for (const c of calloutGroups) {
      sides[c.side].push(c);
    }
    // Sort TopLeft & TopRight: higher Y on top
    sides.TopLeft.sort((a, b) => b.restNdc.y - a.restNdc.y);
    sides.TopRight.sort((a, b) => b.restNdc.y - a.restNdc.y);
    // Sort Left & Right: higher Y on top (since DOM flex column flows top-to-bottom)
    sides.Left.sort((a, b) => b.restNdc.y - a.restNdc.y || a.part.localeCompare(b.part));
    sides.Right.sort((a, b) => b.restNdc.y - a.restNdc.y || a.part.localeCompare(b.part));
    // Sort Top & Bottom: left-to-right by X
    sides.Top.sort((a, b) => a.restNdc.x - b.restNdc.x);
    sides.Bottom.sort((a, b) => a.restNdc.x - b.restNdc.x);
    return sides;
  }, [calloutGroups]);

  // Setup Three.js Scene & Load FBX Model
  useEffect(() => {
    const container = canvasWrapRef.current;
    if (!container) return;

    let disposed = false;
    setLoadingModel(true);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, 1, 0.01, 10);
    const overviewDistance = 0.43;
    const focusDistance = 0.38;
    camera.position.set(0, 0, overviewDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Stage lighting (scaled by lightScale: Xbox black controller uses 2.2x, DualSense uses 1.05x)
    const lightScale = gamepadType === 'Xbox' ? 2.15 : 1.08;
    const ambientLight = new THREE.AmbientLight(0xd8e0ff, 1.35 * lightScale);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5 * lightScale);
    keyLight.position.set(0.35, 0.55, 0.75);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90a8ff, 1.35 * lightScale);
    fillLight.position.set(-0.55, 0.2, 0.55);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc88cff, 1.65 * lightScale);
    rimLight.position.set(0, 0.65, -0.6);
    scene.add(rimLight);

    const bottomFill = new THREE.DirectionalLight(0x6875a8, 0.75 * lightScale);
    bottomFill.position.set(0, -0.6, 0.35);
    scene.add(bottomFill);

    const modelPivot = new THREE.Group();
    scene.add(modelPivot);

    // Load Textures & FBX
    const baseUrl = import.meta.env.BASE_URL || './';
    const texLoader = new THREE.TextureLoader();
    const fbxLoader = new FBXLoader();

    const loadTex = (relPath: string, isSRGB = false): THREE.Texture => {
      const t = texLoader.load(`${baseUrl}${relPath}`);
      t.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
      return t;
    };

    const folder = gamepadType === 'PlayStation' ? 'DualSense' : 'XboxController';
    const baseColorTex = loadTex(
      `models/${folder}/Textures/T_${folder}_BaseColor.png`,
      true
    );
    const roughnessTex = loadTex(
      `models/${folder}/Textures/T_${folder}_Roughness.png`,
      false
    );
    const normalTex =
      gamepadType === 'PlayStation'
        ? loadTex(`models/DualSense/Textures/T_DualSense_Normal.png`, false)
        : null;
    const emissionTex =
      gamepadType === 'PlayStation'
        ? loadTex(`models/DualSense/Textures/T_DualSense_Emission.png`, true)
        : null;

    const baseBodyMat = new THREE.MeshStandardMaterial({
      map: baseColorTex,
      roughnessMap: roughnessTex,
      roughness: gamepadType === 'Xbox' ? 0.62 : 0.55,
      metalness: gamepadType === 'Xbox' ? 0.12 : 0.08,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(0.88, 0.88),
      emissiveMap: emissionTex,
      emissive: new THREE.Color(gamepadType === 'PlayStation' ? 0x2244aa : 0x000000),
      emissiveIntensity: gamepadType === 'PlayStation' ? 0.45 : 0,
    });

    const baseCapMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xd8dce8),
      transparent: true,
      opacity: 0.34,
      roughness: 0.1,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      depthWrite: false,
    });

    const pickableMeshes: Array<{ mesh: THREE.Object3D; partPath: string }> = [];

    fbxLoader.load(
      `${baseUrl}models/${folder}/${folder}.fbx`,
      (fbxGroup) => {
        if (disposed) return;

        // Reset FBXLoader's -90deg X pre-rotation so +X is Right, +Y is Top (Shoulders), +Z is Face Normal
        fbxGroup.rotation.set(0, 0, 0);
        fbxGroup.scale.set(1, 1, 1);
        fbxGroup.position.set(0, 0, 0);
        fbxGroup.updateMatrixWorld(true);

        // Center controller around Body mesh bounds center (exact GamepadPreviewStage.Begin logic)
        const bodyObj = fbxGroup.getObjectByName('Body');
        const bodyBox = new THREE.Box3().setFromObject(bodyObj || fbxGroup);
        const bodyCenter = new THREE.Vector3();
        bodyBox.getCenter(bodyCenter);
        fbxGroup.position.copy(bodyCenter.multiplyScalar(-1));
        fbxGroup.updateMatrixWorld(true);

        modelPivot.add(fbxGroup);
        modelRootRef.current = fbxGroup;

        const newParts = new Map<string, RigPart>();
        const overviewEuler = new THREE.Euler(THREE.MathUtils.degToRad(16), 0, 0, 'XYZ');
        modelPivot.rotation.copy(overviewEuler);
        modelPivot.updateMatrixWorld(true);

        const registerPart = (partPath: string, obj: THREE.Object3D) => {
          const partMats: THREE.MeshStandardMaterial[] = [];
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              const origMats = Array.isArray(m.material) ? m.material : [m.material];
              const clonedMats = origMats.map((om) => {
                if (om && om.name === 'M_DualSense_ButtonCap') {
                  const capClone = baseCapMat.clone();
                  partMats.push(capClone as unknown as THREE.MeshStandardMaterial);
                  return capClone;
                }
                const bodyClone = baseBodyMat.clone();
                bodyClone.emissiveMap = null;
                bodyClone.emissive = new THREE.Color(0x000000);
                bodyClone.emissiveIntensity = 0;
                partMats.push(bodyClone);
                return bodyClone;
              });
              m.material = clonedMats.length === 1 ? clonedMats[0] : clonedMats;
              pickableMeshes.push({ mesh: m, partPath });
            }
          });

          // Compute bounds in fbxGroup space
          modelPivot.rotation.set(0, 0, 0);
          modelPivot.updateMatrixWorld(true);
          const worldBox = new THREE.Box3().setFromObject(obj);
          const worldCenter = new THREE.Vector3();
          const worldSize = new THREE.Vector3();
          worldBox.getCenter(worldCenter);
          worldBox.getSize(worldSize);
          const halfExtents = worldSize.clone().multiplyScalar(0.5);

          const localCenter = fbxGroup.worldToLocal(worldCenter.clone());
          const parent = obj.parent || fbxGroup;
          const kind = kindOfPart(partPath);

          let pivotWorld = worldCenter.clone();
          if (kind === 'Stick') {
            pivotWorld.z -= halfExtents.z; // base of the stick
          } else if (kind === 'Trigger') {
            pivotWorld.y += halfExtents.y * 0.85;
            pivotWorld.z += halfExtents.z * 0.5;
          }
          const pivotInParent = parent.worldToLocal(pivotWorld);

          // Overview NDC projection for fixed callout ordering
          modelPivot.rotation.copy(overviewEuler);
          modelPivot.updateMatrixWorld(true);
          const overviewWorld = fbxGroup.localToWorld(localCenter.clone());
          const ndc3 = overviewWorld.project(camera);

          newParts.set(partPath, {
            path: partPath,
            kind,
            mesh: obj,
            materials: partMats,
            restPosition: obj.position.clone(),
            restRotation: obj.quaternion.clone(),
            pivot: pivotInParent,
            localCenter,
            overviewNdc: new THREE.Vector2(ndc3.x, ndc3.y),
            press: 0,
            tilt: new THREE.Vector2(0, 0),
            livePress: 0,
            liveTilt: new THREE.Vector2(0, 0),
            glow: 0,
            flashTime: -10,
          });
        };

        for (const child of fbxGroup.children) {
          if (child.name === 'dpad') {
            for (const dir of child.children) {
              registerPart(`dpad/${dir.name}`, dir);
            }
          } else if (child.name === 'Body') {
            child.traverse((c) => {
              if ((c as THREE.Mesh).isMesh) {
                (c as THREE.Mesh).material = baseBodyMat;
              }
            });
          } else {
            registerPart(child.name, child);
          }
        }

        partsMapRef.current = newParts;
        const avail: Record<string, THREE.Vector2> = {};
        newParts.forEach((v, k) => {
          avail[k] = v.overviewNdc;
        });
        setAvailableParts(avail);
        setLoadingModel(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load gamepad FBX:', err);
        if (!disposed) setLoadingModel(false);
      }
    );

    // Resize observer
    const updateSize = () => {
      if (!container) return;
      const w = Math.max(200, container.clientWidth);
      const h = Math.max(200, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    // Raycasting & Orbit Drag Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let dragDistance = 0;
    let prevPointer = { x: 0, y: 0 };

    const raycastPart = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = pickableMeshes.map((p) => p.mesh);
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length === 0) return null;
      const hitObj = hits[0].object;
      const found = pickableMeshes.find(
        (p) => p.mesh === hitObj || p.mesh.children.includes(hitObj)
      );
      return found ? found.partPath : null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      dragDistance = 0;
      prevPointer = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevPointer.x;
        const dy = e.clientY - prevPointer.y;
        prevPointer = { x: e.clientX, y: e.clientY };
        dragDistance += Math.hypot(dx, dy);
        if (dragDistance > 3) {
          orbitRef.current.x = THREE.MathUtils.clamp(
            orbitRef.current.x + dx * 0.35,
            -65,
            65
          );
          orbitRef.current.y = THREE.MathUtils.clamp(
            orbitRef.current.y + dy * 0.35,
            -48,
            48
          );
          orbitRef.current.lastTime = performance.now() * 0.001;
        }
        return;
      }

      const part = raycastPart(e.clientX, e.clientY);
      if (hoveredPartRef.current !== part) {
        hoveredPartRef.current = part;
        setHoveredPart(part);
        renderer.domElement.style.cursor = part ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      renderer.domElement.releasePointerCapture(e.pointerId);
      if (dragDistance < 6) {
        const part = raycastPart(e.clientX, e.clientY);
        if (part) {
          const p = partsMapRef.current.get(part);
          if (p) p.flashTime = performance.now() * 0.001;
          onPartClickedRef.current(part, partToDefaultBindingPath(part));
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);

    // Animation loop (exact port of GamepadPreviewStage.LateUpdate & GamepadModelRig.LateUpdate)
    let currentQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(THREE.MathUtils.degToRad(16), 0, 0, 'XYZ')
    );
    let currentDistance = overviewDistance;
    let lastFrameTime = performance.now() * 0.001;
    let rafId = 0;

    // Track previous physical gamepad button states for capture edges
    const prevPadButtons: boolean[] = new Array(20).fill(false);

    const highlightColor = new THREE.Color(0xb86bff); // Lunoris signature violet glow

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const now = performance.now() * 0.001;
      const dt = Math.min(0.1, Math.max(0.001, now - lastFrameTime));
      lastFrameTime = now;

      // 1. Poll Web Gamepad API for live physical mirroring and capture
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activePad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          activePad = p;
          break;
        }
      }

      if (activePad) {
        setConnectedPadName((prev) => (prev === activePad!.id ? prev : activePad!.id));
      } else {
        setConnectedPadName((prev) => (prev === null ? null : null));
      }

      // Standard Web Gamepad mapping -> part live values
      partsMapRef.current.forEach((p) => {
        p.livePress = 0;
        p.liveTilt.set(0, 0);
      });

      if (activePad) {
        const b = activePad.buttons;
        const ax = activePad.axes;
        const setLive = (partName: string, val: number) => {
          const p = partsMapRef.current.get(partName);
          if (p) p.livePress = Math.max(p.livePress, val);
        };
        if (b[0]) setLive('buttonSouth', b[0].value);
        if (b[1]) setLive('buttonEast', b[1].value);
        if (b[2]) setLive('buttonWest', b[2].value);
        if (b[3]) setLive('buttonNorth', b[3].value);
        if (b[4]) setLive('leftShoulder', b[4].value);
        if (b[5]) setLive('rightShoulder', b[5].value);
        if (b[6]) setLive('leftTrigger', b[6].value);
        if (b[7]) setLive('rightTrigger', b[7].value);
        if (b[8]) setLive('select', b[8].value);
        if (b[9]) setLive('start', b[9].value);
        if (b[10]) setLive('leftStick', b[10].value);
        if (b[11]) setLive('rightStick', b[11].value);
        if (b[12]) setLive('dpad/up', b[12].value);
        if (b[13]) setLive('dpad/down', b[13].value);
        if (b[14]) setLive('dpad/left', b[14].value);
        if (b[15]) setLive('dpad/right', b[15].value);
        if (b[16]) setLive('systemButton', b[16].value);
        if (b[17]) setLive('touchpadButton', b[17].value);

        const ls = partsMapRef.current.get('leftStick');
        if (ls && ax.length >= 2) {
          ls.liveTilt.set(
            Math.abs(ax[0]) > 0.08 ? ax[0] : 0,
            Math.abs(ax[1]) > 0.08 ? -ax[1] : 0
          );
        }
        const rs = partsMapRef.current.get('rightStick');
        if (rs && ax.length >= 4) {
          rs.liveTilt.set(
            Math.abs(ax[2]) > 0.08 ? ax[2] : 0,
            Math.abs(ax[3]) > 0.08 ? -ax[3] : 0
          );
        }

        // Check rising edge for capture when listening
        const buttonIndexToPath: Record<number, string> = {
          0: '<Gamepad>/buttonSouth',
          1: '<Gamepad>/buttonEast',
          2: '<Gamepad>/buttonWest',
          3: '<Gamepad>/buttonNorth',
          4: '<Gamepad>/leftShoulder',
          5: '<Gamepad>/rightShoulder',
          6: '<Gamepad>/leftTrigger',
          7: '<Gamepad>/rightTrigger',
          8: '<Gamepad>/select',
          9: '<Gamepad>/start',
          10: '<Gamepad>/leftStickPress',
          11: '<Gamepad>/rightStickPress',
          12: '<Gamepad>/dpad/up',
          13: '<Gamepad>/dpad/down',
          14: '<Gamepad>/dpad/left',
          15: '<Gamepad>/dpad/right',
          17: '<DualShockGamepad>/touchpadButton',
        };
        for (let i = 0; i < b.length && i < 20; i++) {
          const pressed = b[i].value > 0.55;
          if (pressed && !prevPadButtons[i] && listeningRef.current && buttonIndexToPath[i]) {
            onPhysicalCaptureRef.current?.(buttonIndexToPath[i]);
          }
          prevPadButtons[i] = pressed;
        }
      }

      // 2. Camera / Pivot Orientation (GamepadPreviewStage.ShowPart & LateUpdate)
      const activePart = focusPartRef.current || hoveredPartRef.current;
      let targetEulerDeg = { x: 16, y: 0, z: 0 };
      if (activePart) {
        switch (regionForPart(activePart)) {
          case 'FaceLeft':
            targetEulerDeg = { x: 20, y: 15, z: 0 };
            break;
          case 'FaceRight':
            targetEulerDeg = { x: 20, y: -15, z: 0 };
            break;
          case 'TopLeft':
            targetEulerDeg = { x: 52, y: 22, z: 0 };
            break;
          case 'TopRight':
            targetEulerDeg = { x: 52, y: -22, z: 0 };
            break;
          default:
            targetEulerDeg = { x: 18, y: 0, z: 0 };
            break;
        }
      }

      const targetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(targetEulerDeg.x),
          THREE.MathUtils.degToRad(targetEulerDeg.y),
          0,
          'XYZ'
        )
      );
      const turnK = 1 - Math.exp((-dt * 3) / 0.32);
      currentQuat.slerp(targetQuat, turnK);
      const targetDist = activePart ? focusDistance : overviewDistance;
      currentDistance = THREE.MathUtils.lerp(currentDistance, targetDist, turnK);

      if (!lockOrbitRef.current && now - orbitRef.current.lastTime > 1.2) {
        const easeBack = 1 - Math.exp(-dt * 2.5);
        orbitRef.current.x = THREE.MathUtils.lerp(orbitRef.current.x, 0, easeBack);
        orbitRef.current.y = THREE.MathUtils.lerp(orbitRef.current.y, 0, easeBack);
      }

      const swayT = now * 0.4 * Math.PI * 2;
      const swayQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(Math.sin(swayT * 0.7) * 1.25),
          THREE.MathUtils.degToRad(Math.sin(swayT) * 2.5),
          0,
          'XYZ'
        )
      );
      const orbitQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(orbitRef.current.y),
          THREE.MathUtils.degToRad(orbitRef.current.x),
          0,
          'XYZ'
        )
      );

      modelPivot.quaternion.copy(orbitQuat).multiply(swayQuat).multiply(currentQuat);
      camera.position.set(0, 0, currentDistance);
      modelPivot.updateMatrixWorld(true);

      // 3. Part Animation & Emissive Highlight (GamepadModelRig.LateUpdate)
      const responseK = 1 - Math.exp(-22 * dt);
      const demoPeriod = 1.5;
      const flashDuration = 0.7;
      const triggerAngleDeg = 16;
      const stickTiltAngleDeg = 18;

      const getPartPressDepth = (path: string): number => {
        if (path === 'systemButton' || path === 'micButton') return 0.00035;
        if (path === 'select' || path === 'start' || path === 'touchpadButton') {
          return 0.00085;
        }
        if (path.startsWith('dpad/')) return 0.0012;
        return 0.0014;
      };

      partsMapRef.current.forEach((part) => {
        let demoPress = 0;
        const demoTilt = new THREE.Vector2(0, 0);
        let targetGlow = 0;

        const isFocused = part.path === focusPartRef.current;
        const isHovered = part.path === hoveredPartRef.current;

        if (isFocused) {
          const t = now - focusStartRef.current;
          if (part.kind === 'Stick') {
            const a = (t * Math.PI * 2) / (demoPeriod * 1.6);
            const mag = Math.min(1, t * 2) * 0.85;
            demoTilt.set(Math.cos(a) * mag, Math.sin(a) * mag);
          } else {
            demoPress = demoCurve((t % demoPeriod) / demoPeriod);
          }
          targetGlow = 0.65 + 0.45 * Math.sin(t * 3.2);
        } else if (isHovered) {
          targetGlow = 0.45;
        }

        const sinceFlash = now - part.flashTime;
        if (sinceFlash < flashDuration) {
          const f = 1 - sinceFlash / flashDuration;
          targetGlow = Math.max(targetGlow, 1.8 * f);
          demoPress = Math.max(demoPress, sinceFlash < flashDuration * 0.35 ? 1 : f);
        }

        part.press = THREE.MathUtils.lerp(
          part.press,
          Math.max(part.livePress, demoPress),
          responseK
        );
        const targetTilt =
          part.liveTilt.lengthSq() > 0.0004 ? part.liveTilt : demoTilt;
        part.tilt.lerp(targetTilt, responseK);

        let newGlow = THREE.MathUtils.lerp(part.glow, targetGlow, responseK);
        if (newGlow < 0.002) newGlow = 0;
        if (newGlow > 0 || part.glow > 0) {
          for (const mat of part.materials) {
            mat.emissive.copy(highlightColor);
            mat.emissiveIntensity = newGlow;
            mat.polygonOffset = newGlow > 0;
            mat.polygonOffsetFactor = newGlow > 0 ? -2 : 0;
            mat.polygonOffsetUnits = newGlow > 0 ? -2 : 0;
          }
        }
        part.glow = newGlow;

        // Pose part in local space
        const pos = part.restPosition.clone();
        const rot = part.restRotation.clone();
        const partPressDepth = getPartPressDepth(part.path);

        if (part.kind === 'Button') {
          pos.z -= partPressDepth * part.press;
        } else if (part.kind === 'Shoulder') {
          pos.y -= 0.0008 * part.press;
          pos.z -= 0.0006 * part.press;
        } else if (part.kind === 'Trigger') {
          const turn = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            THREE.MathUtils.degToRad(triggerAngleDeg * part.press)
          );
          pos
            .copy(part.restPosition)
            .sub(part.pivot)
            .applyQuaternion(turn)
            .add(part.pivot);
          rot.copy(turn).multiply(part.restRotation);
        } else if (part.kind === 'Stick') {
          const tiltX = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            THREE.MathUtils.degToRad(part.tilt.x * stickTiltAngleDeg)
          );
          const tiltY = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            THREE.MathUtils.degToRad(-part.tilt.y * stickTiltAngleDeg)
          );
          const tiltQ = tiltX.multiply(tiltY);
          pos
            .copy(part.restPosition)
            .sub(part.pivot)
            .applyQuaternion(tiltQ)
            .add(part.pivot);
          pos.z -= partPressDepth * part.press;
          rot.copy(tiltQ).multiply(part.restRotation);
        }

        part.mesh.position.copy(pos);
        part.mesh.quaternion.copy(rot);
      });

      renderer.render(scene, camera);

      // 4. Update SVG Callout Leader Lines & Anchor Dots in real time
      const stageEl = containerRef.current;
      const canvasEl = renderer.domElement;
      if (stageEl && modelRootRef.current) {
        const stageRect = stageEl.getBoundingClientRect();
        const canvasRect = canvasEl.getBoundingClientRect();

        if (stageRect.width > 0 && stageRect.height > 0) {
          partsMapRef.current.forEach((part, partKey) => {
            const wire = wireRefs.current[partKey];
            const dot = dotRefs.current[partKey];
            const pulseRing = pulseRingRefs.current[partKey];
            const card = cardRefs.current[partKey];
            if (!wire || !dot || !card) return;

            const worldPos = modelRootRef.current!.localToWorld(
              part.localCenter.clone()
            );
            const ndc = worldPos.project(camera);

            const anchorX =
              canvasRect.left -
              stageRect.left +
              ((ndc.x + 1) * 0.5) * canvasRect.width;
            const anchorY =
              canvasRect.top -
              stageRect.top +
              ((1 - ndc.y) * 0.5) * canvasRect.height;

            const cardRect = card.getBoundingClientRect();
            const side = sideOfPart(partKey);

            let startX = cardRect.left - stageRect.left + cardRect.width * 0.5;
            let startY = cardRect.top - stageRect.top + cardRect.height * 0.5;

            if (side === 'Left' || side === 'TopLeft') {
              startX = cardRect.right - stageRect.left + 4;
            } else if (side === 'Right' || side === 'TopRight') {
              startX = cardRect.left - stageRect.left - 4;
            } else if (side === 'Top') {
              startY = cardRect.bottom - stageRect.top + 4;
            } else if (side === 'Bottom') {
              startY = cardRect.top - stageRect.top - 4;
            }

            wire.setAttribute('x1', startX.toFixed(1));
            wire.setAttribute('y1', startY.toFixed(1));
            wire.setAttribute('x2', anchorX.toFixed(1));
            wire.setAttribute('y2', anchorY.toFixed(1));

            dot.setAttribute('cx', anchorX.toFixed(1));
            dot.setAttribute('cy', anchorY.toFixed(1));

            if (pulseRing) {
              pulseRing.setAttribute('cx', anchorX.toFixed(1));
              pulseRing.setAttribute('cy', anchorY.toFixed(1));
            }
          });
        }
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, [gamepadType]);

  const resetOrbit = () => {
    orbitRef.current.x = 0;
    orbitRef.current.y = 0;
    orbitRef.current.lastTime = -100;
  };

  const renderCalloutCard = (c: CalloutGroup) => {
    const isFocusedPart = focusedPart === c.part;
    const isHoveredPart = hoveredPart === c.part;
    const hasFocusedEntry =
      focusedEntry != null && c.lines.some((l) => l.entry?.key === focusedEntry.key);
    const isDimmed = focusedEntry != null && !hasFocusedEntry && !isHoveredPart;
    const endsTowardPad = c.side === 'Left' || c.side === 'TopLeft';

    return (
      <div
        key={c.part}
        ref={(el) => {
          cardRefs.current[c.part] = el;
        }}
        className={`callout-card callout-side-${c.side.toLowerCase()} ${
          isFocusedPart || hasFocusedEntry ? 'callout-focused' : ''
        } ${isHoveredPart ? 'callout-hovered' : ''} ${
          isDimmed ? 'callout-dimmed' : ''
        }`}
        onMouseEnter={() => {
          hoveredPartRef.current = c.part;
          setHoveredPart(c.part);
        }}
        onMouseLeave={() => {
          if (hoveredPartRef.current === c.part) {
            hoveredPartRef.current = null;
            setHoveredPart(null);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (listeningEntry) {
            onPartClicked(c.part, partToDefaultBindingPath(c.part));
            return;
          }
          const firstWithEntry = c.lines.find((l) => l.entry != null);
          if (firstWithEntry?.entry) {
            onSelectEntryFromCallout(firstWithEntry.entry, false);
          } else {
            onPartClicked(c.part, partToDefaultBindingPath(c.part));
          }
        }}
      >
        {c.lines.map((line, idx) => {
          const isLineActive =
            focusedEntry != null && line.entry?.key === focusedEntry.key;
          return (
            <div
              key={`${line.controlPath}_${line.text}_${idx}`}
              className={`callout-line ${
                endsTowardPad ? 'callout-line-right' : 'callout-line-left'
              } ${isLineActive ? 'callout-line-active' : ''}`}
              onClick={(e) => {
                if (line.entry && !listeningEntry) {
                  e.stopPropagation();
                  onSelectEntryFromCallout(line.entry, false);
                }
              }}
              onDoubleClick={(e) => {
                if (line.entry) {
                  e.stopPropagation();
                  onSelectEntryFromCallout(line.entry, true);
                }
              }}
            >
              {endsTowardPad ? (
                <>
                  <span className="callout-text">
                    {line.text}
                    {line.note && <small className="callout-note"> ({line.note})</small>}
                  </span>
                  <ControlGlyph
                    path={line.controlPath}
                    gamepadType={gamepadType}
                    size="sm"
                  />
                </>
              ) : (
                <>
                  <ControlGlyph
                    path={line.controlPath}
                    gamepadType={gamepadType}
                    size="sm"
                  />
                  <span className="callout-text">
                    {line.text}
                    {line.note && <small className="callout-note"> ({line.note})</small>}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="stage-container" ref={containerRef}>
      {/* Top Toolbar: Controller Switcher + Context Layer Switcher */}
      <div className="stage-toolbar">
        <div className="stage-toolbar-group">
          <span className="stage-toolbar-label">
            <Gamepad2 size={14} />
            {lang === 'ru' ? 'Модель 3D:' : '3D Model:'}
          </span>
          <div className="segmented-control">
            <button
              type="button"
              className={`seg-btn ${gamepadType === 'PlayStation' ? 'active' : ''}`}
              onClick={() => onGamepadTypeChange('PlayStation')}
            >
              DualSense (PS5)
            </button>
            <button
              type="button"
              className={`seg-btn ${gamepadType === 'Xbox' ? 'active' : ''}`}
              onClick={() => onGamepadTypeChange('Xbox')}
            >
              Xbox Series
            </button>
          </div>
        </div>

        <div className="stage-toolbar-group">
          <span className="stage-toolbar-label">
            <Eye size={14} />
            {lang === 'ru' ? 'Слой сносок:' : 'Callout Layer:'}
          </span>
          <div className="context-pills">
            {CONTEXT_LABELS.map((ctx) => (
              <button
                key={ctx.id}
                type="button"
                className={`ctx-pill ${activeContext === ctx.id ? 'active' : ''}`}
                onClick={() => onContextChange(ctx.id)}
              >
                {lang === 'ru' ? ctx.ru : ctx.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listening / Interactive Hint Banner */}
      {listeningEntry ? (
        <div className="stage-listening-banner">
          <Sparkles size={16} className="spin-pulse" />
          <span>
            {lang === 'ru' ? (
              <>
                Назначаем <strong>«{listeningEntry.labelRu}»</strong>: кликните прямо по{' '}
                <strong>кнопке на 3D-геймпаде</strong>, нажмите кнопку на подключённом геймпаде или выберите из панели
              </>
            ) : (
              <>
                Binding <strong>“{listeningEntry.labelEn}”</strong>: click any{' '}
                <strong>button directly on the 3D controller</strong> or press it on your physical gamepad
              </>
            )}
          </span>
        </div>
      ) : (
        <div className="stage-subtle-hint">
          <span>
            {lang === 'ru'
              ? 'Тяните мышью для вращения 3D-модели • Кликните по любой кнопке на 3D-геймпаде, чтобы назначить на неё действие'
              : 'Drag to orbit 3D model • Click any button on the 3D controller to inspect or bind actions'}
          </span>
          {hoveredPart && (
            <span className="hovered-part-pill">
              {formatReadableBinding(partToDefaultBindingPath(hoveredPart), gamepadType)} (
              <code>{hoveredPart}</code>)
            </span>
          )}
        </div>
      )}

      {/* SVG Overlay for Leader Lines & Anchor Dots */}
      <svg className="callout-svg-overlay" aria-hidden="true">
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(195, 145, 255, 0.55)" />
            <stop offset="100%" stopColor="rgba(195, 145, 255, 0.92)" />
          </linearGradient>
          <linearGradient id="wireGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D896FF" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        {calloutGroups.map((c) => {
          const isFocusedPart = focusedPart === c.part;
          const isHoveredPart = hoveredPart === c.part;
          const hasFocusedEntry =
            focusedEntry != null && c.lines.some((l) => l.entry?.key === focusedEntry.key);
          const isDimmed = focusedEntry != null && !hasFocusedEntry && !isHoveredPart;
          const active = isFocusedPart || hasFocusedEntry || isHoveredPart;

          return (
            <g
              key={c.part}
              className={`callout-wire-group ${active ? 'wire-active' : ''} ${
                isDimmed ? 'wire-dimmed' : ''
              }`}
            >
              <line
                ref={(el) => {
                  wireRefs.current[c.part] = el;
                }}
                className="callout-wire-line"
                stroke={active ? 'url(#wireGradActive)' : 'url(#wireGrad)'}
                strokeWidth={active ? 2.2 : 1.4}
              />
              {active && (
                <circle
                  ref={(el) => {
                    pulseRingRefs.current[c.part] = el;
                  }}
                  r={8}
                  className="callout-anchor-pulse"
                />
              )}
              <circle
                ref={(el) => {
                  dotRefs.current[c.part] = el;
                }}
                r={active ? 4.2 : 3.2}
                className="callout-anchor-dot"
              />
            </g>
          );
        })}
      </svg>

      {/* 3D WebGL Canvas */}
      <div className="stage-canvas-wrap" ref={canvasWrapRef} />

      {loadingModel && (
        <div className="stage-loading-overlay">
          <div className="stage-spinner" />
          <span>
            {lang === 'ru'
              ? `Загрузка 3D-модели ${gamepadType === 'PlayStation' ? 'DualSense' : 'Xbox'}...`
              : `Loading ${gamepadType} 3D model...`}
          </span>
        </div>
      )}

      {/* Callouts Layout Grid around the Pad Silhouette */}
      <div className="callout-layout-grid">
        <div className="callout-zone callout-zone-top-left">
          {calloutsBySide.TopLeft.map(renderCalloutCard)}
        </div>
        <div className="callout-zone callout-zone-top-center">
          {calloutsBySide.Top.map(renderCalloutCard)}
        </div>
        <div className="callout-zone callout-zone-top-right">
          {calloutsBySide.TopRight.map(renderCalloutCard)}
        </div>
        <div className="callout-zone callout-zone-left">
          {calloutsBySide.Left.map(renderCalloutCard)}
        </div>
        <div className="callout-zone callout-zone-right">
          {calloutsBySide.Right.map(renderCalloutCard)}
        </div>
        <div className="callout-zone callout-zone-bottom">
          {calloutsBySide.Bottom.map(renderCalloutCard)}
        </div>
      </div>

      {/* Bottom Stage Status & Camera Controls */}
      <div className="stage-footer">
        <div className="stage-gamepad-status">
          <span className={`status-dot ${connectedPadName ? 'online' : 'offline'}`} />
          <span>
            {connectedPadName
              ? lang === 'ru'
                ? `Подключён: ${connectedPadName.split('(')[0].trim()}`
                : `Connected: ${connectedPadName.split('(')[0].trim()}`
              : lang === 'ru'
              ? 'Физический геймпад не подключён (доступен клик по 3D-модели и список кнопок)'
              : 'No physical gamepad detected (click 3D buttons or use selector)'}
          </span>
        </div>

        <div className="stage-camera-actions">
          <button
            type="button"
            className={`stage-mini-btn ${lockOrbit ? 'active' : ''}`}
            onClick={() => setLockOrbit((v) => !v)}
            title={
              lang === 'ru'
                ? 'Удерживать свободный поворот камеры после вращения мышью'
                : 'Keep manual orbit angle after dragging'
            }
          >
            {lockOrbit ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{lang === 'ru' ? 'Фикс. ракурс' : 'Hold Orbit'}</span>
          </button>
          <button
            type="button"
            className="stage-mini-btn"
            onClick={resetOrbit}
            title={lang === 'ru' ? 'Сбросить поворот камеры' : 'Reset camera orbit'}
          >
            <RotateCcw size={13} />
            <span>{lang === 'ru' ? 'Центрировать' : 'Reset View'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
