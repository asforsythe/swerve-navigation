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
        // Phase 5: Adventure Route
        adventureScore: null,       // 0–100 or null when in safe mode
        adventureCategory: null,    // 'Scenic'|'Exciting'|'Thrilling'|'Epic'|null
        isAdventureMode: false,
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

      // Phase 3: Community hazards
      communityHazards: [],

      // Phase 3: Intelligence feed
      intelligenceFeed: {
        items: [],
        lastUpdated: null,
        unreadCount: 0,
      },

      // Phase 3: Predictive routing
      predictiveRouting: {
        results: null,
        selectedOffset: 0,
        isLoading: false,
      },

      // Phase 3+4: Swerve score + gamification
      swerveScore: {
        total: 0,
        level: 0,            // 0=Novice 1=Scout 2=Ranger 3=Guardian 4=Legend
        badges: [],
        currentStreak: 0,    // consecutive days with a route
        longestStreak: 0,
        lastRouteDate: null, // 'YYYY-MM-DD'
        weeklyPoints: 0,
        weekStart: null,     // 'YYYY-MM-DD' (Monday of current week)
        totalRoutes: 0,
        safeRoutes: 0,       // routes with SSI >= 75
        goldenDepartures: 0,
      },

      // Phase 4: Live route share ("Track My Drive")
      liveShare: {
        id: null,
        isActive: false,
        shareUrl: null,
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
        showIntelligenceFeed: false,
        showHazardReport: false,
        showPredictiveRouting: false,
        showSwerveScore: false,  // Phase 4: score panel
        showLiveShare: false,    // Phase 4: Track My Drive
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

      // Phase 3 actions
      setCommunityHazards: (hazards) => set({ communityHazards: hazards }),

      setIntelligenceFeed: (items) =>
        set((state) => ({
          intelligenceFeed: {
            items,
            lastUpdated: Date.now(),
            unreadCount: state.ui.showIntelligenceFeed
              ? 0
              : Math.max(0, items.length - state.intelligenceFeed.items.length),
          },
        })),

      markFeedRead: () =>
        set((state) => ({
          intelligenceFeed: { ...state.intelligenceFeed, unreadCount: 0 },
        })),

      setPredictiveRouting: (data) =>
        set((state) => ({
          predictiveRouting: { ...state.predictiveRouting, ...data },
        })),

      // Legacy: kept for useCommunityHazards Hazard Scout badge
      awardBadge: (badge) =>
        set((state) => {
          const sc = state.swerveScore;
          if (sc.badges.includes(badge)) return {};
          return {
            swerveScore: {
              ...sc,
              badges: [...sc.badges, badge],
              total: sc.total + 50,
            },
          };
        }),

      // Phase 4: award points after a route completes
      awardRoutePoints: ({ ssi = 0, distance = 0, isGoldenDeparture = false }) => {
        const sc = get().swerveScore;

        // ── Points ────────────────────────────────────────────────────────────
        const distanceMiles = distance / 1609.34;
        const ssiPct = Math.max(0, Math.min(100, ssi)) / 100;
        let earned = Math.max(1, Math.round(distanceMiles * ssiPct * 10));
        if (isGoldenDeparture) earned += 100;
        if (ssi >= 90) earned += 50;

        // ── Date helpers ──────────────────────────────────────────────────────
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const mondayDate = (() => {
          const d = new Date();
          const day = d.getDay(); // 0=Sun
          const diff = day === 0 ? -6 : 1 - day;
          d.setDate(d.getDate() + diff);
          return d.toISOString().slice(0, 10);
        })();

        // ── Streak ────────────────────────────────────────────────────────────
        let newStreak = sc.currentStreak;
        if (!sc.lastRouteDate || sc.lastRouteDate < yesterday) {
          newStreak = 1;
        } else if (sc.lastRouteDate === yesterday) {
          newStreak = sc.currentStreak + 1;
        }
        // else: same day — keep current streak
        const newLongest = Math.max(sc.longestStreak, newStreak);

        // ── Weekly ────────────────────────────────────────────────────────────
        const weeklyPoints = (sc.weekStart === mondayDate ? sc.weeklyPoints : 0) + earned;

        // ── Totals ────────────────────────────────────────────────────────────
        const newTotal = sc.total + earned;
        const newTotalRoutes = sc.totalRoutes + 1;
        const newSafeRoutes = ssi >= 75 ? sc.safeRoutes + 1 : sc.safeRoutes;
        const newGolden = isGoldenDeparture ? sc.goldenDepartures + 1 : sc.goldenDepartures;

        // ── Level (0–4) ───────────────────────────────────────────────────────
        const THRESHOLDS = [0, 500, 2000, 5000, 10000];
        let newLevel = 0;
        for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
          if (newTotal >= THRESHOLDS[i]) { newLevel = i; break; }
        }
        const leveledUp = newLevel > sc.level;

        // ── Badges ────────────────────────────────────────────────────────────
        const existing = new Set(sc.badges);
        const newBadgeIds = [];
        const tryBadge = (id) => { if (!existing.has(id)) { existing.add(id); newBadgeIds.push(id); } };

        if (newTotalRoutes === 1)                        tryBadge('first-route');
        if (newSafeRoutes >= 10)                         tryBadge('safe-driver');
        if (ssi <= 60)                                   tryBadge('storm-chaser');
        if (newStreak >= 3)                              tryBadge('streak-3');
        if (newStreak >= 7)                              tryBadge('streak-7');
        if (isGoldenDeparture && newGolden === 1)        tryBadge('golden-window');
        if (newTotalRoutes >= 100)                       tryBadge('centurion');
        if (leveledUp) {
          const RANK_BADGES = ['', 'scout-rank', 'ranger-rank', 'guardian-rank', 'legend-rank'];
          if (RANK_BADGES[newLevel]) tryBadge(RANK_BADGES[newLevel]);
        }

        set({
          swerveScore: {
            ...sc,
            total: newTotal,
            level: newLevel,
            badges: [...existing],
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastRouteDate: today,
            weeklyPoints,
            weekStart: mondayDate,
            totalRoutes: newTotalRoutes,
            safeRoutes: newSafeRoutes,
            goldenDepartures: newGolden,
          },
        });

        return { earned, leveledUp, newLevel, newBadgeIds };
      },

      // Phase 4: live share state
      setLiveShare: (data) =>
        set((state) => ({ liveShare: { ...state.liveShare, ...data } })),

      clearLiveShare: () =>
        set({ liveShare: { id: null, isActive: false, shareUrl: null } }),

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
      name: 'swerve-storage-v4',
      version: 4,
      migrate: (persistedState, version) => {
        let state = persistedState;
        if (version < 3) {
          state = { ...state, mapTheme: 'mapbox://styles/mapbox/dark-v11', theme: 'dark' };
        }
        if (version < 4) {
          // Merge new swerveScore fields on top of any existing total/badges
          state = {
            ...state,
            swerveScore: {
              level: 0,
              currentStreak: 0,
              longestStreak: 0,
              lastRouteDate: null,
              weeklyPoints: 0,
              weekStart: null,
              totalRoutes: 0,
              safeRoutes: 0,
              goldenDepartures: 0,
              ...(state.swerveScore || {}),
            },
          };
        }
        return state;
      },
      partialize: (state) => ({
        theme: state.theme,
        mapTheme: state.mapTheme,
        isMuted: state.isMuted,
        savedRoutes: state.savedRoutes,
        notificationPermission: state.notificationPermission,
        moments: state.moments,
        swerveScore: state.swerveScore,
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
