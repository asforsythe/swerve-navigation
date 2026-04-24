import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSwerveStore = create(
  persist(
    (set, get) => ({
      // Map state
      map: {
        loaded: false,
        bounds: null,
        cameraMarkers: [],
        weatherOverlays: [],
      },

      // Weather state
      weather: {
        current: null,
        forecast: null,
        severeAlerts: [],
        lastUpdated: null,
        isLoading: false,
        error: null,
      },

      // Traffic state
      traffic: {
        cameras: [],
        selectedCamera: null,
        isLoading: false,
        error: null,
      },

      // Route state
      route: {
        path: null,
        waypoints: [],
        isOptimized: false,
        weatherImpact: null,
      },

      // Polling state
      polling: {
        weatherInterval: null,
        cameraInterval: null,
        isActive: false,
        weatherLastPoll: null,
        cameraLastPoll: null,
      },

      // Theme state
      theme: 'dark',
      mapTheme: 'mapbox://styles/mapbox/dark-v11',

      // Voice mute state
      isMuted: false,

      // Route telemetry
      routeTelemetry: {
        ssi: 100,
        traction: 100,
        roadTemp: null,
        fastestSsi: 100,
        duration: null,
        distance: null,
        modeEtas: { driving: null, cycling: null, walking: null },
        lastUpdated: null,
      },

      // Saved routes
      savedRoutes: [],

      // Notifications
      notifications: [],

      // Toast messages
      toasts: [],

      // Voice command state
      voiceCommand: {
        isListening: false,
        lastTranscript: null,
      },

      // Push notification permission
      notificationPermission: 'default',

      // Radar frame animation state
      radar: {
        frames: [],
        currentFrameIndex: 0,
        isPlaying: false,
        lastFetch: null,
      },

      // Weather layer toggles
      weatherLayers: {
        precip: false,
        wind: false,
        clouds: false,
        lightning: false,
        nws: false,
        nexrad: false,
        stormTracker: false,
      },

      // Shareable moments (captured after extreme SSI routes)
      moments: [],

      // Last completed route report (for SafetyReportPanel)
      lastRouteReport: null,

      // 24hr weather history (for WeatherReplayPanel)
      weatherHistory: [],

      // UI State
      ui: {
        showTelemetry: true,
        showRouteEngine: true,
        activePanel: null,
        showWeatherLayers: false,
        showWeatherDetail: false,
        showSafetyReport: false,
        showWeatherReplay: false,
        showMomentCapture: false,
      },

      // Actions
      setMapLoaded: () => set({ map: { ...get().map, loaded: true } }),

      addCameraMarker: (marker) =>
        set({
          traffic: { ...get().traffic, cameras: [...get().traffic.cameras, marker] },
        }),

      clearCameraMarkers: () =>
        set({
          traffic: { ...get().traffic, cameras: [] },
        }),

      setWeather: (weatherData) =>
        set({ weather: { ...get().weather, ...weatherData } }),

      setRoute: (routeData) =>
        set({ route: { ...get().route, ...routeData } }),

      setPollingActive: () =>
        set({ polling: { ...get().polling, isActive: true } }),

      setPollingInactive: () =>
        set({ polling: { ...get().polling, isActive: false } }),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          const newMapTheme =
            newTheme === 'light'
              ? 'mapbox://styles/mapbox/light-v11'
              : 'mapbox://styles/mapbox/dark-v11';
          return { theme: newTheme, mapTheme: newMapTheme };
        }),

      setMapTheme: (mapTheme) => set({ mapTheme }),

      toggleMute: () => set({ isMuted: !get().isMuted }),

      setRouteTelemetry: (telemetry) =>
        set({
          routeTelemetry: {
            ...get().routeTelemetry,
            ...telemetry,
            lastUpdated: Date.now(),
          },
        }),

      setModeEtas: (modeEtas) =>
        set({
          routeTelemetry: {
            ...get().routeTelemetry,
            modeEtas,
            lastUpdated: Date.now(),
          },
        }),

      saveRoute: (route) =>
        set({
          savedRoutes: [...get().savedRoutes, { ...route, savedAt: Date.now() }],
        }),

      deleteRoute: (routeId) =>
        set({
          savedRoutes: get().savedRoutes.filter((r) => r.id !== routeId),
        }),

      addNotification: (notification) =>
        set({
          notifications: [
            ...get().notifications,
            { ...notification, id: Date.now(), read: false },
          ],
        }),

      clearNotification: (notificationId) =>
        set({
          notifications: get().notifications.filter((n) => n.id !== notificationId),
        }),

      markNotificationRead: (notificationId) =>
        set({
          notifications: get().notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }),

      addToast: (toast) => {
        const id = Date.now() + Math.random();
        set({ toasts: [...get().toasts, { ...toast, id }] });
        setTimeout(() => {
          set({ toasts: get().toasts.filter((t) => t.id !== id) });
        }, toast.duration || 3000);
        return id;
      },

      removeToast: (id) =>
        set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      setVoiceListening: (isListening) =>
        set({
          voiceCommand: { ...get().voiceCommand, isListening },
        }),

      setVoiceTranscript: (transcript) =>
        set({
          voiceCommand: { ...get().voiceCommand, lastTranscript: transcript },
        }),

      setNotificationPermission: (permission) =>
        set({ notificationPermission: permission }),

      setUiState: (uiState) =>
        set({ ui: { ...get().ui, ...uiState } }),

      setRadarFrames: (frames) =>
        set({ radar: { ...get().radar, frames, lastFetch: Date.now() } }),

      setRadarFrameIndex: (indexOrFn) =>
        set((state) => {
          const index =
            typeof indexOrFn === 'function'
              ? indexOrFn(state.radar.currentFrameIndex)
              : indexOrFn;
          return { radar: { ...state.radar, currentFrameIndex: index } };
        }),

      setRadarPlaying: (isPlaying) =>
        set({ radar: { ...get().radar, isPlaying } }),

      setWeatherLayer: (layer, visible) =>
        set({ weatherLayers: { ...get().weatherLayers, [layer]: visible } }),

      setWeatherLayers: (layers) =>
        set({ weatherLayers: { ...get().weatherLayers, ...layers } }),

      // Phase 2 actions
      setLastRouteReport: (report) => set({ lastRouteReport: report }),

      captureRouteMoment: (moment) =>
        set({
          moments: [
            { ...moment, id: Date.now(), capturedAt: Date.now() },
            ...get().moments,
          ].slice(0, 20),
        }),

      deleteMoment: (id) =>
        set({ moments: get().moments.filter((m) => m.id !== id) }),

      setWeatherHistory: (history) => set({ weatherHistory: history }),
    }),
    {
      name: 'swerve-storage-v3',
      version: 3,
      migrate: (persistedState, version) => {
        // Discard any state from older versions to pick up new mapbox:// style defaults
        if (version < 3) {
          return {
            ...persistedState,
            mapTheme: 'mapbox://styles/mapbox/dark-v11',
            theme: 'dark',
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        theme: state.theme,
        mapTheme: state.mapTheme,
        isMuted: state.isMuted,
        savedRoutes: state.savedRoutes,
        notificationPermission: state.notificationPermission,
        moments: state.moments,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate mapTheme — accept mapbox:// style URLs only
          const validDark = 'mapbox://styles/mapbox/dark-v11';
          const validLight = 'mapbox://styles/mapbox/light-v11';
          const isValidUrl =
            state.mapTheme === validDark ||
            state.mapTheme === validLight ||
            state.mapTheme?.startsWith('mapbox://styles/mapbox/');
          if (!isValidUrl) {
            state.mapTheme = state.theme === 'light' ? validLight : validDark;
          }
          // Validate theme
          if (state.theme !== 'dark' && state.theme !== 'light') {
            state.theme = 'dark';
            state.mapTheme = validDark;
          }
        }
      },
    }
  )
);

export default useSwerveStore;
