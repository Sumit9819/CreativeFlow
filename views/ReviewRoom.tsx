import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Asset, Project, User, AssetVersion, AssetType, SocialRatio, Comment, AssetStatus, UserRole, Drawing } from '../types';
import { ArrowLeft, ChevronDown, Download, Check, XCircle, Smartphone, Monitor, Layers, Columns, Eye, EyeOff, Lock, MousePointer2, PenTool, Square, AlertTriangle, ArrowRightLeft, CheckCircle2, UploadCloud, FileUp, X, MoveHorizontal, ZoomIn, ZoomOut, Grid, Share2, Link, Instagram, Youtube, Hand, Maximize } from 'lucide-react';
import { AnnotationLayer } from '../components/Review/AnnotationLayer';
import { CommentThread } from '../components/Review/CommentThread';
import { VideoPlayer } from '../components/Review/VideoPlayer';
import { ComparisonView } from '../components/Review/ComparisonView';

interface ReviewRoomProps {
    asset: Asset;
    project: Project;
    currentUser: User;
    users: User[];
    onBack: () => void;
}

export const ReviewRoom: React.FC<ReviewRoomProps> = ({ asset, project, currentUser, users, onBack }) => {
    // State
    const [activeVersionId, setActiveVersionId] = useState<string>(asset.versions[0].id);
    const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
    const [versions, setVersions] = useState<AssetVersion[]>(asset.versions);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    
    // Status State
    const [currentAssetStatus, setCurrentAssetStatus] = useState<AssetStatus>(asset.status);

    // Derived Active Version
    const activeVersion = useMemo(() => versions.find(v => v.id === activeVersionId) || versions[0], [versions, activeVersionId]);
    
    // Derived Compare Version
    const compareVersion = useMemo(() => versions.find(v => v.id === compareVersionId) || null, [versions, compareVersionId]);

    // UI State
    const [socialRatio, setSocialRatio] = useState<SocialRatio>(SocialRatio.ORIGINAL);
    const [isCompareMode, setIsCompareMode] = useState(false);
    
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    
    // PERFORMANCE OPTIMIZATION: Use Ref for current time to avoid re-rendering entire app 60fps during playback
    // Only update state if we need to force a UI update (like jump to time)
    const currentTimeRef = useRef(0); 
    const [jumpToTime, setJumpToTime] = useState<number | null>(null);
    
    const [presentationMode, setPresentationMode] = useState(false);
    
    // Tools State
    const [showSafeZones, setShowSafeZones] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    
    // Video Playback State
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    // Drawing Tool State
    const [drawingTool, setDrawingTool] = useState<'pointer' | 'pen' | 'box' | 'hand'>('pointer');
    const [toolColor, setToolColor] = useState('#ef4444'); // Default red
    const previousToolRef = useRef<'pointer' | 'pen' | 'box' | 'hand'>('pointer');

    // Zoom & Pan State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    // Media Dimensions State (Critical for fixing annotation drift)
    const [mediaDimensions, setMediaDimensions] = useState<{width: number, height: number} | null>(null);

    // Task Enforcement
    const openTasksCount = activeVersion.comments.filter(c => !c.resolved).length;
    
    // Permissions & Roles
    const isDecisionMaker = currentUser.role === UserRole.APPROVER || currentUser.role === UserRole.SUPER_ADMIN;
    
    const canApprove = isDecisionMaker && (openTasksCount === 0 || currentUser.role === UserRole.SUPER_ADMIN);
    const canDownload = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.CREATOR || currentAssetStatus === AssetStatus.APPROVED;
    const canUpload = currentUser.role === UserRole.CREATOR || currentUser.role === UserRole.SUPER_ADMIN;

    const activeViewers = useMemo(() => users.filter(u => u.id !== currentUser.id && Math.random() > 0.5), [asset.id]);

    useEffect(() => {
        if (activeCommentId) {
            const comment = activeVersion.comments.find(c => c.id === activeCommentId);
            if (comment && comment.videoTimestamp !== undefined) {
                setJumpToTime(comment.videoTimestamp);
                setIsVideoPlaying(false); // Pause on jump
            }
        }
    }, [activeCommentId, activeVersion]);

    useEffect(() => {
        setCurrentAssetStatus(asset.status);
    }, [asset.status]);

    useEffect(() => {
        if (socialRatio !== SocialRatio.ORIGINAL) {
            setShowSafeZones(true);
        } else {
            setShowSafeZones(false);
        }
    }, [socialRatio]);

    // Reset dimensions and zoom when version changes
    useEffect(() => {
        setMediaDimensions(null);
        handleResetZoom();
    }, [activeVersionId]);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isInputActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
            if (isInputActive) return;

            // Spacebar handling
            if (e.code === 'Space') {
                e.preventDefault(); 
                
                if (asset.type === AssetType.VIDEO) {
                    // For Video: Space toggles Play/Pause
                    // Use a functional update to avoid stale closure issues if dependencies were missing
                    setIsVideoPlaying(prev => !prev);
                } else {
                    // For Images: Space triggers Hand Tool (Temporary)
                    if (!e.repeat) {
                        setDrawingTool(current => {
                            if (current !== 'hand') {
                                previousToolRef.current = current;
                                return 'hand';
                            }
                            return current;
                        });
                    }
                }
            }

            // Explicit shortcuts
            if (e.key.toLowerCase() === 'h') setDrawingTool('hand');
            if (e.key.toLowerCase() === 'v') setDrawingTool('pointer');
            if (e.key.toLowerCase() === 'p') setDrawingTool('pen');
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const isInputActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
            if (isInputActive) return;

            if (e.code === 'Space' && asset.type !== AssetType.VIDEO) {
                setDrawingTool(previousToolRef.current);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [asset.type]);


    // Zoom & Pan Logic
    const handleWheel = (e: React.WheelEvent) => {
        if (isCompareMode) return;
        e.preventDefault();
        
        // Use a standard delta (e.deltaY)
        const scaleAmount = -e.deltaY * 0.002;
        const newZoom = Math.min(Math.max(0.1, zoom * (1 + scaleAmount)), 5);

        // Zoom towards mouse pointer
        if (viewportRef.current) {
            const rect = viewportRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate offset change to keep mouse fixed
            // Formula: newPan = mouse - (mouse - oldPan) * (newZoom / oldZoom)
            const zoomRatio = newZoom / zoom;
            const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
            const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
        }
    };

    const handlePanStart = (e: React.MouseEvent) => {
        // Pan if Hand tool, Middle Click
        if (drawingTool === 'hand' || e.button === 1) {
            e.preventDefault();
            isPanningRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            document.body.style.cursor = 'grabbing';
        }
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (isPanningRef.current) {
            e.preventDefault();
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        }
    };

    const handlePanEnd = () => {
        isPanningRef.current = false;
        if (drawingTool === 'hand') {
             document.body.style.cursor = 'grab';
        } else {
             document.body.style.cursor = '';
        }
    };

    const handleResetZoom = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleBackgroundClick = () => {
        if (activeCommentId) {
            setActiveCommentId(null);
        }
    };

    const handleToggleCompare = () => {
        if (!isCompareMode) {
            const other = versions.find(v => v.id !== activeVersionId) || versions[0];
            setCompareVersionId(other.id);
            setIsCompareMode(true);
        } else {
            setIsCompareMode(false);
            setCompareVersionId(null);
        }
    };

    const handleUploadNewVersion = (e: React.FormEvent) => {
        e.preventDefault();
        const nextVersionNumber = versions[0].versionNumber + 1;
        const newVersion: AssetVersion = {
            id: `v_${Date.now()}`,
            versionNumber: nextVersionNumber,
            url: asset.type === AssetType.VIDEO 
                ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' 
                : `https://picsum.photos/1200/800?random=${Date.now()}`,
            createdAt: Date.now(),
            comments: []
        };

        const newVersionsList = [newVersion, ...versions];
        setVersions(newVersionsList);
        setActiveVersionId(newVersion.id);
        setIsUploadModalOpen(false);
        setIsCompareMode(false);
        setActiveCommentId(null);
        setCurrentAssetStatus(AssetStatus.PENDING); 
        setCompareVersionId(versions[0].id); 
    };

    const handleApprove = () => setCurrentAssetStatus(AssetStatus.APPROVED);
    const handleRequestChanges = () => setCurrentAssetStatus(AssetStatus.CHANGES_REQUESTED);

    const handleTimeUpdate = useCallback((t: number) => {
        currentTimeRef.current = t;
    }, []);

    const handleAddComment = (x: number, y: number, drawing?: Drawing) => {
        if (isCompareMode) return;
        if (currentUser.role === UserRole.OBSERVER) return;

        if (asset.type === AssetType.VIDEO && isVideoPlaying) {
            setIsVideoPlaying(false);
        }

        const newComment: Comment = {
            id: `c_${Date.now()}`,
            userId: currentUser.id,
            text: "",
            timestamp: Date.now(),
            resolved: false,
            x,
            y,
            videoTimestamp: asset.type === AssetType.VIDEO ? currentTimeRef.current : undefined,
            drawing,
            replies: [],
            isInternal: false,
        };

        const updatedVersion = {
            ...activeVersion,
            comments: [newComment, ...activeVersion.comments]
        };

        setVersions(prev => prev.map(v => v.id === activeVersion.id ? updatedVersion : v));
        setActiveCommentId(newComment.id);
        if (drawingTool !== 'pointer') setDrawingTool('pointer');
    };

    const handleUpdateCommentPosition = (id: string, newX: number, newY: number) => {
        setVersions(prevVersions => {
            return prevVersions.map(v => {
                if (v.id !== activeVersionId) return v;

                const updatedComments = v.comments.map(c => {
                    if (c.id !== id) return c;
                    
                    const oldX = c.x || 0;
                    const oldY = c.y || 0;
                    const dx = newX - oldX;
                    const dy = newY - oldY;

                    let newDrawing = c.drawing;
                    if (newDrawing) {
                        if (newDrawing.type === 'box' && newDrawing.rect) {
                            newDrawing = {
                                ...newDrawing,
                                rect: {
                                    ...newDrawing.rect,
                                    x: newDrawing.rect.x + dx,
                                    y: newDrawing.rect.y + dy
                                }
                            };
                        } else if (newDrawing.type === 'pen' && newDrawing.points) {
                            newDrawing = {
                                ...newDrawing,
                                points: newDrawing.points.map(p => ({
                                    x: p.x + dx,
                                    y: p.y + dy
                                }))
                            };
                        }
                    }

                    return { ...c, x: newX, y: newY, drawing: newDrawing };
                });

                return { ...v, comments: updatedComments };
            });
        });
    };

    const handleResolveComment = (id: string) => {
         const updatedVersion = {
            ...activeVersion,
            comments: activeVersion.comments.map(c => c.id === id ? { ...c, resolved: true } : c)
        };
        setVersions(prev => prev.map(v => v.id === activeVersion.id ? updatedVersion : v));
    };

    const handleDeleteComment = (id: string) => {
        const updatedVersion = {
            ...activeVersion,
            comments: activeVersion.comments.filter(c => c.id !== id)
        };
        setVersions(prev => prev.map(v => v.id === activeVersion.id ? updatedVersion : v));
        if (activeCommentId === id) setActiveCommentId(null);
    };

    const handleReplyToComment = (id: string, text: string, isInternal: boolean) => {
        const reply: Comment = {
            id: `r_${Date.now()}`,
            userId: currentUser.id,
            text: text,
            timestamp: Date.now(),
            resolved: false,
            isInternal
        };

        const updatedVersion = {
           ...activeVersion,
           comments: activeVersion.comments.map(c => {
               if (c.id === id) {
                   return { ...c, replies: [...(c.replies || []), reply] };
               }
               return c;
           })
       };
       setVersions(prev => prev.map(v => v.id === activeVersion.id ? updatedVersion : v));
    };

    const handleInitialComment = (id: string, text: string, isInternal: boolean) => {
         const updatedVersion = {
            ...activeVersion,
            comments: activeVersion.comments.map(c => c.id === id ? { ...c, text, isInternal } : c)
        };
        setVersions(prev => prev.map(v => v.id === activeVersion.id ? updatedVersion : v));
    }


    const getContainerStyle = () => {
        const baseStyle: React.CSSProperties = {
            position: 'relative',
            maxWidth: '100%',
            maxHeight: '100%',
        };

        // If we know dimensions, force aspect ratio to fix pin drift
        if (mediaDimensions) {
            baseStyle.aspectRatio = `${mediaDimensions.width} / ${mediaDimensions.height}`;
        }

        // Overlay specific social ratios (Visual Preview Only)
        // Note: Safe zones logic relies on the asset filling the container
        if (socialRatio !== SocialRatio.ORIGINAL) {
             baseStyle.border = '8px solid #171717';
             baseStyle.borderRadius = '30px';
             baseStyle.backgroundColor = '#000';
             baseStyle.overflow = 'hidden';
             baseStyle.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
        }

        switch(socialRatio) {
            case SocialRatio.TIKTOK_9_16: 
                baseStyle.aspectRatio = '9 / 16'; 
                baseStyle.width = 'auto';
                baseStyle.height = '100%';
                baseStyle.maxWidth = '380px';
                return baseStyle;
            case SocialRatio.INSTA_1_1: 
                baseStyle.aspectRatio = '1 / 1';
                baseStyle.width = 'auto'; 
                baseStyle.height = '100%';
                baseStyle.maxWidth = '600px';
                return baseStyle;
            case SocialRatio.PORTRAIT_4_5: 
                baseStyle.aspectRatio = '4 / 5'; 
                baseStyle.width = 'auto';
                baseStyle.height = '100%';
                baseStyle.maxWidth = '500px';
                return baseStyle;
            default: 
                return baseStyle;
        }
    };

    const getStatusBadge = () => {
        switch(currentAssetStatus) {
            case AssetStatus.APPROVED:
                return <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={10} /> Approved</span>;
            case AssetStatus.CHANGES_REQUESTED:
                 return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Changes Requested</span>;
            case AssetStatus.IN_PROGRESS:
                 return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">In Progress</span>;
            default:
                 return <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Pending</span>;
        }
    };

    const renderSafeZones = () => {
        if (!showSafeZones) return null;

        // 9:16 - TikTok / Reels / Shorts
        if (socialRatio === SocialRatio.TIKTOK_9_16) {
            return (
                <div className="absolute inset-0 pointer-events-none z-20 font-sans">
                    {/* Top Bar (Search/Following) */}
                    <div className="absolute top-0 left-0 right-0 h-[10%] bg-red-500/20 border-b-2 border-red-500/50 flex items-center justify-center">
                         <span className="text-[10px] font-bold text-red-200 bg-red-900/80 px-2 py-1 rounded">Top Navigation</span>
                    </div>

                    {/* Right Action Bar (Hearts, Comments, Share) */}
                    <div className="absolute top-[25%] bottom-[25%] right-0 w-[16%] bg-red-500/20 border-l-2 border-red-500/50 flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-red-500/40 border border-red-400/50"></div>
                        <div className="w-8 h-8 rounded-full bg-red-500/40 border border-red-400/50"></div>
                        <div className="w-8 h-8 rounded-full bg-red-500/40 border border-red-400/50"></div>
                        <span className="text-[10px] font-bold text-red-200 bg-red-900/80 px-1 py-4 rounded writing-mode-vertical -rotate-180" style={{writingMode: 'vertical-rl'}}>Action Buttons</span>
                    </div>

                    {/* Bottom Caption/Audio Area */}
                    <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-red-500/20 border-t-2 border-red-500/50 flex items-end justify-center pb-4">
                         <span className="text-[10px] font-bold text-red-200 bg-red-900/80 px-2 py-1 rounded mb-4">Captions, Username & Audio</span>
                    </div>

                    {/* Safe Area Indicator */}
                    <div className="absolute inset-0 m-auto border-2 border-green-500/50 border-dashed rounded-lg" style={{ top: '10%', bottom: '20%', right: '16%', left: '2%' }}>
                         <span className="absolute top-2 left-2 text-[10px] font-bold text-green-400 bg-green-900/80 px-2 py-1 rounded">Safe Zone</span>
                    </div>
                </div>
            );
        }

        // 4:5 - Instagram Feed / Portrait
        if (socialRatio === SocialRatio.PORTRAIT_4_5) {
             return (
                <div className="absolute inset-0 pointer-events-none z-20 font-sans">
                    {/* Header Hint (If watching in feed context) */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center justify-center">
                        <span className="text-[10px] text-yellow-500 bg-black/50 px-1 rounded">Header / User Info (In Feed)</span>
                    </div>
                     {/* Footer Hint (If watching in feed context) */}
                     <div className="absolute bottom-0 left-0 right-0 h-12 bg-yellow-500/10 border-t border-yellow-500/30 flex items-center justify-center">
                        <span className="text-[10px] text-yellow-500 bg-black/50 px-1 rounded">Action Bar (In Feed)</span>
                    </div>
                    <div className="absolute inset-2 border border-green-500/40 border-dashed"></div>
                </div>
             )
        }
        
        // 1:1 - Square
        if (socialRatio === SocialRatio.INSTA_1_1) {
             return (
                <div className="absolute inset-0 pointer-events-none z-20 font-sans">
                    <div className="absolute inset-[2%] border-2 border-green-500/40 border-dashed flex items-center justify-center">
                        <span className="text-[10px] text-green-500 bg-black/50 px-1 rounded opacity-50">Safe Area (98%)</span>
                    </div>
                </div>
             )
        }

        return null;
    };

    const visibleComments = activeVersion.comments.filter(c => {
        if (currentUser.role === UserRole.APPROVER && c.isInternal) return false;
        return true;
    });

    const handleMediaLoad = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
        const target = e.currentTarget;
        if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            setMediaDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        } else {
            const video = target as HTMLVideoElement;
            setMediaDimensions({ width: video.videoWidth, height: video.videoHeight });
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-950 font-sans">
            {/* Header */}
            {!presentationMode && (
                <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="text-neutral-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="h-6 w-[1px] bg-neutral-800 mx-2"></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-white text-sm tracking-tight">{asset.title}</h1>
                                {getStatusBadge()}
                            </div>
                            <p className="text-xs text-neutral-500">{project.clientName}</p>
                        </div>
                        
                        {/* Version Switcher */}
                        <div className="relative group ml-4 z-50">
                            <button className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                                <span className="text-indigo-400">V{activeVersion.versionNumber}</span>
                                <span className="text-neutral-400">Current</span>
                                <ChevronDown size={14} className="text-neutral-500" />
                            </button>
                            <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover:block">
                                <div className="bg-neutral-900 border border-neutral-800 rounded shadow-xl overflow-hidden">
                                    {versions.map(v => (
                                        <button 
                                            key={v.id}
                                            onClick={() => { setActiveVersionId(v.id); setIsCompareMode(false); }}
                                            className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-800 flex justify-between items-center"
                                        >
                                            <span className={v.id === activeVersionId ? 'text-white' : 'text-neutral-400'}>
                                                Version {v.versionNumber}
                                            </span>
                                            {v.id === activeVersionId && <Check size={12} className="text-indigo-500"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex items-center -space-x-2 mr-4 border-r border-neutral-800 pr-4">
                            {activeViewers.map(u => (
                                <img key={u.id} src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border-2 border-neutral-950 ring-2 ring-neutral-900" title={`${u.name} is viewing`} />
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-neutral-950 bg-neutral-800 flex items-center justify-center text-xs text-neutral-400 ring-2 ring-neutral-900">
                                +1
                            </div>
                         </div>

                        {versions.length > 1 && (
                             <button 
                                onClick={handleToggleCompare}
                                className={`p-2 rounded-lg transition-colors ${isCompareMode ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                title="Compare Versions"
                            >
                                <Columns size={20} />
                            </button>
                        )}

                        <button 
                            onClick={() => setPresentationMode(true)}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                            title="Presentation Mode"
                        >
                            <Eye size={20} />
                        </button>

                        {!isCompareMode && (
                            <div className="flex items-center bg-neutral-900 rounded-lg p-1 border border-neutral-800 mr-4">
                                <button 
                                    onClick={() => setSocialRatio(SocialRatio.ORIGINAL)}
                                    className={`p-1.5 rounded ${socialRatio === SocialRatio.ORIGINAL ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    title="Original"
                                >
                                    <Monitor size={16} />
                                </button>
                                <button 
                                    onClick={() => setSocialRatio(SocialRatio.TIKTOK_9_16)}
                                    className={`p-1.5 rounded ${socialRatio === SocialRatio.TIKTOK_9_16 ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    title="Mobile 9:16 (TikTok/Reels)"
                                >
                                    <Smartphone size={16} />
                                </button>
                                 <button 
                                    onClick={() => setSocialRatio(SocialRatio.INSTA_1_1)}
                                    className={`p-1.5 rounded ${socialRatio === SocialRatio.INSTA_1_1 ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    title="Square 1:1"
                                >
                                    <Instagram size={16} />
                                </button>
                            </div>
                        )}

                         <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className="text-neutral-400 hover:text-white transition-colors p-2" 
                            title="Share Magic Link"
                        >
                            <Share2 size={20} />
                        </button>

                        {canDownload ? (
                             <button className="text-neutral-400 hover:text-indigo-400 transition-colors p-2" title="Download High-Res">
                                <Download size={20} />
                            </button>
                        ) : (
                            <button className="text-neutral-700 cursor-not-allowed p-2" title="Download Locked (Approval Required)">
                                <Lock size={20} />
                            </button>
                        )}

                        <div className="flex items-center gap-2 ml-4">
                            {canUpload && (
                                <button 
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20 flex items-center gap-2"
                                    title="Upload new version"
                                >
                                    <FileUp size={16} />
                                    New Version
                                </button>
                            )}
                            
                            {isDecisionMaker ? (
                                <>
                                    <button 
                                        onClick={handleRequestChanges}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentAssetStatus === AssetStatus.CHANGES_REQUESTED ? 'bg-amber-600 text-white' : 'bg-red-900/20 text-red-500 hover:bg-red-900/40'}`}
                                    >
                                        {currentAssetStatus === AssetStatus.CHANGES_REQUESTED ? 'Changes Requested' : 'Request Changes'}
                                    </button>
                                    <button 
                                        onClick={handleApprove}
                                        disabled={!canApprove}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            currentAssetStatus === AssetStatus.APPROVED 
                                                ? 'bg-green-600 text-white cursor-default' 
                                                : canApprove 
                                                    ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20' 
                                                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                        }`}
                                        title={!canApprove ? "Resolve all comments to approve" : "Approve asset"}
                                    >
                                        {currentAssetStatus === AssetStatus.APPROVED ? (
                                            <><CheckCircle2 size={16} /> Approved</>
                                        ) : (
                                            <>Approve {!canApprove && <AlertTriangle size={14} />}</>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800 text-xs text-neutral-400 font-medium">
                                    {currentUser.role === UserRole.CREATOR ? "Waiting for Approval" : "Read Only"}
                                </div>
                            )}
                        </div>
                    </div>
                </header>
            )}

            {/* Workspace */}
            <div className="flex-1 flex overflow-hidden relative" onClick={handleBackgroundClick}>
                
                {/* Floating Toolbar */}
                {!presentationMode && !isCompareMode && (
                    <div className="absolute top-6 left-6 z-40 flex flex-col gap-4">
                        {/* Drawing Tools */}
                        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/50 rounded-xl p-1.5 flex flex-col gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
                             <button 
                                onClick={() => setDrawingTool('pointer')}
                                className={`p-2 rounded-lg transition-all duration-200 ${drawingTool === 'pointer' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                title="Comment Pin (V)"
                            >
                                <MousePointer2 size={18} />
                             </button>
                             <button 
                                onClick={() => setDrawingTool('hand')}
                                className={`p-2 rounded-lg transition-all duration-200 ${drawingTool === 'hand' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                title="Pan Tool (H or Hold Space)"
                            >
                                <Hand size={18} />
                             </button>
                             <button 
                                onClick={() => setDrawingTool('pen')}
                                className={`p-2 rounded-lg transition-all duration-200 ${drawingTool === 'pen' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                title="Freehand Draw (P)"
                            >
                                <PenTool size={18} />
                             </button>
                             
                             <div className="h-[1px] bg-neutral-700 mx-1 my-1"></div>
                             <div className="flex flex-col gap-2 items-center py-1">
                                 {['#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                                     <button 
                                        key={c}
                                        onClick={() => setToolColor(c)}
                                        className={`w-4 h-4 rounded-full border border-neutral-700 transition-transform hover:scale-125 ${toolColor === c ? 'ring-2 ring-white scale-110 shadow-lg' : ''}`}
                                        style={{ background: c }}
                                     />
                                 ))}
                             </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/50 rounded-xl p-1.5 flex flex-col gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] items-center" onClick={(e) => e.stopPropagation()}>
                             <button 
                                onClick={() => setZoom(z => Math.min(5, z + 0.25))}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                                title="Zoom In"
                             >
                                <ZoomIn size={18} />
                             </button>
                             <span className="text-[10px] font-mono font-medium text-neutral-400">{Math.round(zoom * 100)}%</span>
                             <button 
                                onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                                title="Zoom Out"
                             >
                                <ZoomOut size={18} />
                             </button>
                             <button 
                                onClick={handleResetZoom}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                                title="Reset Zoom"
                             >
                                <Maximize size={18} />
                             </button>
                        </div>
                    </div>
                )}

                {/* Presentation Exit */}
                {presentationMode && (
                    <button 
                        onClick={() => setPresentationMode(false)}
                        className="absolute top-6 right-6 z-50 bg-black/50 text-white p-3 rounded-full hover:bg-black/80 transition-all backdrop-blur-sm"
                    >
                        <EyeOff size={20} />
                    </button>
                )}

                {/* Canvas Area with Pan/Zoom */}
                <div 
                    ref={viewportRef}
                    className="flex-1 bg-neutral-900/50 relative overflow-hidden flex items-center justify-center cursor-default"
                    onWheel={handleWheel}
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    onClick={handleBackgroundClick}
                >
                    
                    {/* Comparison Mode */}
                    {isCompareMode && compareVersion ? (
                         <div className="w-full h-full p-8 flex items-center justify-center">
                             <ComparisonView 
                                assetType={asset.type}
                                activeVersion={activeVersion}
                                compareVersion={compareVersion}
                                isVideoPlaying={isVideoPlaying}
                                onTogglePlay={() => setIsVideoPlaying(!isVideoPlaying)}
                                onTimeUpdate={handleTimeUpdate}
                             />
                         </div>
                    ) : (
                        /* Single View Mode - NOW WITH PAN & ZOOM TRANSFORM */
                        <div 
                            style={{ 
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: '0 0', // We handle origin manually in calculation for better control
                                transition: isPanningRef.current ? 'none' : 'transform 0.1s ease-out'
                            }}
                            className="flex items-center justify-center w-full h-full pointer-events-none" // pointer-events-none ensures drag events bubble to viewport, children re-enable pointer-events
                        >
                            <div 
                                ref={containerRef}
                                className={`relative shadow-2xl flex items-center justify-center bg-black pointer-events-auto transition-shadow duration-300`}
                                style={getContainerStyle()}
                                onClick={(e) => e.stopPropagation()} 
                            >
                                {asset.type === AssetType.IMAGE || asset.type === AssetType.DOCUMENT ? (
                                    <img 
                                        src={activeVersion.url} 
                                        className="w-full h-full object-contain select-none pointer-events-none" 
                                        alt="Asset" 
                                        onLoad={handleMediaLoad}
                                    />
                                ) : (
                                    <VideoPlayer 
                                        src={activeVersion.url} 
                                        onTimeUpdate={handleTimeUpdate}
                                        jumpToTime={jumpToTime}
                                        markers={activeVersion.comments.filter(c => c.videoTimestamp !== undefined).map(c => c.videoTimestamp!)}
                                        isPlaying={isVideoPlaying}
                                        onTogglePlay={() => setIsVideoPlaying(!isVideoPlaying)}
                                    />
                                )}

                                {/* Context-Aware Safe Zones Overlay */}
                                {renderSafeZones()}

                                {/* Annotation Overlay */}
                                <AnnotationLayer 
                                    comments={visibleComments}
                                    currentUser={currentUser}
                                    users={users}
                                    onAddComment={handleAddComment}
                                    activeCommentId={activeCommentId}
                                    onSelectComment={setActiveCommentId}
                                    isCompareMode={false}
                                    drawingTool={drawingTool}
                                    color={toolColor}
                                    onUpdateCommentPosition={handleUpdateCommentPosition}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                {!presentationMode && (
                    <CommentThread 
                        comments={visibleComments}
                        users={users}
                        activeCommentId={activeCommentId}
                        currentUser={currentUser}
                        onResolve={handleResolveComment}
                        onDelete={handleDeleteComment}
                        onReply={(id, text, isInternal) => {
                             const comment = activeVersion.comments.find(c => c.id === id);
                             if (comment && comment.text === "") {
                                 handleInitialComment(id, text, isInternal);
                             } else {
                                 handleReplyToComment(id, text, isInternal);
                             }
                        }}
                        onSelect={(id) => {
                            setActiveCommentId(id);
                            // Set jump time instantly so video player reacts
                            const c = activeVersion.comments.find(x => x.id === id);
                            if (c?.videoTimestamp !== undefined) {
                                setJumpToTime(c.videoTimestamp);
                                setIsVideoPlaying(false);
                            }
                        }}
                        assetTitle={asset.title}
                    />
                )}
            </div>

            {/* Upload New Version Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button 
                            onClick={() => setIsUploadModalOpen(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-2">Upload New Version</h2>
                        <p className="text-sm text-neutral-400 mb-6">
                            Uploading version <span className="text-indigo-400 font-bold">V{versions[0].versionNumber + 1}</span>. This will become the active version for everyone.
                        </p>
                        <form onSubmit={handleUploadNewVersion} className="space-y-6">
                            <div className="border-2 border-dashed border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-800/50 hover:border-neutral-600 transition-all group">
                                <div className="p-4 rounded-full bg-neutral-800 group-hover:bg-neutral-700 mb-3 transition-colors">
                                    <UploadCloud size={32} className="text-indigo-500" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">Click to upload or drag and drop</h3>
                                <p className="text-sm text-neutral-500">Supports {asset.type === AssetType.VIDEO ? 'MP4, MOV' : 'PNG, JPG, SVG'}</p>
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-900/20">
                                Upload Version {versions[0].versionNumber + 1}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {isShareModalOpen && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                         <button 
                            onClick={() => setIsShareModalOpen(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Share2 size={24} className="text-indigo-500"/> Share for Review</h2>
                        <p className="text-sm text-neutral-400 mb-4">Anyone with this link can view and comment on this asset without logging in.</p>
                        
                        <div className="bg-black/50 p-3 rounded-lg border border-neutral-800 flex items-center justify-between mb-4">
                            <code className="text-xs text-indigo-300 truncate">https://creativeflow.app/s/{asset.id.substring(0,8)}...</code>
                            <button className="text-neutral-400 hover:text-white ml-2"><Link size={16}/></button>
                        </div>

                        <div className="flex items-center gap-2 mb-6">
                            <input type="checkbox" id="allowDownload" className="rounded border-neutral-700 bg-neutral-800 text-indigo-600" />
                            <label htmlFor="allowDownload" className="text-sm text-neutral-300">Allow download</label>
                        </div>

                        <button onClick={() => setIsShareModalOpen(false)} className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-neutral-200 transition-colors">
                            Copy Link
                        </button>
                    </div>
                 </div>
            )}
        </div>
    );
};