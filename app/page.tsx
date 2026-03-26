'use client';

import { useState, useEffect, FormEvent, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, ShieldCheck, Monitor, Play, Pause, Trash2, Megaphone, Plus, X, 
  Loader2, AlertTriangle, CheckCircle2, Search, Copy, MoreVertical, 
  UserPlus, UserMinus, History, Edit3, Calendar, CheckSquare, Square
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserProfile {
  id: string;
  email: string;
  ads_enabled: boolean;
  is_verified: boolean;
  computer_id: string;
  trial_end_date: string;
  created_at: string;
}

interface Advertisement {
  id: string;
  title: string;
  target_url: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [newAd, setNewAd] = useState({ title: '', target_url: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Selection & Modal States
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSubsModalOpen, setIsSubsModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({ email: '', computer_id: '' });

  const fetchData = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.from('user_profiles').select('*');
    const { data: adData, error: adError } = await supabase.from('advertisements').select('*').order('created_at', { ascending: false });
    
    if (userError || adError) {
      setNotification({ type: 'error', message: 'CRITICAL_SYSTEM_ERROR: DATA_FETCH_FAILED' });
    }

    if (userData) {
      const typedUsers = userData as UserProfile[];
      setUsers(typedUsers);
      setStats({
        total: typedUsers.length,
        verified: typedUsers.filter((u) => u.is_verified).length
      });
    }
    if (adData) setAds(adData as Advertisement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Wrap in microtask to avoid synchronous state update warnings in some environments
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.computer_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Selection Handlers
  const toggleUserSelection = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const toggleAllSelection = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: `${label}_COPIED_TO_BUFFER` });
  };

  // User Action Handlers
  const handleUpdateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setActionLoading('update-user');
    const { error } = await supabase.from('user_profiles')
      .update({ email: editFormData.email, computer_id: editFormData.computer_id })
      .eq('id', activeUser.id);
    
    if (error) {
      setNotification({ type: 'error', message: 'UPDATE_FAILED: PROTOCOL_REJECTED' });
    } else {
      setNotification({ type: 'success', message: 'PROFILE_UPDATED' });
      setIsUpdateModalOpen(false);
      fetchData();
    }
    setActionLoading(null);
  };

  const deleteUser = async (user: UserProfile) => {
    if (!confirm(`TEMPORARY_DESTRUCTION_CONFIRM: DELETING ${user.email}?`)) return;
    setActionLoading('delete-' + user.id);
    const { error } = await supabase.from('user_profiles').delete().eq('id', user.id);
    if (error) {
      setNotification({ type: 'error', message: 'DELETION_FAILED: TARGET_SHIELDED' });
    } else {
      setNotification({ type: 'success', message: 'USER_PULVERIZED: RECORD_DELETED' });
      fetchData();
    }
    setActionLoading(null);
  };

  const toggleUserStatus = async (user: UserProfile) => {
    setActionLoading('status-' + user.id);
    const { error } = await supabase.from('user_profiles')
      .update({ is_verified: !user.is_verified })
      .eq('id', user.id);
    if (error) {
      setNotification({ type: 'error', message: 'STATUS_TOGGLE_FAILED' });
    } else {
      setNotification({ type: 'success', message: `ACCOUNT_${!user.is_verified ? 'ENABLED' : 'DISABLED'}` });
      fetchData();
    }
    setActionLoading(null);
  };

  const setSubscription = async (userIds: string[], days: number | 'lifetime') => {
    setActionLoading('subs-update');
    let trial_end_date: string;
    
    if (days === 'lifetime') {
      trial_end_date = new Date('2099-12-31').toISOString();
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      trial_end_date = date.toISOString();
    }

    const { error } = await supabase.from('user_profiles')
      .update({ trial_end_date })
      .in('id', userIds);

    if (error) {
      setNotification({ type: 'error', message: 'SUBS_INJECTION_FAILED' });
    } else {
      setNotification({ type: 'success', message: `SUBS_SET_${days === 'lifetime' ? 'PERMANENT' : days + 'D'}_FOR_${userIds.length}_USERS` });
      setIsSubsModalOpen(false);
      setSelectedUserIds(new Set());
      fetchData();
    }
    setActionLoading(null);
  };

  const toggleAds = async (email: string, current: boolean) => {
    setActionLoading('user-' + email);
    const { error } = await supabase.from('user_profiles').update({ ads_enabled: !current }).eq('email', email);
    if (error) {
      setNotification({ type: 'error', message: 'ACCESS_DENIED: USER_MODIFICATION_FAILED' });
    } else {
      setNotification({ type: 'success', message: 'STREAM_STATUS_UPDATED' });
      setLoading(true);
      await fetchData();
    }
    setActionLoading(null);
  };

  const updateAdStatus = async (id: string, current: boolean) => {
    setActionLoading('ad-status-' + id);
    const { error } = await supabase.from('advertisements').update({ is_active: !current }).eq('id', id);
    if (error) {
      setNotification({ type: 'error', message: 'PROTOCOL_ERROR: AD_UPDATE_FAILED' });
    } else {
      setNotification({ type: 'success', message: 'BROADCAST_STATUS_UPDATED' });
      setLoading(true);
      await fetchData();
    }
    setActionLoading(null);
  };

  const deleteAd = async (id: string) => {
    if (!confirm('ARCHIVE_DESTRUCTION_CONFIRMATION: PROCEED?')) return;
    
    setActionLoading('ad-delete-' + id);
    const { error } = await supabase.from('advertisements').delete().eq('id', id);
    if (error) {
      setNotification({ type: 'error', message: 'DELETION_FAILED: TARGET_LOCKED' });
    } else {
      setNotification({ type: 'success', message: 'DATA_PULVERIZED: AD_DELETED' });
      setLoading(true);
      await fetchData();
    }
    setActionLoading(null);
  };

  const handleAddAd = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading('add-ad');
    const { error } = await supabase.from('advertisements').insert([
      { title: newAd.title, target_url: newAd.target_url, is_active: true }
    ]);
    
    if (error) {
      setNotification({ type: 'error', message: 'INJECTION_FAILED: SCHEMA_VIOLATION' });
    } else {
      setNotification({ type: 'success', message: 'NEW_AD_STREAM_INJECTED' });
      setIsModalOpen(false);
      setNewAd({ title: '', target_url: '' });
      setLoading(true);
      await fetchData();
    }
    setActionLoading(null);
  };

  return (
    <main className="space-y-8 font-mono animate-in fade-in duration-1000">
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

      {/* Notifications Area */}
      <div className="fixed top-6 right-6 z-[100] space-y-2 pointer-events-none">
        {notification && (
          <div className={cn(
            "p-4 border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-right duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]",
            notification.type === 'success' ? "border-green-500 bg-green-950/40 text-green-300" : "border-red-500 bg-red-950/40 text-red-300"
          )}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span className="text-xs font-bold tracking-widest">{notification.message}</span>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: 'TOTAL_USERS', value: stats.total },
          { icon: ShieldCheck, label: 'VERIFIED_LOGINS', value: stats.verified, highlight: true },
          { icon: Megaphone, label: 'ACTIVE_ADS', value: ads.filter(a => a.is_active).length }
        ].map((stat, i) => (
          <div key={i} className="group relative border border-green-500/30 bg-black/60 p-6 rounded-lg transition-all hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent"></div>
            <div className="flex items-center gap-4 mb-2">
              <stat.icon className={cn("transition-colors", stat.highlight ? "text-green-400" : "text-green-800")} size={20} />
              <span className="text-[10px] text-green-800 tracking-tighter">{stat.label}</span>
            </div>
            <span className={cn("text-5xl font-black tracking-tighter", stat.highlight ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "text-green-100")}>
              {loading ? '...' : stat.value.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* User Management */}
        <section className="relative border border-green-900/50 bg-black/80 p-8 rounded shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 border-t border-l border-green-500 w-2 h-2"></div>
          <div className="absolute top-0 right-0 border-t border-r border-green-500 w-2 h-2"></div>
          <div className="absolute bottom-0 left-0 border-b border-l border-green-500 w-2 h-2"></div>
          <div className="absolute bottom-0 right-0 border-b border-r border-green-500 w-2 h-2"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-xl font-black flex items-center gap-3 text-green-100 tracking-tighter italic">
              <Monitor size={22} className="text-green-500" /> USER_BASE_ADMIN
            </h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              {selectedUserIds.size > 0 && (
                <button 
                  onClick={() => setIsSubsModalOpen(true)}
                  className="bg-green-500 text-black text-[10px] font-black px-4 py-2 hover:bg-green-400 animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  BULK_INJECT_SUBS ({selectedUserIds.size})
                </button>
              )}
              <div className="relative group flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900 group-focus-within:text-green-500 transition-colors" size={14} />
                <input 
                  type="text"
                  placeholder="search_identifier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black border border-green-900 text-[10px] pl-9 pr-4 py-2 w-full focus:outline-none focus:border-green-500 transition-all text-green-300 placeholder:text-green-950"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-green-900 animate-pulse">SYNCHRONIZING_DATA...</div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-green-900/50">
                    <th className="py-2 pr-4 w-10">
                      <button onClick={toggleAllSelection} className="text-green-900 hover:text-green-500 transition-colors">
                        {selectedUserIds.size === filteredUsers.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="py-2 px-2 text-[10px] text-green-900 font-bold uppercase tracking-tighter">IDENTIFIER</th>
                    <th className="py-2 px-2 text-[10px] text-green-900 font-bold uppercase tracking-tighter text-center">ADS_MODE</th>
                    <th className="py-2 px-2 text-[10px] text-green-900 font-bold uppercase tracking-tighter text-center">STATUS</th>
                    <th className="py-2 pl-4 text-[10px] text-green-900 font-bold uppercase tracking-tighter text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-green-900 text-[10px] italic">NO_RECORDS_MATCH_CRITERIA</td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id} className={cn(
                      "border-b border-green-900/20 group hover:bg-green-500/5 transition-colors",
                      selectedUserIds.has(u.id) && "bg-green-500/10"
                    )}>
                      <td className="py-4 pr-4">
                        <button onClick={() => toggleUserSelection(u.id)} className={cn(
                          "transition-colors",
                          selectedUserIds.has(u.id) ? "text-green-400" : "text-green-900 hover:text-green-600"
                        )}>
                          {selectedUserIds.has(u.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className="text-green-300 text-xs font-bold truncate max-w-[120px]">{u.email}</div>
                          <button onClick={() => copyToClipboard(u.email, 'EMAIL')} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-800 hover:text-green-400">
                            <Copy size={10} />
                          </button>
                        </div>
                        <div className="text-[8px] text-green-900 mt-1 flex items-center gap-1">
                          ID: {u.id.slice(0, 8)} | HWID: {(u.computer_id || 'NONE').slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <button 
                          disabled={actionLoading === 'user-' + u.email}
                          onClick={() => toggleAds(u.email, u.ads_enabled)}
                          className={cn(
                            "px-3 py-1 rounded text-[8px] font-black transition-all border whitespace-nowrap",
                            u.ads_enabled 
                              ? "bg-green-950/20 border-green-500 text-green-500" 
                              : "bg-red-950/10 border-red-900/50 text-red-900 hover:border-red-500"
                          )}
                        >
                          {u.ads_enabled ? "ADS_ON" : "ADS_OFF"}
                        </button>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black border inline-block",
                          u.is_verified ? "border-green-500/30 text-green-500 bg-green-500/5" : "border-yellow-900/50 text-yellow-600/50"
                        )}>
                          {u.is_verified ? "VERIFIED" : "PENDING"}
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setIsActionMenuOpen(isActionMenuOpen === u.id ? null : u.id)}
                            className="p-1.5 hover:bg-green-500/20 text-green-500 rounded transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {isActionMenuOpen === u.id && (
                            <>
                              <div className="fixed inset-0 z-[150]" onClick={() => setIsActionMenuOpen(null)}></div>
                              <div className="absolute right-0 top-10 w-48 bg-black border border-green-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-[160] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={() => { setIsUpdateModalOpen(true); setActiveUser(u); setEditFormData({ email: u.email, computer_id: u.computer_id || '' }); setIsActionMenuOpen(null); }} 
                                  className="w-full text-left px-4 py-2.5 text-[10px] text-green-100 hover:bg-green-500 hover:text-black flex items-center gap-3 border-b border-green-900/30">
                                  <Edit3 size={12} /> UPDATE_PROFILE
                                </button>
                                <button onClick={() => { setIsHistoryModalOpen(true); setActiveUser(u); setIsActionMenuOpen(null); }} 
                                  className="w-full text-left px-4 py-2.5 text-[10px] text-green-100 hover:bg-green-500 hover:text-black flex items-center gap-3 border-b border-green-900/30">
                                  <History size={12} /> ACCESS_LOGS
                                </button>
                                <button onClick={() => { setIsSubsModalOpen(true); setActiveUser(u); setIsActionMenuOpen(null); }}
                                  className="w-full text-left px-4 py-2.5 text-[10px] text-green-100 hover:bg-green-500 hover:text-black flex items-center gap-3 border-b border-green-900/30">
                                  <Calendar size={12} /> SET_SUBSCRIPTION
                                </button>
                                <button onClick={() => { toggleUserStatus(u); setIsActionMenuOpen(null); }} 
                                  className="w-full text-left px-4 py-2.5 text-[10px] text-green-100 hover:bg-green-500 hover:text-black flex items-center gap-3 border-b border-green-900/30">
                                  {u.is_verified ? <UserMinus size={12} /> : <UserPlus size={12} />} {u.is_verified ? 'DISABLE_ACCOUNT' : 'RESTORE_ACCESS'}
                                </button>
                                <button onClick={() => { deleteUser(u); setIsActionMenuOpen(null); }} 
                                  className="w-full text-left px-4 py-2.5 text-[10px] text-red-500 hover:bg-red-500 hover:text-black flex items-center gap-3">
                                  <Trash2 size={12} /> DELETE_RECORD
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Ads Manager */}
        <section className="relative border border-green-900/50 bg-black/80 p-8 rounded shadow-2xl">
          <div className="absolute top-0 left-0 border-t border-l border-green-500 w-2 h-2"></div>
          <div className="absolute top-0 right-0 border-t border-r border-green-500 w-2 h-2"></div>
          <div className="absolute bottom-0 left-0 border-b border-l border-green-500 w-2 h-2"></div>
          <div className="absolute bottom-0 right-0 border-b border-r border-green-500 w-2 h-2"></div>

          <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-green-100 tracking-tighter italic">
            <Megaphone size={22} className="text-green-500" /> BROADCAST_PROTOCOL_MANAGER
          </h2>

          <div className="space-y-4">
            {ads.map(ad => (
              <div key={ad.id} className="border border-green-900/30 p-4 rounded bg-green-950/5 flex justify-between items-center group hover:border-green-500/50 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-green-100 font-black text-xs uppercase tracking-widest truncate">{ad.title}</h3>
                    <button onClick={() => copyToClipboard(ad.id, 'AD_ID')} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-800 hover:text-green-400">
                      <Copy size={10} />
                    </button>
                  </div>
                  <p className="text-[9px] text-green-900 truncate mt-1 italic">{ad.target_url}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    disabled={actionLoading === 'ad-status-' + ad.id}
                    onClick={() => updateAdStatus(ad.id, ad.is_active)} 
                    className={cn("p-2 rounded transition-all", ad.is_active ? "text-green-500 hover:bg-green-900 text-green-400" : "text-green-900 hover:text-green-500")}
                  >
                    {actionLoading === 'ad-status-' + ad.id ? <Loader2 className="animate-spin" size={14} /> : (ad.is_active ? <Pause size={14} /> : <Plus size={14} />)}
                  </button>
                  <button 
                    disabled={actionLoading === 'ad-delete-' + ad.id}
                    onClick={() => deleteAd(ad.id)}
                    className="p-2 text-green-900 hover:text-red-500 hover:bg-red-950/30 rounded transition-all"
                  >
                    {actionLoading === 'ad-delete-' + ad.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full border border-dashed border-green-900 p-6 rounded text-[10px] font-black tracking-widest text-green-900 hover:text-green-400 hover:border-green-400 hover:bg-green-400/5 transition-all group"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus size={14} />
                INITIALIZE_NEW_AD_INJECTION
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Modal Overlay: New Ad */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md border border-green-500 bg-black p-8 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-green-400"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-green-400"></div>
            
            <div className="flex justify-between items-center mb-8 border-b border-green-900/50 pb-4">
              <h3 className="text-xl font-black text-green-400 italic">AD_INJECTION_INTERFACE</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-green-900 hover:text-green-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAd} className="space-y-6">
              <div>
                <label className="block text-[10px] text-green-800 mb-2 font-bold tracking-widest">STREAM_IDENTIFIER_TITLE</label>
                <input 
                  required
                  type="text"
                  value={newAd.title}
                  onChange={e => setNewAd({...newAd, title: e.target.value})}
                  className="w-full bg-black border border-green-900 font-mono text-xs p-4 text-green-300 focus:outline-none focus:border-green-400 transition-colors"
                  placeholder="enter stream title..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-green-800 mb-2 font-bold tracking-widest">TARGET_REDIRECT_URL</label>
                <input 
                  required
                  type="url"
                  value={newAd.target_url}
                  onChange={e => setNewAd({...newAd, target_url: e.target.value})}
                  className="w-full bg-black border border-green-900 font-mono text-xs p-4 text-green-300 focus:outline-none focus:border-green-400 transition-colors"
                  placeholder="https://target.stream.io"
                />
              </div>
              <button 
                type="submit" 
                disabled={actionLoading === 'add-ad'}
                className="w-full bg-green-500 text-black font-black py-4 text-xs tracking-[0.2em] hover:bg-green-400 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2"
              >
                {actionLoading === 'add-ad' ? <Loader2 className="animate-spin" size={16} /> : "EXECUTE_INJECTION"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update User */}
      {isUpdateModalOpen && activeUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md border border-green-500 bg-black p-8 shadow-[0_0_60px_rgba(34,197,94,0.3)]">
            <div className="flex justify-between items-center mb-8 border-b border-green-900/50 pb-4">
              <h3 className="text-xl font-black text-green-400 italic font-mono tracking-tighter">ALTER_USER_IDENTITY</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-green-900 hover:text-green-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="space-y-6">
              <div>
                <label className="block text-[10px] text-green-800 mb-2 font-bold tracking-widest">NETWORK_ALIAS_EMAIL</label>
                <input required type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full bg-black border border-green-900 font-mono text-xs p-4 text-green-300 focus:outline-none focus:border-green-400 transition-colors"/>
              </div>
              <div>
                <label className="block text-[10px] text-green-800 mb-2 font-bold tracking-widest">HARDWARE_ID_IDENTIFIER</label>
                <input value={editFormData.computer_id} onChange={e => setEditFormData({...editFormData, computer_id: e.target.value})}
                  className="w-full bg-black border border-green-900 font-mono text-xs p-4 text-green-300 focus:outline-none focus:border-green-400 transition-colors" placeholder="HWID_NOT_SET"/>
              </div>
              <button type="submit" disabled={actionLoading === 'update-user'}
                className="w-full bg-green-500 text-black font-black py-4 text-xs tracking-[0.2em] hover:bg-green-400 transition-colors flex items-center justify-center gap-2">
                {actionLoading === 'update-user' ? <Loader2 className="animate-spin" size={16} /> : "PROPAGATE_CHANGES"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Subscription Settings */}
      {isSubsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md border border-green-500 bg-black p-8 shadow-[0_0_60px_rgba(34,197,94,0.3)] text-center">
            <h3 className="text-xl font-black text-green-400 italic mb-4">ACCESS_DURATION_OVERRIDE</h3>
            <p className="text-[10px] text-green-900 mb-8 uppercase tracking-widest font-bold font-mono">
              TARGETING: {selectedUserIds.size > 0 ? `${selectedUserIds.size} SELECTED USERS` : activeUser?.email}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '01_DAY_TRIAL', val: 1 },
                { label: '03_DAY_TRIAL', val: 3 },
                { label: '07_DAY_PRO', val: 7 },
                { label: '30_DAY_ELITE', val: 30 },
                { label: 'LIFETIME_FREE', val: 'lifetime' as const },
              ].map((opt) => (
                <button
                  key={opt.label}
                  disabled={actionLoading === 'subs-update'}
                  onClick={() => setSubscription(selectedUserIds.size > 0 ? Array.from(selectedUserIds) : [activeUser!.id], opt.val)}
                  className="border border-green-900 p-4 text-[10px] text-green-500 font-black hover:bg-green-500 hover:text-black transition-all"
                >
                  {opt.label}
                </button>
              ))}
              <button onClick={() => setIsSubsModalOpen(false)} className="col-span-2 border border-red-900/50 p-4 text-[10px] text-red-900 hover:text-red-500 font-black transition-all">
                ABORT_OPERATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Access Logs (Placeholder) */}
      {isHistoryModalOpen && activeUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl border border-green-500 bg-black p-8 shadow-[0_0_60px_rgba(34,197,94,0.3)]">
            <div className="flex justify-between items-center mb-8 border-b border-green-900/50 pb-4">
              <h3 className="text-xl font-black text-green-400 italic">SYSTEM_ACCESS_LOGS: {activeUser.email}</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-green-900 hover:text-green-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="h-64 border border-green-900/30 bg-green-950/5 flex flex-col items-center justify-center gap-4">
              <History size={48} className="text-green-900 animate-pulse" />
              <p className="text-[10px] text-green-900 font-black tracking-[0.3em]">NO_LOG_RECORDS_FOUND_IN_PERIPHERAL_STORAGE</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
