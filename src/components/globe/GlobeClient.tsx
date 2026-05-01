'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 2;
const GOLD  = '#D4AF37';
const GREEN = '#00C853';
const BLACK = '#0A0A0A';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe/example/img/earth-night.jpg';

// ─── Types ────────────────────────────────────────────────────────────────────
type LayerKey = 'conflict' | 'centralBanks' | 'economicEvents' | 'goldRegions';

interface MarkerData {
  name: string;
  lat: number;
  lon: number;
  desc: string;
  impact: { xauusd: string; eurusd: string; gbpusd: string };
  layer: LayerKey;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: MarkerData | null;
}

// ─── Layer config ─────────────────────────────────────────────────────────────
const LAYER_CONFIG: Record<LayerKey, { label: string; color: string; hexColor: number; icon: string }> = {
  conflict:       { label: 'Conflict Zones',         color: '#ff4444', hexColor: 0xff4444, icon: '⚠' },
  centralBanks:   { label: 'Central Banks',           color: GREEN,     hexColor: 0x00C853, icon: '🏦' },
  economicEvents: { label: 'Economic Events',         color: '#4db8ff', hexColor: 0x4db8ff, icon: '📊' },
  goldRegions:    { label: 'Gold Producing Regions',  color: GOLD,      hexColor: 0xD4AF37, icon: '⛏' },
};

