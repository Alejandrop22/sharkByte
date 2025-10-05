"use client";

import { useState } from "react";

type SharkPopupProps = {
  id: number;
  lat: number;
  lon: number;
  existingName?: string;
  onNameSet: (id: number, name: string) => void;
};

export default function Adopt({ id, lat, lon, existingName, onNameSet }: SharkPopupProps) {
  const [name, setName] = useState(existingName || "");
  const [editing, setEditing] = useState(!existingName);

  const handleSave = () => {
    if (name.trim() === "") return;
    onNameSet(id, name);
    setEditing(false);
  };

  return (
    <div>
      🦈 Tiburón #{id}
      <br />
      Lat: {lat.toFixed(2)}
      <br />
      Lon: {lon.toFixed(2)}
      <br />
      {editing ? (
        <>
          <input
            type="text"
            placeholder="Put it a name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-1 py-0.5 mt-1"
          />
          <button onClick={handleSave} className="ml-1 bg-blue-500 text-white px-2 rounded">
            Adopt
          </button>
        </>
      ) : (
        <div>Name: {name}</div>
      )}
    </div>
  );
}
