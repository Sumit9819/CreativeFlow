import React, { useMemo, useState } from 'react';
import { Project, Asset, User, AssetStatus, AssetType } from '../types';
import { FolderOpen, FileImage, FileVideo, FileText, MoreVertical, Clock, Plus, Filter, X, UploadCloud, Search, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight, ArrowUpDown, Calendar } from 'lucide-react';
import { generateProjectReport } from '../services/geminiService';

interface DashboardProps {
    projects: Project[];
    onSelectAsset: (asset: Asset) => void;
    currentUser: User;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical';

export const Dashboard: React.FC<DashboardProps> = ({ projects: initialProjects, onSelectAsset, currentUser }) => {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [reportStatus, setReportStatus] = useState<Record<string, string>>({});
    
    // Scalability States
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const ITEMS_PER_PAGE = 8; // Adjustable based on screen size

    // Form States
    const [newProjectName, setNewProjectName] = useState('');
    const [newClientName, setNewClientName] = useState('');
    const [selectedProjectForUpload, setSelectedProjectForUpload] = useState<string>(projects[0]?.id || '');

    // Process Data: Filter -> Sort -> Paginate
    const processedData = useMemo(() => {
        let data = [...projects];

        // 1. Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            data = data.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                p.clientName.toLowerCase().includes(lowerQuery)
            );
        }

        // 2. Sort
        data.sort((a, b) => {
            if (sortOption === 'alphabetical') return a.name.localeCompare(b.name);
            // Mock date sorting based on ID or we'd use a createdAt field
            // Using ID for mock newness since mock data lacks project-level timestamp
            if (sortOption === 'newest') return b.id.localeCompare(a.id); 
            if (sortOption === 'oldest') return a.id.localeCompare(b.id);
            return 0;
        });

        // 3. Paginate
        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const currentItems = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return { totalPages, currentItems, totalCount: data.length };
    }, [projects, searchQuery, sortOption, currentPage]);

    const handleGenerateReport = async (project: Project) => {
        setReportStatus(prev => ({...prev, [project.id]: 'Generating...'}));
        const report = await generateProjectReport(project);
        setReportStatus(prev => ({...prev, [project.id]: report}));
    };

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        const newProject: Project = {
            id: `p_${Date.now()}`,
            name: newProjectName,
            clientName: newClientName,
            assets: []
        };
        setProjects([newProject, ...projects]);
        setIsNewProjectModalOpen(false);
        setNewProjectName('');
        setNewClientName('');
        // Reset to first page to see new project
        setCurrentPage(1); 
    };

    const handleUploadAsset = (e: React.FormEvent) => {
        e.preventDefault();
        const projectIndex = projects.findIndex(p => p.id === selectedProjectForUpload);
        if (projectIndex === -1) return;

        const newAsset: Asset = {
            id: `a_${Date.now()}`,
            title: 'New Uploaded Asset',
            type: AssetType.IMAGE,
            status: AssetStatus.PENDING,
            thumbnail: 'https://picsum.photos/400/300?random=' + Date.now(),
            versions: [{
                id: `v_${Date.now()}`,
                versionNumber: 1,
                url: 'https://picsum.photos/1200/800?random=' + Date.now(),
                createdAt: Date.now(),
                comments: []
            }]
        };

        const updatedProjects = [...projects];
        updatedProjects[projectIndex] = {
            ...updatedProjects[projectIndex],
            assets: [newAsset, ...updatedProjects[projectIndex].assets]
        };
        setProjects(updatedProjects);
        setIsUploadModalOpen(false);
    };

    const getStatusColor = (status: AssetStatus) => {
        switch(status) {
            case AssetStatus.APPROVED: return 'bg-green-500/10 text-green-400 border-green-500/20';
            case AssetStatus.CHANGES_REQUESTED: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case AssetStatus.IN_PROGRESS: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
        }
    };

    const getAssetIcon = (type: AssetType) => {
        switch(type) {
            case AssetType.VIDEO: return <FileVideo size={20} className="text-white" />;
            case AssetType.DOCUMENT: return <FileText size={20} className="text-white" />;
            default: return <FileImage size={20} className="text-white" />;
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative bg-neutral-950 flex flex-col h-full">
            <header className="mb-8 shrink-0">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Workspace</h1>
                        <p className="text-neutral-400">Manage your creative projects.</p>
                    </div>
                    <button 
                        onClick={() => setIsNewProjectModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={18} /> New Project
                    </button>
                </div>

                {/* Toolbar for Massive Scale */}
                <div className="flex flex-col md:flex-row gap-4 justify-between bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 backdrop-blur-sm">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search projects or clients..." 
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                         {/* Sort */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors">
                                <ArrowUpDown size={16} />
                                <span className="capitalize">{sortOption}</span>
                            </button>
                            {/* Updated Dropdown with padding bridge */}
                            <div className="absolute right-0 top-full pt-2 w-32 hidden group-hover:block z-20">
                                <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
                                    {['newest', 'oldest', 'alphabetical'].map((opt) => (
                                        <button 
                                            key={opt}
                                            onClick={() => setSortOption(opt as SortOption)}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 ${sortOption === opt ? 'text-indigo-400' : 'text-neutral-400'}`}
                                        >
                                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-6 w-[1px] bg-neutral-800"></div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-neutral-950 rounded-lg p-1 border border-neutral-800">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <ListIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto -mr-4 pr-4 custom-scrollbar">
                {processedData.totalCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                        <FolderOpen size={48} className="mb-4 opacity-50" />
                        <p>No projects found matching "{searchQuery}"</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="space-y-10 pb-8">
                                {/* We map through items directly, no more hardcoded client grouping for scalability */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {processedData.currentItems.map(project => (
                                        <div key={project.id} className="flex flex-col gap-4 animate-fade-in">
                                            {/* Project Header Card */}
                                            <div className="flex items-center justify-between px-1">
                                                <div>
                                                    <h3 className="font-medium text-neutral-200 truncate max-w-[200px]" title={project.name}>{project.name}</h3>
                                                    <p className="text-xs text-indigo-400">{project.clientName}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleGenerateReport(project)}
                                                    className="text-[10px] bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
                                                >
                                                    AI Report
                                                </button>
                                            </div>

                                            {/* Render report if exists */}
                                            {reportStatus[project.id] && (
                                                <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 relative animate-fade-in">
                                                    <button onClick={() => setReportStatus(prev => ({...prev, [project.id]: ''}))} className="absolute top-2 right-2 hover:text-white"><X size={12}/></button>
                                                    <p className="font-semibold text-indigo-400 mb-1">Status Report</p>
                                                    {reportStatus[project.id]}
                                                </div>
                                            )}

                                            {/* Assets Grid within Project */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {project.assets.slice(0, 4).map(asset => (
                                                    <div 
                                                        key={asset.id}
                                                        onClick={() => onSelectAsset(asset)}
                                                        className="group relative aspect-video bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer hover:shadow-lg"
                                                    >
                                                        {asset.type === AssetType.IMAGE ? (
                                                            <img src={asset.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={asset.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-neutral-900 relative">
                                                                <img src={asset.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" alt="" />
                                                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center z-10 border border-white/20">
                                                                    {getAssetIcon(asset.type)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${asset.status === AssetStatus.APPROVED ? 'bg-green-500' : asset.status === AssetStatus.CHANGES_REQUESTED ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                                    </div>
                                                ))}
                                                {project.assets.length > 4 && (
                                                     <div className="aspect-video bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center text-xs text-neutral-500">
                                                        +{project.assets.length - 4} more
                                                     </div>
                                                )}
                                                <div 
                                                    onClick={() => { setSelectedProjectForUpload(project.id); setIsUploadModalOpen(true); }}
                                                    className="aspect-video bg-neutral-900/30 border border-neutral-800 border-dashed rounded-lg flex items-center justify-center text-neutral-600 hover:text-indigo-400 hover:border-indigo-500/30 cursor-pointer transition-all"
                                                >
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* LIST VIEW - Better for density */
                            <div className="w-full text-left border-separate border-spacing-y-2 pb-8">
                                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800 mb-2">
                                    <div className="col-span-4">Project & Client</div>
                                    <div className="col-span-2">Assets</div>
                                    <div className="col-span-3">Status Overview</div>
                                    <div className="col-span-2">Last Updated</div>
                                    <div className="col-span-1 text-right">Actions</div>
                                </div>
                                {processedData.currentItems.map(project => {
                                    // Aggregate status
                                    const approvedCount = project.assets.filter(a => a.status === AssetStatus.APPROVED).length;
                                    const changesCount = project.assets.filter(a => a.status === AssetStatus.CHANGES_REQUESTED).length;
                                    
                                    return (
                                        <div key={project.id} className="grid grid-cols-12 gap-4 px-4 py-4 bg-neutral-900/50 border border-neutral-800/50 rounded-lg hover:border-indigo-500/30 hover:bg-neutral-900 transition-all items-center group animate-fade-in">
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-indigo-900/20 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                                                    {project.name.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-neutral-200">{project.name}</h3>
                                                    <p className="text-xs text-neutral-500">{project.clientName}</p>
                                                </div>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2">
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {project.assets.slice(0, 3).map(asset => (
                                                        <div key={asset.id} onClick={() => onSelectAsset(asset)} className="w-8 h-8 rounded-lg border border-neutral-950 bg-neutral-800 overflow-hidden cursor-pointer hover:scale-110 transition-transform relative z-0 hover:z-10">
                                                            <img src={asset.thumbnail} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                    ))}
                                                </div>
                                                {project.assets.length > 3 && <span className="text-xs text-neutral-500">+{project.assets.length - 3}</span>}
                                            </div>
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="h-1.5 flex-1 bg-neutral-800 rounded-full overflow-hidden flex">
                                                        <div style={{ width: `${(approvedCount / project.assets.length) * 100}%` }} className="bg-green-500/70" />
                                                        <div style={{ width: `${(changesCount / project.assets.length) * 100}%` }} className="bg-red-500/70" />
                                                    </div>
                                                    <span className="text-xs text-neutral-400">{Math.round((approvedCount / (project.assets.length || 1)) * 100)}%</span>
                                                </div>
                                                <p className="text-[10px] text-neutral-500">{project.assets.length} assets total</p>
                                            </div>
                                            <div className="col-span-2 text-xs text-neutral-400 flex items-center gap-2">
                                                <Calendar size={12} /> Today
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button 
                                                    onClick={() => handleGenerateReport(project)}
                                                    className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-indigo-400 transition-colors"
                                                    title="Generate Report"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedProjectForUpload(project.id); setIsUploadModalOpen(true); }}
                                                    className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-indigo-400 transition-colors"
                                                    title="Quick Upload"
                                                >
                                                    <UploadCloud size={16} />
                                                </button>
                                            </div>
                                            {/* Inline Report in List View */}
                                            {reportStatus[project.id] && (
                                                <div className="col-span-12 mt-2 bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300">
                                                    <p className="font-bold text-indigo-400">AI Status Report:</p>
                                                    {reportStatus[project.id]}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {processedData.totalPages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-neutral-900 mt-auto">
                                <span className="text-xs text-neutral-500">
                                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, processedData.totalCount)} of {processedData.totalCount} projects
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: processedData.totalPages }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:bg-neutral-800'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(processedData.totalPages, p + 1))}
                                        disabled={currentPage === processedData.totalPages}
                                        className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Project Modal */}
            {isNewProjectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setIsNewProjectModalOpen(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Project Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    required
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Winter Campaign 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Client Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newClientName}
                                    onChange={e => setNewClientName(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors mt-2">
                                Create Project
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button 
                            onClick={() => setIsUploadModalOpen(false)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-4">Upload Asset</h2>
                        <form onSubmit={handleUploadAsset} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Select Project</label>
                                <select 
                                    value={selectedProjectForUpload}
                                    onChange={e => setSelectedProjectForUpload(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="border-2 border-dashed border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-800/50 hover:border-neutral-600 transition-all">
                                <UploadCloud size={48} className="text-indigo-500 mb-3" />
                                <h3 className="text-lg font-medium text-white mb-1">Click to upload or drag and drop</h3>
                                <p className="text-sm text-neutral-500">SVG, PNG, JPG, MP4 or PDF (max. 50MB)</p>
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors">
                                Upload 1 File
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};