// ─── Marker data ──────────────────────────────────────────────────────────────
const MARKERS: MarkerData[] = [
  // Conflict
  { layer: 'conflict', name: 'Middle East',    lat: 32,   lon: 35,    desc: 'Active conflicts across Gaza, Lebanon and regional theaters',    impact: { xauusd: '+2.4%', eurusd: '-0.3%', gbpusd: '-0.2%' } },
  { layer: 'conflict', name: 'Eastern Europe', lat: 49,   lon: 32,    desc: 'Russia-Ukraine war — energy and grain supply disruption',        impact: { xauusd: '+1.8%', eurusd: '-1.2%', gbpusd: '-0.8%' } },
  { layer: 'conflict', name: 'Sudan',          lat: 15,   lon: 30,    desc: 'Civil war disrupting African supply chains and gold mining',      impact: { xauusd: '+0.6%', eurusd: '-0.1%', gbpusd: '-0.1%' } },
  { layer: 'conflict', name: 'Yemen',          lat: 15,   lon: 48,    desc: 'Houthi attacks on Red Sea shipping lanes',                       impact: { xauusd: '+1.2%', eurusd: '-0.2%', gbpusd: '-0.3%' } },
  { layer: 'conflict', name: 'West Africa',    lat: 12,   lon: -2,    desc: 'Sahel coup belt — political instability region',                 impact: { xauusd: '+0.4%', eurusd:  '0.0%', gbpusd:  '0.0%' } },
  // Central Banks
  { layer: 'centralBanks', name: 'Federal Reserve', lat: 38.9, lon: -77.0,  desc: 'FOMC rate decisions — primary USD monetary policy anchor',   impact: { xauusd: '±2.0%', eurusd: '±1.5%', gbpusd: '±1.2%' } },
  { layer: 'centralBanks', name: 'Bank of England',  lat: 51.5, lon: -0.1,  desc: 'MPC rate decisions — GBP monetary policy',                  impact: { xauusd: '±0.8%', eurusd: '±0.5%', gbpusd: '±1.8%' } },
  { layer: 'centralBanks', name: 'ECB Frankfurt',    lat: 50.1, lon:  8.7,  desc: 'Governing council decisions — EUR monetary policy',         impact: { xauusd: '±1.0%', eurusd: '±2.0%', gbpusd: '±0.6%' } },
  { layer: 'centralBanks', name: 'PBOC Beijing',     lat: 39.9, lon: 116.4, desc: 'CNY policy and major driver of global gold demand',          impact: { xauusd: '±1.5%', eurusd: '±0.3%', gbpusd: '±0.2%' } },
  { layer: 'centralBanks', name: 'Bank of Japan',    lat: 35.7, lon: 139.7, desc: 'YCC policy — global carry trade and risk dynamics',          impact: { xauusd: '±0.9%', eurusd: '±0.4%', gbpusd: '±0.3%' } },
  // Economic Events
  { layer: 'economicEvents', name: 'US NFP',           lat: 40.7, lon: -74.0, desc: 'Non-Farm Payrolls — largest USD and gold catalyst',              impact: { xauusd: '±1.8%', eurusd: '±1.2%', gbpusd: '±1.0%' } },
  { layer: 'economicEvents', name: 'ECB Rate Decision', lat: 50.1, lon:  8.9, desc: 'European Central Bank policy statement and press conference',    impact: { xauusd: '±0.9%', eurusd: '±2.2%', gbpusd: '±0.5%' } },
  { layer: 'economicEvents', name: 'UK CPI',            lat: 51.4, lon: -0.2, desc: 'UK inflation data — drives BOE rate expectations',              impact: { xauusd: '±0.5%', eurusd: '±0.3%', gbpusd: '±1.6%' } },
  { layer: 'economicEvents', name: 'US Core PCE',       lat: 38.8, lon: -77.3, desc: "Fed's preferred inflation gauge — key for rate path",           impact: { xauusd: '±1.5%', eurusd: '±1.0%', gbpusd: '±0.8%' } },
  // Gold Regions
  { layer: 'goldRegions', name: 'South Africa',      lat: -29.0, lon:  25.0, desc: "World's historically largest gold producer — Witwatersrand belt", impact: { xauusd: '+0.5%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Australia',         lat: -25.0, lon: 133.0, desc: '2nd largest gold reserves — Kalgoorlie and Pilbara regions',      impact: { xauusd: '+0.8%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Ghana',             lat:   7.9, lon:  -1.0, desc: "Africa's top current gold producer",                             impact: { xauusd: '+0.3%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Russia',            lat:  62.0, lon:  94.0, desc: 'Major gold producer — sanctions impacting supply routes',         impact: { xauusd: '+1.2%', eurusd: '-0.2%', gbpusd: '-0.1%' } },
  { layer: 'goldRegions', name: 'Brazil',            lat: -10.0, lon: -55.0, desc: 'Growing Amazon basin gold production region',                     impact: { xauusd: '+0.4%', eurusd:  '0.0%', gbpusd:  '0.0%' } },
  { layer: 'goldRegions', name: 'Papua New Guinea',  lat:  -6.0, lon: 147.0, desc: 'Pacific gold and copper mining hub — Ok Tedi, Lihir',             impact: { xauusd: '+0.3%', eurusd:  '0.0%', gbpusd:  '0.0%' } },
];

// ─── Ticker ───────────────────────────────────────────────────────────────────
const TICKER = [
  { pair: 'XAU/USD', price: '3,324.00', pct: '+0.37%', up: true  },
  { pair: 'EUR/USD', price: '1.1342',   pct: '+0.16%', up: true  },
  { pair: 'GBP/USD', price: '1.3421',   pct: '-0.17%', up: false },
  { pair: 'USD/JPY', price: '142.34',   pct: '-0.39%', up: false },
  { pair: 'DXY',     price: '104.20',   pct: '-0.12%', up: false },
  { pair: 'AUD/USD', price: '0.6582',   pct: '+0.18%', up: true  },
  { pair: 'USD/CHF', price: '0.8821',   pct: '+0.39%', up: true  },
  { pair: 'USD/CAD', price: '1.3845',   pct: '-0.15%', up: false },
  { pair: 'NZD/USD', price: '0.6021',   pct: '+0.13%', up: true  },
  { pair: 'XAG/USD', price: '32.45',    pct: '+0.71%', up: true  },
  { pair: 'BRENT',   price: '82.14',    pct: '-0.54%', up: false },
  { pair: 'WTI',     price: '79.80',    pct: '-0.48%', up: false },
];

// ─── Utility ──────────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

// lat/lon → percent position for 2D flat map
function latLonTo2D(lat: number, lon: number) {
  return {
    left: `${((lon + 180) / 360) * 100}%`,
    top:  `${((90 - lat) / 180) * 100}%`,
  };
}

// ─── 2D Flat Map View ─────────────────────────────────────────────────────────
function FlatMapView({
  activeLayers,
  onMarkerHover,
  tooltip,
}: {
  activeLayers: Record<LayerKey, boolean>;
  onMarkerHover: (data: MarkerData | null, x: number, y: number) => void;
  tooltip: TooltipState;
}) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#03060f' }}>
      {/* Night earth texture as flat map */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={EARTH_NIGHT_URL}
        alt="Earth night map"
        style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', opacity: 0.85 }}
        draggable={false}
      />
      {/* Markers overlay */}
      {MARKERS.filter(m => activeLayers[m.layer]).map((m, i) => {
        const pos = latLonTo2D(m.lat, m.lon);
        const cfg = LAYER_CONFIG[m.layer];
        return (
          <div
            key={i}
            onMouseEnter={e => onMarkerHover(m, e.clientX, e.clientY)}
            onMouseLeave={() => onMarkerHover(null, 0, 0)}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              transform: 'translate(-50%, -50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: cfg.color,
              boxShadow: `0 0 8px ${cfg.color}, 0 0 16px ${cfg.color}80`,
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `1px solid ${cfg.color}`,
              opacity: 0.5,
              animation: 'pulse-ring 2s ease-out infinite',
            }} />
          </div>
        );
      })}
      {/* Grid overlay */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Latitude lines */}
        {[-60,-30,0,30,60].map(lat => (
          <line key={lat} x1="0" y1={`${((90 - lat) / 180) * 100}%`} x2="100%" y2={`${((90 - lat) / 180) * 100}%`}
            stroke={lat === 0 ? '#D4AF3740' : '#ffffff10'} strokeWidth={lat === 0 ? 1 : 0.5} />
        ))}
        {/* Longitude lines */}
        {[-120,-60,0,60,120].map(lon => (
          <line key={lon} x1={`${((lon + 180) / 360) * 100}%`} y1="0" x2={`${((lon + 180) / 360) * 100}%`} y2="100%"
            stroke={lon === 0 ? '#D4AF3740' : '#ffffff10'} strokeWidth={lon === 0 ? 1 : 0.5} />
        ))}
      </svg>
      {/* 2D label */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 9, color: '#333', letterSpacing: 1 }}>
        EQUIRECTANGULAR PROJECTION
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobeClient() {
  const mountRef     = useRef<HTMLDivElement>(null);
  const rootRef      = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef  = useRef<OrbitControls | null>(null);
  const frameRef     = useRef<number>(0);
  const groupRefs    = useRef<Partial<Record<LayerKey, THREE.Group>>>({});
  const markerMeshes = useRef<{ mesh: THREE.Mesh; data: MarkerData; ring: THREE.Mesh }[]>([]);

  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({
    conflict: true, centralBanks: true, economicEvents: true, goldRegions: true,
  });
  const [tooltip, setTooltip]         = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const [utcTime, setUtcTime]         = useState('');
  const [is3D, setIs3D]               = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UTC clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hh  = now.getUTCHours().toString().padStart(2, '0');
      const mm  = now.getUTCMinutes().toString().padStart(2, '0');
      const ss  = now.getUTCSeconds().toString().padStart(2, '0');
      setUtcTime(`${hh}:${mm}:${ss} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!rootRef.current) return;
    if (!document.fullscreenElement) {
      rootRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Three.js init — only once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.05;
    controls.rotateSpeed    = 0.5;
    controls.zoomSpeed      = 0.8;
    controls.minDistance    = 2.8;
    controls.maxDistance    = 10;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const sun = new THREE.DirectionalLight(0xfff0e0, 0.9);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // ── Stars (Three.js BufferGeometry points) ───────────────────────────────
    const starCount = 2000;
    const starPos: number[] = [];
    for (let i = 0; i < starCount; i++) {
      // Distribute on a large sphere shell
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 80 + Math.random() * 40;
      starPos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Earth globe (NASA night lights texture) ───────────────────────────────
    const loader  = new THREE.TextureLoader();
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

    // Start with a placeholder dark material, swap once texture loads
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x030d1a,
      specular: new THREE.Color(0x112244),
      shininess: 15,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    loader.load(
      EARTH_NIGHT_URL,
      (tex) => { globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true; },
      undefined,
      () => { /* texture failed — keep dark fallback */ },
    );

    // ── Atmosphere — Fresnel rim-only glow (ShaderMaterial, FrontSide) ──────
    // Renders transparent at the globe face, bright only at the silhouette edge.
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.20, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // dot = 1 at front center, 0 at rim → glow only at rim
          float fresnel = 1.0 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
          float alpha   = pow(max(fresnel, 0.0), 4.2) * 0.88;
          gl_FragColor  = vec4(0.22, 0.52, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      side:        THREE.FrontSide,
      blending:    THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    atmosMesh.renderOrder = 1;
    scene.add(atmosMesh);

    // ── Markers ───────────────────────────────────────────────────────────────
    markerMeshes.current = [];
    const layerGroups: Partial<Record<LayerKey, THREE.Group>> = {};
    (Object.keys(LAYER_CONFIG) as LayerKey[]).forEach(key => {
      const g = new THREE.Group();
      g.name = key;
      scene.add(g);
      layerGroups[key] = g;
    });
    groupRefs.current = layerGroups;

    MARKERS.forEach(marker => {
      const g   = layerGroups[marker.layer]!;
      const cfg = LAYER_CONFIG[marker.layer];
      const pos = latLonToVec3(marker.lat, marker.lon, GLOBE_RADIUS + 0.04);

      // Outward normal from globe centre — used to orient the ring tangent to surface
      const outward = pos.clone().normalize();

      // Core dot — 2.5× bigger than before
      const dotMat = new THREE.MeshPhongMaterial({
        color: cfg.hexColor, emissive: cfg.hexColor, emissiveIntensity: 1.2,
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 16), dotMat);
      dot.position.copy(pos);
      g.add(dot);

      // Pulse ring — align ring plane tangent to sphere (normal = outward radial)
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.hexColor, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.20, 32), ringMat);
      ring.position.copy(pos);
      // Rotate so ring's +Z (its face normal) matches outward radial direction
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
      g.add(ring);

      (dot as any).__markerData = marker;
      markerMeshes.current.push({ mesh: dot, data: marker, ring });
    });

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Raycaster ─────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();
    let hovered: typeof markerMeshes.current[0] | null = null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes.current.map(m => m.mesh));
      if (hits.length > 0) {
        const entry = markerMeshes.current.find(m => m.mesh === hits[0].object);
        if (entry && entry !== hovered) {
          if (hovered) (hovered.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0;
          hovered = entry;
          controls.autoRotate = false;
          (entry.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 2.5;
          const sp = entry.mesh.position.clone().project(camera);
          const sx = ((sp.x + 1) / 2) * el.clientWidth;
          const sy = ((-sp.y + 1) / 2) * el.clientHeight;
          setTooltip({ visible: true, x: sx, y: sy, data: entry.data });
        }
      } else {
        if (hovered) {
          (hovered.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0;
          hovered = null;
        }
        controls.autoRotate = true;
        setTooltip(t => ({ ...t, visible: false }));
      }
    };
    el.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ────────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      controls.update();
      markerMeshes.current.forEach(({ ring }, i) => {
        const phase = t * 1.6 + i * 1.1;
        // ring expands from 1→1.6 then snaps back (sawtooth-ish feel via sin)
        const s = 1 + 0.55 * ((Math.sin(phase) + 1) / 2);
        ring.scale.setScalar(s);
        // fade out as it expands
        (ring.material as THREE.MeshBasicMaterial).opacity =
          0.7 * (1 - (Math.sin(phase) + 1) / 2);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('mousemove', onMouseMove);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  // Sync layer visibility
  useEffect(() => {
    (Object.keys(activeLayers) as LayerKey[]).forEach(key => {
      const g = groupRefs.current[key];
      if (g) g.visible = activeLayers[key];
    });
  }, [activeLayers]);

  // Sync autoRotate when mode switches back to 3D
  useEffect(() => {
    if (is3D && controlsRef.current) controlsRef.current.autoRotate = true;
  }, [is3D]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleMarkerHover2D = useCallback((data: MarkerData | null, x: number, y: number) => {
    if (data) setTooltip({ visible: true, x, y, data });
    else setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const layerCounts: Record<LayerKey, number> = {
    conflict: 5, centralBanks: 5, economicEvents: 4, goldRegions: 6,
  };

  return (
    <div
      ref={rootRef}
      style={{ width: '100vw', height: '100vh', background: BLACK, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif", color: '#e8e8e8' }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 48, background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, zIndex: 20 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${GOLD}, #a88420)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: BLACK, letterSpacing: -0.5 }}>T</div>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>TRADEX</span>
        </div>
        <div style={{ width: 1, height: 24, background: '#222' }} />
        <span style={{ fontSize: 11, color: '#666', letterSpacing: 1.5, textTransform: 'uppercase' }}>Market Intelligence Globe</span>

        <div style={{ flex: 1 }} />

        {/* Pair badges */}
        {[
          { pair: 'XAU/USD', price: '3,324.80', up: true  },
          { pair: 'EUR/USD', price: '1.1342',   up: true  },
          { pair: 'GBP/USD', price: '1.3421',   up: false },
        ].map(b => (
          <div key={b.pair} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#141414', border: '1px solid #222', borderRadius: 4, padding: '3px 8px' }}>
            <span style={{ fontSize: 10, color: '#777', fontFamily: 'IBM Plex Mono, monospace' }}>{b.pair}</span>
            <span style={{ fontSize: 11, color: b.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{b.price}</span>
            <span style={{ fontSize: 8, color: b.up ? GREEN : '#ff4444' }}>{b.up ? '▲' : '▼'}</span>
          </div>
        ))}

        <div style={{ width: 1, height: 24, background: '#222' }} />

        {/* Geo Risk */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, color: '#666', letterSpacing: 1, textTransform: 'uppercase' }}>Geo Risk</span>
          <div style={{ width: 72, height: 5, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '68%', height: '100%', background: `linear-gradient(90deg, ${GOLD}, #e05a00)`, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: GOLD, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>68%</span>
        </div>

        <div style={{ width: 1, height: 24, background: '#222' }} />
        <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'IBM Plex Mono, monospace', minWidth: 88 }}>{utcTime}</span>

        <div style={{ width: 1, height: 24, background: '#222' }} />

        {/* 2D / 3D toggle */}
        <div style={{ display: 'flex', background: '#141414', border: '1px solid #222', borderRadius: 5, overflow: 'hidden' }}>
          {(['2D', '3D'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setIs3D(mode === '3D')}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1, border: 'none', cursor: 'pointer', background: (mode === '3D') === is3D ? GOLD : 'transparent', color: (mode === '3D') === is3D ? BLACK : '#555', transition: 'all 0.15s' }}
            >{mode}</button>
          ))}
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={{ width: 30, height: 30, background: '#141414', border: '1px solid #222', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13, transition: 'all 0.15s' }}
        >
          {isFullscreen ? '⊠' : '⛶'}
        </button>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Sidebar */}
        <div style={{ width: 236, background: '#0d0d0d', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1e1e1e' }}>
            <span style={{ fontSize: 10, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>Data Layers</span>
          </div>
          <div style={{ flex: 1, padding: '6px 0' }}>
            {(Object.keys(LAYER_CONFIG) as LayerKey[]).map(key => {
              const cfg    = LAYER_CONFIG[key];
              const active = activeLayers[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', background: active ? cfg.color + '0a' : 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderLeft: `3px solid ${active ? cfg.color : 'transparent'}`, transition: 'all 0.15s' }}
                >
                  {/* Custom checkbox */}
                  <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${active ? cfg.color : '#3a3a3a'}`, background: active ? cfg.color + '25' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                    {active && <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />}
                  </div>
                  <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 12, color: active ? '#ececec' : '#666', flex: 1, lineHeight: 1.35, fontWeight: active ? 500 : 400 }}>{cfg.label}</span>
                  <span style={{ fontSize: 10, color: active ? cfg.color : '#3a3a3a', fontFamily: 'IBM Plex Mono, monospace', background: active ? cfg.color + '18' : '#141414', padding: '2px 6px', borderRadius: 4, minWidth: 22, textAlign: 'center' }}>{layerCounts[key]}</span>
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Legend</div>
            {(Object.keys(LAYER_CONFIG) as LayerKey[]).map(key => {
              const cfg = LAYER_CONFIG[key];
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 7px ${cfg.color}, 0 0 14px ${cfg.color}60`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#666' }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Globe / Map area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Three.js mount — hidden in 2D mode but kept alive */}
          <div
            ref={mountRef}
            style={{ position: 'absolute', inset: 0, display: is3D ? 'block' : 'none' }}
          />

          {/* 2D flat map */}
          {!is3D && (
            <FlatMapView
              activeLayers={activeLayers}
              onMarkerHover={handleMarkerHover2D}
              tooltip={tooltip}
            />
          )}

          {/* Shared Tooltip */}
          {tooltip.visible && tooltip.data && (() => {
            const td   = tooltip.data!;
            const lcfg = LAYER_CONFIG[td.layer];
            const containerW = mountRef.current?.clientWidth ?? 900;
            const containerH = mountRef.current?.clientHeight ?? 600;
            return (
              <div style={{
                position: 'absolute',
                left: Math.min(tooltip.x + 14, containerW - 244),
                top:  Math.max(tooltip.y - 70, 8),
                width: 232,
                background: '#0f0f0f',
                border: `1px solid ${lcfg.color}30`,
                borderLeft: `3px solid ${lcfg.color}`,
                borderRadius: 6,
                padding: '10px 12px',
                pointerEvents: 'none',
                zIndex: 200,
                boxShadow: `0 12px 40px rgba(0,0,0,0.9), 0 0 24px ${lcfg.color}12`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: lcfg.color, boxShadow: `0 0 6px ${lcfg.color}` }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{td.name}</span>
                </div>
                <div style={{ fontSize: 9, color: lcfg.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{lcfg.label}</div>
                <div style={{ fontSize: 10, color: '#999', lineHeight: 1.55, marginBottom: 8 }}>{td.desc}</div>
                <div style={{ borderTop: '1px solid #1c1c1c', paddingTop: 7 }}>
                  <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, marginBottom: 5 }}>MARKET IMPACT</div>
                  {(['xauusd', 'eurusd', 'gbpusd'] as const).map(p => (
                    <div key={p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {p === 'xauusd' ? 'XAU/USD' : p === 'eurusd' ? 'EUR/USD' : 'GBP/USD'}
                      </span>
                      <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: td.impact[p].startsWith('+') ? GREEN : td.impact[p].startsWith('-') ? '#ff4444' : GOLD }}>
                        {td.impact[p]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 3D hint */}
          {is3D && (
            <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 9, color: '#2a2a2a', letterSpacing: 1, pointerEvents: 'none' }}>
              DRAG TO ROTATE · SCROLL TO ZOOM
            </div>
          )}
        </div>
      </div>

      {/* ── Ticker tape ─────────────────────────────────────────────────────── */}
      <div style={{ height: 36, background: '#080808', borderTop: '1px solid #1e1e1e', overflow: 'hidden', display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
        {/* Left fade */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(90deg, #080808, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        {/* Right fade */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(-90deg, #080808, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', animation: 'ticker-scroll 55s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER, ...TICKER].map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 22px' }}>
              <span style={{ fontSize: 11, color: '#999', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.5, fontWeight: 500 }}>{item.pair}</span>
              <span style={{ fontSize: 12, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.price}</span>
              <span style={{ fontSize: 10, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace' }}>{item.pct}</span>
              <span style={{ fontSize: 9, color: item.up ? GREEN : '#ff4444' }}>{item.up ? '▲' : '▼'}</span>
              <span style={{ fontSize: 10, color: '#2a2a2a', marginLeft: 4 }}>|</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
