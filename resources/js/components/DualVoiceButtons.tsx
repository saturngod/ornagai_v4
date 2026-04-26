import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface DualVoiceButtonsProps {
    text: string;
    ukVoiceUrl?: string | null;
    usVoiceUrl?: string | null;
    className?: string;
}

export default function DualVoiceButtons({ text, ukVoiceUrl, usVoiceUrl, className = '' }: DualVoiceButtonsProps) {
    const { speak, isPlaying, isSupported } = useTTS();
    const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);

    const playAudio = (url: string, accent: 'us' | 'uk') => {
        const audio = new Audio(url);
        setPlayingAccent(accent);
        audio.play().catch(() => {
            // fallback to TTS on audio error
            speak(text, accent);
        });
        audio.onended = () => setPlayingAccent(null);
        audio.onerror = () => {
            setPlayingAccent(null);
            speak(text, accent);
        };
    };

    const handleSpeak = (accent: 'us' | 'uk') => {
        if (isPlaying || playingAccent) return;

        if (accent === 'us' && usVoiceUrl) {
            playAudio(usVoiceUrl, 'us');
        } else if (accent === 'uk' && ukVoiceUrl) {
            playAudio(ukVoiceUrl, 'uk');
        } else if (isSupported) {
            speak(text, accent);
        }
    };

    const isCurrentlyPlaying = isPlaying || playingAccent !== null;

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <button
                onClick={() => handleSpeak('us')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                title="Play US English pronunciation"
                disabled={isCurrentlyPlaying}
            >
                <span className="text-xs">🇺🇸</span>
                <Volume2 className={`w-4 h-4 ${playingAccent === 'us' ? 'animate-pulse' : ''}`} />
                <span>US</span>
            </button>

            <button
                onClick={() => handleSpeak('uk')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md transition-colors text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
                title="Play UK English pronunciation"
                disabled={isCurrentlyPlaying}
            >
                <span className="text-xs">🇬🇧</span>
                <Volume2 className={`w-4 h-4 ${playingAccent === 'uk' ? 'animate-pulse' : ''}`} />
                <span>UK</span>
            </button>
        </div>
    );
}
