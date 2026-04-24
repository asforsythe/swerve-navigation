import { useCallback, useEffect, useRef } from 'react';
import useSwerveStore from '../store/useSwerveStore';

export function useVoiceCommand({ onCommand, onTranscript, onError }) {
    const recognitionRef = useRef(null);
    const { setVoiceListening, setVoiceTranscript } = useSwerveStore();

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceTranscript(transcript);
            setVoiceListening(false);
            onTranscript?.(transcript);
            onCommand?.(transcript);
        };

        recognitionRef.current.onend = () => {
            setVoiceListening(false);
        };

        recognitionRef.current.onerror = (event) => {
            console.warn('[Swerve Voice] Recognition error:', event.error);
            setVoiceListening(false);
            if (event.error === 'not-allowed') {
                onError?.('Microphone access denied. Enable it in browser settings.');
            }
        };

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // ignore
                }
            }
        };
    }, [setVoiceListening, setVoiceTranscript, onCommand, onTranscript, onError]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return false;
        try {
            recognitionRef.current.start();
            setVoiceListening(true);
            return true;
        } catch (e) {
            console.warn('[Swerve Voice] Start failed:', e);
            return false;
        }
    }, [setVoiceListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            recognitionRef.current.stop();
            setVoiceListening(false);
        } catch (e) {
            // ignore
        }
    }, [setVoiceListening]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return false;
        const isListening = useSwerveStore.getState().voiceCommand?.isListening;
        if (isListening) {
            stopListening();
            return false;
        } else {
            return startListening();
        }
    }, [startListening, stopListening]);

    return { startListening, stopListening, toggleListening, isSupported: !!recognitionRef.current };
}
