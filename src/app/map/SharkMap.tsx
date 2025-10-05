"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/lib/leaflet-rotatedmarker";
import { useEffect, useState } from "react";
import L from "leaflet";
import ReactDOM from "react-dom/client";
import Adopt from "@/app/map/Adopt";

declare module "leaflet" {
  interface MarkerOptions {
    rotationAngle?: number;
    rotationOrigin?: string;
  }
}

// Ícono de tiburón
const sharkIcon = new L.Icon({
  iconUrl: "/shark.png",
  iconSize: [30, 45],
});

type Tiburon = {
  ID: number;
  lat: number;
  lon: number;
  datetime: string;
  code: string;
  week?: number;
};

type SharkTimeline = {
  ID: number;
  positions: { lat: number; lon: number; week: number }[];
};

// Calcular ángulo de movimiento
function getAngle(from: [number, number], to: [number, number]): number {
  const dy = to[0] - from[0];
  const dx = to[1] - from[1];
  const theta = Math.atan2(dy, dx);
  return (theta * 180) / Math.PI;
}

function RotatedSharkMarker({
  lat,
  lon,
  angle,
  id,
  week,
  existingName,
  onNameSet,
}: {
  lat: number;
  lon: number;
  angle: number;
  id: number;
  week: number;
  existingName?: string;
  onNameSet: (id: number, name: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const marker = L.marker([lat, lon], {
      icon: sharkIcon,
      rotationAngle: angle,
      rotationOrigin: "center",
    }).addTo(map);

    const popupDiv = L.DomUtil.create("div", "");
    popupDiv.id = `popup-${id}`;
    marker.bindPopup(popupDiv);

    marker.on("popupopen", () => {
      const container = document.getElementById(`popup-${id}`);
      if (container) {
        const root = ReactDOM.createRoot(container);
        root.render(
          <Adopt
            id={id}
            lat={lat}
            lon={lon}
            existingName={existingName}
            onNameSet={onNameSet}
          />
        );
      }
    });

    return () => {
      map.removeLayer(marker);
    };
  }, [lat, lon, angle, id, week, existingName, onNameSet, map]);

  return null;
}

export default function SharkMap() {
  const [data, setData] = useState<Tiburon[]>([]);
  const [timeline, setTimeline] = useState<SharkTimeline[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [sharkNames, setSharkNames] = useState<Record<number, string>>({});
  const [autoPlay, setAutoPlay] = useState(true); // ✅ control del intervalo automático

  const handleNameSet = (id: number, name: string) => {
    setSharkNames((prev) => ({ ...prev, [id]: name }));
  };

  // 📥 Cargar datos del JSON
  useEffect(() => {
    fetch("/tibu.json")
      .then((res) => res.json())
      .then((json: Tiburon[]) => {
        setData(json);

        const grouped: Record<number, Tiburon[]> = {};
        json.forEach((t) => {
          if (!grouped[t.ID]) grouped[t.ID] = [];
          grouped[t.ID].push(t);
        });

        const timelines: SharkTimeline[] = Object.entries(grouped).map(
          ([id, positions]) => ({
            ID: Number(id),
            positions: positions.map((p, i) => ({
              lat: p.lat,
              lon: p.lon,
              week: i - Math.floor(positions.length / 2),
            })),
          })
        );

        setTimeline(timelines);
      });
  }, []);

  // 🎬 Auto-actualización del slider cada 2 segundos
  useEffect(() => {
    if (!autoPlay) return;

    const interval = setInterval(() => {
      setWeekOffset((prev) => {
        // ciclo entre -4 y 4
        if (prev >= 4) return -4;
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [autoPlay]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWeekOffset(Number(e.target.value));
    setAutoPlay(false); // ⏸️ pausa auto-play al mover el slider manualmente
  };

  const centro: [number, number] = [23.5, -90.0];

  return (
    <div className="h-screen w-full relative">
      {/* 🎛️ Slider temporal */}
      <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold">Semana: {weekOffset}</label>
          <button
            onClick={() => setAutoPlay((prev) => !prev)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            {autoPlay ? "Pausar" : "Reanudar"}
          </button>
        </div>

        <input
          type="range"
          min={-4}
          max={4}
          value={weekOffset}
          onChange={handleSliderChange}
          className="w-48"
        />

        <div className="text-sm text-gray-600 mt-2">
          {weekOffset < 0
            ? `Mostrando semana ${Math.abs(weekOffset)} en el pasado`
            : weekOffset > 0
            ? `Predicción para semana ${weekOffset}`
            : "Ubicación actual"}
        </div>
      </div>

      {/* 🗺️ Mapa principal */}
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

        {/* Marcadores dinámicos */}
        {timeline.map((shark) => {
          const current = shark.positions.find((p) => p.week === weekOffset);
          if (!current) return null;

          const prev = shark.positions.find((p) => p.week === weekOffset - 1);
          const next = shark.positions.find((p) => p.week === weekOffset + 1);

          const from = prev ?? next;
          const angle = from
            ? getAngle([from.lat, from.lon], [current.lat, current.lon])
            : 0;

          return (
            <RotatedSharkMarker
              key={`${shark.ID}-${weekOffset}`}
              lat={current.lat}
              lon={current.lon}
              angle={angle}
              id={shark.ID}
              week={weekOffset}
              existingName={sharkNames[shark.ID]}
              onNameSet={handleNameSet}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
