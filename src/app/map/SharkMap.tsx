"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import Adopt from "./Adopt";

const sharkIcon = new L.Icon({
  iconUrl: "/shark.svg",
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
  const [data, setData] = useState<Tiburon[]>([]);
  const [sharks, setSharks] = useState<Record<number, SharkPosition>>({});
  const [sharkNames, setSharkNames] = useState<Record<number, string>>({});
  const animationRef = useRef<number | null>(null);

  const handleNameSet = (id: number, name: string) => {
    setSharkNames((prev) => ({ ...prev, [id]: name }));
  };

  // Fetch desde la API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("https://tu-api.com/tiburones"); // <- tu API aquí
        if (!res.ok) throw new Error("Error al obtener los datos");
        const json: Tiburon[] = await res.json();
        setData(json);

        const uniqueIDs = Array.from(new Set(json.map((t) => t.ID)));
        const initialPositions: Record<number, SharkPosition> = {};
        uniqueIDs.forEach((id) => {
          const first = json.find((t) => t.ID === id);
          if (first) {
            initialPositions[id] = { lat: first.lat, lon: first.lon, nextIndex: 1 };
          }
        });
        setSharks(initialPositions);
      } catch (err) {
        console.error("Error cargando tiburones:", err);
      }
    };

    fetchData();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Animación de los tiburones
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
