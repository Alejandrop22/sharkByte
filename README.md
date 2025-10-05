# SharkMap – Interactive Shark Tracker

SharkMap is an interactive web application built with React, Next.js, and React Leaflet that visualizes shark movements in the Gulf of Mexico. It allows users to track the positions of tagged sharks in real time and explore historical or predictive data based on week offsets.

## Features

* Interactive Map
Displays shark locations on a zoomable and scrollable Leaflet map with custom shark icons.

* Week-Based Offset
Users can scroll or use the range slider to view shark positions in different weeks, allowing visualization of past, present, and predicted movements.

* Custom Shark Naming
Users can assign custom names to sharks for personalized tracking.

* Dynamic Data Handling
Fetches and processes shark tracking data from a JSON source (seguimiento_filtrado.json), ensuring proper filtering and sorting by timestamps.

* Smooth Animations
Sharks move smoothly between data points using a frame-by-frame animation system.

## Technologies Used

* React – Frontend framework for building the user interface.

* Next.js – Handles server-side rendering and routing.

* React Leaflet – Integrates Leaflet maps into React components.

* Leaflet – Interactive map library.

* TypeScript – Strong typing for better maintainability and error reduction.