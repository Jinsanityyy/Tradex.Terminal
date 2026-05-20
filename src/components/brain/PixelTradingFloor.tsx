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
    id: "exec", label: "EXEC", left: 19, top: 57, status: "NO-TRADE",
    seatedLook: { skin: "Coffee", hairStyle: "Buzzcut", hairColor: "Black", shirtColor: "Navy", pantsColor: "Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
  {
    id: "cntr", label: "CNTR", left: 73, top: 57, status: "TRADE-OK",
    seatedLook: { skin: "Sienna", hairStyle: "Curly Short", hairColor: "Chestnut", shirtColor: "Purple", pantsColor: "Blue Gray", shoesColor: "Black", seatFrame: 2, scale: 0.75 },
  },
];

const CENTRAL_LOOK: OperatorLook = {
  skin: "Ivory", hairStyle: "Loose", hairColor: "Chestnut",
  shirtColor: "Teal", pantsColor: "Gray", shoesColor: "Black",
  seatFrame: 2, scale: 0.9,
};

const FLOOR_WIRES: CSSProperties[] = [
  { left: "10%", top: "27%", width: "19%" },
  { left: "31%", top: "27%", width: "25%" },
  { left: "58%", top: "27%", width: "24%" },
  { left: "20%", top: "73%", width: "28%" },
  { left: "51%", top: "73%", width: "21%" },
];

const FLOOR_DROPS: CSSProperties[] = [
  { left: "19%", top: "27%", height: "46%" },
  { left: "50%", top: "27%", height: "46%" },
  { left: "73%", top: "27%", height: "46%" },
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

                    {/* DOM order: keyboard → sprite → monitor
                        flex-direction: column-reverse makes DOM-last appear at top.
                        Paint order follows DOM: keyboard behind sprite behind monitor. */}

                    <div className={styles.stationKeyboard} aria-hidden="true" />

                    <div className={styles.spriteWrap}>
                      <SeatedOperator look={station.seatedLook} className={styles.stationSprite} />
                    </div>

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
              {/* Same column-reverse trick: keyboard → sprite → monitor in DOM */}
              <div className={styles.stationKeyboard} aria-hidden="true" />
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
