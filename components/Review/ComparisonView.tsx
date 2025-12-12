import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AssetType, AssetVersion } from '../../types';
import { VideoPlayer } from './VideoPlayer';
import { MoveHorizontal, ArrowRightLeft, Columns } from 'lucide-react';

interface ComparisonViewProps {
    assetType: AssetType;
    activeVersion: AssetVersion;
    compareVersion: AssetVersion;
    isVideoPlaying: boolean;
    onTogglePlay: () => void;
    onTimeUpdate: (t: number) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
    assetType,
    activeVersion,
    compareVersion,
    isVideoPlaying,
    onTogglePlay,
    onTimeUpdate
}) => {
    const [mode, setMode] = useState<'side-by-side' | 'wipe'>('side-by-side');
    const [wipePos, setWipePos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Global event listeners for drag to ensure it doesn't get stuck if mouse leaves the div
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const newPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setWipePos(newPos);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent text selection
        isDragging.current = true;
        document.body.style.cursor = 'ew-resize';
    };

    return (
        <div className="w-full h-full flex flex-col animate-fade-in p-4 bg-black/40 backdrop-blur-sm">
            {/* Controls */}
            <div className="flex justify-center mb-4 bg-neutral-900/80 p-2 rounded-full border border-neutral-800 w-fit mx-auto gap-2 backdrop-blur z-20 pointer-events-auto">
                <button 
                    onClick={() => setMode('side-by-side')}
                    className={`px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1 ${mode === 'side-by-side' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-neutral-400 hover:text-white'}`}
                >
                    <Columns size={12} /> Side-by-Side
                </button>
                <button 
                    onClick={() => setMode('wipe')}
                    className={`px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1 ${mode === 'wipe' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-neutral-400 hover:text-white'}`}
                >
                    <MoveHorizontal size={12} /> Wipe
                </button>
            </div>

            {mode === 'side-by-side' ? (
                /* SIDE BY SIDE VIEW */
                <div className="flex gap-6 w-full h-full min-h-0">
                    {/* Previous */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0 relative">
                        <div className="absolute top-2 left-4 z-20 bg-black/70 px-2 py-1 rounded text-[10px] font-bold text-neutral-400 border border-neutral-700 backdrop-blur-md">V{compareVersion.versionNumber}</div>
                        <div className="flex-1 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center relative">
                            {assetType === AssetType.VIDEO ? (
                                <VideoPlayer src={compareVersion.url} onTimeUpdate={() => {}} isPlaying={isVideoPlaying} onTogglePlay={onTogglePlay} markers={[]} />
                            ) : (
                                <img src={compareVersion.url} className="max-w-full max-h-full object-contain opacity-70 grayscale-[30%]" alt="Old" />
                            )}
                        </div>
                    </div>
                    
                    {/* Current */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0 relative">
                        <div className="absolute top-2 left-4 z-20 bg-indigo-900/90 px-2 py-1 rounded text-[10px] font-bold text-indigo-200 border border-indigo-500/50 backdrop-blur-md">V{activeVersion.versionNumber} (Current)</div>
                        <div className="flex-1 border border-indigo-900/30 rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.1)] relative">
                            {assetType === AssetType.VIDEO ? (
                                <VideoPlayer src={activeVersion.url} onTimeUpdate={onTimeUpdate} isPlaying={isVideoPlaying} onTogglePlay={onTogglePlay} markers={[]} />
                            ) : (
                                <img src={activeVersion.url} className="max-w-full max-h-full object-contain" alt="Current" />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* WIPE VIEW */
                <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 select-none group w-full h-full">
                    {/* Bottom Layer (Old - Full Width) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {assetType === AssetType.VIDEO ? (
                            <VideoPlayer src={compareVersion.url} onTimeUpdate={() => {}} isPlaying={isVideoPlaying} onTogglePlay={onTogglePlay} markers={[]} />
                        ) : (
                            <img src={compareVersion.url} className="w-full h-full object-contain grayscale" alt="Old" />
                        )}
                        <div className="absolute bottom-6 left-6 bg-black/70 text-neutral-400 text-xs px-2 py-1 rounded border border-neutral-700 z-10">V{compareVersion.versionNumber}</div>
                    </div>

                    {/* Top Layer (New - Clipped) */}
                    <div 
                        className="absolute inset-0 flex items-center justify-center bg-neutral-950"
                        style={{ clipPath: `polygon(${wipePos}% 0, 100% 0, 100% 100%, ${wipePos}% 100%)` }}
                    >
                        {assetType === AssetType.VIDEO ? (
                            <VideoPlayer src={activeVersion.url} onTimeUpdate={onTimeUpdate} isPlaying={isVideoPlaying} onTogglePlay={onTogglePlay} markers={[]} />
                        ) : (
                            <img src={activeVersion.url} className="w-full h-full object-contain" alt="New" />
                        )}
                        <div className="absolute bottom-6 right-6 bg-indigo-900/90 text-white text-xs px-2 py-1 rounded border border-indigo-500/50 z-10">V{activeVersion.versionNumber}</div>
                    </div>

                    {/* Wipe Handle */}
                    <div 
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-30 shadow-[0_0_25px_rgba(0,0,0,1)] flex items-center justify-center hover:bg-indigo-400 transition-colors"
                        style={{ left: `${wipePos}%` }}
                        onMouseDown={handleMouseDown}
                    >
                        <div className="w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-black hover:scale-110 transition-transform">
                            <ArrowRightLeft size={14} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};