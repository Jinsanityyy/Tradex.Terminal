"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import styles from "./PixelTradingFloor.module.css";

type StationStatus = "TRADE-OK" | "NO-TRADE";

type OperatorLook = {
  skin: string;
  hairStyle: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoesColor: string;
  seatFrame: 0 | 1 | 2 | 3;
  scale?: number;
};

type StationBlueprint = {
  id: string;
  label: string;
  left: number;
  top: number;
  status: StationStatus;
  seatedLook: OperatorLook;
};

const STATION_BLUEPRINTS: StationBlueprint[] = [
  {
    id: "trend", label: "TREND", left: 9, top: 5, status: "NO-TRADE",
    seatedLook: { skin: "Ivory", hairStyle: "Parted Short", hairColor: "Brown", shirtColor: "Forest", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "pract", label: "PR.ACT", left: 30, top: 5, status: "NO-TRADE",
    seatedLook: { skin: "Gold", hairStyle: "Messy", hairColor: "Black", shirtColor: "Gray", pantsColor: "Black", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "news", label: "NEWS", left: 57, top: 5, status: "TRADE-OK",
    seatedLook: { skin: "Dove", hairStyle: "Plain", hairColor: "White", shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "risk", label: "RISK", left: 83, top: 5, status: "NO-TRADE",
    seatedLook: { skin: "Copper", hairStyle: "Swoop", hairColor: "Black", shirtColor: "Maroon", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "exec", label: "EXEC", left: 19, top: 55, status: "NO-TRADE",
    seatedLook: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "cntr", label: "CNTR", left: 73, top: 55, status: "TRADE-OK",
    seatedLook: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
];

const CENTRAL_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Loose", hairColor: "Chestnut",
  shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black",
  seatFrame: 2, scale: 0.9,
};

/* Wire topology:
   Top-row monitor bottoms are at ~27% (5% anchor + 48px sprite + desk overlap).
   Bottom-row desk level is at ~63% (55% anchor + 24px into sprite).
   Drops connect 27% → 63%. Bottom wires sit at 63%. */
const FLOOR_WIRES: CSSProperties[] = [
  { left: "10%", top: "27%", width: "19%" },
  { left: "31%", top: "27%", width: "25%" },
  { left: "58%", top: "27%", width: "24%" },
  { left: "20%", top: "63%", width: "28%" },
  { left: "51%", top: "63%", width: "21%" },
];

const FLOOR_DROPS: CSSProperties[] = [
  { left: "19%", top: "27%", height: "36%" },
  { left: "50%", top: "27%", height: "36%" },
  { left: "73%", top: "27%", height: "36%" },
];

function assetUrl(path: string) { return encodeURI(path); }
function seatedBaseUrl(skin: string) {
  return assetUrl(`/lpc-sitting-kit/Bases/Androgynous/Recolors/${skin}/Sitting - Chair.png`);
}
function seatedClothesUrl(item: "Longsleeved Shirt" | "Pants" | "Shoes", color: string) {
  return assetUrl(`/lpc-sitting-kit/Clothes/Androgynous/Recolors/${color}/${item} - Sitting (Chair).png`);
}
function seatedHairUrl(style: string, color: string) {
  return assetUrl(`/lpc-sitting-kit/Hair/${style}/Recolors/${color}/Sitting (Chair).png`);
}
function seatedLayerStyle(imageUrl: string, frame: number, scale = 1): CSSProperties {
  return {
    "--seat-image": `url("${imageUrl}")`,
    "--seat-width": `${64 * scale}px`,
    "--seat-height": `${64 * scale}px`,
    "--seat-sheet-width": `${64 * scale}px`,
    "--seat-sheet-height": `${256 * scale}px`,
    "--seat-frame-y": `${-64 * frame * scale}px`,
  } as CSSProperties;
}

function SeatedOperator({ look, className }: { look: OperatorLook; className?: string }) {
  const scale = look.scale ?? 1;
  const layers = [
    seatedBaseUrl(look.skin),
    seatedClothesUrl("Shoes", look.shoesColor),
    seatedClothesUrl("Pants", look.pantsColor),
    seatedClothesUrl("Longsleeved Shirt", look.shirtColor),
    seatedHairUrl(look.hairStyle, look.hairColor),
  ];
  return (
    <div
      className={`${styles.seatedActor} ${className ?? ""}`}
      style={{ "--seat-actor-width": `${64 * scale}px`, "--seat-actor-height": `${64 * scale}px` } as CSSProperties}
      aria-hidden="true"
    >
      {layers.map((url, i) => (
        <span key={i} className={styles.seatedLayer} style={seatedLayerStyle(url, look.seatFrame, scale)} />
      ))}
    </div>
  );
}

/* Station layout (flex-direction: column):
   1. spriteWrap — character at visual TOP, z-index:0
   2. monitorGroup — desk+monitor pulled UP 24px (margin-top:-24px), z-index:1
      → monitor bezel covers character's lower body
      → character's head/shoulders remain visible above the bezel
   3. Connection point for wires is at the bottom of monitorGroup */

const STATION_TO_DRAWER: Record<string, string> = {
  trend: "trend", pract: "smc", news: "news",
  risk: "risk", exec: "execution", cntr: "contrarian",
};

export function PixelTradingFloor({ onAgentClick }: { onAgentClick?: (agentId: string) => void }) {
  const [selectedId, setSelectedId] = useState("risk");

  return (
    <main className={styles.root}>
      <div className={styles.sceneFrame}>
        <section className={styles.scene} aria-label="Trading floor">

          <div className={styles.topHeader}>
            <span>TRDX://WAR-ROOM</span>
            <div className={styles.headerLights} aria-hidden="true">
              <span className={styles.headerRed} />
              <span className={styles.headerAmber} />
              <span className={styles.headerGreen} />
            </div>
          </div>

          <div className={styles.upperFloor}>
            <div className={styles.wallDisplay} aria-hidden="true" />

            {FLOOR_WIRES.map((w, i) => <span key={`w${i}`} className={styles.floorWire} style={w} />)}
            {FLOOR_DROPS.map((d, i) => <span key={`d${i}`} className={styles.floorDrop} style={d} />)}

            {STATION_BLUEPRINTS.map((station) => {
              const isSelected = selectedId === station.id;
              const ok = station.status === "TRADE-OK";
              return (
                <button
                  key={station.id}
                  type="button"
                  className={`${styles.stationPod} ${isSelected ? styles.stationSelected : ""}`}
                  style={{ left: `${station.left}%`, top: `${station.top}%` }}
                  onClick={() => { setSelectedId(station.id); onAgentClick?.(STATION_TO_DRAWER[station.id] ?? station.id); }}
                  aria-pressed={isSelected}
                >
                  <div className={`${styles.stationBody} ${isSelected ? styles.stationBodySelected : ""}`}>

                    {/* 1. Character sprite — at the TOP, head visible above desk */}
                    <div className={styles.spriteWrap}>
                      <SeatedOperator look={station.seatedLook} className={styles.stationSprite} />
                    </div>

                    {/* 2. Desk + monitor — pulled UP 24px to overlap character's lower body.
                           z-index:1 ensures it paints over the sprite's filter stacking context. */}
                    <div className={styles.monitorGroup}>
                      <div className={`${styles.monitorBezel} ${ok ? styles.monitorOk : styles.monitorNoTrade}`}>
                        <div className={styles.monitorScreen} />
                        <span className={ok ? styles.monitorLabelOk : styles.monitorLabelBad}>{station.label}</span>
                        <span className={`${styles.statusLed} ${ok ? styles.ledOk : styles.ledNoTrade}`} aria-hidden="true" />
                      </div>
                      <div className={styles.monitorNeck} />
                      <div className={styles.monitorBase} />
                    </div>

                    {station.id === "risk" && (
                      <div className={styles.riskBadge} aria-hidden="true">!</div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* ── Master desk ── */}
            <button type="button" className={styles.masterDesk} onClick={() => onAgentClick?.("master")}>
              {/* Same pattern: sprite at top, monitor overlapping lower body */}
              <div className={styles.masterSpriteWrap}>
                <SeatedOperator look={CENTRAL_LOOK} className={styles.masterSeatedSprite} />
              </div>
              <div className={styles.monitorGroup}>
                <div className={`${styles.monitorBezel} ${styles.masterBezel}`}>
                  <div className={styles.monitorScreen} />
                  <span className={styles.masterLabel}>MASTER</span>
                  <span className={`${styles.statusLed} ${styles.ledOk} ${styles.masterLed}`} aria-hidden="true" />
                </div>
                <div className={styles.monitorNeck} />
                <div className={styles.monitorBase} />
              </div>
            </button>

            <div className={styles.floorWordmark}>TRADING FLOOR</div>
          </div>

        </section>
      </div>
    </main>
  );
}
