import { useCallback, useEffect, useRef, useState } from 'react';
import { TtsSession } from '@realtimex/piper-tts-web';
import useSwerveStore from '../store/useSwerveStore';

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
    const [isReady, setIsReady] = useState(false);
    const { isMuted } = useSwerveStore();

    useEffect(() => {
        let active = true;
        const initTts = async () => {
            if (sessionRef.current) return;
            try {
                const session = await TtsSession.create({
                    voiceId: 'en_US-amy-medium',
                });
                if (active) {
                    sessionRef.current = session;
                    setIsReady(true);
                }
            } catch (error) {
                console.error('[Swerve TTS] Initialization error:', error);
                setIsReady(true); // Fail-safe: unblock UI
            }
        };

        initTts();
        return () => {
            active = false;
        };
    }, []);

    const unlockAudio = useCallback(async () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            isAudioUnlocked = true;
        } catch (err) {
            console.error('[Swerve TTS] Audio unlock failed:', err);
        }
    }, []);

    const speak = useCallback(
        (text) => {
            if (!isReady || !sessionRef.current || isMuted) return;
            if (!isAudioUnlocked) {
                speechQueue.push(text);
                return;
            }
            speakWithPiper(sessionRef.current, text);
        },
        [isReady, isMuted]
    );

    const flushQueue = useCallback(() => {
        isAudioUnlocked = true;
        if (speechQueue.length > 0 && sessionRef.current) {
            const nextText = speechQueue.shift();
            speakWithPiper(sessionRef.current, nextText);
        }
    }, []);

    return { isReady, speak, unlockAudio, flushQueue };
}
