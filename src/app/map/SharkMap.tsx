"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import Adopt from "@/app/map/Adopt";

const sharkIcon = new L.Icon({
  iconUrl: "/shark.png",
  iconSize: [30, 50],
});

const animals = [
  "Blue tang surgeonfish",
  "Five-band surgeonfish",
  "Thresher shark",
  "Porkfish",
  "Sheepshead",
  "West Atlantic trumpetfish",
  "Grey triggerfish",
  "Queen triggerfish",
  "Roughtail stingray",
  "Spanish hogfish",
  "Eyed flounder",
  "Blue runner",
  "Crevalle jack",
  "Horse-eye jack",
  "Silky shark",
  "Bull shark",
  "Sandbar shark",
  "Common snook",
  "Cherubfish",
  "Foureye butterflyfish",
  "Common dolphinfish",
  "Flying gurnard",
  "Porcupinefishes",
  "Live sharksucker",
  "Atlantic goliath grouper",
  "Little tunny",
  "Tropical two-wing flyingfish",
  "Blue-spotted cornetfish",
  "Atlantic nurse shark",
  "Moray eels",
  "Grunts",
  "Seahorses",
  "Frogfish",
  "Squirrelfish",
  "Queen angelfish",
  "Rock beauty",
  "Longspine squirrelfish",
  "Caesar grunt",
  "French grunt",
  "White grunt",
  "Sailfish",
  "Red snapper",
  "Tarpon",
  "Ocean sunfish",
  "Black grouper",
  "Pilotfish",
  "Yellowtail snapper",
  "Polka-dot batfish",
  "Yellowhead jawfish",
  "Red porgy",
  "French angelfish",
  "Bluefish",
  "Blue shark",
  "Pelagic stingray",
  "Atlantic bonito",
  "Atlantic chub mackerel",
  "Lookdown",
  "Greater amberjack",
  "Longfin yellowtail",
  "Belted sandbass",
  "Great barracuda",
  "Longfin damselfish",
  "Bicolor damselfish",
  "Threespot damselfish",
  "Leaf scorpionfish",
  "Yellowfin tuna"
];

type Tiburon = {
  ID: number;
  lat: number;
  lon: number;
  datetime: string;
  code: string;
};

type SharkPosition = {
  lat: number;
  lon: number;
  nextIndex: number;
};

const MIN_OFFSET = -2;
const MAX_OFFSET = 8;

