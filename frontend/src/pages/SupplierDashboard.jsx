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
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

import HeaderWidget from '../components/HeaderWidget';

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

  const inProgress = myDemands.filter(d => d.status === 'in_progress');
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
        bio: profileForm.bio, date_of_birth: profileForm.date_of_birth,
        ico: profileForm.ico, dic: profileForm.dic,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingProfile(false);
      fetchProfile();
    } catch (e) { console.error(e); }
    setSavingProfile(false);
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
    { key: 'completed', label: 'Dokončené', count: completed.length, color: 'text-zinc-500' },
    { key: 'cancelled', label: 'Nedokončené', count: cancelled.length, color: 'text-red-500' },
  ];

  const getDemandsByTab = (tab) => {
    switch (tab) {
      case 'available_verified': return availableVerified;
      case 'available_unverified': return availableUnverified;
      case 'in_progress': return inProgress;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
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
              <h3 className="font-bold text-zinc-900 dark:text-white">Osobní údaje</h3>
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
                { key: 'first_name', label: 'Jméno' },
                { key: 'last_name', label: 'Příjmení' },
                { key: 'company_name', label: 'Firma' },
                { key: 'phone', label: 'Telefon' },
                { key: 'email', label: 'E-mail', readonly: true },
                { key: 'ico', label: 'IČ' },
                { key: 'dic', label: 'DIČ' },
                { key: 'permanent_address', label: 'Adresa trvalého pobytu', full: true },
                { key: 'actual_address', label: 'Adresa skutečného bydliště', full: true },
                { key: 'date_of_birth', label: 'Datum narození' },
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
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">O firmě / o mně</label>
              {editingProfile ? (
                <textarea value={profileForm.bio || ''} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
              ) : (
                <p className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm min-h-[42px]">{profile?.bio || '—'}</p>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => { if (editingProfile) setProfileForm(p => ({...p, sms_notifications: !p.sms_notifications})); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${profileForm.sms_notifications ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'} ${!editingProfile ? 'opacity-60' : ''}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${profileForm.sms_notifications ? 'left-5.5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">SMS notifikace</span>
            </div>
            {profile?.categories?.length > 0 && (
              <div className="mt-5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Kategorie služeb</label>
                <div className="flex flex-wrap gap-2">
                  {profile.categories.map(c => (
                    <span key={c} className="px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
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
      const d = selectedDemand;
      const isVerified = d.verified;
      const isOpen = d.status === 'open';
      
      const handleRequestVerification = async () => {
        try {
          await axios.post(`${API}/demands/${d.id}/request-verification`, {}, { headers: { Authorization: `Bearer ${token}` } });
          alert('Žádost o ověření byla odeslána zákazníkovi emailem i SMS.');
        } catch (error) {
          alert(error.response?.data?.detail || 'Nepodařilo se odeslat žádost');
        }
      };
      
      return (
        <div data-testid="supplier-demand-detail">
          <button onClick={() => setSelectedDemand(null)} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors">
            <X className="w-4 h-4" /> Zpět na seznam
          </button>
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{d.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(d.status)}
              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium">{d.category}</span>
              {isVerified ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Ověřená</span>
              ) : (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">Neověřená</span>
              )}
            </div>
            
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{d.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" /> {d.address}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" /> {new Date(d.created_at).toLocaleDateString('cs-CZ')}</span>
            </div>
            
            {d.deadline && (
              <p className="text-orange-500 font-semibold text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {d.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' : d.deadline === 'ASAP' ? 'Co nejdříve' : `Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`}
              </p>
            )}

            {/* Customer info - ONLY for verified demands */}
            {isVerified && d.customer_name && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Zákazník</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-zinc-400" /> {d.customer_name}
                </p>
              </div>
            )}

            {/* Unverified demand restriction notice */}
            {!isVerified && isOpen && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-800 rounded-xl p-5" data-testid="unverified-notice">
                <div className="flex items-start gap-3">
                  <Warning weight="bold" className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-orange-700 dark:text-orange-400 text-sm mb-1">Neověřená poptávka</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400/80 leading-relaxed">
                      Informace o zákazníkovi, online poloha a možnost nahrání rozpočtu jsou skryté.
                      Zákazník musí nejprve ověřit poptávku, abyste mohli zakázku přijmout.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <hr className="border-zinc-200 dark:border-zinc-700" />
            
            <div className="flex gap-3 flex-wrap">
              {/* Verified + open: full action buttons */}
              {isVerified && isOpen && (
                <>
                  <button onClick={() => handleAcceptDemand(d.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors" data-testid="accept-demand-btn">
                    <Check weight="bold" className="w-4 h-4 inline mr-1" /> Přijmout zakázku
                  </button>
                  <Link to={`/zakazka/${d.id}`} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors" data-testid="open-detail-btn">
                    Otevřít detail
                  </Link>
                </>
              )}
              
              {/* Unverified + open: request verification button */}
              {!isVerified && isOpen && (
                <button onClick={handleRequestVerification} className="w-full px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors" data-testid="request-verification-btn">
                  <Warning weight="bold" className="w-4 h-4 inline mr-1.5" />
                  Zakázku bych přijmul, ale poptávka není ověřena
                </button>
              )}
              
              {/* In progress or other statuses: show detail link */}
              {!isOpen && (
                <Link to={`/zakazka/${d.id}`} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
                  Otevřít detail
                </Link>
              )}
            </div>
          </div>
          
          {/* Map - only for verified demands */}
          {isVerified && d.latitude && d.longitude && (
            <div className="mt-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-64">
              <MapContainer center={[d.latitude, d.longitude]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                <Marker position={[d.latitude, d.longitude]}>
                  <Popup>{d.title}<br/><small>{d.address}</small></Popup>
                </Marker>
              </MapContainer>
            </div>
          )}
        </div>
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
              {demandList.map(d => (
                <button key={d.id} onClick={() => setSelectedDemand(d)}
                  className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-left hover:border-orange-400 hover:shadow-md transition-all"
                  data-testid={`supplier-demand-card-${d.id}`}>
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
              ))}
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

        <div className="p-6 max-w-5xl">
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
