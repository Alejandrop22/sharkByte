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
  sst: number;
  chl: number;

};

type SharkPosition = {
  lat: number;
  lon: number;
  nextIndex: number;
};

const MIN_OFFSET = 0;
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
// --- Obtener predicciones del backend ---
type Prediction = {
  id: number;
  lat_next: number;
  lon_next: number;
  sst_next?: number;
  chl_next?: number;
};

useEffect(() => {
  // ⚠️ Solo de prueba: simula ubicaciones iniciales de tiburones
  setData([
    { ID: 159826, lat: 27.5, lon: -90.0, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    { ID: 120880, lat: 26.8, lon: -89.2, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    // { ID: 132414, lat: 25.9, lon: -88.5, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    { ID: 129957, lat: 28.2, lon: -91.1, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    // { ID: 169320, lat: 29.0, lon: -89.5, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
// { ID: 132416, lat: 24.5, lon: -87.0, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    { ID: 146598, lat: 26.0, lon: -86.5, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    { ID: 151420, lat: 28.5, lon: -92.0, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    { ID: 160314, lat: 27.0, lon: -88.0, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },
    // { ID: 120885, lat: 25.5, lon: -85.5, datetime: new Date().toISOString(), sst: 25.3, chl: .8 },


    
  ]);
}, []);


useEffect(() => {
  if (!data.length) return;

  async function getPredictions() {
    try {
      const predictions: Prediction[] = [];

      // IDs únicos de tiburones
      const uniqueIDs = Array.from(new Set(data.map((t) => t.ID))).slice(0, 8);

      for (const id of uniqueIDs) {
        // Última posición conocida: si el tiburón ya tiene posición animada, usa esa
        const lastPosition = sharks[id]
          ? { lat: sharks[id].lat, lon: sharks[id].lon }
          : data
              .filter((t) => t.ID === id)
              .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0];

        if (!lastPosition) continue;

        const res = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            lat: lastPosition.lat,
            lon: lastPosition.lon,
            hour: new Date().getHours(),
            month: new Date().getMonth() + 1,
            sst: 25.0,
            chl: 0.8,
          }),
        });

        const json = await res.json();
        predictions.push(json);

        // Actualizar data para que la próxima predicción use la nueva posición
        setData((prev) => [
          ...prev,
          {
            ID: json.id,
            lat: json.lat_next,
            lon: json.lon_next,
            datetime: new Date().toISOString(),
            sst: json.sst_next ?? 25,
            chl: json.chl_next ?? 0.8,
          },
        ]);
      }

      console.log("Predicciones recibidas:", predictions);

      // Actualizar posiciones en el mapa
      setSharks((prev) => {
        const updated = { ...prev };
        predictions.forEach((p) => {
          if (!p.lat_next || !p.lon_next) return;
          updated[p.id] = {
            lat: p.lat_next,
            lon: p.lon_next,
            nextIndex: 0,
          };
        });
        return updated;
      });
    } catch (err) {
      console.error("Error obteniendo predicciones:", err);
    }
  }

  // ⚠️ Llamar cada 5 segundos, por ejemplo, para simular movimiento continuo
  const interval = setInterval(getPredictions, 5000);
  return () => clearInterval(interval);
}, [data, sharks]);



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
          min={0}
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
