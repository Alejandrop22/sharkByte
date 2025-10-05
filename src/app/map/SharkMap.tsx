"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker"; // Importa el plugin
import { useState, useEffect } from "react";
import L from "leaflet";

const sharkIcon = new L.Icon({
  iconUrl: "/shark.png",
  iconSize: [30, 45],
});

type SharkTimeline = {
  ID: number;
  positions: { lat: number; lon: number; week: number }[];
};

const dummyTimeline: SharkTimeline[] = [
  {
    ID: 1,
    positions: Array.from({ length: 9 }, (_, i) => ({
      lat: 23.5 + i * 0.1,
      lon: -90 + i * 0.1,
      week: i - 4,
    })),
  },
  {
    ID: 2,
    positions: Array.from({ length: 9 }, (_, i) => ({
      lat: 24 + i * 0.05,
      lon: -91 + i * 0.05,
      week: i - 4,
    })),
  },
];

// Función para calcular el ángulo entre dos puntos
function getAngle(from: [number, number], to: [number, number]): number {
  const dy = to[0] - from[0];
  const dx = to[1] - from[1];
  const theta = Math.atan2(dy, dx);
  return (theta * 180) / Math.PI;
}

// Componente para renderizar el marcador rotado
function RotatedSharkMarker({
  lat,
  lon,
  angle,
  id,
  week,
}: {
  lat: number;
  lon: number;
  angle: number;
  id: number;
  week: number;
}) {
  const map = useMap();

  useEffect(() => {
    const marker = L.marker([lat, lon], {
      icon: sharkIcon,
      rotationAngle: angle,
      rotationOrigin: "center",
    }).addTo(map);

    marker.bindPopup(`Tiburón #${id}<br>Semana ${week}`);

    return () => {
      map.removeLayer(marker);
    };
  }, [lat, lon, angle, id, week, map]);

  return null;
}

export default function SharkMap() {
  const [weekOffset, setWeekOffset] = useState(0);
  const centro: [number, number] = [23.5, -90.0];

  return (
    <div className="h-screen w-full relative">
      {/* Slider temporal */}
      <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-xl shadow">
        <label className="block mb-2 font-semibold">Semana: {weekOffset}</label>
        <input
          type="range"
          min={-4}
          max={4}
          value={weekOffset}
          onChange={(e) => setWeekOffset(Number(e.target.value))}
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

      {/* Mapa */}
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

        {/* Marcadores rotados */}
        {dummyTimeline.map((shark) => {
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
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
