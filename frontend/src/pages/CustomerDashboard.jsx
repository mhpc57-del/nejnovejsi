import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import WelcomeModal from '../components/WelcomeModal';
import CraftBoltLogo from '../components/CraftBoltLogo';
import { 
  House, Plus, List, User, SignOut, Bell, MapPin, Camera,
  Calendar, Clock, ArrowRight, X, Check, Image as ImageIcon, Trash, Warning,
  ChatCircle, Envelope, Briefcase, Receipt, DotsThreeCircle, Moon, Sun, ChatCircleDots
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DraggableMap from '../components/DraggableMap';
import DemandRadiusMap from '../components/DemandRadiusMap';
import ThemeToggle from '../components/ThemeToggle';
import CustomerDemandDetail from '../components/CustomerDemandDetail';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

import HeaderWidget from '../components/HeaderWidget';

const CustomerDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [unreadDemandIds, setUnreadDemandIds] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchDemands = async () => {
    try {
      const response = await axios.get(`${API}/demands/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemands(response.data);
    } catch (error) {
      console.error('Error fetching demands:', error);
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
    fetchDemands();
    fetchProfile();
    axios.post(`${API}/payments/sync-pending`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.synced > 0) fetchDemands(); })
      .catch(() => {});
    axios.get(`${API}/messages/unread-summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setUnreadDemandIds((r.data || []).map(d => d.demand_id))).catch(() => {});
    const unreadInterval = setInterval(() => {
      axios.get(`${API}/messages/unread-summary`, { headers: { Authorization: `Bearer ${token}` } }).then(r => setUnreadDemandIds((r.data || []).map(d => d.demand_id))).catch(() => {});
    }, 15000);
    const demandsPoll = setInterval(fetchDemands, 15000);
    
    // Handle verify_demand query param (from email link)
    const params = new URLSearchParams(window.location.search);
    const verifyDemandId = params.get('verify_demand');
    if (verifyDemandId) {
      // Redirect to Stripe checkout for demand verification
      axios.post(`${API}/payments/demands/${verifyDemandId}/verify-checkout`, {}, {
        headers: { Authorization: `Bearer ${token}`, 'Origin': window.location.origin }
      }).then(res => {
        if (res.data.url) window.location.href = res.data.url;
      }).catch(err => {
        const detail = err.response?.data?.detail;
        if (detail === 'Poptávka je již ověřena') {
          alert('Tato poptávka je již ověřená.');
        } else {
          alert(detail || 'Nepodařilo se zahájit ověření poptávky.');
        }
      });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    }
    return () => { clearInterval(unreadInterval); clearInterval(demandsPoll); };
  }, [token]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API}/users/profile`, {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
        sms_notifications: profileForm.sms_notifications,
        permanent_address: profileForm.permanent_address,
        actual_address: profileForm.actual_address,
        profile_image: profileForm.profile_image,
        bio: profileForm.bio,
        date_of_birth: profileForm.date_of_birth,
        company_name: profileForm.company_name,
        ico: profileForm.ico,
        dic: profileForm.dic,
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
      // Compress
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
      // Auto-save photo
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

  // Demand counts
  const verified = demands.filter(d => d.verified && d.status === 'open');
  const unverified = demands.filter(d => !d.verified && d.status === 'open');
  const inProgress = demands.filter(d => d.status === 'in_progress');
  const pendingCompletion = demands.filter(d => d.status === 'pending_completion');
  const inDispute = demands.filter(d => d.status === 'dispute');
  const completed = demands.filter(d => d.status === 'completed');
  const cancelled = demands.filter(d => d.status === 'cancelled');

  const demandTabs = [
    { key: 'verified', label: 'Ověřené', count: verified.length, color: 'text-emerald-500' },
    { key: 'unverified', label: 'Neověřené', count: unverified.length, color: 'text-orange-500' },
    { key: 'in_progress', label: 'Probíhající', count: inProgress.length, color: 'text-blue-500' },
    { key: 'pending_completion', label: 'K potvrzení', count: pendingCompletion.length, color: 'text-purple-500' },
    { key: 'dispute', label: 'V řešení', count: inDispute.length, color: 'text-amber-500' },
    { key: 'completed', label: 'Dokončené', count: completed.length, color: 'text-zinc-500' },
    { key: 'cancelled', label: 'Nedokončené', count: cancelled.length, color: 'text-red-500' },
  ];

  const getDemandsByTab = (tab) => {
    switch (tab) {
      case 'verified': return verified;
      case 'unverified': return unverified;
      case 'in_progress': return inProgress;
      case 'pending_completion': return pendingCompletion;
      case 'dispute': return inDispute;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const totalExpenses = demands
    .filter(d => d.status === 'completed' && d.invoiced_amount)
    .reduce((sum, d) => sum + d.invoiced_amount, 0);

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], pending_completion: ['K potvrzení', 'bg-purple-100 text-purple-700'], dispute: ['V řešení', 'bg-amber-100 text-amber-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  // Render main content based on active tab
  const renderContent = () => {
    // Profile tab
    if (activeTab === 'profile') {
      const photoUrl = (profileForm.profile_image || profile?.profile_image)
        ? `${API.replace('/api', '')}${(profileForm.profile_image || profile?.profile_image).startsWith('/api') ? (profileForm.profile_image || profile?.profile_image) : '/api' + ((profileForm.profile_image || profile?.profile_image).startsWith('/') ? '' : '/') + (profileForm.profile_image || profile?.profile_image)}`
        : null;

      return (
        <div className="space-y-6" data-testid="profile-content">
          {/* Profile card + photo */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profil" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl font-bold text-orange-500 border-2 border-zinc-200 dark:border-zinc-700">
                    {(profile?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
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
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{profile?.first_name} {profile?.last_name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-zinc-500">Zákazník</span>
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
                </div>
              </div>
            </div>
          </div>

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
                { key: 'phone', label: 'Telefon' },
                { key: 'email', label: 'E-mail', readonly: true },
                { key: 'permanent_address', label: 'Adresa trvalého pobytu' },
                { key: 'actual_address', label: 'Adresa skutečného bydliště' },
                { key: 'date_of_birth', label: 'Datum narození' },
              ].map(f => (
                <div key={f.key} className={f.key.includes('address') ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{f.label}</label>
                  {editingProfile && !f.readonly ? (
                    <input value={profileForm[f.key] || ''} onChange={e => setProfileForm(p => ({...p, [f.key]: e.target.value}))}
                      className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                      data-testid={`profile-${f.key}`} />
                  ) : (
                    <p className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm min-h-[42px]">{profile?.[f.key] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Bio */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">O mně</label>
              {editingProfile ? (
                <textarea value={profileForm.bio || ''} onChange={e => setProfileForm(p => ({...p, bio: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="profile-bio" />
              ) : (
                <p className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm min-h-[42px]">{profile?.bio || '—'}</p>
              )}
            </div>
            {/* SMS toggle */}
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => { if (editingProfile) setProfileForm(p => ({...p, sms_notifications: !p.sms_notifications})); }}
                className={`w-11 h-6 rounded-full transition-colors relative ${profileForm.sms_notifications ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'} ${!editingProfile ? 'opacity-60' : ''}`} data-testid="sms-toggle">
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${profileForm.sms_notifications ? 'left-5.5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">SMS notifikace</span>
            </div>
          </div>
        </div>
      );
    }

    // Invoices tab — show actual invoices inline
    if (activeTab === 'invoices') {
      if (!invoices.length && !invoicesLoading) fetchInvoices();
      return (
        <div data-testid="invoices-content">
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
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors" data-testid={`download-invoice-${inv.id}`}>
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

    // Expenses tab
    if (activeTab === 'expenses') {
      return (
        <div data-testid="expenses-content">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Moje výdaje</h2>
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 mb-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Celkové výdaje</p>
            <p className="text-3xl font-bold text-orange-500 mt-1">{totalExpenses.toLocaleString('cs-CZ')} Kč</p>
          </div>
          {completed.filter(d => d.invoiced_amount).length > 0 ? (
            <div className="space-y-3">
              {completed.filter(d => d.invoiced_amount).map(d => (
                <div key={d.id} className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex items-center justify-between" data-testid={`expense-${d.id}`}>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white text-sm">{d.title}</p>
                    <p className="text-xs text-zinc-500">{d.category} — {new Date(d.completed_at || d.created_at).toLocaleDateString('cs-CZ')}</p>
                  </div>
                  <p className="font-bold text-orange-500">{d.invoiced_amount?.toLocaleString('cs-CZ')} Kč</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Zatím žádné výdaje.</p>
          )}
        </div>
      );
    }

    // Demand detail
    if (selectedDemand) {
      const d = selectedDemand;
      const isOpen = d.status === 'open';
      const isUnverified = !d.verified;
      const isInProgress = d.status === 'in_progress';
      const hasSupplier = !!d.assigned_supplier_id;
      
      const handleVerifyDemand = async () => {
        try {
          const res = await axios.post(`${API}/payments/demands/${d.id}/verify-checkout`, {}, {
            headers: { Authorization: `Bearer ${token}`, 'Origin': window.location.origin }
          });
          if (res.data.url) window.location.href = res.data.url;
        } catch (err) {
          const detail = err.response?.data?.detail;
          if (detail === 'Poptávka je již ověřena') {
            alert('Tato poptávka je již ověřená.');
            fetchDemands();
          } else {
            alert(detail || 'Nepodařilo se zahájit ověření.');
          }
        }
      };
      
      return (
        <CustomerDemandDetail
          demand={d}
          token={token}
          isOpen={isOpen}
          isUnverified={isUnverified}
          isInProgress={isInProgress}
          hasSupplier={hasSupplier}
          onBack={() => setSelectedDemand(null)}
          onVerify={handleVerifyDemand}
          onRefresh={fetchDemands}
          userId={user?.id}
        />
      );
    }

    // Demand grid by status tab
    const demandList = getDemandsByTab(activeTab);
    const tabInfo = demandTabs.find(t => t.key === activeTab);
    if (tabInfo) {
      return (
        <div data-testid={`demands-${activeTab}`}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div></div>
          ) : demandList.length === 0 ? (
            <div className="text-center py-16">
              <List className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500">Žádné poptávky v této kategorii</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demandList.map(d => (
                <button key={d.id} onClick={() => setSelectedDemand(d)}
                  className="relative bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-left hover:border-orange-400 hover:shadow-md transition-all group"
                  data-testid={`demand-card-${d.id}`}>
                  {unreadDemandIds.includes(d.id) && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse" data-testid="unread-badge">Zpráva</span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate flex-1">{d.title}</h3>
                    {d.verified && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">Ověřená</span>}
                    {!d.verified && d.status === 'open' && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">Neověřená</span>}
                  </div>
                  <div className="space-y-1 text-xs text-zinc-500">
                    <p className="flex items-center gap-1"><User className="w-3 h-3" /> {d.customer_name || 'Zadavatel'}</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.address || '—'}</p>
                    <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                      {d.deadline === 'URGENT' ? <span className="text-orange-500 font-semibold">IHNED!</span> : d.deadline === 'ASAP' ? 'Co nejdříve' : new Date(d.created_at).toLocaleDateString('cs-CZ')}
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
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex" data-testid="customer-dashboard">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 fixed top-0 left-0 bottom-0 z-30" data-testid="sidebar">
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <Link to="/" className="flex items-center gap-2"><CraftBoltLogo size="xs" /></Link>
        </div>

        <div className="p-3">
          <button onClick={() => setShowNewDemand(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            data-testid="sidebar-new-demand-btn">
            <Plus weight="bold" className="w-4 h-4" /> Nová poptávka
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => { setActiveTab('profile'); setSelectedDemand(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="sidebar-profile">
            <User className="w-4 h-4" /> Profil
          </button>
          <button onClick={() => { setActiveTab('invoices'); setSelectedDemand(null); fetchInvoices(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoices' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="sidebar-invoices">
            <Receipt className="w-4 h-4" /> Faktury
          </button>
          <button onClick={() => { setActiveTab('expenses'); setSelectedDemand(null); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'expenses' ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            data-testid="sidebar-expenses">
            <Briefcase className="w-4 h-4" /> Moje výdaje
          </button>

          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-500 mb-2 italic">Moje poptávky:</p>
            {demandTabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedDemand(null); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === tab.key ? 'bg-orange-500 text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                data-testid={`sidebar-tab-${tab.key}`}>
                <span>{tab.label}</span>
                <span className={`font-bold ${activeTab === tab.key ? 'text-white' : tab.color}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <button onClick={() => setShowDeactivate(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" data-testid="sidebar-deactivate">
            <Trash className="w-4 h-4" /> Zrušit účet
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" data-testid="sidebar-logout">
            <SignOut className="w-4 h-4" /> Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-56">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center justify-between px-6 h-14">
            <div className="lg:hidden"><CraftBoltLogo size="xs" /></div>
            <HeaderWidget />
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-5xl">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800/60 lg:hidden z-40" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { setActiveTab('profile'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${activeTab === 'profile' ? 'text-orange-500' : 'text-zinc-400'}`}>
            <User className="w-5 h-5" /><span className="text-[10px] font-medium">Profil</span>
          </button>
          <button onClick={() => { setActiveTab('verified'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${demandTabs.some(t => t.key === activeTab) ? 'text-orange-500' : 'text-zinc-400'}`}>
            <List className="w-5 h-5" /><span className="text-[10px] font-medium">Poptávky</span>
          </button>
          <button onClick={() => setShowNewDemand(true)} className="flex flex-col items-center -mt-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"><Plus weight="bold" className="w-6 h-6 text-white" /></div>
          </button>
          <button onClick={() => { setActiveTab('expenses'); setSelectedDemand(null); }} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${activeTab === 'expenses' ? 'text-orange-500' : 'text-zinc-400'}`}>
            <Briefcase className="w-5 h-5" /><span className="text-[10px] font-medium">Výdaje</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400">
            <SignOut className="w-5 h-5" /><span className="text-[10px] font-medium">Odhlásit</span>
          </button>
        </div>
      </nav>

      {showNewDemand && (
        <NewDemandModal onClose={() => setShowNewDemand(false)} onSuccess={() => { setShowNewDemand(false); fetchDemands(); }} token={token} />
      )}
      {showDeactivate && (
        <DeactivateModal token={token} onClose={() => setShowDeactivate(false)} onSuccess={() => { logout(); navigate('/'); }} />
      )}
    </div>
  );
};

const NewDemandModal = ({ onClose, onSuccess, token }) => {
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    latitude: null,
    longitude: null,
    budget_min: '',
    budget_max: '',
    payment_method: 'cash',
    deadline: '',
    supplier_radius: 30
  });

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data.categories);
        if (response.data.grouped) setGroupedCategories(response.data.grouped);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Address search with debounce
  const handleAddressChange = (value) => {
    setFormData(prev => ({ ...prev, address: value }));
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await axios.get(`${API}/geocode/search`, { params: { q: value } });
        setAddressSuggestions(response.data);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Geocode search error:', err);
      }
    }, 400);
    setSearchTimeout(timeout);
  };

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setFormData(prev => ({
      ...prev,
      address: suggestion.display_name,
      latitude: lat,
      longitude: lon
    }));
    setShowSuggestions(false);
    setShowMap(true);
    setMapKey(prev => prev + 1);
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolokace není ve vašem prohlížeči podporována');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await axios.get(`${API}/geocode/reverse`, { params: { lat: latitude, lon: longitude } });
          setFormData(prev => ({
            ...prev,
            address: response.data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude
          }));
          setShowMap(true);
          setMapKey(prev => prev + 1);
        } catch (err) {
          setFormData(prev => ({ ...prev, latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          setShowMap(true);
          setMapKey(prev => prev + 1);
        }
        setGeoLoading(false);
      },
      (err) => {
        setError('Nepodařilo se získat vaši polohu. Povolte geolokaci v prohlížeči.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle map manually
  const toggleMap = () => {
    if (!showMap) {
      if (!formData.latitude) {
        setFormData(prev => ({ ...prev, latitude: 49.8175, longitude: 15.4730 }));
      }
      setShowMap(true);
      setMapKey(prev => prev + 1);
    } else {
      setShowMap(false);
    }
  };

  // Compress image before upload
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImages.length + files.length > 5) {
      setError('Maximálně 5 fotografií');
      return;
    }
    setUploading(true);
    setError('');
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append('file', compressed);
        const response = await axios.post(`${API}/upload`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        setUploadedImages(prev => [...prev, response.data.url]);
      } catch (err) {
        setError(err.response?.data?.detail || 'Nepodařilo se nahrát fotografii');
      }
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/demands`, {
        ...formData,
        images: uploadedImages,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        deadline: formData.deadline || null,
        supplier_radius: formData.supplier_radius || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se vytvořit poptávku');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAndVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);

    try {
      const res = await axios.post(`${API}/demands`, {
        ...formData,
        images: uploadedImages,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        deadline: formData.deadline || null,
        supplier_radius: formData.supplier_radius || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Now create verification checkout
      const demandId = res.data.id;
      const checkoutRes = await axios.post(`${API}/demands/${demandId}/verify-checkout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = checkoutRes.data.url;
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se vytvořit poptávku');
      setVerifyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Nová poptávka</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název zakázky</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="např. Oprava elektroinstalace"
              required
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="demand-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Kategorie</label>
            <div className="relative">
              <input
                type="text"
                value={catSearch || formData.category}
                onChange={(e) => { setCatSearch(e.target.value); setCatDropdownOpen(true); if (!e.target.value) setFormData(prev => ({ ...prev, category: '' })); }}
                onFocus={() => setCatDropdownOpen(true)}
                placeholder="Hledat kategorii..."
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="demand-category-search"
              />
              {formData.category && !catSearch && (
                <button type="button" onClick={() => { setFormData(prev => ({ ...prev, category: '' })); setCatSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400">&times;</button>
              )}
              {catDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCatDropdownOpen(false)} />
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const searchLower = catSearch.toLowerCase();
                      const hasGroups = Object.keys(groupedCategories).length > 0;
                      const entries = hasGroups
                        ? Object.entries(groupedCategories).map(([g, items]) => [g, catSearch ? items.filter(c => c.toLowerCase().includes(searchLower)) : items]).filter(([, items]) => items.length > 0)
                        : [['', catSearch ? categories.filter(c => c.toLowerCase().includes(searchLower)) : categories]];
                      const total = entries.reduce((s, [, items]) => s + items.length, 0);
                      if (total === 0) return <p className="px-4 py-3 text-sm text-zinc-400 text-center">Žádná kategorie nenalezena</p>;
                      return entries.map(([group, items]) => (
                        <div key={group || 'all'}>
                          {group && (
                            <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10 px-4 py-1.5 border-b border-zinc-200/80 dark:border-zinc-800">
                              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{group}</span>
                            </div>
                          )}
                          {items.map((cat) => (
                            <button key={cat} type="button" onClick={() => { setFormData(prev => ({ ...prev, category: cat })); setCatSearch(''); setCatDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors ${formData.category === cat ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-zinc-700 dark:text-zinc-300'}`}
                              data-testid={`demand-cat-option-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
            <input type="hidden" value={formData.category} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Popis práce</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Popište co potřebujete..."
              required
              rows={4}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              data-testid="demand-description-input"
            />
          </div>

          {/* Address with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa realizace</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 z-10" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 400)}
                placeholder="Začněte psát adresu..."
                required
                className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="demand-address-input"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto" data-testid="address-suggestions">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 text-sm text-zinc-700 dark:text-zinc-300 border-b border-gray-50 last:border-0 flex items-start gap-2"
                      data-testid={`address-suggestion-${i}`}
                    >
                      <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
                data-testid="use-current-location-btn"
              >
                {geoLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-orange-500"></div>
                ) : (
                  <MapPin weight="fill" className="w-3.5 h-3.5" />
                )}
                Použít aktuální polohu
              </button>
              <button
                type="button"
                onClick={toggleMap}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-600 transition-colors"
                data-testid="toggle-map-btn"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showMap ? 'Skrýt mapu' : 'Zvolit na mapě'}
              </button>
            </div>

            {/* Coordinates info */}
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                Poloha: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
              </p>
            )}

            {/* Interactive map */}
            {showMap && (
              <div className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700" data-testid="demand-location-map">
                <DemandRadiusMap
                  key={mapKey}
                  lat={formData.latitude || 49.8175}
                  lng={formData.longitude || 15.4730}
                  radiusKm={formData.supplier_radius}
                  onLocationChange={async (lat, lng) => {
                    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    try {
                      const response = await axios.get(`${API}/geocode/reverse`, { params: { lat, lon: lng } });
                      if (response.data.display_name) {
                        setFormData(prev => ({ ...prev, address: response.data.display_name }));
                      }
                    } catch (err) {
                      console.error('Reverse geocode error:', err);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Supplier radius */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Okruh dodavatelů</label>
            <p className="text-xs text-zinc-400 mb-2">Pouze dodavatelé působící v tomto okruhu od místa zakázky budou osloveni</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={formData.supplier_radius}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_radius: parseInt(e.target.value) }))}
                className="flex-1 accent-orange-500"
                data-testid="supplier-radius-slider"
              />
              <span className="text-sm font-semibold text-orange-600 w-16 text-right" data-testid="supplier-radius-value">{formData.supplier_radius} km</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5 px-0.5">
              <span>5 km</span>
              <span>75 km</span>
              <span>150 km</span>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Předpokládaná cena (Kč)</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Od"
                  value={formData.budget_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                  data-testid="demand-budget-min"
                />
              </div>
              <span className="text-zinc-400 text-sm">—</span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Do"
                  value={formData.budget_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                  data-testid="demand-budget-max"
                />
              </div>
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Fotografie (max 5, JPEG/PNG, auto-zmenšení na 1200px)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                  <img src={(() => { const u = url; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`remove-image-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploadedImages.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="upload-photo-btn">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 mt-1">Přidat</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-zinc-400">JPEG, PNG nebo WebP. Max 10 MB na soubor.</p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">Způsob platby</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Hotově' },
                { value: 'card', label: 'Kartou' },
                { value: 'transfer', label: 'Převodem' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, payment_method: opt.value }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    formData.payment_method === opt.value
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:border-zinc-600'
                  }`}
                  data-testid={`payment-${opt.value}-btn`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">Požadovaný termín realizace</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deadline: 'ASAP' }))}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.deadline === 'ASAP'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                data-testid="deadline-asap-btn"
              >
                Pokud možno, co nejdříve
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deadline: 'URGENT' }))}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.deadline === 'URGENT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                data-testid="deadline-urgent-btn"
              >
                IHNED — klidně si připlatím
              </button>
            </div>
            <input
              type="date"
              value={formData.deadline === 'ASAP' || formData.deadline === 'URGENT' ? '' : formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white"
              data-testid="demand-deadline-input"
            />
            <p className="text-xs text-zinc-500 mt-1">Vyberte tlačítko nebo konkrétní datum z kalendáře</p>
          </div>

          <div className="space-y-3 pt-4">
            <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200/60 dark:border-orange-800/40 rounded-xl p-3">
              <p className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                <strong>Tip:</strong> Ověřením poptávky za 49 Kč dáváte dodavatelům najevo, že to myslíte vážně.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || verifyLoading}
                className="flex-1 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 text-sm"
                data-testid="submit-demand-btn"
              >
                {loading ? 'Vytváření...' : 'Vložit poptávku'}
              </button>
              <button
                type="button"
                onClick={handleSubmitAndVerify}
                disabled={loading || verifyLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 text-sm"
                data-testid="submit-verify-demand-btn"
              >
                {verifyLoading ? 'Zpracování...' : 'Ověřit poptávku — 49 Kč'}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              data-testid="cancel-demand-btn"
            >
              Zrušit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerDashboard;

const DeactivateModal = ({ token, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = warning, 2 = password

  const handleDeactivate = async () => {
    if (!password.trim()) { setError('Zadejte heslo'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/auth/deactivate`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { password }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se deaktivovat účet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" data-testid="deactivate-modal">
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-600">Zrušení účtu</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center" data-testid="close-deactivate-btn">
            <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-center font-semibold text-zinc-900 dark:text-white mb-2">Opravdu chcete zrušit účet?</h3>
              <p className="text-center text-sm text-zinc-500 mb-6">
                Váš účet bude deaktivován. Nebudete se moci přihlásit, dokud administrátor účet neobnoví. Vaše data zůstanou zachována.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="cancel-deactivate-btn">
                  Zpět
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors" data-testid="confirm-deactivate-step1-btn">
                  Pokračovat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Pro potvrzení deaktivace zadejte své heslo:</p>
              {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm mb-4">{error}</div>}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vaše heslo"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 mb-4"
                data-testid="deactivate-password-input"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setError(''); }} className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  Zpět
                </button>
                <button onClick={handleDeactivate} disabled={loading} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50" data-testid="confirm-deactivate-final-btn">
                  {loading ? 'Deaktivuji...' : 'Zrušit účet'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
