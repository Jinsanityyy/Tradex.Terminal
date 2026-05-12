'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useQuotes } from '@/hooks/useMarketData';

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

interface LiveMarker {
  id: string;
  layer: LayerKey;
  name: string;
  lat: number;
  lon: number;
  desc: string;
  impact: { xauusd: string; eurusd: string; gbpusd: string };
  eventTime?: string;
  actual?: string;
  estimate?: string;
  prev?: string;
  source?: string;
  isLive: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: MarkerData | null;
}

// ─── Layer config ─────────────────────────────────────────────────────────────
const LAYER_CONFIG: Record<LayerKey, { label: string; color: string; hexColor: number; icon: string; code: string }> = {
  conflict:       { label: 'Conflict Zones',         color: '#c0392b', hexColor: 0xc0392b, icon: '▲', code: 'CFZ' },
  centralBanks:   { label: 'Central Banks',           color: '#27ae60', hexColor: 0x27ae60, icon: '◆', code: 'CBK' },
  economicEvents: { label: 'Economic Events',         color: '#2980b9', hexColor: 0x2980b9, icon: '●', code: 'ECO' },
  goldRegions:    { label: 'Gold Producing Regions',  color: '#b8962e', hexColor: 0xb8962e, icon: '◈', code: 'GLD' },
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
const TICKER_SYMBOL_ORDER = [
  'XAUUSD',
  'BTCUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USOIL',
  'ETHUSD',
  'USDCAD',
  'AUDUSD',
  'USDCHF',
  'NZDUSD',
  'XAGUSD',
] as const;

const TICKER_LABELS: Record<string, string> = {
  XAUUSD: 'XAU/USD',
  BTCUSD: 'BTC/USD',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  USOIL: 'WTI',
  ETHUSD: 'ETH/USD',
  USDCAD: 'USD/CAD',
  AUDUSD: 'AUD/USD',
  USDCHF: 'USD/CHF',
  NZDUSD: 'NZD/USD',
  XAGUSD: 'XAG/USD',
};

const FOUR_DECIMAL_SYMBOLS = new Set(['EURUSD', 'GBPUSD', 'USDCAD', 'AUDUSD', 'USDCHF', 'NZDUSD']);

function formatTickerPrice(symbol: string, price: number) {
  if (!Number.isFinite(price)) return '--';
  if (FOUR_DECIMAL_SYMBOLS.has(symbol)) return price.toFixed(4);
  if (symbol === 'USDJPY') return price.toFixed(2);
  if (symbol === 'BTCUSD') return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (symbol === 'XAUUSD' || symbol === 'XAGUSD' || symbol === 'ETHUSD' || symbol === 'USOIL') {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString(undefined, { maximumFractionDigits: price > 100 ? 2 : 4 });
}

function formatTickerPercent(changePercent: number) {
  if (!Number.isFinite(changePercent)) return '0.00%';
  return `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
}

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

const MAP_LABELS = [
  { label: 'CANADA', lat: 62, lon: -104, accent: '#5e6166', city: false },
  { label: 'UNITED STATES', lat: 39, lon: -99, accent: '#707378', city: false },
  { label: 'New York', lat: 40.7, lon: -74, accent: '#9ea2aa', city: true },
  { label: 'London', lat: 51.5, lon: -0.1, accent: '#a4a8af', city: true },
  { label: 'Paris', lat: 48.85, lon: 2.35, accent: '#898d95', city: true },
  { label: 'Moscow', lat: 55.75, lon: 37.62, accent: '#91857a', city: true },
  { label: 'UKRAINE', lat: 49, lon: 31, accent: '#c8c8c8', city: false },
  { label: 'Cairo', lat: 30.04, lon: 31.24, accent: '#888b90', city: true },
  { label: 'Beijing', lat: 39.9, lon: 116.4, accent: '#979ba2', city: true },
  { label: 'Tokyo', lat: 35.7, lon: 139.7, accent: '#a2a6ad', city: true },
  { label: 'SOUTH AFRICA', lat: -29, lon: 24, accent: '#76797f', city: false },
  { label: 'Rio de Janeiro', lat: -22.9, lon: -43.2, accent: '#7d8187', city: true },
  { label: 'Mexico City', lat: 19.43, lon: -99.13, accent: '#82868d', city: true },
  { label: 'Bogota', lat: 4.71, lon: -74.07, accent: '#767b82', city: true },
];

const LAYER_INTEL: Record<LayerKey, { tag: string; level: string; accent: string; chip: string }> = {
  conflict: { tag: 'Conflict Alert', level: 'HIGH', accent: '#ff544a', chip: '#3b1613' },
  centralBanks: { tag: 'Central Bank Watch', level: 'ELEVATED', accent: GREEN, chip: '#123225' },
  economicEvents: { tag: 'Macro Release', level: 'SCHEDULED', accent: '#5ba7ff', chip: '#15243b' },
  goldRegions: { tag: 'Supply Zone', level: 'MONITOR', accent: GOLD, chip: '#3b3114' },
};

const MARKER_SIZE: Record<LayerKey, number> = {
  conflict: 13,
  centralBanks: 10,
  economicEvents: 11,
  goldRegions: 12,
};

const HOTSPOT_SIZE: Record<LayerKey, number> = {
  conflict: 52,
  centralBanks: 38,
  economicEvents: 42,
  goldRegions: 46,
};

// ─── 2D Flat Map View ─────────────────────────────────────────────────────────
function FlatMapView({
  markers,
  activeLayers,
  layerCounts,
  selectedMarker,
  onSelectMarker,
  onClosePanel,
  onToggleLayer,
  isPanelOpen,
  onTogglePanel,
}: {
  markers: LiveMarker[];
  activeLayers: Record<LayerKey, boolean>;
  layerCounts: Record<LayerKey, number>;
  selectedMarker: LiveMarker | null;
  onSelectMarker: (data: LiveMarker) => void;
  onClosePanel: () => void;
  onToggleLayer: (key: LayerKey) => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const [mapScale, setMapScale] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  const visibleMarkers = useMemo(
    () => markers.filter((marker) => activeLayers[marker.layer]),
    [activeLayers, markers]
  );

  const relatedMarkers = useMemo(() => {
    if (!selectedMarker) return [];
    return visibleMarkers
      .filter((marker) => marker.layer === selectedMarker.layer && marker.name !== selectedMarker.name)
      .slice(0, 3);
  }, [selectedMarker, visibleMarkers]);

  const zoomIn = useCallback(() => setMapScale((value) => Math.min(1.75, Number((value + 0.15).toFixed(2)))), []);
  const zoomOut = useCallback(() => setMapScale((value) => Math.max(1, Number((value - 0.15).toFixed(2)))), []);
  const zoomReset = useCallback(() => setMapScale(1), []);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#07090d', minHeight: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 22%, rgba(255,255,255,0.03), transparent 35%), linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.2))', zIndex: 0, pointerEvents: 'none' }} />

      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          transform: `scale(${mapScale})`,
          transformOrigin: '50% 50%',
          transition: 'transform 160ms ease',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={EARTH_NIGHT_URL}
          alt=""
          onLoad={() => setImgLoaded(true)}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            display: 'block',
            opacity: imgLoaded ? 0.44 : 0,
            filter: 'grayscale(1) contrast(1.22) brightness(0.43) saturate(0.15)',
          }}
          draggable={false}
        />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(16,18,22,0.06), rgba(16,18,22,0.32))', pointerEvents: 'none' }} />

        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {[-60, -30, 0, 30, 60].map((lat) => (
            <line
              key={lat}
              x1="0"
              y1={`${((90 - lat) / 180) * 100}%`}
              x2="100%"
              y2={`${((90 - lat) / 180) * 100}%`}
              stroke={lat === 0 ? '#6b5a2a' : '#ffffff18'}
              strokeWidth={lat === 0 ? 1.5 : 0.5}
            />
          ))}
          {[-120, -60, 0, 60, 120].map((lon) => (
            <line
              key={lon}
              x1={`${((lon + 180) / 360) * 100}%`}
              y1="0"
              x2={`${((lon + 180) / 360) * 100}%`}
              y2="100%"
              stroke={lon === 0 ? '#6b5a2a' : '#ffffff18'}
              strokeWidth={lon === 0 ? 1.5 : 0.5}
            />
          ))}
        </svg>

        {MAP_LABELS.map((label) => {
          const pos = latLonTo2D(label.lat, label.lon);
          return (
            <div
              key={label.label}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                transform: 'translate(-50%, -50%)',
                fontSize: label.city ? 12 : 11,
                fontWeight: label.city ? 500 : 700,
                letterSpacing: label.city ? 0.2 : 1.2,
                color: label.accent,
                opacity: label.city ? 0.78 : 0.58,
                textTransform: label.city ? 'none' : 'uppercase',
                textShadow: '0 1px 0 rgba(0,0,0,0.7)',
                pointerEvents: 'none',
                zIndex: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {label.label}
            </div>
          );
        })}

        {visibleMarkers.map((marker, index) => {
          const pos = latLonTo2D(marker.lat, marker.lon);
          const cfg = LAYER_CONFIG[marker.layer];
          const isSelected = selectedMarker?.name === marker.name;
          const hotspot = HOTSPOT_SIZE[marker.layer];
          const size = MARKER_SIZE[marker.layer] + (isSelected ? 4 : 0);

          return (
            <div key={`${marker.name}-${index}`}>
              <div
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  transform: 'translate(-50%, -50%)',
                  width: hotspot,
                  height: hotspot,
                  borderRadius: '50%',
                  background: `${cfg.color}24`,
                  boxShadow: `0 0 24px ${cfg.color}22`,
                  border: `1px solid ${cfg.color}32`,
                  filter: 'blur(0.4px)',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => onSelectMarker(marker)}
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                  transform: 'translate(-50%, -50%)',
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  border: isSelected ? `2px solid ${cfg.color}` : 'none',
                  background: cfg.color,
                  boxShadow: isSelected
                    ? `0 0 0 4px ${cfg.color}22, 0 0 18px ${cfg.color}`
                    : `0 0 10px ${cfg.color}, 0 0 16px ${cfg.color}70`,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                aria-label={marker.name}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: -6,
                    borderRadius: '50%',
                    border: `1px solid ${cfg.color}`,
                    opacity: 0.45,
                    animation: 'pulse-ring 2s ease-out infinite',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 18, top: 16, zIndex: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #20242b', background: 'rgba(8,10,14,0.84)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#f04e45', textTransform: 'uppercase' }}>
          2D Tactical View
        </div>
        <div style={{ fontSize: 10, color: '#6f7379', letterSpacing: 1 }}>
          {visibleMarkers.length} active nodes
        </div>
        <button
          type="button"
          onClick={onTogglePanel}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid #20242b',
            background: 'rgba(8,10,14,0.84)',
            color: '#8f949c',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
          title={isPanelOpen ? 'Hide layers panel' : 'Show layers panel'}
        >
          {isPanelOpen ? '←' : '→'}
        </button>
      </div>

      {isPanelOpen ? (
        <div style={{ position: 'absolute', left: 18, top: 54, zIndex: 14, width: 212, borderRadius: 12, border: '1px solid #20242b', background: 'rgba(8,10,14,0.9)', boxShadow: '0 18px 42px rgba(0,0,0,0.42)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #181b21', fontSize: 10, color: '#70757d', letterSpacing: 1.6, textTransform: 'uppercase' }}>
            Live Layers
          </div>
          <div style={{ padding: '6px 0' }}>
            {(Object.keys(LAYER_CONFIG) as LayerKey[]).map((key) => {
              const cfg = LAYER_CONFIG[key];
              const active = activeLayers[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleLayer(key)}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: active ? `${cfg.color}10` : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${active ? cfg.color : 'transparent'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: active ? cfg.color : '#30343a', boxShadow: active ? `0 0 10px ${cfg.color}` : 'none', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: active ? '#e5e7eb' : '#70757d', fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ minWidth: 24, borderRadius: 999, background: active ? `${cfg.color}18` : '#12151b', padding: '2px 7px', textAlign: 'center', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: active ? cfg.color : '#4d5158' }}>
                    {layerCounts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onTogglePanel}
          style={{
            position: 'absolute',
            left: 18,
            top: 54,
            zIndex: 14,
            width: 34,
            height: 34,
            borderRadius: 9,
            border: '1px solid #20242b',
            background: 'rgba(8,10,14,0.9)',
            color: '#8f949c',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
          title="Show layers panel"
        >
          →
        </button>
      )}

      <div style={{ position: 'absolute', right: 16, top: 18, zIndex: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: '+', onClick: zoomIn, title: 'Zoom in' },
          { label: '−', onClick: zoomOut, title: 'Zoom out' },
          { label: '⌂', onClick: zoomReset, title: 'Reset view' },
        ].map((control) => (
          <button
            key={control.title}
            type="button"
            onClick={control.onClick}
            title={control.title}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid #1f2329',
              background: 'rgba(10,12,16,0.88)',
              color: '#d6d8dc',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            {control.label}
          </button>
        ))}
      </div>

      {selectedMarker && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 40, width: 'min(360px, 88vw)', borderRadius: 14, border: '1px solid #262119', background: 'rgba(11, 10, 8, 0.97)', boxShadow: '0 24px 60px rgba(0,0,0,0.72)', overflow: 'hidden', backdropFilter: 'blur(6px)' }}>
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid #1f1c17' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: LAYER_INTEL[selectedMarker.layer].accent, boxShadow: `0 0 10px ${LAYER_INTEL[selectedMarker.layer].accent}` }} />
                  <span style={{ fontSize: 11, color: '#8b867d', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {LAYER_INTEL[selectedMarker.layer].tag}
                  </span>
                  {selectedMarker.isLive && (
                    <span style={{ fontSize: 8, color: GREEN, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, border: `1px solid ${GREEN}30`, background: `${GREEN}10` }}>
                      LIVE
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, fontSize: 20, lineHeight: 1.15, fontWeight: 700, color: '#f2ede2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedMarker.name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                <div style={{ borderRadius: 999, border: `1px solid ${LAYER_INTEL[selectedMarker.layer].accent}30`, background: LAYER_INTEL[selectedMarker.layer].chip, padding: '4px 8px', fontSize: 10, color: LAYER_INTEL[selectedMarker.layer].accent, fontWeight: 700 }}>
                  {LAYER_INTEL[selectedMarker.layer].level}
                </div>
                <button
                  type="button"
                  onClick={onClosePanel}
                  style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #2a2620', background: 'rgba(255,255,255,0.04)', color: '#6b6660', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64615c', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: LAYER_INTEL[selectedMarker.layer].accent }}>{LAYER_CONFIG[selectedMarker.layer].label}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64615c', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Location</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#d9d5cc', textTransform: 'lowercase' }}>{selectedMarker.name}</div>
                </div>
              </div>

              {(selectedMarker.isLive || selectedMarker.eventTime || selectedMarker.actual || selectedMarker.estimate) && (
                <div style={{ marginBottom: 14, padding: '8px 10px', borderRadius: 7, border: '1px solid #18221a', background: 'rgba(0,200,83,0.04)' }}>
                  {selectedMarker.isLive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: (selectedMarker.eventTime || selectedMarker.actual || selectedMarker.estimate) ? 8 : 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, boxShadow: `0 0 5px ${GREEN}`, display: 'inline-block' }} />
                      <span style={{ fontSize: 9, color: GREEN, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>Live Data</span>
                    </div>
                  )}
                  {selectedMarker.eventTime && (
                    <div style={{ fontSize: 10, color: '#8c8880', fontFamily: 'IBM Plex Mono, monospace', marginBottom: (selectedMarker.actual || selectedMarker.estimate || selectedMarker.prev) ? 8 : 0 }}>
                      <span style={{ color: '#535050', marginRight: 6 }}>EVENT</span>
                      {selectedMarker.eventTime.slice(0, 16).replace('T', ' ')}
                    </div>
                  )}
                  {(selectedMarker.actual || selectedMarker.estimate || selectedMarker.prev) && (
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {selectedMarker.actual && (
                        <div>
                          <div style={{ fontSize: 9, color: '#535050', letterSpacing: 1, marginBottom: 2 }}>ACTUAL</div>
                          <div style={{ fontSize: 12, color: '#e2dccc', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{selectedMarker.actual}</div>
                        </div>
                      )}
                      {selectedMarker.estimate && (
                        <div>
                          <div style={{ fontSize: 9, color: '#535050', letterSpacing: 1, marginBottom: 2 }}>ESTIMATE</div>
                          <div style={{ fontSize: 12, color: '#9b9792', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedMarker.estimate}</div>
                        </div>
                      )}
                      {selectedMarker.prev && (
                        <div>
                          <div style={{ fontSize: 9, color: '#535050', letterSpacing: 1, marginBottom: 2 }}>PREV</div>
                          <div style={{ fontSize: 12, color: '#6e6b65', fontFamily: 'IBM Plex Mono, monospace' }}>{selectedMarker.prev}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#64615c', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Market Impact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6 }}>
                  {(['xauusd', 'eurusd', 'gbpusd'] as const).map((pair) => (
                    <div key={pair} style={{ display: 'contents' }}>
                      <span style={{ fontSize: 11, color: '#8c8880', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {pair === 'xauusd' ? 'XAU/USD' : pair === 'eurusd' ? 'EUR/USD' : 'GBP/USD'}
                      </span>
                      <span style={{ fontSize: 11, color: selectedMarker.impact[pair].startsWith('+') ? GREEN : selectedMarker.impact[pair].startsWith('-') ? '#ff544a' : GOLD, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>
                        {selectedMarker.impact[pair]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, lineHeight: 1.55, color: '#b9b4ab', marginBottom: 14 }}>
                {selectedMarker.desc}
              </div>

              <div style={{ fontSize: 10, color: '#64615c', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Related Events</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[selectedMarker, ...relatedMarkers].slice(0, 3).map((item, index) => (
                  <div key={`${item.name}-${index}`} style={{ borderTop: index === 0 ? 'none' : '1px solid #201d19', paddingTop: index === 0 ? 0 : 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: LAYER_INTEL[item.layer].accent }} />
                      <span style={{ fontSize: 10, color: '#7c786f', letterSpacing: 1, textTransform: 'uppercase' }}>{LAYER_INTEL[item.layer].level}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ece7de', lineHeight: 1.35 }}>{item.name}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: '#8b867d', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        </div>
      )}

      <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 14, display: 'flex', alignItems: 'center', gap: 14, borderRadius: 999, border: '1px solid #20242b', background: 'rgba(8,10,14,0.92)', padding: '8px 12px', boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>
        {(Object.keys(LAYER_CONFIG) as LayerKey[]).map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_CONFIG[key].color }} />
            <span style={{ fontSize: 10, color: '#8a9097', whiteSpace: 'nowrap' }}>{LAYER_CONFIG[key].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobeClient({ embedded = false }: { embedded?: boolean }) {
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
  const [selectedMarker2D, setSelectedMarker2D] = useState<LiveMarker | null>(null);
  const [liveMarkers, setLiveMarkers] = useState<LiveMarker[]>([]);
  const [is3D, setIs3D]               = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const { quotes } = useQuotes(15_000);

  const syncRendererSize = useCallback(() => {
    const el = mountRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!el || !camera || !renderer) return;

    const width = Math.max(el.clientWidth, 1);
    const height = Math.max(el.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, true);
    renderer.setViewport(0, 0, width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Live globe markers — fetch on mount, refresh every 5 minutes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/globe/live');
        if (res.ok) {
          const data: { markers: LiveMarker[] } = await res.json();
          setLiveMarkers(data.markers);
        }
      } catch { /* network failure — keep previous state */ }
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(timer);
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
    renderer.setSize(el.clientWidth, el.clientHeight, true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
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

      const dotMat = new THREE.MeshPhongMaterial({
        color: cfg.hexColor, emissive: cfg.hexColor, emissiveIntensity: 1.4,
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), dotMat);
      dot.position.copy(pos);
      g.add(dot);

      // Pulse ring — align ring plane tangent to sphere (normal = outward radial)
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.hexColor, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.115, 32), ringMat);
      ring.position.copy(pos);
      // Rotate so ring's +Z (its face normal) matches outward radial direction
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
      g.add(ring);

      (dot as any).__markerData = marker;
      markerMeshes.current.push({ mesh: dot, data: marker, ring });
    });

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      syncRendererSize();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('tradex-dashboard-layout-change', onResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => onResize())
        : null;
    resizeObserver?.observe(el);
    if (el.parentElement) resizeObserver?.observe(el.parentElement);
    if (rootRef.current) resizeObserver?.observe(rootRef.current);

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
        const phase = t * 1.2 + i * 1.1;
        const expand = (Math.sin(phase) + 1) / 2;
        ring.scale.setScalar(1 + 0.9 * expand);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - expand);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('tradex-dashboard-layout-change', onResize);
      resizeObserver?.disconnect();
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

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      syncRendererSize();
    });
    const secondFrame = window.requestAnimationFrame(() => {
      syncRendererSize();
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [is3D, isLayerPanelOpen, isFullscreen, syncRendererSize]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleLayerPanel = useCallback(() => {
    setIsLayerPanelOpen((prev) => !prev);
  }, []);

  const layerCounts = useMemo<Record<LayerKey, number>>(() => ({
    conflict:       liveMarkers.filter(m => m.layer === 'conflict').length,
    centralBanks:   liveMarkers.filter(m => m.layer === 'centralBanks').length,
    economicEvents: liveMarkers.filter(m => m.layer === 'economicEvents').length,
    goldRegions:    liveMarkers.filter(m => m.layer === 'goldRegions').length,
  }), [liveMarkers]);

  useEffect(() => {
    if (selectedMarker2D && !activeLayers[selectedMarker2D.layer]) {
      const fallback = liveMarkers.find((marker) => activeLayers[marker.layer]) ?? null;
      setSelectedMarker2D(fallback);
    }
  }, [activeLayers, selectedMarker2D, liveMarkers]);

  const tickerItems = useMemo(() => {
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const liveItems = TICKER_SYMBOL_ORDER
      .map((symbol) => {
        const quote = quoteMap.get(symbol);
        if (!quote) return null;

        return {
          pair: TICKER_LABELS[symbol] ?? symbol,
          price: formatTickerPrice(symbol, quote.price),
          pct: formatTickerPercent(quote.changePercent),
          up: quote.changePercent >= 0,
        };
      })
      .filter(Boolean) as { pair: string; price: string; pct: string; up: boolean }[];

    return liveItems;
  }, [quotes]);

  return (
    <div
      ref={rootRef}
      style={{
        width: embedded ? '100%' : '100vw',
        height: embedded ? '100%' : '100vh',
        background: BLACK,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: '#e8e8e8',
      }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{ height: 44, background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 20 }}>
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
        {is3D && isLayerPanelOpen && (
          <div style={{ width: 236, background: '#0d0d0d', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 10, color: '#555', letterSpacing: 2, textTransform: 'uppercase' }}>Data Layers</span>
              <button
                type="button"
                onClick={toggleLayerPanel}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #232323', background: '#111214', color: '#7e838a', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                title="Hide data layers"
              >
                ←
              </button>
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
        )}
        {/* Globe / Map area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
          {is3D && !isLayerPanelOpen && (
            <button
              type="button"
              onClick={toggleLayerPanel}
              style={{
                position: 'absolute',
                left: 16,
                top: 16,
                zIndex: 30,
                width: 34,
                height: 34,
                borderRadius: 9,
                border: '1px solid #232323',
                background: 'rgba(10, 12, 16, 0.92)',
                color: '#8f949c',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
              title="Show data layers"
            >
              →
            </button>
          )}

          {/* Three.js mount — hidden in 2D mode but kept alive */}
          <div
            ref={mountRef}
            style={{ position: 'absolute', inset: 0, display: is3D ? 'block' : 'none' }}
          />

          {/* 2D flat map */}
          {!is3D && (
            <FlatMapView
              markers={liveMarkers}
              activeLayers={activeLayers}
              layerCounts={layerCounts}
              selectedMarker={selectedMarker2D}
              onSelectMarker={setSelectedMarker2D}
              onClosePanel={() => setSelectedMarker2D(null)}
              onToggleLayer={toggleLayer}
              isPanelOpen={isLayerPanelOpen}
              onTogglePanel={toggleLayerPanel}
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
          {[...(tickerItems.length > 0 ? tickerItems : []), ...(tickerItems.length > 0 ? tickerItems : [])].map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 22px' }}>
              <span style={{ fontSize: 11, color: '#999', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.5, fontWeight: 500 }}>{item.pair}</span>
              <span style={{ fontSize: 12, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{item.price}</span>
              <span style={{ fontSize: 10, color: item.up ? GREEN : '#ff4444', fontFamily: 'IBM Plex Mono, monospace' }}>{item.pct}</span>
              <span style={{ fontSize: 9, color: item.up ? GREEN : '#ff4444' }}>{item.up ? '▲' : '▼'}</span>
              <span style={{ fontSize: 10, color: '#2a2a2a', marginLeft: 4 }}>|</span>
            </div>
          ))}
        </div>
        {tickerItems.length === 0 && (
          <div style={{ position: 'absolute', left: 16, fontSize: 11, color: '#666', fontFamily: 'IBM Plex Mono, monospace' }}>
            Loading live market tape...
          </div>
        )}
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
