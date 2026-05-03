import { useCallback, useEffect, useRef } from 'react';
import useSwerveStore from '../store/useSwerveStore';

/**
 * Browser-native SpeechSynthesis fallback when Piper's OPFS storage is
 * unavailable (e.g. insecure context or missing navigator.storage).
 */
function createBrowserFallbackSession() {
    if (!('speechSynthesis' in window)) return null;

    return {
        _isFallback: true,
        predict: async (text) => {
            return new Promise((resolve, reject) => {
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'en-US';
                utter.pitch = 1.0;
                utter.rate = 1.0;
                // Try to pick a decent voice
                const voices = window.speechSynthesis.getVoices();
                const enVoices = voices.filter(v => v.lang.startsWith('en'));
                const preferred =
                    enVoices.find(v => v.name.includes('Google')) ||
                    enVoices.find(v => v.name.includes('Samantha')) ||
                    enVoices.find(v => v.name.includes('US')) ||
                    enVoices[0];
                if (preferred) utter.voice = preferred;

                utter.onend = () => resolve(new Blob());
                utter.onerror = reject;
                window.speechSynthesis.speak(utter);
            });
        },
    };
}

/**
 * TTS is initialized *lazily* — the ~60 MB Piper model + WASM are only
 * downloaded after the user taps "Start Ride" (via `unlockAudio`).
 * Loading Piper on initial page mount was causing iOS Safari (iPhone 14 and
 * earlier) to OOM-kill the tab while Mapbox was still warming up its WebGL
 * context.
 */

let isAudioUnlocked = false;
let isSpeaking = false;
let speechQueue = [];

const speakWithPiper = async (session, text) => {
    if (!session) return;

    const muted = useSwerveStore.getState().isMuted;
    if (muted) return;

    if (isSpeaking) {
        speechQueue.push(text);
        return;
    }

    // Fallback session delegates to speechSynthesis; skip blob/audio work.
    if (session._isFallback) {
        try {
            isSpeaking = true;
            await session.predict(text);
        } catch (error) {
            console.error('[Swerve TTS] SpeechSynthesis playback failed:', error);
        } finally {
            isSpeaking = false;
            if (speechQueue.length > 0) {
                const nextText = speechQueue.shift();
                speakWithPiper(session, nextText);
            }
        }
        return;
    }

    try {
        isSpeaking = true;
        const audioBlob = await session.predict(text);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.15;

        await new Promise((resolve, reject) => {
            audio.onended = resolve;
            audio.onerror = reject;
            audio.play().catch(reject);
        });

        URL.revokeObjectURL(audioUrl);
    } catch (error) {
        console.error('[Swerve TTS] Playback failed:', error);
    } finally {
        isSpeaking = false;
        if (speechQueue.length > 0) {
            const nextText = speechQueue.shift();
            speakWithPiper(session, nextText);
        }
    }
};

export function useTTS() {
    const sessionRef = useRef(null);
    const initPromiseRef = useRef(null);
    // `isReady` is reported as `true` immediately so the StartScreen's
    // "Hold to Start" button is interactive on first paint. Actual Piper
    // weights finish loading in the background after the user taps.
    const isReady = true;
    const { isMuted } = useSwerveStore();


    const initPiper = useCallback(() => {
        if (sessionRef.current) return Promise.resolve(sessionRef.current);
        if (initPromiseRef.current) return initPromiseRef.current;

        initPromiseRef.current = (async () => {
            // Guard: OPFS (navigator.storage.getDirectory) requires a
            // "secure context": HTTPS, localhost, or 127.0.0.1. Accessing
            // via a LAN IP (e.g. http://192.168.x.x:3000) or 0.0.0.0 will
            // cause Piper to throw "Cannot read properties of undefined
            // (reading 'getDirectory')". We detect this early so we can
            // provide a helpful message instead of spamming the console.
            if (typeof navigator !== 'undefined' && !navigator.storage) {
                console.warn(
                    '[Swerve TTS] navigator.storage is unavailable. ' +
                    'This usually means the page was loaded from a non-secure origin ' +
                    '(e.g. a LAN IP or http://0.0.0.0:3000). ' +
                    'For local development, use http://localhost:3000 instead. ' +
                    'Falling back to browser SpeechSynthesis if available.'
                );
                // Return a lightweight TtsSession-like object that delegates to
                // the browser's built-in speechSynthesis API.
                const fallback = createBrowserFallbackSession();
                sessionRef.current = fallback;
                return fallback;
            }

            try {
                // Dynamic import so the Piper bundle (and its WASM blob) isn't
                // part of the initial-paint critical path. Keeps the iOS
                // Safari peak-memory window small while Mapbox is still
                // bootstrapping its WebGL context.
                const { TtsSession } = await import('@realtimex/piper-tts-web');
                const session = await TtsSession.create({
                    voiceId: 'en_US-amy-medium',
                });
                sessionRef.current = session;
                return session;
            } catch (error) {
                console.error('[Swerve TTS] Initialization error:', error);
                // Attempt fallback so TTS isn't completely broken.
                const fallback = createBrowserFallbackSession();
                sessionRef.current = fallback;
                return fallback;
            }
        })();

        return initPromiseRef.current;
    }, []);

    const unlockAudio = useCallback(async () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            isAudioUnlocked = true;
        } catch (err) {
            console.error('[Swerve TTS] Audio unlock failed:', err);
        }
        // Kick off the Piper download now — user has tapped, so we finally
        // have (a) a user gesture for audio and (b) Mapbox has had its
        // initial-paint moment.
        initPiper();
    }, [initPiper]);

    const speak = useCallback(
        (text) => {
            if (isMuted) return;
            if (!isAudioUnlocked) {
                speechQueue.push(text);
                return;
            }
            const session = sessionRef.current;
            if (session) {
                speakWithPiper(session, text);
            } else {
                // Model still downloading — queue and flush on completion.
                speechQueue.push(text);
                initPiper().then((s) => {
                    if (!s) return;
                    const next = speechQueue.shift();
                    if (next) speakWithPiper(s, next);
                });
            }
        },
        [isMuted, initPiper]
    );

    const flushQueue = useCallback(() => {
        isAudioUnlocked = true;
        initPiper().then((session) => {
            if (!session) return;
            if (speechQueue.length > 0) {
                const nextText = speechQueue.shift();
                speakWithPiper(session, nextText);
            }
        });
    }, [initPiper]);

    // Cleanup is intentionally minimal — the Piper session has no explicit
    // dispose API, and the audio queue is a module-level global shared
    // across hook instances.
    useEffect(() => () => { /* no-op */ }, []);

    return { isReady, speak, unlockAudio, flushQueue };
}
