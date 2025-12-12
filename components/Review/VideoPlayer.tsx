import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronRight, ChevronLeft, Gauge, Repeat, Hash } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    onTimeUpdate: (time: number) => void;
    jumpToTime?: number | null;
    markers?: number[]; // Timestamps of comments
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, onTimeUpdate, jumpToTime, markers = [], isPlaying, onTogglePlay }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [useSmpte, setUseSmpte] = useState(true);
    
    // Looping State
    const [loopStart, setLoopStart] = useState<number | null>(null);
    const [loopEnd, setLoopEnd] = useState<number | null>(null);
    const [isLoopActive, setIsLoopActive] = useState(false);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.play().catch(e => console.error("Autoplay prevented", e));
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    useEffect(() => {
        if (jumpToTime !== undefined && jumpToTime !== null && videoRef.current) {
            videoRef.current.currentTime = jumpToTime;
        }
    }, [jumpToTime]);

    // Keyboard shortcuts for Loop (I/O)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            
            if (!videoRef.current) return;
            const t = videoRef.current.currentTime;

            if (e.key.toLowerCase() === 'i') {
                setLoopStart(t);
                setIsLoopActive(true);
            }
            if (e.key.toLowerCase() === 'o') {
                setLoopEnd(t);
                setIsLoopActive(true);
            }
            if (e.key.toLowerCase() === 'p') {
                setLoopStart(null);
                setLoopEnd(null);
                setIsLoopActive(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        setDuration(dur);
        if (dur > 0) {
            setProgress((current / dur) * 100);
        }
        
        // Loop Logic
        if (isLoopActive && loopStart !== null && loopEnd !== null) {
            if (current >= loopEnd || current < loopStart) {
                videoRef.current.currentTime = loopStart;
            }
        }

        onTimeUpdate(current);
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        if (useSmpte) {
            // HH:MM:SS:FF (Assuming 30fps)
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const f = Math.floor((seconds % 1) * 30);
            return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}:${f.toString().padStart(2,'0')}`;
        } else {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Critical: Prevent AnnotationLayer from catching this click
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, x / width));
        
        if (videoRef.current.duration) {
            const newTime = percentage * videoRef.current.duration;
            videoRef.current.currentTime = newTime;
            setProgress(percentage * 100);
        }
    }

    const stepFrame = (frames: number) => {
        if (!videoRef.current) return;
        // Approx 30fps
        const frameTime = 1/30;
        const newTime = videoRef.current.currentTime + (frames * frameTime);
        videoRef.current.currentTime = Math.max(0, Math.min(newTime, videoRef.current.duration));
        
        // Pause if playing when stepping
        if (isPlaying) onTogglePlay();
    };

    const speeds = [0.5, 1, 1.5, 2];

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black group rounded-lg overflow-hidden">
            <video
                ref={videoRef}
                src={src}
                className="max-h-full max-w-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => isPlaying && onTogglePlay()} // Sync state on end
                playsInline
                loop={!isLoopActive} // Native loop if custom loop is off
                muted={isMuted}
            />
            
            {/* Controls Overlay - Always visible at bottom, but pointer-events handled carefully */}
            <div 
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-50 transition-opacity"
                onClick={(e) => e.stopPropagation()} // Prevent click-through to annotation
                onMouseDown={(e) => e.stopPropagation()}
            >
                 {/* Timeline */}
                 <div 
                    className="relative w-full h-3 bg-white/20 hover:bg-white/30 transition-colors rounded-full mb-4 cursor-pointer group/timeline flex items-center"
                    onClick={handleSeek}
                    onMouseDown={(e) => e.stopPropagation()}
                 >
                     {/* Loop Range Indicator */}
                     {loopStart !== null && loopEnd !== null && duration > 0 && (
                         <div 
                            className="absolute top-0 bottom-0 bg-yellow-500/30 border-l border-r border-yellow-500 pointer-events-none"
                            style={{ 
                                left: `${(loopStart / duration) * 100}%`,
                                width: `${((loopEnd - loopStart) / duration) * 100}%`
                            }}
                         />
                     )}

                     {/* Progress Bar */}
                     <div 
                        className="h-full bg-indigo-500 rounded-full relative pointer-events-none" 
                        style={{ width: `${progress}%` }}
                     >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-100 transition-transform" />
                     </div>

                     {/* Interactive Markers - High Visibility Yellow */}
                     {markers.map((time, i) => (
                         <button 
                            key={i}
                            className="absolute top-0 bottom-0 w-4 -ml-2 z-20 cursor-pointer group/marker focus:outline-none flex flex-col items-center justify-center"
                            style={{ left: `${(time / duration) * 100}%` }}
                            onClick={(e) => {
                                e.stopPropagation(); // Stop seek
                                if (videoRef.current) {
                                    videoRef.current.currentTime = time;
                                    setProgress((time / duration) * 100);
                                    if (isPlaying) onTogglePlay(); // Pause on marker jump
                                }
                            }}
                            title={`Jump to comment at ${formatTime(time)}`}
                         >
                             {/* Marker Head (Always visible dot) */}
                             <div className="absolute -top-2 w-3.5 h-3.5 rounded-full bg-yellow-400 border-2 border-black/50 shadow-[0_0_10px_rgba(250,204,21,0.5)] transform hover:scale-125 transition-transform" />
                             
                             {/* Marker Line */}
                             <div className="w-[2px] h-full bg-yellow-400/80 shadow-[0_0_5px_rgba(0,0,0,0.5)]" />
                         </button>
                     ))}
                 </div>

                 {/* Button Row */}
                 <div className="flex items-center justify-between text-white">
                     <div className="flex items-center gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} 
                            className="hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-white/10"
                         >
                             {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                         </button>
                         
                         <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

                         <button 
                            onClick={(e) => { e.stopPropagation(); stepFrame(-1); }}
                            className="hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-white/10"
                            title="Previous Frame"
                         >
                             <ChevronLeft size={18} />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); stepFrame(1); }}
                            className="hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-white/10"
                            title="Next Frame"
                         >
                             <ChevronRight size={18} />
                         </button>

                         <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
                            className="hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-white/10"
                         >
                             {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                         </button>

                         <button
                            onClick={(e) => { e.stopPropagation(); setUseSmpte(!useSmpte); }}
                            className="flex items-center gap-1 font-mono text-xs text-neutral-300 ml-2 hover:text-white px-2 py-1 hover:bg-white/10 rounded"
                            title="Toggle SMPTE Timecode"
                         >
                             {formatTime(videoRef.current?.currentTime || 0)} <span className="text-neutral-500">/</span> {formatTime(duration || 0)}
                         </button>
                     </div>
                     
                     <div className="flex items-center gap-2">
                         {/* Loop Controls */}
                         <button 
                            onClick={(e) => {e.stopPropagation(); if(isLoopActive) { setLoopStart(null); setLoopEnd(null); setIsLoopActive(false); } }}
                            className={`p-1.5 rounded hover:bg-white/10 transition-colors ${isLoopActive ? 'text-yellow-400' : 'text-neutral-400'}`}
                            title={isLoopActive ? "Clear Loop (P)" : "Use keys I/O to set loop"}
                        >
                            <Repeat size={18} />
                         </button>

                         {/* Playback Speed */}
                         <div className="relative">
                            <button 
                                onClick={(e) => {e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu)}}
                                className="flex items-center gap-1 hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-white/10 text-xs font-medium"
                            >
                                <Gauge size={14} /> {playbackSpeed}x
                            </button>
                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden min-w-[80px]">
                                    {speeds.map(s => (
                                        <button 
                                            key={s}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPlaybackSpeed(s);
                                                setShowSpeedMenu(false);
                                            }}
                                            className={`block w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 ${playbackSpeed === s ? 'text-indigo-400 font-bold bg-indigo-900/10' : 'text-neutral-300'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>

                         <button className="hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-white/10">
                             <Maximize size={18} />
                         </button>
                     </div>
                 </div>
            </div>
            
            {/* Center Play Button Overlay */}
            {!isPlaying && (
                <div 
                    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                >
                    <div 
                        className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 hover:scale-110 transition-transform hover:bg-black/50 group cursor-pointer pointer-events-auto shadow-2xl"
                        onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
                    >
                         <Play size={40} fill="white" className="text-white ml-2 opacity-90 group-hover:opacity-100" />
                    </div>
                </div>
            )}
        </div>
    );
};