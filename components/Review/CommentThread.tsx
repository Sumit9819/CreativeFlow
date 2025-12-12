import React, { useState } from 'react';
import { Comment, User, UserRole } from '../../types';
import { CheckCircle2, Sparkles, Send, X, Clock, Filter, PenTool, Box, CornerDownRight, Trash2, Lock, Eye, EyeOff } from 'lucide-react';
import { summarizeFeedback, suggestReply } from '../../services/geminiService';

interface CommentThreadProps {
  comments: Comment[];
  users: User[];
  activeCommentId: string | null;
  onResolve: (id: string) => void;
  onReply: (id: string, text: string, isInternal: boolean) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  assetTitle: string;
  currentUser: User;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  users,
  activeCommentId,
  onResolve,
  onReply,
  onSelect,
  onDelete,
  assetTitle,
  currentUser
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyInternal, setReplyInternal] = useState<Record<string, boolean>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN');

  const getUser = (id: string) => users.find(u => u.id === id) || users[0];

  const handleSummarize = async () => {
    setIsSummarizing(true);
    // Only summarize non-internal comments usually, but let's include all for internal teams
    const result = await summarizeFeedback(comments.filter(c => !c.resolved), users, assetTitle);
    setSummary(result);
    setIsSummarizing(false);
  };

  const handleGetSuggestion = async (commentId: string, text: string) => {
      setReplyDrafts(prev => ({ ...prev, [commentId]: 'Generating suggestion...' }));
      const suggestion = await suggestReply(text);
      setAiSuggestions(prev => ({ ...prev, [commentId]: suggestion }));
      setReplyDrafts(prev => ({ ...prev, [commentId]: suggestion }));
  };

  const handleSendReply = (commentId: string) => {
      const text = replyDrafts[commentId];
      const isInternal = replyInternal[commentId] || false;
      if (text && text.trim()) {
          onReply(commentId, text, isInternal);
          setReplyDrafts(prev => ({ ...prev, [commentId]: '' }));
          const newSuggestions = {...aiSuggestions};
          delete newSuggestions[commentId];
          setAiSuggestions(newSuggestions);
      }
  }

  const sortedComments = [...comments]
    .filter(c => {
        if (filter === 'OPEN') return !c.resolved;
        if (filter === 'RESOLVED') return c.resolved;
        return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const openCount = comments.filter(c => !c.resolved).length;
  // Check if current user can make internal comments (Not an external client)
  // Assuming 'APPROVER' is client, everyone else is internal team for this logic.
  const canPostInternal = currentUser.role !== UserRole.APPROVER;

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 w-80 shrink-0 z-40">
      
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-200">Feedback</h3>
            <button
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="text-xs flex items-center gap-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 px-2 py-1 rounded transition-colors"
            >
            <Sparkles size={12} />
            {isSummarizing ? 'Thinking...' : 'Summarize'}
            </button>
        </div>

        {/* Filters */}
        <div className="flex p-1 bg-neutral-950 rounded-lg">
            {(['OPEN', 'RESOLVED', 'ALL'] as const).map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${filter === f ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    {f === 'OPEN' ? `Open (${openCount})` : f === 'ALL' ? 'All' : 'Resolved'}
                </button>
            ))}
        </div>
      </div>

      {/* AI Summary Panel */}
      {summary && (
        <div className="p-4 bg-indigo-950/20 border-b border-indigo-900/30 text-sm text-neutral-300 relative animate-fade-in">
          <button 
            onClick={() => setSummary(null)}
            className="absolute top-2 right-2 text-neutral-500 hover:text-white"
          >
            <X size={14} />
          </button>
          <h4 className="font-semibold text-indigo-400 mb-2 flex items-center gap-2">
            <Sparkles size={14} /> Executive Summary
          </h4>
          <div className="prose prose-invert prose-sm max-w-none leading-relaxed whitespace-pre-line text-xs">
            {summary}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {sortedComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                <Filter size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No {filter.toLowerCase()} comments.</p>
            </div>
        ) : (
            sortedComments.map((comment) => {
            const author = getUser(comment.userId);
            const isActive = activeCommentId === comment.id;
            const canDelete = currentUser.id === comment.userId || currentUser.role === UserRole.SUPER_ADMIN;
            const isInternal = comment.isInternal;
            
            // Calculate index based on the original list passed in props to match pins
            const originalIndex = comments.findIndex(c => c.id === comment.id) + 1;

            return (
                <div 
                key={comment.id}
                onClick={() => onSelect(comment.id)}
                id={`comment-${comment.id}`}
                className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                    isActive 
                    ? isInternal ? 'bg-amber-900/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-neutral-800 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : isInternal ? 'bg-amber-900/5 border-amber-900/20 hover:border-amber-700 hover:bg-amber-900/10' : 'bg-neutral-800/40 border-neutral-800/50 hover:border-neutral-700 hover:bg-neutral-800/80'
                } ${comment.resolved ? 'opacity-60 grayscale-[0.5]' : ''}`}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-neutral-700 text-[10px] flex items-center justify-center font-bold text-white border border-neutral-600">
                                 #{originalIndex}
                             </div>
                            <img src={author.avatar} className="w-5 h-5 rounded-full border border-neutral-700" alt={author.name} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-neutral-200 leading-tight">{author.name}</span>
                                <span className="text-[10px] text-neutral-500 uppercase">{author.role}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isInternal && (
                                <span className="text-amber-500 flex items-center gap-1 text-[10px] bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/50" title="Internal Team Only">
                                    <Lock size={10} /> TEAM
                                </span>
                            )}
                            {comment.drawing && (
                                <span className="text-neutral-500" title="Has drawing">
                                    {comment.drawing.type === 'pen' ? <PenTool size={10} /> : <Box size={10} />}
                                </span>
                            )}
                            {comment.videoTimestamp !== undefined && (
                                <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900/50">
                                    <Clock size={10} />
                                    {new Date(comment.videoTimestamp * 1000).toISOString().substr(14, 5)}
                                </span>
                            )}
                            {canDelete && !comment.resolved && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
                                    className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                                    title="Delete comment"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <p className="text-sm text-neutral-300 mb-3 leading-relaxed">{comment.text}</p>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-neutral-700 space-y-2 mb-3">
                            {comment.replies.map(reply => {
                                const replyAuthor = getUser(reply.userId);
                                return (
                                    <div key={reply.id} className={`text-xs ${reply.isInternal ? 'text-amber-200/80 italic' : 'text-neutral-300'}`}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`font-semibold ${reply.isInternal ? 'text-amber-400' : 'text-neutral-400'}`}>{replyAuthor.name}</span>
                                            <span className="text-[9px] text-neutral-600">{new Date(reply.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {reply.isInternal && <Lock size={8} className="text-amber-500" />}
                                        </div>
                                        <p>{reply.text}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="flex items-center gap-2 justify-between mt-2 pt-2 border-t border-neutral-700/30">
                        <span className="text-[10px] text-neutral-600">
                             {new Date(comment.timestamp).toLocaleDateString()}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!comment.resolved && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleGetSuggestion(comment.id, comment.text); }}
                                    className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 rounded"
                                    title="Generate AI Reply"
                                >
                                    <Sparkles size={14} />
                                </button>
                            )}
                            {!comment.resolved ? (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
                                    className="flex items-center gap-1 text-xs bg-green-900/20 text-green-400 hover:bg-green-900/30 px-2 py-1 rounded transition-colors border border-green-900/30"
                                >
                                    <CheckCircle2 size={12} />
                                    Done
                                </button>
                            ) : (
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Resolved
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Reply Input Area */}
                    {isActive && !comment.resolved && (
                        <div className="mt-3 pt-3 border-t border-neutral-700/50 animate-fade-in">
                             {aiSuggestions[comment.id] && (
                                 <p className="text-[10px] text-indigo-300 mb-1.5 italic flex items-center gap-1">
                                     <Sparkles size={8} /> AI Suggestion
                                 </p>
                             )}
                             <div className="flex gap-2">
                                <div className="text-neutral-600 pt-2"><CornerDownRight size={14} /></div>
                                <div className="flex-1 flex flex-col gap-2">
                                    <input 
                                        type="text"
                                        value={replyDrafts[comment.id] || ''}
                                        onChange={(e) => setReplyDrafts(prev => ({...prev, [comment.id]: e.target.value}))}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSendReply(comment.id);
                                        }}
                                        placeholder={replyInternal[comment.id] ? "Internal note..." : "Write a reply..."}
                                        className={`w-full border rounded px-2 py-1.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 transition-colors ${
                                            replyInternal[comment.id] 
                                                ? 'bg-amber-950/30 border-amber-900 focus:border-amber-500' 
                                                : 'bg-neutral-900 border-neutral-700 focus:border-indigo-500'
                                        }`}
                                        autoFocus
                                    />
                                    {canPostInternal && (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplyInternal(prev => ({...prev, [comment.id]: !prev[comment.id]}));
                                                }}
                                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                                                    replyInternal[comment.id] 
                                                        ? 'bg-amber-500/20 text-amber-400' 
                                                        : 'text-neutral-500 hover:bg-neutral-800'
                                                }`}
                                            >
                                                {replyInternal[comment.id] ? <Lock size={10} /> : <Eye size={10} />}
                                                {replyInternal[comment.id] ? 'Internal Team Only' : 'Public Reply'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => {e.stopPropagation(); handleSendReply(comment.id)}}
                                    className={`px-2 rounded h-8 mt-1 ${
                                        replyInternal[comment.id]
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                    }`}
                                >
                                    <Send size={12} />
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            );
            })
        )}
      </div>
    </div>
  );
};