export default function SharkMap() {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [data, setData] = useState<Tiburon[]>([]);
  const [sharks, setSharks] = useState<Record<number, SharkPosition>>({});
  const animationRef = useRef<number | null>(null);

  const [sharkNames, setSharkNames] = useState<Record<number, string>>({});
  const [sharkAnimals, setSharkAnimals] = useState<Record<number, string[]>>({});

  // Genera 4 animales aleatorios
  function getRandomAnimals(): string[] {
    const copy = [...animals];
    const result: string[] = [];
    for (let i = 0; i < 4; i++) {
      if (copy.length === 0) break;
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  const handleNameSet = (id: number, name: string) => {
    setSharkNames((prev) => ({ ...prev, [id]: name }));
  };

  // --- Load & clean data ---
  useEffect(() => {
    fetch("/seguimiento_filtrado.json")
      .then((res) => res.json())
      .then((json: any[]) => {
        const cleaned: Tiburon[] = json
          .filter(
            (t) =>
              (typeof t.Lat === "number" || typeof t.lat === "number") &&
              (typeof t.Lon === "number" || typeof t.lon === "number")
          )
          .map((t) => ({
            ID: Number(t.ID),
            lat: Number(t.Lat ?? t.lat),
            lon: Number(t.Lon ?? t.lon),
            datetime: String(t.datetime),
            code: String(t.code ?? ""),
          }));

        cleaned.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

        setData(cleaned);

        // Inicializar posiciones
        const uniqueIDs = Array.from(new Set(cleaned.map((t) => t.ID)));
        const initialPositions: Record<number, SharkPosition> = {};
        uniqueIDs.forEach((id) => {
          const positions = cleaned.filter((t) => t.ID === id);
          if (positions.length) {
            initialPositions[id] = {
              lat: positions[0].lat,
              lon: positions[0].lon,
              nextIndex: 1
            };
            setSharkAnimals((prev) => ({
              ...prev,
              [id]: getRandomAnimals()
            }));
          }
        });
        setSharks(initialPositions);
      })
      .catch((err) => console.error("Error cargando JSON:", err));
  }, []);

  // --- Animate sharks ---
  useEffect(() => {
    if (!data.length) return;
    const speed = 0.002;

    const animate = () => {
      setSharks((prev) => {
        const newPositions: Record<number, SharkPosition> = {};

        for (const idStr in prev) {
          const id = Number(idStr);
          const shark = prev[id];
          const positions = data.filter((t) => t.ID === id);
          if (!positions.length) continue;

          const next = positions[shark.nextIndex % positions.length];
          if (!next) continue;

          const dLat = next.lat - shark.lat;
          const dLon = next.lon - shark.lon;

          if (Math.abs(dLat) < 0.0001 && Math.abs(dLon) < 0.0001) {
            // Solo cuando llega al siguiente punto, generamos nuevos animales
            const newNextIndex = (shark.nextIndex + 1) % positions.length;
            setSharkAnimals((prevAnimals) => ({
              ...prevAnimals,
              [id]: getRandomAnimals()
            }));

            newPositions[id] = {
              lat: next.lat,
              lon: next.lon,
              nextIndex: newNextIndex
            };
          } else {
            newPositions[id] = {
              lat: shark.lat + dLat * speed,
              lon: shark.lon + dLon * speed,
              nextIndex: shark.nextIndex
            };
          }
        }

        return newPositions;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data]);

  // --- Scroll para weekOffset ---
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollMax > 0 ? scrollY / scrollMax : 0;
      const raw = Math.round(ratio * (MAX_OFFSET - MIN_OFFSET)) + MIN_OFFSET;
      const offset = Math.min(MAX_OFFSET, Math.max(0, raw));
      setWeekOffset(offset);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Ajuste de semana ---
  useEffect(() => {
    if (!data.length) return;
    setSharks((prev) => {
      const newPositions: Record<number, SharkPosition> = {};
      const ids = Array.from(new Set(data.map((d) => d.ID)));

      ids.forEach((id) => {
        const positions = data
          .filter((p) => p.ID === id)
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

        if (!positions.length) return;

        const ratio = (weekOffset - MIN_OFFSET) / (MAX_OFFSET - MIN_OFFSET);
        const idx = Math.round(ratio * (positions.length - 1));
        const clampedIdx = Math.min(Math.max(0, idx), positions.length - 1);

        const target = positions[clampedIdx];
        newPositions[id] = {
          lat: target.lat,
          lon: target.lon,
          nextIndex: Math.min(clampedIdx + 1, positions.length - 1)
        };
      });

      return newPositions;
    });
  }, [weekOffset, data]);

  const centro: [number, number] = [23.5, -90.0];

  return (
    <div className="h-screen w-full">
      <div className="absolute bottom-4 right-4 z-[1000] bg-white p-4 rounded-xl shadow">
        <label className="block mb-2 font-semibold text-black">Week: {weekOffset}</label>
        <input
          type="range"
          min={-1}
          max={7}
          value={weekOffset}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) setWeekOffset(v);
          }}
          className="w-48"
        />
        <div className="text-sm text-gray-600 mt-2">
          {weekOffset < 0
            ? `Week number #${Math.abs(weekOffset)} in past`
            : weekOffset > 0
            ? `Prediction week: #${weekOffset}`
            : "Actual week"}
        </div>
      </div>

      <MapContainer
        center={centro}
        zoom={6}
        minZoom={5}
        maxZoom={8}
        className="h-full w-full rounded-2xl shadow-lg"
        maxBounds={[[18, -98], [30.5, -78]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {Object.keys(sharks).map((idStr) => {
          const id = Number(idStr);
          const s = sharks[id];
          if (!s) return null;

          return (
            <Marker key={id} position={[s.lat, s.lon]} icon={sharkIcon}>
              <Popup>
                <Adopt
                  id={id}
                  lat={s.lat}
                  lon={s.lon}
                  existingName={sharkNames[id]}
                  onNameSet={handleNameSet}
                />
                <div className="mt-2 font-semibold text-sm">
                  <p>Nearby animals:</p>
                  <ul>
                    {(sharkAnimals[id] ?? []).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
