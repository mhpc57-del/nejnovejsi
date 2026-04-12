import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import WelcomeModal from '../components/WelcomeModal';
import CraftBoltLogo from '../components/CraftBoltLogo';
import { 
  House, Briefcase, User, SignOut, MapPin, Calendar, ArrowRight, 
  Check, Clock, Star, Camera, X, CurrencyDollar, Warning,
  CaretDown, CaretUp, Plus, Trash, Eye, List, ChatCircle, Receipt,
  DotsThreeCircle, Moon, Sun, ChatCircleDots
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ThemeToggle from '../components/ThemeToggle';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const demandIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const MapClickHandler = ({ onAdd }) => {
  useMapEvents({
    click(e) { onAdd(e.latlng); }
  });
  return null;
};

import HeaderWidget from '../components/HeaderWidget';
import SupplierDemandDetail from '../components/SupplierDemandDetail';

const SupplierDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [availableDemands, setAvailableDemands] = useState([]);
  const [myDemands, setMyDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finances, setFinances] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomCategoryForm, setShowCustomCategoryForm] = useState(false);
  const [submittingCustomCategory, setSubmittingCustomCategory] = useState(false);
  const [editingServiceAreas, setEditingServiceAreas] = useState(false);
  const [unreadDemandIds, setUnreadDemandIds] = useState([]);
  const [viewedDemands, setViewedDemands] = useState([]);

  const fetchViewedDemands = async () => {
    try {
      const res = await axios.get(`${API}/demands/viewed`, { headers: { Authorization: `Bearer ${token}` } });
      setViewedDemands(res.data.demand_ids || []);
    } catch { /* ignore */ }
  };

  const markDemandViewed = async (demandId) => {
    if (viewedDemands.includes(demandId)) return;
    setViewedDemands(prev => [...prev, demandId]);
    try {
      await axios.post(`${API}/demands/viewed/${demandId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch { /* ignore */ }
  };

  const inProgress = myDemands.filter(d => d.status === 'in_progress');
  const pendingCompletion = myDemands.filter(d => d.status === 'pending_completion');
  const inDispute = myDemands.filter(d => d.status === 'dispute');
  const completed = myDemands.filter(d => d.status === 'completed');
  const cancelled = myDemands.filter(d => d.status === 'cancelled');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availableRes, myRes, finRes] = await Promise.all([
        axios.get(`${API}/demands/available`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/demands/my`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/suppliers/${user?.id}/finances`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { total_income: 0, completed_jobs: 0 } }))
      ]);
      setAvailableDemands(availableRes.data);
      setMyDemands(myRes.data);
      setFinances(finRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(res.data);
      setProfileForm(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    fetchProfile();
    fetchViewedDemands();
    axios.get(`${API}/categories`).then(r => setAllCategories(r.data.categories || [])).catch(() => {});
    axios.get(`${API}/messages/unread-summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setUnreadDemandIds((r.data || []).map(d => d.demand_id))).catch(() => {});
    const unreadInterval = setInterval(() => {
      axios.get(`${API}/messages/unread-summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setUnreadDemandIds((r.data || []).map(d => d.demand_id))).catch(() => {});
    }, 15000);
    const dataPoll = setInterval(fetchData, 15000);
    // Sync pending payments (e.g. subscription that wasn't activated)
    axios.post(`${API}/payments/sync-pending`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.synced > 0) { fetchData(); fetchProfile(); } })
      .catch(() => {});
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          axios.post(`${API}/users/location`, { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }, () => {}
      );
    }
    return () => { clearInterval(unreadInterval); clearInterval(dataPoll); };
  }, [token]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API}/users/profile`, {
        first_name: profileForm.first_name, last_name: profileForm.last_name,
        company_name: profileForm.company_name, phone: profileForm.phone,
        sms_notifications: profileForm.sms_notifications,
        permanent_address: profileForm.permanent_address,
        actual_address: profileForm.actual_address,
        profile_image: profileForm.profile_image,
        bio: profileForm.bio,
        ico: profileForm.ico, dic: profileForm.dic,
        categories: profileForm.categories || [],
        service_areas: profileForm.service_areas || [],
        branches: profileForm.branches || [],
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingProfile(false);
      fetchProfile();
      alert('Změny byly úspěšně uloženy.');
    } catch (e) { console.error(e); alert('Nepodařilo se uložit změny.'); }
    setSavingProfile(false);
  };

  const handleSaveServiceAreas = async () => {
    try {
      await axios.put(`${API}/users/profile`, {
        service_areas: profileForm.service_areas || [],
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingServiceAreas(false);
      fetchProfile();
    } catch (e) { console.error(e); alert('Nepodařilo se uložit místa působení'); }
  };


  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await new Promise((resolve) => {
        if (!file.type.startsWith('image/')) { resolve(file); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > 800) { h = (h * 800) / w; w = 800; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => resolve(new File([blob], 'profile.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85);
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
      const fd = new FormData();
      fd.append('file', compressed);
      const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfileForm(p => ({ ...p, profile_image: res.data.url }));
      await axios.put(`${API}/users/profile`, { profile_image: res.data.url }, { headers: { Authorization: `Bearer ${token}` } });
      fetchProfile();
    } catch (err) { console.error(err); }
    setUploadingPhoto(false);
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await axios.get(`${API}/invoices/my`, { headers: { Authorization: `Bearer ${token}` } });
      setInvoices(res.data || []);
    } catch (e) { console.error(e); }
    setInvoicesLoading(false);
  };

  const handleAcceptDemand = async (demandId) => {
    try {
      await axios.post(`${API}/demands/${demandId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedDemand(null);
      setActiveTab('in_progress');
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se přijmout zakázku');
    }
  };

  const availableVerified = availableDemands.filter(d => d.verified);
  const availableUnverified = availableDemands.filter(d => !d.verified);

  const totalIncome = finances?.total_income || completed.reduce((s, d) => s + (d.invoiced_amount || 0), 0);

  const demandTabs = [
    { key: 'available_verified', label: 'Ověřené', count: availableVerified.length, color: 'text-emerald-500' },
    { key: 'available_unverified', label: 'Neověřené', count: availableUnverified.length, color: 'text-orange-500' },
    { key: 'in_progress', label: 'Rozdělané', count: inProgress.length, color: 'text-blue-500' },
    { key: 'pending_completion', label: 'K potvrzení', count: pendingCompletion.length, color: 'text-purple-500' },
    { key: 'dispute', label: 'V řešení', count: inDispute.length, color: 'text-amber-500' },
    { key: 'completed', label: 'Dokončené', count: completed.length, color: 'text-zinc-500' },
    { key: 'cancelled', label: 'Nedokončené', count: cancelled.length, color: 'text-red-500' },
  ];

  const getDemandsByTab = (tab) => {
    switch (tab) {
      case 'available_verified': return availableVerified;
      case 'available_unverified': return availableUnverified;
      case 'in_progress': return inProgress;
      case 'pending_completion': return pendingCompletion;
      case 'dispute': return inDispute;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], pending_completion: ['K potvrzení', 'bg-purple-100 text-purple-700'], dispute: ['V řešení', 'bg-amber-100 text-amber-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      const photoUrl = (profileForm.profile_image || profile?.profile_image)
        ? `${API.replace('/api', '')}${(profileForm.profile_image || profile?.profile_image).startsWith('/api') ? (profileForm.profile_image || profile?.profile_image) : '/api' + ((profileForm.profile_image || profile?.profile_image).startsWith('/') ? '' : '/') + (profileForm.profile_image || profile?.profile_image)}`
        : null;

      return (
        <div className="space-y-6" data-testid="supplier-profile-content">
          {/* Profile card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profil" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-bold text-orange-500 border-2 border-zinc-200 dark:border-zinc-700">
                    {(profile?.first_name?.[0] || user?.email?.[0] || 'D').toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <Camera weight="bold" className="w-6 h-6 text-white" />
                  )}
                  <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{profile?.company_name || `${profile?.first_name} ${profile?.last_name}`}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-zinc-500">Dodavatel</span>
                  {profile?.account_type === 'individual' && (
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium rounded-full">Nepodnikatel</span>
                  )}
                  {profile?.account_type === 'business' && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">Podnikatel</span>
                  )}
                  {profile?.is_verified && (
                    <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                      <Check weight="bold" className="w-3.5 h-3.5" /> Ověřeno
                    </span>
                  )}
                  {!user?.subscription_active && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Neaktivní</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Paywall */}
          {!user?.subscription_active && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-2xl p-5" data-testid="paywall-banner">
              <p className="font-bold text-red-700 dark:text-red-400 mb-1">Nemáte uhrazený přístup</p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">Pro přístup k zakázkám uhraďte platbu.</p>
              <a href="/cenik" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">Uhradit přístup</a>
            </div>
          )}

          {/* Personal data */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-zinc-900 dark:text-white">Firemní údaje</h3>
              {editingProfile ? (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProfile(false); setProfileForm(profile); }} className="px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Zrušit</button>
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50" data-testid="save-profile-btn">
                    {savingProfile ? 'Ukládám...' : 'Uložit změny'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditingProfile(true)} className="px-4 py-1.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" data-testid="edit-profile-btn">
                  Upravit
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: 'company_name', label: 'Firma' },
                { key: 'first_name', label: 'Kontaktní osoba — jméno' },
                { key: 'last_name', label: 'Kontaktní osoba — příjmení' },
                { key: 'phone', label: 'Telefon' },
                { key: 'email', label: 'E-mail', readonly: true },
                { key: 'ico', label: 'IČ' },
                { key: 'dic', label: 'DIČ' },
                { key: 'permanent_address', label: 'Adresa sídla', full: true },
              ].map(f => (
                <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{f.label}</label>
                  {editingProfile && !f.readonly ? (
                    <input value={profileForm[f.key] || ''} onChange={e => setProfileForm(p => ({...p, [f.key]: e.target.value}))}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors" />
                  ) : (
                    <p className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm min-h-[42px]">{profile?.[f.key] || '—'}</p>
                  )}
                </div>
              ))}
              {/* Branches (unlimited) - always editable */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pobočky</label>
                </div>
                <div className="space-y-2">
                  {(profileForm.branches || profile?.branches || []).map((branch, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={branch} onChange={(e) => {
                        const b = [...(profileForm.branches || profile?.branches || [])];
                        b[i] = e.target.value;
                        setProfileForm(p => ({...p, branches: b}));
                      }} placeholder={`Adresa pobočky ${i+1}`}
                        className="flex-1 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                      <button onClick={async () => {
                        const b = (profileForm.branches || profile?.branches || []).filter((_, j) => j !== i);
                        setProfileForm(p => ({...p, branches: b}));
                        try { await axios.put(`${API}/users/profile`, { branches: b }, { headers: { Authorization: `Bearer ${token}` } }); fetchProfile(); } catch {}
                      }} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2 items-center">
                    <input id="new-branch-input" placeholder="Zadejte adresu nové pobočky..."
                      className="flex-1 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (!val) return;
                          const newBranches = [...(profileForm.branches || profile?.branches || []), val];
                          setProfileForm(p => ({...p, branches: newBranches}));
                          e.target.value = '';
                          try { await axios.put(`${API}/users/profile`, { branches: newBranches }, { headers: { Authorization: `Bearer ${token}` } }); fetchProfile(); alert('Pobočka přidána.'); } catch { alert('Nepodařilo se uložit.'); }
                        }
                      }} />
                    <button type="button" onClick={async () => {
                      const input = document.getElementById('new-branch-input');
                      const val = input?.value?.trim();
                      if (!val) return;
                      const newBranches = [...(profileForm.branches || profile?.branches || []), val];
                      setProfileForm(p => ({...p, branches: newBranches}));
                      input.value = '';
                      try { await axios.put(`${API}/users/profile`, { branches: newBranches }, { headers: { Authorization: `Bearer ${token}` } }); fetchProfile(); alert('Pobočka přidána.'); } catch { alert('Nepodařilo se uložit.'); }
                    }} className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">Přidat</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">O firmě</label>
              {editingProfile ? (
                <textarea value={profileForm.bio || ''} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              ) : (
                <p className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm min-h-[42px]">{profile?.bio || '—'}</p>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={async () => {
                const newVal = !profileForm.sms_notifications;
                setProfileForm(p => ({...p, sms_notifications: newVal}));
                try {
                  await axios.put(`${API}/users/profile`, { sms_notifications: newVal }, { headers: { Authorization: `Bearer ${token}` } });
                } catch {}
              }}
                className={`w-11 h-6 rounded-full transition-colors relative ${profileForm.sms_notifications ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${profileForm.sms_notifications ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">SMS notifikace</span>
            </div>
            {/* Categories */}
            <div className="mt-5">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Kategorie služeb</label>
              {/* Selected categories chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(editingProfile ? (profileForm.categories || []) : (profile?.categories || [])).map(c => (
                  <span key={c} className="px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full flex items-center gap-1.5">
                    {c}
                    {editingProfile && (
                      <button onClick={() => setProfileForm(p => ({...p, categories: (p.categories || []).filter(x => x !== c)}))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    )}
                  </span>
                ))}
                {(editingProfile ? (profileForm.categories || []) : (profile?.categories || [])).length === 0 && (
                  <span className="text-sm text-zinc-400">Žádné kategorie</span>
                )}
              </div>
              {editingProfile && (
                <div className="space-y-2">
                  {/* Search dropdown */}
                  <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTimeout(() => setShowCategoryDropdown(false), 200); }}>
                    <input value={categorySearch} onChange={e => { setCategorySearch(e.target.value); setShowCategoryDropdown(true); }}
                      onFocus={() => setShowCategoryDropdown(true)} placeholder="Vyhledat kategorii..."
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                    {showCategoryDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {allCategories
                          .filter(c => !(profileForm.categories || []).includes(c) && c.toLowerCase().includes(categorySearch.toLowerCase()))
                          .slice(0, 10)
                          .map(c => (
                            <button key={c} onClick={() => {
                              setProfileForm(p => ({...p, categories: [...(p.categories || []), c]}));
                              setCategorySearch('');
                              setShowCategoryDropdown(false);
                            }} className="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors">
                              {c}
                            </button>
                          ))}
                        {allCategories.filter(c => !(profileForm.categories || []).includes(c) && c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                          <p className="px-3 py-2 text-sm text-zinc-400">Žádné výsledky</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Custom category */}
                  {showCustomCategoryForm ? (
                    <div className="flex gap-2 items-center">
                      <input value={customCategoryInput} onChange={e => setCustomCategoryInput(e.target.value)} placeholder="Název nové kategorie..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white" />
                      <button disabled={!customCategoryInput.trim() || submittingCustomCategory} onClick={async () => {
                        setSubmittingCustomCategory(true);
                        try {
                          await axios.post(`${API}/categories/suggest`, { name: customCategoryInput.trim() }, { headers: { Authorization: `Bearer ${token}` } });
                          setProfileForm(p => ({...p, custom_categories: [...(p.custom_categories || []), customCategoryInput.trim()]}));
                          alert('Kategorie byla odeslána ke schválení administrátorovi.');
                          setCustomCategoryInput('');
                          setShowCustomCategoryForm(false);
                        } catch (e) { alert(e.response?.data?.detail || 'Nepodařilo se odeslat'); }
                        setSubmittingCustomCategory(false);
                      }} className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                        {submittingCustomCategory ? '...' : 'Odeslat'}
                      </button>
                      <button onClick={() => { setShowCustomCategoryForm(false); setCustomCategoryInput(''); }} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowCustomCategoryForm(true)} className="text-sm text-orange-500 hover:text-orange-600 font-medium">+ Přidat manuálně</button>
                  )}
                </div>
              )}
            </div>
            
            {/* Service areas with map */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Místa působení</label>
                {!editingServiceAreas && !editingProfile ? (
                  <button onClick={() => { setEditingServiceAreas(true); setProfileForm(p => ({...p, service_areas: profile?.service_areas || []})); }} className="text-xs text-orange-500 hover:text-orange-600 font-medium">Upravit místa</button>
                ) : !editingProfile && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingServiceAreas(false); setProfileForm(p => ({...p, service_areas: profile?.service_areas || []})); }} className="text-xs text-zinc-400 hover:text-zinc-600">Zrušit</button>
                    <button onClick={handleSaveServiceAreas} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg font-medium">Uložit místa</button>
                  </div>
                )}
              </div>
              {/* List of service areas */}
              <div className="space-y-3 mb-3">
                {((editingServiceAreas || editingProfile) ? (profileForm.service_areas || []) : (profile?.service_areas || [])).map((a, i) => {
                  const area = typeof a === 'object' ? a : { name: a, lat: null, lng: null, radius: 25 };
                  return (
                    <div key={i} className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium flex-1 truncate">{area.name || 'Neznámé místo'}</span>
                        {(editingServiceAreas || editingProfile) && (
                          <button onClick={() => setProfileForm(p => ({...p, service_areas: (p.service_areas || []).filter((_, j) => j !== i)}))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                      {(editingServiceAreas || editingProfile) ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500 w-16">Poloměr:</span>
                          <input type="range" min="1" max="150" step="1" value={area.radius || 25} onChange={e => {
                            const areas = [...(profileForm.service_areas || [])];
                            areas[i] = { ...area, radius: parseInt(e.target.value) };
                            setProfileForm(p => ({...p, service_areas: areas}));
                          }} className="flex-1 accent-orange-500" />
                          <span className="text-sm font-bold text-orange-500 w-14 text-right">{area.radius || 25} km</span>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-400 ml-6">Poloměr: {area.radius || 25} km</p>
                      )}
                    </div>
                  );
                })}
                {((editingServiceAreas || editingProfile) ? (profileForm.service_areas || []) : (profile?.service_areas || [])).length === 0 && (
                  <p className="text-sm text-zinc-400">{(editingServiceAreas || editingProfile) ? 'Zadejte město nebo klikněte na mapu.' : 'Žádná místa působení.'}</p>
                )}
              </div>
              {(editingServiceAreas || editingProfile) && (
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2 items-center">
                    <input id="manual-area-input" placeholder="Zadejte město nebo adresu..." className="flex-1 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (!val) return;
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1&countrycodes=cz`);
                            const data = await res.json();
                            if (data.length > 0) {
                              setProfileForm(p => ({...p, service_areas: [...(p.service_areas || []), { name: data[0].display_name.split(',').slice(0,2).join(',').trim(), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), radius: 25 }]}));
                            } else {
                              alert('Adresa nebyla nalezena. Zkuste jiný výraz nebo klikněte na mapu.');
                            }
                            e.target.value = '';
                          } catch { alert('Chyba při hledání adresy.'); }
                        }
                      }} />
                    <button type="button" onClick={async () => {
                      const input = document.getElementById('manual-area-input');
                      const val = input?.value?.trim();
                      if (!val) return;
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1&countrycodes=cz`);
                        const data = await res.json();
                        if (data.length > 0) {
                          setProfileForm(p => ({...p, service_areas: [...(p.service_areas || []), { name: data[0].display_name.split(',').slice(0,2).join(',').trim(), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), radius: 25 }]}));
                        } else {
                          alert('Adresa nebyla nalezena.');
                        }
                        input.value = '';
                      } catch { alert('Chyba při hledání adresy.'); }
                    }} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">Přidat</button>
                  </div>
                  <p className="text-xs text-zinc-400">Nebo klikněte přímo na mapu.</p>
                </div>
              )}
              {/* Map */}
              <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-80">
                <MapContainer center={[49.8, 15.5]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  {(editingServiceAreas || editingProfile) && <MapClickHandler onAdd={async (latlng) => {
                    let name = `${latlng.lat.toFixed(2)}, ${latlng.lng.toFixed(2)}`;
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
                      const data = await res.json();
                      if (data.display_name) name = data.display_name.split(',').slice(0,2).join(',').trim();
                    } catch {}
                    setProfileForm(p => ({...p, service_areas: [...(p.service_areas || []), { name, lat: latlng.lat, lng: latlng.lng, radius: 25 }]}));
                  }} />}
                  {/* Service area markers + circles */}
                  {((editingServiceAreas || editingProfile) ? (profileForm.service_areas || []) : (profile?.service_areas || [])).map((a, i) => {
                    const area = typeof a === 'object' ? a : null;
                    if (!area || !area.lat || !area.lng) return null;
                    const radius = (area.radius || 25) * 1000;
                    return (
                      <React.Fragment key={`${i}-${area.radius}`}>
                        <Circle center={[area.lat, area.lng]} radius={radius} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.12, weight: 2 }} />
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'invoices') {
      if (!invoices.length && !invoicesLoading) fetchInvoices();
      return (
        <div data-testid="supplier-invoices-content">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Faktury</h2>
          {invoicesLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500">Zatím nemáte žádné faktury.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between" data-testid={`invoice-${inv.id}`}>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-zinc-500">{inv.description || inv.plan_name || 'Platba CraftBolt'}</p>
                    <p className="text-xs text-zinc-400 mt-1">{new Date(inv.created_at).toLocaleDateString('cs-CZ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">{inv.total_amount?.toLocaleString('cs-CZ')} Kč</span>
                    <a href={`${API}/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors">
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'income') {
      return (
        <div data-testid="supplier-income-content">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Celkové příjmy</h2>
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 mb-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Potvrzené příjmy</p>
            <p className="text-3xl font-bold text-emerald-500 mt-1">{totalIncome.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-zinc-400 mt-1">{completed.length} dokončených zakázek</p>
          </div>
          {completed.filter(d => d.invoiced_amount).length > 0 ? (
            <div className="space-y-3">
              {completed.filter(d => d.invoiced_amount).map(d => (
                <div key={d.id} className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex items-center justify-between" data-testid={`income-${d.id}`}>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{d.title}</p>
                    <p className="text-xs text-zinc-500">{d.category} — {new Date(d.completed_at || d.created_at).toLocaleDateString('cs-CZ')}</p>
                  </div>
                  <p className="font-bold text-emerald-500">+{d.invoiced_amount?.toLocaleString('cs-CZ')} Kč</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Zatím žádné příjmy.</p>
          )}
        </div>
      );
    }

    // Demand detail
    if (selectedDemand) {
      return (
        <SupplierDemandDetail
          demand={selectedDemand}
          token={token}
          userId={user?.id}
          onBack={() => setSelectedDemand(null)}
          onAccept={handleAcceptDemand}
          onRefresh={fetchData}
        />
      );
    }

    // Demand grid
    const demandList = getDemandsByTab(activeTab);
    const tabInfo = demandTabs.find(t => t.key === activeTab);
    if (tabInfo) {
      return (
        <div data-testid={`supplier-demands-${activeTab}`}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div></div>
          ) : demandList.length === 0 ? (
            <div className="text-center py-16">
              <List className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500">Žádné zakázky v této kategorii</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demandList.map(d => {
                const isNew = !viewedDemands.includes(d.id);
                const hasUnread = unreadDemandIds.includes(d.id);
                return (
                <button key={d.id} onClick={() => { markDemandViewed(d.id); setSelectedDemand(d); }}
                  className="relative bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-left hover:border-orange-400 hover:shadow-md transition-all"
                  data-testid={`supplier-demand-card-${d.id}`}>
                  {isNew && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm" data-testid="new-badge">Nová</span>
                  )}
                  {hasUnread && !isNew && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse" data-testid="unread-badge">Zpráva</span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate flex-1">{d.title}</h3>
                    {d.verified && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">Ověřená</span>}
                  </div>
                  <div className="space-y-1 text-xs text-zinc-500">
                    <p className="flex items-center gap-1"><User className="w-3 h-3" /> {d.customer_name || 'Zadavatel'}</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.address || '—'}</p>
                    <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                      {d.deadline === 'URGENT' ? <span className="text-orange-500 font-semibold">IHNED!</span> : new Date(d.created_at).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex" data-testid="supplier-dashboard">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 fixed top-0 left-0 bottom-0 z-30" data-testid="supplier-sidebar">
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <Link to="/" className="flex items-center gap-2"><CraftBoltLogo size="xs" /></Link>
        </div>

        <nav className="flex-1 px-3 pt-3 space-y-1">
          <button onClick={() => { setActiveTab('profile'); setSelectedDemand(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="supplier-sidebar-profile">
            <User className="w-4 h-4" /> Profil
          </button>
          <button onClick={() => { setActiveTab('invoices'); setSelectedDemand(null); fetchInvoices(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="supplier-sidebar-invoices">
            <Receipt className="w-4 h-4" /> Faktury
          </button>
          <button onClick={() => { setActiveTab('income'); setSelectedDemand(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'income' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="supplier-sidebar-income">
            <CurrencyDollar className="w-4 h-4" /> Celkové příjmy
          </button>

          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-zinc-500 mb-2 italic">Zakázky:</p>
            {demandTabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedDemand(null); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === tab.key ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                data-testid={`supplier-sidebar-tab-${tab.key}`}>
                <span>{tab.label}</span>
                <span className={`font-bold ${activeTab === tab.key ? 'text-white' : tab.color}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" data-testid="supplier-sidebar-logout">
            <SignOut className="w-4 h-4" /> Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-56">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center justify-between px-6 h-14">
            <div className="lg:hidden"><CraftBoltLogo size="xs" /></div>
            <HeaderWidget />
            <ThemeToggle />
          </div>
        </header>

        <div className="p-3 sm:p-6 pb-20 lg:pb-6 max-w-5xl">
          {/* Mobile tab bar for demands */}
          {demandTabs.some(t => t.key === activeTab) && (
            <div className="lg:hidden overflow-x-auto -mx-3 px-3 mb-4 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {demandTabs.map(tab => (
                  <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedDemand(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                    {tab.label} <span className={activeTab === tab.key ? 'text-white/80' : tab.color}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800/60 lg:hidden z-40">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { setActiveTab('profile'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-400'}`}>
            <User className="w-5 h-5" /><span className="text-[10px] font-medium">Profil</span>
          </button>
          <button onClick={() => { setActiveTab('available_verified'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${demandTabs.some(t => t.key === activeTab) ? 'text-orange-500' : 'text-zinc-400'}`}>
            <List className="w-5 h-5" /><span className="text-[10px] font-medium">Zakázky</span>
          </button>
          <button onClick={() => { setActiveTab('income'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${activeTab === 'income' ? 'text-orange-500' : 'text-zinc-400'}`}>
            <CurrencyDollar className="w-5 h-5" /><span className="text-[10px] font-medium">Příjmy</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400">
            <SignOut className="w-5 h-5" /><span className="text-[10px] font-medium">Odhlásit</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default SupplierDashboard;
