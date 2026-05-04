import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSwerveStore from '../../store/useSwerveStore';
import { CHALLENGES, isChallengeAvailable } from '../../data/challenges';

// ── Progress ring ──────────────────────────────────────────────────────────────
const ProgressRing = ({ count, target, color, size = 44 }) => {
    const pct = Math.min(1, count / target);
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct);
    const cx = size / 2;

    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={cx} cy={cx} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="4" fill="none" />
            <circle
                cx={cx} cy={cx} r={r}
                stroke={color}
                strokeWidth="4"
                fill="none"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 5px ${color}80)`, transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
            />
        </svg>
    );
};

// ── Single challenge card ──────────────────────────────────────────────────────
const ChallengeCard = ({ challenge, progress }) => {
    const available = isChallengeAvailable(challenge);
    const count = progress?.count ?? 0;
    const completed = !!progress?.completedAt;
    const pct = Math.min(100, Math.round((count / challenge.target) * 100));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{
                background: completed
                    ? `linear-gradient(135deg, ${challenge.color}18, ${challenge.color}08)`
                    : 'rgba(255,255,255,0.03)',
                border: `1px solid ${completed ? challenge.color + '40' : 'rgba(255,255,255,0.06)'}`,
                opacity: !available ? 0.45 : 1,
            }}
        >
            {/* Completed shimmer line */}
            {completed && (
                <div
                    className="absolute inset-x-0 top-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${challenge.color}90, transparent)` }}
                />
            )}

            <div className="flex items-center gap-3">
                {/* Progress ring with icon */}
                <div className="relative shrink-0">
                    <ProgressRing count={count} target={challenge.target} color={challenge.color} />
                    <span
                        className="absolute inset-0 flex items-center justify-center text-base leading-none"
                        style={{ paddingTop: '2px' }}
                    >
                        {completed ? '✓' : challenge.icon}
                    </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-white/90 text-xs font-semibold truncate">{challenge.name}</p>
                        {challenge.seasonal && available && (
                            <span
                                className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: challenge.color + '25', color: challenge.color }}
                            >
                                SEASONAL
                            </span>
                        )}
                        {!available && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 shrink-0">
                                OFF-SEASON
                            </span>
                        )}
                    </div>
                    <p className="text-white/35 text-[10px] leading-relaxed line-clamp-2">{challenge.description}</p>

                    {/* Progress bar */}
                    {!completed && available && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-white/25 text-[9px]">{count} / {challenge.target}</span>
                                <span className="text-[9px] font-bold" style={{ color: challenge.color }}>{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${challenge.color}80, ${challenge.color})` }}
                                />
                            </div>
                        </div>
                    )}

                    {completed && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: challenge.color, boxShadow: `0 0 4px ${challenge.color}` }}
                            />
                            <span className="text-[10px] font-semibold" style={{ color: challenge.color }}>
                                Complete — {challenge.reward}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function ChallengesPanel() {
    const { ui, setUiState, challengeProgress, swerveScore } = useSwerveStore();
    const show = ui?.showChallenges ?? false;

    const { active, available, completed } = useMemo(() => {
        const active = [], available = [], completed = [];
        CHALLENGES.forEach((c) => {
            const p = challengeProgress[c.id];
            const isAvail = isChallengeAvailable(c);
            if (p?.completedAt) {
                completed.push(c);
            } else if (p?.count > 0 && isAvail) {
                active.push(c);
            } else if (isAvail) {
                available.push(c);
            } else {
                available.push(c); // show off-season challenges dimmed
            }
        });
        return { active, available, completed };
    }, [challengeProgress]);

    const totalCompleted = completed.length;
    const totalChallenges = CHALLENGES.length;

    return (
        <AnimatePresence>
            {show && (
                <>
                <motion.div
                    key="ch-backdrop"
                    className="sm:hidden fixed inset-0 z-[54] bg-black/55 backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setUiState({ showChallenges: false })}
                />
                <motion.div
                    key="challenges-panel"
                    initial={{ opacity: 0, y: 32, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 32, scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="
                        fixed sm:absolute z-[55] sm:z-40
                        left-0 right-0 bottom-0 sm:left-[340px] sm:right-auto sm:bottom-auto sm:top-6
                        w-full sm:w-80
                        rounded-t-[28px] sm:rounded-[20px] overflow-hidden
                    "
                    style={{
                        background: 'rgba(10,10,14,0.94)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(24px)',
                        maxHeight: '85vh',
                    }}
                >
                    {/* Mobile drag handle + status hairline */}
                    <div className="sm:hidden">
                        <div
                            className="absolute inset-x-0 top-0 h-[1.5px]"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.85), transparent)' }}
                        />
                        <div className="flex justify-center pt-3 pb-0.5">
                            <div className="w-11 h-1 rounded-full" style={{ background: 'rgba(252,211,77,0.55)', boxShadow: '0 0 6px rgba(252,211,77,0.5)' }} />
                        </div>
                    </div>
                    {/* Top accent */}
                    <div
                        className="hidden sm:block absolute inset-x-0 top-0 h-[1px]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.6), transparent)' }}
                    />

                    <div className="p-5 overflow-y-auto no-scrollbar" style={{ maxHeight: '85vh', paddingBottom: 'max(1.25rem, calc(var(--safe-bottom, 0px) + 1rem))' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <div>
                                    <h3 className="text-white font-semibold text-xs tracking-widest uppercase">Challenges</h3>
                                    <p className="text-white/30 text-[9px]">{totalCompleted} / {totalChallenges} complete</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setUiState({ showChallenges: false })}
                                className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Overall progress bar */}
                        <div className="mb-5 p-3 rounded-xl" style={{ background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.12)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-amber-300/80 text-[10px] font-bold uppercase tracking-wider">Overall Progress</span>
                                <span className="text-amber-300 text-[11px] font-bold tabular-nums">{Math.round((totalCompleted / totalChallenges) * 100)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #fbbf24, #fcd34d)' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(totalCompleted / totalChallenges) * 100}%` }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                            <p className="text-white/25 text-[9px] mt-1.5">{totalChallenges - totalCompleted} challenges remaining · {swerveScore?.total ?? 0} total pts</p>
                        </div>

                        {/* Active challenges */}
                        {active.length > 0 && (
                            <div className="mb-4">
                                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2 px-0.5">In Progress</p>
                                <div className="space-y-2">
                                    {active.map((c) => (
                                        <ChallengeCard key={c.id} challenge={c} progress={challengeProgress[c.id]} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available challenges */}
                        {available.length > 0 && (
                            <div className="mb-4">
                                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2 px-0.5">Available</p>
                                <div className="space-y-2">
                                    {available.map((c) => (
                                        <ChallengeCard key={c.id} challenge={c} progress={challengeProgress[c.id]} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed challenges */}
                        {completed.length > 0 && (
                            <div>
                                <p className="text-white/30 text-[9px] uppercase tracking-widest mb-2 px-0.5">Completed</p>
                                <div className="space-y-2">
                                    {completed.map((c) => (
                                        <ChallengeCard key={c.id} challenge={c} progress={challengeProgress[c.id]} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {active.length === 0 && available.length === 0 && completed.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-white/25 text-sm">Plan your first route to start a challenge</p>
                            </div>
                        )}
                    </div>
                </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
