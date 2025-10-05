"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import Adopt from "@/app/map/Adopt"

const sharkIcon = new L.Icon({
  iconUrl: "/shark.png",
  iconSize: [30, 30],
});

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

export default function SharkMap() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<Tiburon[]>([]);
  const [sharks, setSharks] = useState<Record<number, SharkPosition>>({});
  const animationRef = useRef<number | null>(null);

  const [sharkNames, setSharkNames] = useState<Record<number, string>>({});

  const handleNameSet = (id: number, name: string) => {
    setSharkNames((prev) => ({ ...prev, [id]: name }));
  };


  useEffect(() => {
    fetch("/tibu.json")
      .then((res) => res.json())
      .then((json: Tiburon[]) => {
        setData(json);

        // Inicializar posiciones solo si hay datos
        const uniqueIDs = Array.from(new Set(json.map((t) => t.ID)));
        const initialPositions: Record<number, SharkPosition> = {};
        uniqueIDs.forEach((id) => {
          const first = json.find((t) => t.ID === id);
          if (first) {
            initialPositions[id] = { lat: first.lat, lon: first.lon, nextIndex: 1 };
          }
        });
        setSharks(initialPositions);
      });
  }, []);

  useEffect(() => {
    if (!data.length) return; // No iniciar animación si no hay datos

    const speed = 0.002;

    const animate = () => {
      setSharks((prev) => {
        const newPositions: Record<number, SharkPosition> = {};

        for (const idStr in prev) {
          const id = Number(idStr);
          const shark = prev[id];
          const positions = data.filter((t) => t.ID === id);

          if (!positions.length) continue;

          // Validar que el siguiente índice exista
          const next = positions[shark.nextIndex % positions.length];
          if (!next) continue;

          const { lat, lon } = shark;
          const dLat = next.lat - lat;
          const dLon = next.lon - lon;

          if (Math.abs(dLat) < 0.0001 && Math.abs(dLon) < 0.0001) {
            newPositions[id] = {
              lat: next.lat,
              lon: next.lon,
              nextIndex: (shark.nextIndex + 1) % positions.length,
            };
          } else {
            newPositions[id] = {
              lat: lat + dLat * speed,
              lon: lon + dLon * speed,
              nextIndex: shark.nextIndex,
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

  const centro: [number, number] = [23.5, -90.0];

  return (
    <div className="h-screen w-full">
      {/* Slider */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-white p-4 rounded-xl shadow">
          <label className="block mb-2 font-semibold text-black">Week: {weekOffset}</label>
          <input
            type="range"
            min={0}
            max={8}
            value={weekOffset}
            onChange={(e) => setWeekOffset(Number(e.target.value))}
            className="w-48"
          />
          <div className="text-sm text-gray-600 mt-2">
            {weekOffset < 0
              ? `Week numer #${Math.abs(weekOffset)} in past`
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
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
