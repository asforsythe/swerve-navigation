import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import useSwerveStore from '../../store/useSwerveStore';

const POLL_MS     = 90_000;  // 90 seconds
const NWS_POLL_MS = 300_000; // NWS polls at 5-min cadence — independent of GPS updates
const USER_AGENT  = 'Swerve-NeuralCoPilot (contact@bradfordinformedguidance.com)';
const NWS_HEADERS = { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' };

const SEVERITY_STYLES = {
  high:   { dot: 'bg-rose-500',    label: 'text-rose-400',    border: 'border-rose-500/30'    },
  medium: { dot: 'bg-amber-400',   label: 'text-amber-400',   border: 'border-amber-400/30'   },
  low:    { dot: 'bg-blue-400',    label: 'text-blue-400',    border: 'border-blue-400/30'    },
};

const SOURCE_ICONS = {
  nws:       { icon: '⛈', color: '#f87171', label: 'NWS'       },
  community: { icon: '👥', color: '#a78bfa', label: 'Community' },
  road511:   { icon: '📷', color: '#22d3ee', label: 'Road511'   },
};

function fmtAge(ts) {
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); }
  catch { return ''; }
}

export default function IntelligenceFeed({ speak, userLoc }) {
  const { ui, setUiState, markFeedRead, intelligenceFeed, setIntelligenceFeed } = useSwerveStore();
  const show         = ui?.showIntelligenceFeed ?? false;
  const items        = useMemo(() => intelligenceFeed?.items ?? [], [intelligenceFeed?.items]);
  const unread       = intelligenceFeed?.unreadCount ?? 0;

  const [expanded, setExpanded]   = useState(null); // id of expanded item
  const scrollRef                 = useRef(null);
  const prevItemsRef              = useRef([]);
  const timerRef                  = useRef(null);
  const nwsTimerRef               = useRef(null);
  const nwsAlertsRef              = useRef([]);   // cached NWS alerts (updated independently)
  const nwsZoneRef                = useRef(null); // cached zone ID (e.g. "FLZ142") — stable per location
  const spokenRef                 = useRef(new Set());

  // ── NWS fetch — two-step: /points → zone ID → /alerts/active?zone=... ────────
  const fetchNws = useCallback(async (loc) => {
    if (!loc) return;
    try {
      const [lng, lat] = loc;

      // Step 1: resolve zone ID if not already cached
      if (!nwsZoneRef.current) {
        const ptRes = await fetch(
          `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
          { headers: NWS_HEADERS }
        );
        if (!ptRes.ok) return;
        const ptCt = ptRes.headers.get('content-type') ?? '';
        if (!ptCt.includes('application/json')) return;
        const ptData = await ptRes.json();
        const zoneUrl = ptData?.properties?.forecastZone; // e.g. ".../zones/forecast/FLZ142"
        if (!zoneUrl) return;
        nwsZoneRef.current = zoneUrl.split('/').pop(); // "FLZ142"
      }

      // Step 2: fetch active alerts for this zone
      const alertRes = await fetch(
        `https://api.weather.gov/alerts/active?zone=${nwsZoneRef.current}&status=actual&message_type=alert&limit=10`,
        { headers: NWS_HEADERS }
      );
      if (!alertRes.ok) return;
      const alertCt = alertRes.headers.get('content-type') ?? '';
      if (!alertCt.includes('application/json')) return;
      const data = await alertRes.json();

      nwsAlertsRef.current = (data.features || []).slice(0, 8).map(f => {
        const p = f.properties || {};
        return {
          id:         `nws-${f.id}`,
          source:     'nws',
          type:       p.event || 'Weather Alert',
          severity:   p.severity === 'Extreme' || p.severity === 'Severe' ? 'high' : 'medium',
          title:      p.event || 'NWS Alert',
          detail:     p.headline || p.description?.slice(0, 160) || '',
          distanceKm: null,
          timestamp:  p.sent || new Date().toISOString(),
        };
      });
    } catch { /* NWS can be flaky — silently skip */ }
  }, []);

  // ── Fetch community hazards and merge with cached NWS ────────────────────
  const fetchFeed = useCallback(async () => {
    const merged = [...nwsAlertsRef.current];

    if (userLoc) {
      try {
        const [lng, lat] = userLoc;
        const res = await fetch(`/api/intelligence-feed?lat=${lat}&lng=${lng}&radius=80`);
        if (res.ok) {
          const ct = res.headers.get('content-type') ?? '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            merged.push(...data);
          }
        }
      } catch { /* server not running — degrade gracefully */ }
    }

    // Deduplicate and sort
    const seen = new Set();
    const deduped = merged.filter(i => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
    deduped.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (b.severity === 'high' && a.severity !== 'high') return 1;
      if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
      return 0;
    });

    setIntelligenceFeed(deduped);
  }, [userLoc, setIntelligenceFeed]);

  // ── Auto-readout new items ────────────────────────────────────────────────
  useEffect(() => {
    if (!speak) return;
    const muted = useSwerveStore.getState().isMuted;
    if (muted) return;

    items.forEach(item => {
      if (spokenRef.current.has(item.id)) return;
      if (item.severity !== 'high') return; // only speak high severity
      spokenRef.current.add(item.id);
      const dist = item.distanceKm ? ` ${item.distanceKm} kilometers away.` : '';
      speak(`Intelligence alert: ${item.title}.${dist}`);
    });
  }, [items, speak]);

  // ── NWS poll (only when userLoc is available, 5-min cadence) ─────────────
  useEffect(() => {
    if (!userLoc) return;
    // Clear cached zone when location changes (new region may have different zone)
    nwsZoneRef.current = null;
    fetchNws(userLoc);
    clearInterval(nwsTimerRef.current);
    nwsTimerRef.current = setInterval(() => fetchNws(userLoc), NWS_POLL_MS);
    return () => clearInterval(nwsTimerRef.current);
  }, [userLoc, fetchNws]);

  // ── Community + merged feed poll ─────────────────────────────────────────
  useEffect(() => {
    fetchFeed();
    timerRef.current = setInterval(fetchFeed, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchFeed]);

  // Mark read when panel opens
  useEffect(() => {
    if (show) markFeedRead();
  }, [show, markFeedRead]);

  // Auto-scroll to top on new items
  useEffect(() => {
    if (show && scrollRef.current && items.length !== prevItemsRef.current.length) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevItemsRef.current = items;
  }, [items, show]);

  const togglePanel = () => setUiState({ showIntelligenceFeed: !show });

  return (
    <>
      {/* Floating toggle tab */}
      <button
        onClick={togglePanel}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.1] transition-all duration-200 hover:border-violet-400/40 hover:bg-violet-500/10 active:scale-95"
        style={{
          background: show ? 'rgba(167,139,250,0.15)' : 'rgba(10,10,14,0.85)',
          backdropFilter: 'blur(16px)',
          boxShadow: show ? '0 0 20px rgba(167,139,250,0.2)' : '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <svg className={`w-3.5 h-3.5 ${show ? 'text-violet-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`text-[11px] font-semibold ${show ? 'text-violet-300' : 'text-white/50'}`}>
          Intelligence Feed
        </span>
        {unread > 0 && !show && (
          <span className="w-4 h-4 bg-violet-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <svg className={`w-3 h-3 text-white/30 transition-transform ${show ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Feed panel */}
      <AnimatePresence>
        {show && (
          <motion.div
            key="intelligence-feed"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[45]"
            style={{ pointerEvents: 'auto' }}
          >
            <div
              className="rounded-t-[24px] border-t border-x border-white/[0.08] overflow-hidden"
              style={{
                background: 'rgba(10,10,14,0.97)',
                backdropFilter: 'blur(28px)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                maxHeight: '42vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top accent */}
              <div className="h-[2px] flex-shrink-0" style={{ background: 'linear-gradient(90deg, #a78bfa, #a78bfa44, transparent)' }} />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className="text-violet-400 text-sm">📡</span>
                  <div>
                    <p className="text-white text-xs font-semibold">Intelligence Feed</p>
                    <p className="text-white/30 text-[9px]">{items.length} item{items.length !== 1 ? 's' : ''} · updates every 90s</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchFeed()}
                    className="p-1.5 rounded-lg text-white/25 hover:text-violet-300 hover:bg-white/[0.06] transition-colors"
                    title="Refresh feed"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={togglePanel}
                    className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Feed list */}
              <div ref={scrollRef} className="overflow-y-auto no-scrollbar flex-1">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/20 text-sm">No active alerts near you.</p>
                    <p className="text-white/10 text-xs mt-1">All clear — safe to travel.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {items.map((item) => {
                      const sev = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.low;
                      const src = SOURCE_ICONS[item.source]  || SOURCE_ICONS.community;
                      const isExpanded = expanded === item.id;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          className={`px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors border-l-2 ${sev.border}`}
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Source icon */}
                            <span className="text-base flex-shrink-0 mt-0.5">{src.icon}</span>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${sev.dot} bg-opacity-20`}
                                  style={{ background: `${sev.dot.replace('bg-', '')}22`, color: sev.label.replace('text-', '') }}
                                >
                                  {item.severity}
                                </span>
                                <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                              </div>

                              {!isExpanded && (
                                <p className="text-white/40 text-[10px] mt-0.5 truncate">{item.detail}</p>
                              )}

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.p
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="text-white/50 text-[10px] mt-1 leading-relaxed overflow-hidden"
                                  >
                                    {item.detail}
                                  </motion.p>
                                )}
                              </AnimatePresence>

                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-white/20 text-[9px]" style={{ color: src.color }}>{src.label}</span>
                                {item.distanceKm != null && (
                                  <span className="text-white/20 text-[9px]">· {item.distanceKm}km away</span>
                                )}
                                {item.votes != null && (
                                  <span className="text-white/20 text-[9px]">· {item.votes > 0 ? `👍 ${item.votes}` : item.votes < 0 ? `👎 ${Math.abs(item.votes)}` : 'unconfirmed'}</span>
                                )}
                                <span className="text-white/15 text-[9px] ml-auto">{fmtAge(item.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
