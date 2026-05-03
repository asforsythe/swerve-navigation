import React from 'react';
import MapOverlay from './components/MapOverlay';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  // Root-level ErrorBoundary: if *anything* throws during the initial render
  // pass (e.g. Mapbox losing its WebGL context on a tight-memory iPhone),
  // the user sees the branded reload screen instead of a white page.
  return (
    <div className="w-screen overflow-hidden bg-black m-0 p-0" style={{ height: '100dvh' }}>
      <ErrorBoundary>
        <MapOverlay />
      </ErrorBoundary>
    </div>
  );
}

export default App;

