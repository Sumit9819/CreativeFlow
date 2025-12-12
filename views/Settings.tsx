import React, { useState } from 'react';
import { User } from '../types';
import { Save, User as UserIcon, Bell, Palette, Check } from 'lucide-react';

interface SettingsProps {
    currentUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-neutral-950 text-white">
             <header className="mb-10">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-neutral-400">Manage your account preferences and workspace settings.</p>
            </header>

            <div className="max-w-2xl space-y-8">
                {/* Profile Section */}
                <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <UserIcon className="text-indigo-500" size={24} />
                        <h2 className="text-xl font-semibold">Profile Information</h2>
                    </div>
                    
                    <div className="flex items-start gap-6 mb-6">
                        <div className="relative group">
                            <img src={currentUser.avatar} alt="Profile" className="w-20 h-20 rounded-full border-2 border-neutral-700" />
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs">
                                Change
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    defaultValue={currentUser.name} 
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Role</label>
                                <input 
                                    type="text" 
                                    value={currentUser.role} 
                                    disabled
                                    className="w-full bg-neutral-800 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-400 cursor-not-allowed uppercase text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notifications Section */}
                <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="text-indigo-500" size={24} />
                        <h2 className="text-xl font-semibold">Notifications</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-neutral-500">Receive digests about project updates.</p>
                            </div>
                            <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                         <div className="flex items-center justify-between py-2 border-t border-neutral-800">
                            <div>
                                <p className="font-medium">Browser Push</p>
                                <p className="text-sm text-neutral-500">Real-time alerts for comments and approvals.</p>
                            </div>
                             <div className="w-12 h-6 bg-neutral-700 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </section>

                 {/* Appearance Section */}
                 <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="text-indigo-500" size={24} />
                        <h2 className="text-xl font-semibold">Appearance</h2>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 p-3 rounded-lg border-2 border-indigo-500 bg-neutral-950 cursor-pointer">
                            <div className="h-20 bg-neutral-900 rounded mb-2"></div>
                            <p className="text-center text-sm font-medium text-indigo-400">Dark Mode</p>
                        </div>
                        <div className="flex-1 p-3 rounded-lg border border-neutral-800 bg-white opacity-50 cursor-not-allowed">
                             <div className="h-20 bg-gray-100 rounded mb-2"></div>
                            <p className="text-center text-sm font-medium text-neutral-900">Light Mode</p>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-2 rounded-lg text-neutral-300 hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave}
                        className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${isSaved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                    >
                        {isSaved ? <Check size={18} /> : <Save size={18} />}
                        {isSaved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};