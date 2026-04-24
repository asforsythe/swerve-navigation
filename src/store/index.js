// Zustand Store for Swerve
// Lightweight state management for React with efficient API polling

import create from 'zustand';

const useSwerveStore = create((set, get) => ({
  // Map state
  map: {
    loaded: false,
    bounds: null,
    cameraMarkers: [],
    weatherOverlays: []
  },

  // Weather state
  weather: {
    current: null,
    forecast: null,
    severeAlerts: [],
    lastUpdated: null,
    isLoading: false,
    error: null
  },

  // Traffic state
  traffic: {
    cameras: [],
    selectedCamera: null,
    isLoading: false,
    error: null
  },

  // Route state
  route: {
    path: null,
    waypoints: [],
    isOptimized: false,
    weatherImpact: null
  },

  // Polling state
  polling: {
    weatherInterval: null,
    cameraInterval: null,
    isActive: false,
    weatherLastPoll: null,
    cameraLastPoll: null
  },

  // Actions
  setMapLoaded: () => set({ map: { ...get().map, loaded: true } }),
  
  addCameraMarker: (marker) => set({
    traffic: { ...get().traffic, cameras: [...get().traffic.cameras, marker] }
  }),
  
  clearCameraMarkers: () => set({
    traffic: { ...get().traffic, cameras: [] }
  }),
  
  setWeather: (weatherData) => set({ weather: { ...get().weather, ...weatherData } }),
  
  setRoute: (routeData) => set({ route: { ...get().route, ...routeData } }),
  
  setPollingActive: () => set({ polling: { ...get().polling, isActive: true } }),
  
  setPollingInactive: () => set({ polling: { ...get().polling, isActive: false } })
}));

export default useSwerveStore;