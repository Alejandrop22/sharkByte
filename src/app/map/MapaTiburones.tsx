"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Ícono personalizado
const sharkIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [30, 30],
});

type Tiburon = {
  lat: number;
  lon: number;
  id?: string;
};

export default function MapaTiburones() {
  const [data, setData] = useState<Tiburon[]>([]);

  // === Cargar datos del CSV (convertido a JSON) ===
  useEffect(() => {
    fetch("/tibu.json")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  // Coordenadas del centro del Golfo de México
const centro: [number, number] = [23.5, -90.0];
  return (
    <div className="h-screen w-full">
      <MapContainer
        center={[23.5, -90.0]}       // Centro del Golfo de México
        zoom={5}                     // Zoom fijo
        minZoom={5}                  // Misma que zoom
        maxZoom={5}                  // Misma que zoom
        scrollWheelZoom={false}      // Desactiva zoom con scroll
        doubleClickZoom={false}      // Desactiva zoom con doble click
        dragging={true}              // Permite mover dentro del área
        maxBounds={[[18, -98], [30.5, -78]]}  // Limites del mapa
        maxBoundsViscosity={1.0}     // No permite salirse
        className="h-full w-full rounded-2xl shadow-lg"
        style={{ border: "2px solid #ccc" }}
      >
        {/* Capa base del mapa */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de tiburones */}
        {data.map((t, i) => (
          <Marker key={i} position={[t.lat, t.lon]} icon={sharkIcon}>
            <Popup>
              🦈 Tiburón #{t.id ?? i + 1}
              <br />
              Lat: {t.lat.toFixed(2)}, Lon: {t.lon.toFixed(2)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
