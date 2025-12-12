import React, { useState, useRef, useMemo, useCallback } from 'react';
import { User, Comment, Drawing } from '../../types';

interface AnnotationLayerProps {
  comments: Comment[];
  currentUser: User;
  users: User[];
  onAddComment: (x: number, y: number, drawing?: Drawing) => void;
  activeCommentId: string | null;
  onSelectComment: (id: string) => void;
  isCompareMode?: boolean;
  drawingTool: 'pointer' | 'pen' | 'box' | 'hand';
  color: string;
  onUpdateCommentPosition?: (id: string, x: number, y: number) => void;
}

// ----------------------------------------------------------------------
// 1. Memoized Pin Component (Prevents re-rendering all pins when one moves)
// ----------------------------------------------------------------------
const Pin = React.memo(({ 
    comment, 
    index, 
    isActive, 
    isHovered, 
    isDragging, 
    dragPosition, 
    author, 
    onMouseDown, 
    onMouseEnter, 
    onMouseLeave,
    isCompareMode,
    drawingTool
}: {
    comment: Comment;
    index: number;
    isActive: boolean;
    isHovered: boolean;
    isDragging: boolean;
    dragPosition: {x: number, y: number} | null;
    author?: User;
    onMouseDown: (e: React.MouseEvent, id: string, x: number, y: number) => void;
    onMouseEnter: (id: string) => void;
    onMouseLeave: () => void;
    isCompareMode: boolean;
    drawingTool: string;
}) => {
    // Determine Display Position
    const displayX = isDragging && dragPosition ? dragPosition.x : comment.x;
    const displayY = isDragging && dragPosition ? dragPosition.y : comment.y;

    if (typeof displayX !== 'number' || typeof displayY !== 'number') return null;

    const isRightSide = displayX > 50;

    return (
        <React.Fragment>
            <div
                onMouseDown={(e) => onMouseDown(e, comment.id, comment.x || 0, comment.y || 0)}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => !isDragging && onMouseEnter(comment.id)}
                onMouseLeave={onMouseLeave}
                style={{ left: `${displayX}%`, top: `${displayY}%` }}
                className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transform transition-transform duration-200 border-2 z-30
                ${drawingTool === 'pointer' && !isCompareMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${isActive || isDragging
                    ? 'bg-indigo-600 border-white text-white scale-110 ring-4 ring-indigo-500/30' 
                    : 'bg-white/95 border-indigo-600 text-indigo-900 hover:scale-110 hover:bg-white'
                }`}
            >
                {index + 1}
            </div>

            {/* Tooltip */}
            {isHovered && !isDragging && (
                <div 
                    className="absolute z-50 bg-neutral-900/90 backdrop-blur-xl border border-neutral-700 p-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-72 pointer-events-none animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-2"
                    style={{ 
                        left: `${displayX}%`, 
                        top: `${displayY}%`,
                        transform: isRightSide ? 'translate(calc(-100% - 24px), -50%)' : 'translate(24px, -50%)'
                    }}
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                        <div className="flex items-center gap-2">
                             {author && <img src={author.avatar} className="w-5 h-5 rounded-full border border-neutral-600" alt="" />}
                             <span className="text-xs font-semibold text-neutral-200 truncate max-w-[120px]">
                                 {author?.name || 'Unknown'}
                             </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                             #{index + 1} • {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed line-clamp-4">
                        {comment.text || <span className="italic text-neutral-500">Writing comment...</span>}
                    </p>
                    {/* Tooltip Arrows */}
                    <div className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-8 border-transparent ${isRightSide ? 'right-[-16px] border-l-neutral-700/50' : 'left-[-16px] border-r-neutral-700/50'}`}></div>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent ${isRightSide ? 'right-[-12px] border-l-neutral-900/90' : 'left-[-12px] border-r-neutral-900/90'}`}></div>
                </div>
            )}
        </React.Fragment>
    );
});


// ----------------------------------------------------------------------
// 2. Memoized Static Drawings (Prevents re-rendering heavy SVG paths)
// ----------------------------------------------------------------------
const StaticDrawings = React.memo(({ comments, activeCommentId, draggedCommentId, dragPosition }: { 
    comments: Comment[], 
    activeCommentId: string | null,
    draggedCommentId: string | null,
    dragPosition: {x: number, y: number} | null
}) => {
    return (
        <>
            {comments.map((comment) => {
                if (comment.resolved || !comment.drawing) return null;

                const isDimmed = activeCommentId && activeCommentId !== comment.id;
                const opacity = isDimmed ? 0.3 : 1;
                const strokeWidth = 2;

                // Handle Dragging Offset for Drawings
                let drawingToRender = comment.drawing;
                const isDragging = draggedCommentId === comment.id;
                
                if (isDragging && dragPosition && comment.x !== undefined && comment.y !== undefined) {
                    const dx = dragPosition.x - comment.x;
                    const dy = dragPosition.y - comment.y;
                    
                    if (drawingToRender.type === 'box' && drawingToRender.rect) {
                        drawingToRender = {
                            ...drawingToRender,
                            rect: {
                                ...drawingToRender.rect,
                                x: drawingToRender.rect.x + dx,
                                y: drawingToRender.rect.y + dy
                            }
                        };
                    } else if (drawingToRender.type === 'pen' && drawingToRender.points) {
                        drawingToRender = {
                            ...drawingToRender,
                            points: drawingToRender.points.map(p => ({
                                x: p.x + dx,
                                y: p.y + dy
                            }))
                        };
                    }
                }

                if (drawingToRender.type === 'pen' && drawingToRender.points) {
                    const d = drawingToRender.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    return <path key={`d-${comment.id}`} d={d} stroke={drawingToRender.color} strokeWidth={strokeWidth} fill="none" vectorEffect="non-scaling-stroke" opacity={opacity} strokeLinecap="round" strokeLinejoin="round" />;
                } 
                if (drawingToRender.type === 'box' && drawingToRender.rect) {
                    const { x, y, w, h } = drawingToRender.rect;
                    return <rect key={`d-${comment.id}`} x={x} y={y} width={w} height={h} stroke={drawingToRender.color} strokeWidth={strokeWidth} fill="none" vectorEffect="non-scaling-stroke" opacity={opacity} />;
                }
                return null;
            })}
        </>
    );
});


// ----------------------------------------------------------------------
// 3. Main Annotation Layer Component
// ----------------------------------------------------------------------
export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  comments,
  currentUser,
  users,
  onAddComment,
  activeCommentId,
  onSelectComment,
  isCompareMode = false,
  drawingTool,
  color,
  onUpdateCommentPosition
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Cache Rect to avoid Layout Thrashing on MouseMove
  const boundsRef = useRef<DOMRect | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [currentStart, setCurrentStart] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [draggedCommentId, setDraggedCommentId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{x: number, y: number} | null>(null);

  // Helper to calculate normalized point (0-100) using CACHED bounds
  const getPoint = (e: React.MouseEvent) => {
      // Fallback if bounds missing (shouldn't happen during drag if MouseDown logic works)
      const rect = boundsRef.current || containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      return { x, y };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 0. If tool is 'hand', allow event to bubble to parent for panning
    if (drawingTool === 'hand') return;

    // 1. Cache the Container Bounds immediately
    if (containerRef.current) {
        boundsRef.current = containerRef.current.getBoundingClientRect();
    }

    if (isCompareMode || draggedCommentId) return;

    // Start Drawing Logic
    if (drawingTool !== 'pointer') {
        setIsDrawing(true);
        const point = getPoint(e);

        if (drawingTool === 'pen') {
            setCurrentPath([point]);
        } else if (drawingTool === 'box') {
            setCurrentStart(point);
            setCurrentRect({ x: point.x, y: point.y, w: 0, h: 0 });
        }
    } else {
        setIsDrawing(true); // Treat click as potential 'dot' drawing for placement logic
    }
  }, [isCompareMode, draggedCommentId, drawingTool]);

  const handlePinMouseDown = useCallback((e: React.MouseEvent, id: string, startX: number, startY: number) => {
      e.stopPropagation(); // Always stop propagation on pin click
      if (drawingTool === 'pointer' && !isCompareMode) {
          // Cache bounds for dragging too
          if (containerRef.current) {
              boundsRef.current = containerRef.current.getBoundingClientRect();
          }
          setDraggedCommentId(id);
          setDragPosition({ x: startX, y: startY });
          onSelectComment(id);
      }
  }, [drawingTool, isCompareMode, onSelectComment]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getPoint(e);

    // 1. Handle Dragging
    if (draggedCommentId) {
        // Clamp to 0-100
        const x = Math.max(0, Math.min(100, point.x));
        const y = Math.max(0, Math.min(100, point.y));
        setDragPosition({ x, y });
        return;
    }

    // 2. Handle Drawing
    if (!isDrawing) return;

    if (drawingTool === 'pen') {
        setCurrentPath(prev => [...prev, point]);
    } else if (drawingTool === 'box' && currentStart) {
        const w = point.x - currentStart.x;
        const h = point.y - currentStart.y;
        setCurrentRect({
            x: w > 0 ? currentStart.x : point.x,
            y: h > 0 ? currentStart.y : point.y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
    }
  }, [draggedCommentId, isDrawing, drawingTool, currentStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Finish Dragging
    if (draggedCommentId) {
        if (onUpdateCommentPosition && dragPosition) {
            onUpdateCommentPosition(draggedCommentId, dragPosition.x, dragPosition.y);
        }
        setDraggedCommentId(null);
        setDragPosition(null);
        boundsRef.current = null; // Clear cache
        return;
    }

    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    // Finish Drawing
    if (drawingTool === 'pointer' && !isCompareMode) {
        const point = getPoint(e);
        onAddComment(point.x, point.y);
    } else if (drawingTool === 'pen' && currentPath.length > 1) {
        onAddComment(currentPath[0].x, currentPath[0].y, {
            type: 'pen',
            points: currentPath,
            color: color
        });
    } else if (drawingTool === 'box' && currentRect && (currentRect.w > 1 || currentRect.h > 1)) {
        onAddComment(currentRect.x + currentRect.w, currentRect.y, {
            type: 'box',
            rect: currentRect,
            color: color
        });
    }

    // Reset
    setCurrentPath([]);
    setCurrentRect(null);
    setCurrentStart(null);
    boundsRef.current = null; // Clear cache
  }, [draggedCommentId, dragPosition, onUpdateCommentPosition, isDrawing, drawingTool, isCompareMode, currentPath, currentRect, onAddComment, color]);

  const handleMouseLeave = useCallback(() => {
      setIsDrawing(false);
      setHoveredCommentId(null);
      setDraggedCommentId(null);
      setDragPosition(null);
      boundsRef.current = null;
  }, []);

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`absolute inset-0 z-10 select-none ${isCompareMode ? '' : drawingTool === 'hand' ? 'cursor-grab active:cursor-grabbing' : drawingTool !== 'pointer' ? 'cursor-crosshair' : draggedCommentId ? 'cursor-grabbing' : 'cursor-default'}`}
    >
      {/* SVG Layer */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        {/* Memoized Static Drawings (includes the moving drawing when dragging pin) */}
        <StaticDrawings 
            comments={comments} 
            activeCommentId={activeCommentId} 
            draggedCommentId={draggedCommentId}
            dragPosition={dragPosition}
        />

        {/* Current Active Drawing Draft */}
        {isDrawing && drawingTool === 'pen' && (
            <path d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} stroke={color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {isDrawing && drawingTool === 'box' && currentRect && (
             <rect x={currentRect.x} y={currentRect.y} width={currentRect.w} height={currentRect.h} stroke={color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {/* Pins Layer */}
      {comments.map((comment, index) => {
          if (comment.resolved || typeof comment.x !== 'number' || typeof comment.y !== 'number') return null;
          
          return (
              <Pin 
                key={comment.id}
                comment={comment}
                index={index}
                isActive={activeCommentId === comment.id}
                isHovered={hoveredCommentId === comment.id}
                isDragging={draggedCommentId === comment.id}
                dragPosition={draggedCommentId === comment.id ? dragPosition : null}
                author={users.find(u => u.id === comment.userId)}
                onMouseDown={handlePinMouseDown}
                onMouseEnter={setHoveredCommentId}
                onMouseLeave={() => setHoveredCommentId(null)}
                isCompareMode={isCompareMode}
                drawingTool={drawingTool}
              />
          );
      })}
    </div>
  );
};