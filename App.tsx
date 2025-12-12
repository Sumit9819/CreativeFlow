import React, { useState } from 'react';
import { MOCK_PROJECTS, MOCK_USERS, MOCK_NOTIFICATIONS } from './constants';
import { Project, User, Asset } from './types';
import { Dashboard } from './views/Dashboard';
import { ReviewRoom } from './views/ReviewRoom';
import { Settings } from './views/Settings';
import { Layout, Grid, LogOut, Settings as SettingsIcon, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

enum View {
  DASHBOARD = 'DASHBOARD',
  REVIEW = 'REVIEW',
  SETTINGS = 'SETTINGS',
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); 
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // Mock navigation handler
  const handleOpenAsset = (asset: Asset) => {
    // Find project for asset (inefficient but fine for mock)
    const project = MOCK_PROJECTS.find(p => p.assets.some(a => a.id === asset.id));
    if (project) {
        setActiveProject(project);
        setActiveAsset(asset);
        setCurrentView(View.REVIEW);
    }
  };

  const handleGoHome = () => {
    setCurrentView(View.DASHBOARD);
    setActiveAsset(null);
  };

  const handleMarkAllRead = () => {
      setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
      switch(type) {
          case 'success': return <CheckCircle2 size={16} className="text-green-400" />;
          case 'alert': return <AlertCircle size={16} className="text-amber-400" />;
          default: return <Info size={16} className="text-blue-400" />;
      }
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-18 border-r border-neutral-800 flex flex-col items-center py-6 gap-6 bg-neutral-950 z-50 shrink-0">
        <div 
            onClick={handleGoHome}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer hover:scale-105 transition-transform"
        >
          <Layout className="text-white" size={20} />
        </div>

        <nav className="flex flex-col gap-4 flex-1 w-full items-center mt-6">
            <button 
                onClick={handleGoHome}
                className={`p-3 rounded-xl transition-all relative group ${currentView === View.DASHBOARD ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}`}
            >
                <Grid size={22} />
                <span className="absolute left-14 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-neutral-700">Dashboard</span>
            </button>
            
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-3 rounded-xl transition-all relative group ${showNotifications ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}`}
                >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                        <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-950"></span>
                    )}
                    <span className="absolute left-14 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-neutral-700">Notifications</span>
                </button>

                {/* Notifications Popup */}
                {showNotifications && (
                    <div className="absolute left-14 top-0 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                        <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300">Mark all read</button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-neutral-500">No notifications</div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className={`p-3 border-b border-neutral-800/50 hover:bg-neutral-800/50 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-900/10' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                                            <div>
                                                <p className="text-sm text-neutral-200 leading-snug">{n.text}</p>
                                                <span className="text-[10px] text-neutral-500 mt-1 block">{n.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={() => { setCurrentView(View.SETTINGS); setActiveAsset(null); }}
                className={`p-3 rounded-xl transition-all relative group ${currentView === View.SETTINGS ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}`}
            >
                <SettingsIcon size={22} />
                <span className="absolute left-14 bg-neutral-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-neutral-700">Settings</span>
            </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4 items-center mb-2">
             {/* Role Switcher for Demo Purposes */}
             <div className="group relative">
                <img 
                    src={currentUser.avatar} 
                    alt="User" 
                    className="w-10 h-10 rounded-full border-2 border-neutral-800 cursor-pointer hover:border-indigo-500 transition-colors relative z-10" 
                />
                {/* Bridge wrapper that starts over the avatar to prevent hover gap */}
                <div className="absolute left-8 bottom-0 hidden group-hover:block w-56 z-50 pl-6 pb-2">
                    <div className="bg-neutral-800 p-2 rounded-lg border border-neutral-700 shadow-xl animate-fade-in">
                        <p className="text-[10px] text-neutral-400 mb-2 px-2 uppercase tracking-wider font-bold border-b border-neutral-700 pb-1">Demo: Switch User</p>
                        {MOCK_USERS.map(u => (
                            <button 
                                key={u.id}
                                onClick={() => setCurrentUser(u)}
                                className={`w-full text-left px-2 py-2 text-xs rounded hover:bg-neutral-700 flex items-center gap-2 ${currentUser.id === u.id ? 'bg-neutral-700/50 text-white' : 'text-neutral-300'}`}
                            >
                                <img src={u.avatar} className="w-5 h-5 rounded-full" alt="" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{u.name}</span>
                                    <span className="text-[9px] text-neutral-500 uppercase">{u.role}</span>
                                </div>
                            </button>
                        ))}
                        <div className="mt-2 border-t border-neutral-700 pt-2 px-2">
                            <button className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 w-full">
                                <LogOut size={12} /> Log Out
                            </button>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-neutral-950">
        {currentView === View.DASHBOARD && (
            <Dashboard 
                projects={MOCK_PROJECTS} 
                onSelectAsset={handleOpenAsset}
                currentUser={currentUser}
            />
        )}
        {currentView === View.REVIEW && activeAsset && activeProject && (
            <ReviewRoom 
                asset={activeAsset} 
                project={activeProject}
                currentUser={currentUser}
                users={MOCK_USERS}
                onBack={handleGoHome}
            />
        )}
        {currentView === View.SETTINGS && (
            <Settings currentUser={currentUser} />
        )}
      </main>
    </div>
  );
};

export default App;