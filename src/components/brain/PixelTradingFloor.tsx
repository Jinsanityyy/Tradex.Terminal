"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
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
  analyst: string;
  detail: string;
  left: number;
  top: number;
  score: number;
  status: StationStatus;
  seatedLook: OperatorLook;
};

const STATION_BLUEPRINTS: StationBlueprint[] = [
  {
    id: "trend",
    label: "TREND",
    analyst: "Macro Scout",
    detail: "Higher-timeframe structure is aligned with the active swing.",
    left: 10,
    top: 15,
    score: 52,
    status: "NO-TRADE",
    seatedLook: {
      skin: "Ivory",
      hairStyle: "Parted Short",
      hairColor: "Brown",
      shirtColor: "Forest",
      pantsColor: "Blue Gray",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
  {
    id: "pract",
    label: "PR.ACT",
    analyst: "Tape Reader",
    detail: "Micro trigger is still dirty. Wait for a cleaner reaction.",
    left: 31,
    top: 15,
    score: 41,
    status: "NO-TRADE",
    seatedLook: {
      skin: "Gold",
      hairStyle: "Messy",
      hairColor: "Black",
      shirtColor: "Gray",
      pantsColor: "Black",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
  {
    id: "news",
    label: "NEWS",
    analyst: "Catalyst Watch",
    detail: "Headline flow is stable and no fresh surprise is in play.",
    left: 58,
    top: 15,
    score: 64,
    status: "TRADE-OK",
    seatedLook: {
      skin: "Dove",
      hairStyle: "Plain",
      hairColor: "White",
      shirtColor: "Teal",
      pantsColor: "Gray",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
  {
    id: "risk",
    label: "RISK",
    analyst: "Guard Rail",
    detail: "Protect size until conflicting desks settle down.",
    left: 84,
    top: 15,
    score: 28,
    status: "NO-TRADE",
    seatedLook: {
      skin: "Copper",
      hairStyle: "Swoop",
      hairColor: "Black",
      shirtColor: "Maroon",
      pantsColor: "Gray",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
  {
    id: "exec",
    label: "EXEC",
    analyst: "Entry Pilot",
    detail: "Wait until the trigger desk confirms the entry lane.",
    left: 24,
    top: 43,
    score: 36,
    status: "NO-TRADE",
    seatedLook: {
      skin: "Coffee",
      hairStyle: "Buzzcut",
      hairColor: "Black",
      shirtColor: "Navy",
      pantsColor: "Gray",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
  {
    id: "cntr",
    label: "CNTR",
    analyst: "Contrarian Desk",
    detail: "Crowding risk is low enough for a controlled fade if needed.",
    left: 61,
    top: 43,
    score: 57,
    status: "TRADE-OK",
    seatedLook: {
      skin: "Sienna",
      hairStyle: "Curly Short",
      hairColor: "Chestnut",
      shirtColor: "Purple",
      pantsColor: "Blue Gray",
      shoesColor: "Black",
      seatFrame: 0,
    },
  },
];

const CENTRAL_LOOK: OperatorLook = {
  skin: "Ivory",
  hairStyle: "Loose",
  hairColor: "Chestnut",
  shirtColor: "Teal",
  pantsColor: "Gray",
  shoesColor: "Black",
  seatFrame: 2,
};


const FLOOR_WIRES: CSSProperties[] = [
  { left: "11%", top: "30%", width: "16%" },
  { left: "34%", top: "30%", width: "13%" },
  { left: "48%", top: "30%", width: "17%" },
  { left: "18%", top: "54%", width: "19%" },
  { left: "43%", top: "54%", width: "21%" },
];

const FLOOR_DROPS: CSSProperties[] = [
  { left: "27%", top: "30%", height: "26%" },
  { left: "48%", top: "22%", height: "34%" },
  { left: "65%", top: "30%", height: "22%" },
];


function toggleStatus(status: StationStatus): StationStatus {
  return status === "TRADE-OK" ? "NO-TRADE" : "TRADE-OK";
}


function assetUrl(path: string) {
  return encodeURI(path);
}

function seatedBaseUrl(skin: string) {
  return assetUrl(`/lpc-sitting-kit/Bases/Androgynous/Recolors/${skin}/Sitting - Chair.png`);
}

function seatedClothesUrl(item: "Longsleeved Shirt" | "Pants" | "Shoes", color: string) {
  return assetUrl(
    `/lpc-sitting-kit/Clothes/Androgynous/Recolors/${color}/${item} - Sitting (Chair).png`
  );
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

function SeatedOperator({
  look,
  className,
}: {
  look: OperatorLook;
  className?: string;
}) {
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
      style={
        {
          "--seat-actor-width": `${64 * scale}px`,
          "--seat-actor-height": `${64 * scale}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {layers.map((imageUrl, index) => (
        <span
          key={`${imageUrl}-${index}`}
          className={styles.seatedLayer}
          style={seatedLayerStyle(imageUrl, look.seatFrame, scale)}
        />
      ))}
    </div>
  );
}

const STATION_TO_DRAWER: Record<string, string> = {
  trend: "trend",
  pract: "smc",
  news:  "news",
  risk:  "risk",
  exec:  "execution",
  cntr:  "contrarian",
};

export function PixelTradingFloor({ onAgentClick }: { onAgentClick?: (agentId: string) => void }) {
  const [stations, setStations] = useState(STATION_BLUEPRINTS);
  const [selectedId, setSelectedId] = useState("risk");
  useEffect(() => {
    const statusTimer = window.setInterval(() => {
      setStations((current) => {
        const nextIndex = Math.floor(Math.random() * current.length);
        const companionIndex = (nextIndex + 2) % current.length;

        return current.map((station, index) => {
          const shouldFlip =
            index === nextIndex || (index === companionIndex && Math.random() > 0.68);

          if (!shouldFlip || station.id === "risk") {
            return station;
          }

          return {
            ...station,
            status: toggleStatus(station.status),
          };
        });
      });
    }, 2_600);

    return () => window.clearInterval(statusTimer);
  }, []);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedId) ?? stations[0],
    [selectedId, stations]
  );

  const boardSignal = selectedStation.status;
  const boardScore =
    selectedStation.status === "TRADE-OK"
      ? selectedStation.score
      : -Math.abs(82 - selectedStation.score);

  return (
    <main className={styles.root}>
      <div className={styles.sceneFrame}>
        <section className={styles.scene} aria-label="Premium pixel trading terminal">
          <div className={styles.topHeader}>
            <span className={styles.headerTitle}>TRDX://WAR-ROOM</span>
            <div className={styles.headerLights} aria-hidden="true">
              <span className={styles.headerRed} />
              <span className={styles.headerAmber} />
              <span className={styles.headerGreen} />
            </div>
          </div>

          <div className={styles.upperFloor}>
            {FLOOR_WIRES.map((wire, index) => (
              <span key={`wire-${index}`} className={styles.floorWire} style={wire} />
            ))}

            {FLOOR_DROPS.map((wire, index) => (
              <span key={`drop-${index}`} className={styles.floorDrop} style={wire} />
            ))}

            {stations.map((station) => {
              const isSelected = selectedStation.id === station.id;
              const statusClass =
                station.status === "TRADE-OK" ? styles.monitorOk : styles.monitorNoTrade;
              const ledClass =
                station.status === "TRADE-OK" ? styles.ledOk : styles.ledNoTrade;

              return (
                <button
                  key={station.id}
                  type="button"
                  className={`${styles.stationPod} ${isSelected ? styles.stationSelected : ""}`}
                  style={{ left: `${station.left}%`, top: `${station.top}%` }}
                  onClick={() => {
                    setSelectedId(station.id);
                    onAgentClick?.(STATION_TO_DRAWER[station.id] ?? station.id);
                  }}
                  aria-pressed={isSelected}
                >
                  <div
                    className={`${styles.stationBody} ${
                      station.id === "risk" ? styles.riskBody : ""
                    } ${isSelected ? styles.stationBodySelected : ""}`}
                  >
                    <div className={`${styles.stationMonitor} ${statusClass}`}>{station.status}</div>
                    <span className={`${styles.statusLed} ${ledClass}`} aria-hidden="true" />
                    <span className={styles.stationTerminalLeft} aria-hidden="true" />
                    <span className={styles.stationTerminalRight} aria-hidden="true" />
                    <span className={styles.stationWire} aria-hidden="true" />
                    <div className={styles.stationChair} aria-hidden="true" />
                    <SeatedOperator look={station.seatedLook} className={styles.stationSprite} />
                    <div className={styles.stationDeskSurface} />
                    {station.id === "risk" ? (
                      <div className={styles.riskBadge} aria-hidden="true">
                        !
                      </div>
                    ) : null}
                  </div>
                  <span className={styles.stationLabel}>{station.label}</span>
                </button>
              );
            })}

            <div className={styles.masterDesk} aria-hidden="true">
              <span className={`${styles.statusLed} ${styles.ledOk} ${styles.masterLedA}`} />
              <span className={`${styles.statusLed} ${styles.ledOk} ${styles.masterLedB}`} />
              <span className={`${styles.statusLed} ${styles.ledNoTrade} ${styles.masterLedC}`} />
              <span className={styles.masterTerminalLeft} />
              <span className={styles.masterTerminalRight} />
              <div className={styles.masterChair} />
              <SeatedOperator look={CENTRAL_LOOK} className={styles.masterSeatedSprite} />
              <div className={styles.masterDeskSurface} />
              <div className={styles.masterKeyboard} />
            </div>

            <div className={styles.statusBoard}>
              <div className={styles.boardHeader}>
                <span>MASTER - CMD</span>
                <span className={styles.boardOrb} />
              </div>
              <div
                className={`${styles.boardSignal} ${
                  boardSignal === "TRADE-OK" ? styles.boardGood : styles.boardBad
                }`}
              >
                {boardSignal}
              </div>
              <div className={styles.boardCopy}>{selectedStation.detail}</div>
              <div className={styles.boardMeta}>
                <span>{selectedStation.label}</span>
                <span>{selectedStation.analyst}</span>
                <span>
                  SCORE {boardScore > 0 ? "+" : ""}
                  {boardScore}.0
                </span>
              </div>
            </div>

            <div className={styles.floorWordmark}>TRADING FLOOR</div>
          </div>

        </section>
      </div>
    </main>
  );
}
