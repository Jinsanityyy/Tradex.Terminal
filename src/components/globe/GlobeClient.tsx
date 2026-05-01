'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const GLOBE_RADIUS = 2;
const GOLD = '#D4AF37';
const GREEN = '#00C853';
const BLACK = '#0A0A0A';

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
  conflict:       { label: 'Conflict Zones',          color: '#ff4444', hexColor: 0xff4444, icon: '⚠' },
  centralBanks:   { label: 'Central Banks',            color: GREEN,     hexColor: 0x00C853, icon: '🏦' },
  economicEvents: { label: 'Economic Events',          color: '#4db8ff', hexColor: 0x4db8ff, icon: '📊' },
  goldRegions:    { label: 'Gold Producing Regions',   color: GOLD,      hexColor: 0xD4AF37, icon: '⛏' },
};

// ─── Marker data ──────────────────────────────────────────────────────────────
const RAW_MARKERS: Omit<MarkerData, 'layer'>[] & { layer: LayerKey }[] = [
  // Conflict
  { layer: 'conflict', name: 'Middle East', lat: 32, lon: 35, desc: 'Active conflicts across Gaza, Lebanon and regional theaters', impact: { xauusd: '+2.4%', eurusd: '-0.3%', gbpusd: '-0.2%' } },
  { layer: 'conflict', name: 'Eastern Europe', lat: 49, lon: 32, desc: 'Russia-Ukraine war — energy and grain supply disruption', impact: { xauusd: '+1.8%', eurusd: '-1.2%', gbpusd: '-0.8%' } },
  { layer: 'conflict', name: 'Sudan', lat: 15, lon: 30, desc: 'Civil war disrupting African supply chains and gold mining', impact: { xauusd: '+0.6%', eurusd: '-0.1%', gbpusd: '-0.1%' } },
  { layer: 'conflict', name: 'Yemen', lat: 15, lon: 48, desc: 'Houthi attacks on Red Sea shipping lanes', impact: { xauusd: '+1.2%', eurusd: '-0.2%', gbpusd: '-0.3%' } },
  { layer: 'conflict', name: 'West Africa', lat: 12, lon: -2, desc: 'Sahel coup belt — political instability region', impact: { xauusd: '+0.4%', eurusd: '0.0%', gbpusd: '0.0%' } },
  // Central Banks
  { layer: 'centralBanks', name: 'Federal Reserve', lat: 38.9, lon: -77.0, desc: 'FOMC rate decisions — primary USD monetary policy anchor', impact: { xauusd: '±2.0%', eurusd: '±1.5%', gbpusd: '±1.2%' } },
  { layer: 'centralBanks', name: 'Bank of England', lat: 51.5, lon: -0.1, desc: 'MPC rate decisions — GBP monetary policy', impact: { xauusd: '±0.8%', eurusd: '±0.5%', gbpusd: '±1.8%' } },
  { layer: 'centralBanks', name: 'ECB Frankfurt', lat: 50.1, lon: 8.7, desc: 'Governing council decisions — EUR monetary policy', impact: { xauusd: '±1.0%', eurusd: '±2.0%', gbpusd: '±0.6%' } },
  { layer: 'centralBanks', name: 'PBOC Beijing', lat: 39.9, lon: 116.4, desc: 'CNY policy and major driver of global gold demand', impact: { xauusd: '±1.5%', eurusd: '±0.3%', gbpusd: '±0.2%' } },
  { layer: 'centralBanks', name: 'Bank of Japan', lat: 35.7, lon: 139.7, desc: 'YCC policy — global carry trade and risk dynamics', impact: { xauusd: '±0.9%', eurusd: '±0.4%', gbpusd: '±0.3%' } },
  // Economic Events
  { layer: 'economicEvents', name: 'US NFP', lat: 40.7, lon: -74.0, desc: 'Non-Farm Payrolls — largest USD and gold catalyst', impact: { xauusd: '±1.8%', eurusd: '±1.2%', gbpusd: '±1.0%' } },
  { layer: 'economicEvents', name: 'ECB Rate Decision', lat: 50.1, lon: 8.9, desc: 'European Central Bank policy statement and press conference', impact: { xauusd: '±0.9%', eurusd: '±2.2%', gbpusd: '±0.5%' } },
  { layer: 'economicEvents', name: 'UK CPI', lat: 51.4, lon: -0.2, desc: 'UK inflation data — drives BOE rate expectations', impact: { xauusd: '±0.5%', eurusd: '±0.3%', gbpusd: '±1.6%' } },
  { layer: 'economicEvents', name: 'US Core PCE', lat: 38.8, lon: -77.3, desc: "Fed's preferred inflation gauge — key for rate path", impact: { xauusd: '±1.5%', eurusd: '±1.0%', gbpusd: '±0.8%' } },
  // Gold Regions
  { layer: 'goldRegions', name: 'South Africa', lat: -29.0, lon: 25.0, desc: "World's historically largest gold producer — Witwatersrand belt", impact: { xauusd: '+0.5%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Australia', lat: -25.0, lon: 133.0, desc: '2nd largest gold reserves — Kalgoorlie and Pilbara regions', impact: { xauusd: '+0.8%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Ghana', lat: 7.9, lon: -1.0, desc: "Africa's top current gold producer", impact: { xauusd: '+0.3%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Russia', lat: 62.0, lon: 94.0, desc: 'Major gold producer — sanctions impacting supply routes', impact: { xauusd: '+1.2%', eurusd: '-0.2%', gbpusd: '-0.1%' } },
  { layer: 'goldRegions', name: 'Brazil', lat: -10.0, lon: -55.0, desc: 'Growing Amazon basin gold production region', impact: { xauusd: '+0.4%', eurusd: '0.0%', gbpusd: '0.0%' } },
  { layer: 'goldRegions', name: 'Papua New Guinea', lat: -6.0, lon: 147.0, desc: 'Pacific gold and copper mining hub — Ok Tedi, Lihir', impact: { xauusd: '+0.3%', eurusd: '0.0%', gbpusd: '0.0%' } },
];

const MARKERS: MarkerData[] = RAW_MARKERS as MarkerData[];

// ─── Ticker data ──────────────────────────────────────────────────────────────
const TICKER = [
  { pair: 'XAU/USD', price: '3,324.80', change: '+12.40', pct: '+0.37%', up: true },
  { pair: 'EUR/USD', price: '1.1342',   change: '+0.0018', pct: '+0.16%', up: true },
  { pair: 'GBP/USD', price: '1.3421',   change: '-0.0023', pct: '-0.17%', up: false },
  { pair: 'USD/JPY', price: '142.34',   change: '-0.56',   pct: '-0.39%', up: false },
  { pair: 'AUD/USD', price: '0.6582',   change: '+0.0012', pct: '+0.18%', up: true },
  { pair: 'USD/CHF', price: '0.8821',   change: '+0.0034', pct: '+0.39%', up: true },
  { pair: 'USD/CAD', price: '1.3845',   change: '-0.0021', pct: '-0.15%', up: false },
  { pair: 'NZD/USD', price: '0.6021',   change: '+0.0008', pct: '+0.13%', up: true },
  { pair: 'XAG/USD', price: '32.45',    change: '+0.23',   pct: '+0.71%', up: true },
  { pair: 'WTI/USD', price: '82.14',    change: '-0.45',   pct: '-0.54%', up: false },
];

// ─── Utility ──────────────────────────────────────────────────────────────────
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function buildGlobeTexture(): THREE.CanvasTexture {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Ocean base
  const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  grad.addColorStop(0, '#0d1826');
  grad.addColorStop(1, '#060e1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(180,150,60,0.10)';
  ctx.lineWidth = 0.8;
  for (let lon = 0; lon <= 360; lon += 30) {
    const x = (lon / 360) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let lat = 0; lat <= 180; lat += 30) {
    const y = (lat / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Equator & prime meridian brighter
  ctx.strokeStyle = 'rgba(212,175,55,0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

  // Subtle land blobs (impressionistic)
  const blobs: [number, number, number, number][] = [
    // [lon-center, lat-center, w, h] in degrees
    [-100, 50, 70, 45],  // North America
    [-55, -10, 35, 50],  // South America
    [15, 15, 55, 65],    // Africa + Europe
    [80, 30, 65, 55],    // Asia
    [135, -25, 30, 30],  // Australia
  ];
  blobs.forEach(([lon, lat, w, h]) => {
    const cx = ((lon + 180) / 360) * W;
    const cy = ((90 - lat) / 180) * H;
    const rx = (w / 360) * W;
    const ry = (h / 180) * H;
    const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    lg.addColorStop(0, 'rgba(30,55,45,0.55)');
    lg.addColorStop(0.6, 'rgba(20,40,35,0.25)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  return new THREE.CanvasTexture(canvas);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlobeClient() {
  const mountRef      = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef      = useRef<THREE.Scene | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef   = useRef<OrbitControls | null>(null);
  const markerMeshes  = useRef<{ mesh: THREE.Mesh; data: MarkerData; ring: THREE.Mesh }[]>([]);
  const frameRef      = useRef<number>(0);
  const groupRefs     = useRef<Partial<Record<LayerKey, THREE.Group>>>({});

  const [activeLayers, setActiveLayers] = useState<Record<LayerKey, boolean>>({
    conflict: true, centralBanks: true, economicEvents: true, goldRegions: true,
  });
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const [utcTime, setUtcTime] = useState('');

  // UTC clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Three.js init
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x2040a0, 0.3);
    fill.position.set(-5, -2, -3);
    scene.add(fill);

    // Stars
    const starPositions: number[] = [];
    for (let i = 0; i < 3000; i++) {
      starPositions.push(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // Globe
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeTex = buildGlobeTexture();
    const globeMat = new THREE.MeshPhongMaterial({
      map: globeTex,
      specular: new THREE.Color(0x223355),
      shininess: 25,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.04, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0xD4AF37),
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    const atmosGeo2 = new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 64, 64);
    const atmosMat2 = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x4488ff),
      transparent: true,
      opacity: 0.025,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeo2, atmosMat2));

    // Markers
    markerMeshes.current = [];
    const layerGroups: Partial<Record<LayerKey, THREE.Group>> = {};

    (Object.keys(LAYER_CONFIG) as LayerKey[]).forEach(key => {
      const group = new THREE.Group();
      group.name = key;
      scene.add(group);
      layerGroups[key] = group;
    });
    groupRefs.current = layerGroups;

    MARKERS.forEach(marker => {
      const group = layerGroups[marker.layer]!;
      const cfg   = LAYER_CONFIG[marker.layer];
      const pos   = latLonToVec3(marker.lat, marker.lon, GLOBE_RADIUS + 0.03);

      // Dot
      const dotGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const dotMat = new THREE.MeshPhongMaterial({
        color: cfg.hexColor,
        emissive: cfg.hexColor,
        emissiveIntensity: 0.8,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      group.add(dot);

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(0.055, 0.075, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.hexColor,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.rotateX(Math.PI);
      group.add(ring);

      // Store for raycasting
      (dot as any).__markerData = marker;
      (dot as any).__ring = ring;
      markerMeshes.current.push({ mesh: dot, data: marker, ring });
    });

    // Resize
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered: typeof markerMeshes.current[0] | null = null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allDots = markerMeshes.current.map(m => m.mesh);
      const hits = raycaster.intersectObjects(allDots);

      if (hits.length > 0) {
        const hit = hits[0].object as THREE.Mesh;
        const entry = markerMeshes.current.find(m => m.mesh === hit);
        if (entry && entry !== hovered) {
          hovered = entry;
          controls.autoRotate = false;
          const vec = entry.data;
          const screenPos = entry.mesh.position.clone().project(camera);
          const sx = ((screenPos.x + 1) / 2) * el.clientWidth;
          const sy = ((-screenPos.y + 1) / 2) * el.clientHeight;
          setTooltip({ visible: true, x: sx, y: sy, data: vec });
          (hit.material as THREE.MeshPhongMaterial).emissiveIntensity = 2;
        }
      } else {
        if (hovered) {
          (hovered.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.8;
          hovered = null;
        }
        controls.autoRotate = true;
        setTooltip(t => ({ ...t, visible: false }));
      }
    };

    el.addEventListener('mousemove', onMouseMove);

    // Animate
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;
      controls.update();

      // Pulse rings
      markerMeshes.current.forEach(({ ring }, i) => {
        const s = 1 + 0.3 * Math.sin(t * 2 + i * 0.7);
        ring.scale.setScalar(s);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * Math.sin(t * 2 + i * 0.7 + Math.PI);
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
      const group = groupRefs.current[key];
      if (group) group.visible = activeLayers[key];
    });
  }, [activeLayers]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const layerCounts: Record<LayerKey, number> = {
    conflict: 5, centralBanks: 5, economicEvents: 4, goldRegions: 6,
  };

  const geoRisk = 68;

  return (
    <div style={{ width: '100vw', height: '100vh', background: BLACK, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif", color: '#e8e8e8' }}>

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 48, background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${GOLD}, #a88420)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: BLACK, letterSpacing: -0.5 }}>T</div>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>TRADEX</span>
        </div>

        <div style={{ width: 1, height: 24, background: '#222' }} />

        {/* Page title */}
        <span style={{ fontSize: 11, color: '#888', letterSpacing: 1.5, textTransform: 'uppercase' }}>Market Intelligence Globe</span>

        <div style={{ flex: 1 }} />

        {/* Pair badges */}
        {[
          { pair: 'XAU/USD', price: '3,324.80', up: true },
          { pair: 'EUR/USD', price: '1.1342', up: true },
          { pair: 'GBP/USD', price: '1.3421', up: false },
        ].map(b => (
          <div key={b.pair} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#161616', border: '1px solid #252525', borderRadius: 4, padding: '3px 8px' }}>
            <span style={{ fontSize: 10, color: '#999', fontFamily: 'IBM Plex Mono, monospace' }}>{b.pair}</span>
            <span style={{ fontSize: 11, color: b.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{b.price}</span>
            <span style={{ fontSize: 8 }}>{b.up ? '▲' : '▼'}</span>
          </div>
        ))}

        <div style={{ width: 1, height: 24, background: '#222' }} />

        {/* Geo Risk */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>Geo Risk</span>
          <div style={{ width: 80, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${geoRisk}%`, height: '100%', background: `linear-gradient(90deg, ${GOLD}, #ff6b35)`, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: GOLD, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{geoRisk}%</span>
        </div>

        <div style={{ width: 1, height: 24, background: '#222' }} />

        {/* UTC Clock */}
        <span style={{ fontSize: 11, color: '#ccc', fontFamily: 'IBM Plex Mono, monospace', minWidth: 80 }}>{utcTime}</span>
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 220, background: '#0d0d0d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', padding: '16px 0', flexShrink: 0, zIndex: 10 }}>
          <div style={{ padding: '0 14px 12px', borderBottom: '1px solid #1a1a1a', marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: '#666', letterSpacing: 2, textTransform: 'uppercase' }}>Data Layers</span>
          </div>

          {(Object.keys(LAYER_CONFIG) as LayerKey[]).map(key => {
            const cfg = LAYER_CONFIG[key];
            const active = activeLayers[key];
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderLeft: `2px solid ${active ? cfg.color : 'transparent'}`, transition: 'all 0.15s' }}
              >
                {/* Checkbox */}
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${active ? cfg.color : '#444'}`, background: active ? cfg.color + '22' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {active && <div style={{ width: 7, height: 7, borderRadius: 1.5, background: cfg.color }} />}
                </div>
                <span style={{ fontSize: 10 }}>{cfg.icon}</span>
                <span style={{ fontSize: 11, color: active ? '#e8e8e8' : '#666', flex: 1, lineHeight: 1.3 }}>{cfg.label}</span>
                <span style={{ fontSize: 9, color: active ? cfg.color : '#444', fontFamily: 'IBM Plex Mono, monospace', background: active ? cfg.color + '15' : '#111', padding: '1px 5px', borderRadius: 3 }}>{layerCounts[key]}</span>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Legend */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Legend</div>
            {(Object.keys(LAYER_CONFIG) as LayerKey[]).map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: LAYER_CONFIG[key].color, boxShadow: `0 0 6px ${LAYER_CONFIG[key].color}` }} />
                <span style={{ fontSize: 9, color: '#666' }}>{LAYER_CONFIG[key].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Globe canvas */}
        <div ref={mountRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Tooltip */}
          {tooltip.visible && tooltip.data && (() => {
            const td = tooltip.data!;
            const lcfg = LAYER_CONFIG[td.layer];
            return (
              <div style={{
                position: 'absolute',
                left: Math.min(tooltip.x + 12, (mountRef.current?.clientWidth ?? 800) - 240),
                top: Math.max(tooltip.y - 60, 8),
                width: 228,
                background: '#111',
                border: `1px solid ${lcfg.color}40`,
                borderLeft: `3px solid ${lcfg.color}`,
                borderRadius: 6,
                padding: '10px 12px',
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${lcfg.color}15`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: lcfg.color, boxShadow: `0 0 6px ${lcfg.color}` }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{td.name}</span>
                </div>
                <div style={{ fontSize: 9, color: lcfg.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{lcfg.label}</div>
                <div style={{ fontSize: 10, color: '#aaa', lineHeight: 1.5, marginBottom: 8 }}>{td.desc}</div>
                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 7 }}>
                  <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 5 }}>MARKET IMPACT</div>
                  {(['xauusd', 'eurusd', 'gbpusd'] as const).map(p => (
                    <div key={p} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: '#666', fontFamily: 'IBM Plex Mono, monospace' }}>{p.replace('xau', 'XAU/').replace('eur', 'EUR/').replace('gbp', 'GBP/').replace('usd', 'USD')}</span>
                      <span style={{ fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: td.impact[p].startsWith('+') ? GREEN : td.impact[p].startsWith('-') ? '#ff4444' : GOLD }}>
                        {td.impact[p]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Drag hint */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 9, color: '#333', letterSpacing: 1, pointerEvents: 'none' }}>
            DRAG TO ROTATE · SCROLL TO ZOOM
          </div>
        </div>
      </div>

      {/* ── Ticker tape ─────────────────────────────────────────────────────── */}
      <div style={{ height: 32, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 0, animation: 'ticker-scroll 40s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER, ...TICKER].map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 20px', borderRight: '1px solid #1a1a1a' }}>
              <span style={{ fontSize: 10, color: '#888', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.5 }}>{item.pair}</span>
              <span style={{ fontSize: 11, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{item.price}</span>
              <span style={{ fontSize: 9, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace' }}>{item.pct}</span>
              <span style={{ fontSize: 8, color: item.up ? GREEN : '#ff4444' }}>{item.up ? '▲' : '▼'}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
