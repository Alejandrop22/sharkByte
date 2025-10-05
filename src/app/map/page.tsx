"use client";

import React from 'react'
import dynamic from "next/dynamic";

const MapaTiburones = dynamic(() => import("../map/MapaTiburones"), {
  ssr: false,
});

function page() {
  return (
    <div>
        <MapaTiburones></MapaTiburones>
    </div>
  )
}

export default page