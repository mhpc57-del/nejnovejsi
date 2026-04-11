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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(null);
  const [availableDemands, setAvailableDemands] = useState([]);
  const [myDemands, setMyDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finances, setFinances] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadDemands, setUnreadDemands] = useState([]);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const fetchUnread = async () => {
    try {
      const res = await axios.get(`${API}/messages/unread-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadDemands(res.data.unread_demands || []);
    } catch (err) {
      console.error('Error fetching unread:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(loc);
          axios.post(`${API}/users/location`, { latitude: loc.lat, longitude: loc.lng },
            { headers: { Authorization: `Bearer ${token}` } }).catch(console.error);
        },
        () => {}
      );
    }
    return () => clearInterval(interval);
  }, [token]);

  const handleAcceptDemand = async (demandId) => {
    try {
      await axios.post(`${API}/demands/${demandId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se přijmout zakázku');
    }
  };

  const handleProgressPhoto = async (demandId, file) => {
    if (!file) return;
    setUploadingPhoto(demandId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await axios.post(`${API}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      await axios.post(`${API}/demands/${demandId}/progress-photo?photo_url=${encodeURIComponent(uploadRes.data.url)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Nepodařilo se nahrát fotku');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleCannotComplete = async () => {
    if (!cancelDialog || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await axios.post(`${API}/demands/${cancelDialog}/cannot-complete`, 
        { reason: cancelReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCancelDialog(null);
      setCancelReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Nepodařilo se odeslat');
    } finally {
      setCancelLoading(false);
    }
  };

  const tabs = [
    { id: 'available', label: 'Dostupné', count: availableDemands.length, color: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-500', bgLight: 'bg-green-50' },
    { id: 'in_progress', label: 'Rozdělané', count: inProgress.length, color: 'bg-red-500', textColor: 'text-red-600', borderColor: 'border-red-500', bgLight: 'bg-red-50' },
    { id: 'completed', label: 'Dokončené', count: completed.length, color: 'bg-zinc-50 dark:bg-zinc-800/500', textColor: 'text-zinc-600 dark:text-zinc-400', borderColor: 'border-gray-500', bgLight: 'bg-zinc-50 dark:bg-zinc-800/50' },
    { id: 'cancelled', label: 'Nedokončené', count: cancelled.length, color: 'bg-orange-500', textColor: 'text-orange-600', borderColor: 'border-orange-500', bgLight: 'bg-orange-50' },
  ];

  const toggleTab = (id) => setActiveTab(activeTab === id ? null : id);

  const renderDemandCard = (demand, type) => (
    <Link key={demand.id} to={`/zakazka/${demand.id}`}
      className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-200/80 dark:border-zinc-800 last:border-0"
      data-testid={`demand-${type}-${demand.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-zinc-900 dark:text-white">{demand.title}</h3>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm">{demand.category}</span>
          </div>
          <p className="text-sm text-zinc-900 dark:text-white line-clamp-1 mb-2">{demand.description}</p>
          <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{demand.address}</span>
            <span className="flex items-center gap-1"><User className="w-4 h-4" />{demand.customer_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</span>
            {demand.deadline && (
              <span className={`flex items-center gap-1 font-medium ${demand.deadline === 'URGENT' ? 'text-red-600' : 'text-orange-600'}`}>
                <Clock className="w-4 h-4" />
                {demand.deadline === 'ASAP' ? 'Co nejdříve' :
                 demand.deadline === 'URGENT' ? 'IHNED!' :
                 `Termín: ${new Date(demand.deadline).toLocaleDateString('cs-CZ')}`}
              </span>
            )}
            {demand.invoiced_amount && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <CurrencyDollar className="w-4 h-4" />{demand.invoiced_amount.toLocaleString('cs-CZ')} Kč
              </span>
            )}
          </div>
          {demand.cancellation_reason && (
            <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
              <Warning className="w-4 h-4" /> {demand.cancellation_reason}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );

  const renderAvailable = () => (
    <div>
      {/* Map for available demands */}
      {availableDemands.length > 0 && availableDemands.some(d => d.latitude && d.longitude) && (
        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 mb-4 h-80" data-testid="available-map">
          <MapContainer center={myLocation ? [myLocation.lat, myLocation.lng] : [49.8, 15.5]} zoom={9}
            style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {availableDemands.filter(d => d.latitude && d.longitude).map(d => (
              <Marker key={d.id} position={[d.latitude, d.longitude]} icon={demandIcon}>
                <Popup>
                  <strong>{d.title}</strong><br/><small>{d.category} - {d.address}</small>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
      {availableDemands.length === 0 ? (
        <div className="p-8 text-center">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-zinc-700 dark:text-zinc-300">Momentálně nejsou dostupné žádné zakázky ve vašich kategoriích</p>
        </div>
      ) : (
        <div>
          {availableDemands.map(demand => (
            <div key={demand.id} className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{demand.title}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm">{demand.category}</span>
                  </div>
                  <p className="text-sm text-zinc-900 dark:text-white line-clamp-2 mb-2">{demand.description}</p>
                  <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 flex-wrap mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{demand.address}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</span>
                    {demand.deadline && (
                      <span className="flex items-center gap-1 text-orange-600 font-medium"><Clock className="w-4 h-4" />Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</span>
                    )}
                    {demand.budget_max && (
                      <span className="text-green-600 font-semibold">Rozpočet: {demand.budget_min ? `${demand.budget_min}-` : ''}{demand.budget_max} Kč</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/zakazka/${demand.id}`}
                      className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      data-testid={`view-${demand.id}`}>Detail</Link>
                    <button onClick={() => handleAcceptDemand(demand.id)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium text-white"
                      data-testid={`accept-${demand.id}`}>Přijmout</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInProgress = () => (
    <div>
      {inProgress.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-zinc-700 dark:text-zinc-300">Žádné rozdělané zakázky</p>
        </div>
      ) : (
        inProgress.map(demand => (
          <div key={demand.id} className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 last:border-0">
            <Link to={`/zakazka/${demand.id}`} className="block" data-testid={`demand-progress-${demand.id}`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-zinc-900 dark:text-white">{demand.title}</h3>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm">Probíhá</span>
                {demand.supplier_arrived && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                    <Check className="w-3 h-3" /> Na místě
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-900 dark:text-white line-clamp-1 mb-2">{demand.description}</p>
              <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 flex-wrap">
                <span className="flex items-center gap-1"><User className="w-4 h-4" />{demand.customer_name}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{demand.address}</span>
              </div>
            </Link>
            {/* Progress photos + cannot complete */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {(demand.progress_photos || []).map((url, i) => (
                <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={(() => { const u = url; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <label className={`w-12 h-12 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors ${uploadingPhoto === demand.id ? 'opacity-50' : ''}`}>
                {uploadingPhoto === demand.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-orange-500"></div>
                ) : (
                  <Camera className="w-5 h-5 text-zinc-400" />
                )}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === demand.id}
                  onChange={(e) => handleProgressPhoto(demand.id, e.target.files[0])}
                  data-testid={`progress-photo-${demand.id}`} />
              </label>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Přidat foto</span>
              <div className="ml-auto">
                <button
                  onClick={(e) => { e.preventDefault(); setCancelDialog(demand.id); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                  data-testid={`cannot-complete-${demand.id}`}
                >
                  <Warning weight="bold" className="w-4 h-4" />
                  Nemohu provést
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCompleted = () => (
    <div>
      {/* Financial summary */}
      {finances && (
        <div className="p-4 bg-green-50 border-b border-green-100 flex items-center justify-between" data-testid="finance-summary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CurrencyDollar weight="bold" className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-600">Celkové příjmy</p>
              <p className="text-lg font-bold text-green-800">{(finances.total_income || 0).toLocaleString('cs-CZ')} Kč</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-600">Dokončených zakázek</p>
            <p className="text-lg font-bold text-green-800">{finances.completed_jobs || 0}</p>
          </div>
        </div>
      )}
      {completed.length === 0 ? (
        <div className="p-8 text-center">
          <Check className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-zinc-700 dark:text-zinc-300">Žádné dokončené zakázky</p>
        </div>
      ) : (
        completed.map(demand => renderDemandCard(demand, 'completed'))
      )}
    </div>
  );

  const renderCancelled = () => (
    <div>
      {cancelled.length === 0 ? (
        <div className="p-8 text-center">
          <Warning className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-zinc-700 dark:text-zinc-300">Žádné nedokončené zakázky</p>
        </div>
      ) : (
        cancelled.map(demand => renderDemandCard(demand, 'cancelled'))
      )}
    </div>
  );

  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'available': return renderAvailable();
      case 'in_progress': return renderInProgress();
      case 'completed': return renderCompleted();
      case 'cancelled': return renderCancelled();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <WelcomeModal user={user} token={token} API={API} />
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800/60 p-6 hidden lg:block">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <CraftBoltLogo size="sm" />
        </Link>
        <nav className="space-y-1">
          <Link to="/dodavatel"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/dodavatel' ? 'bg-orange-500 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
            data-testid="nav-dashboard">
            <House weight={location.pathname === '/dodavatel' ? 'fill' : 'regular'} className="w-5 h-5" /> Hlavní menu
          </Link>
          <Link to="/profil" className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors" data-testid="nav-profile">
            <User className="w-5 h-5" /> Profil
          </Link>
          <Link to="/faktury" className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors" data-testid="nav-invoices">
            <Receipt className="w-5 h-5" /> Faktury
          </Link>
          {user?.role === 'customer_supplier' && (
            <Link to="/zakaznik"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-orange-600 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors font-medium"
              data-testid="nav-switch-to-customer">
              <User className="w-5 h-5" /> Přepnout na - Zákazník
            </Link>
          )}
        </nav>
        <div className="absolute bottom-6 left-6 right-6">
          {/* Finance widget */}
          {finances && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg p-4 mb-3" data-testid="sidebar-finance">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Potvrzené příjmy</p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{(finances.total_income || 0).toLocaleString('cs-CZ')} Kč</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{finances.confirmed_jobs || 0} zakázek</p>
              {finances.total_pending > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Čeká na potvrzení</p>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{(finances.total_pending || 0).toLocaleString('cs-CZ')} Kč</p>
                  <p className="text-xs text-orange-500">{finances.pending_jobs || 0} zakázek</p>
                </div>
              )}
            </div>
          )}
          {(() => {
            const trialExpired = user?.trial_ends_at && new Date(user.trial_ends_at) < new Date();
            const subActive = user?.subscription_active;
            if (subActive) {
              return (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200/60 dark:border-green-800/40 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">Aktivní předplatné</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {user?.subscription_plan ? SUBSCRIPTION_PLANS_NAMES[user.subscription_plan] || user.subscription_plan : 'Předplatné'}
                  </p>
                </div>
              );
            }
            if (trialExpired) {
              return (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-800/40 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-400 font-bold mb-1">Zkušební doba vypršela</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                    Vypršela {new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}
                  </p>
                  <a href="/cenik" className="inline-block text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Zaplatit předplatné
                  </a>
                </div>
              );
            }
            return (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-800/40 rounded-lg p-4 mb-4">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-1">Zkušební doba</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {user?.trial_ends_at ? `Končí ${new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}` : 'Aktivní'}
                </p>
              </div>
            );
          })()}
          <button onClick={() => setShowDeactivate(true)}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg mb-1 transition-colors" data-testid="deactivate-btn-sidebar">
            <Trash className="w-5 h-5" /> Zrušit účet
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors" data-testid="logout-btn">
            <SignOut className="w-5 h-5" /> Odhlásit se
          </button>
          <div className="px-4 py-2">
            <ThemeToggle className="w-full justify-center" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Hlavní menu dodavatele</h1>
              <p className="text-sm text-zinc-500">Vítejte zpět, {user?.company_name || user?.email}</p>
              <div className="mt-1"><HeaderWidget /></div>
            </div>
            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star weight="fill" className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-zinc-900 dark:text-white">{user?.rating?.toFixed(1) || '0.0'}</span>
              {user?.rating_percentage > 0 && (
                <span className={`text-sm font-semibold ${user.rating_percentage >= 80 ? 'text-emerald-600' : user.rating_percentage >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                  ({user.rating_percentage.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Unread messages notification */}
          {unreadDemands.length > 0 && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4" data-testid="supplier-unread-messages-banner">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ChatCircle weight="fill" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-orange-800">Nové zprávy ({unreadDemands.length})</p>
                  <p className="text-sm text-orange-600">Máte nepřečtené zprávy v následujících zakázkách</p>
                </div>
              </div>
              <div className="space-y-2">
                {unreadDemands.slice(0, 5).map((item) => (
                  <Link key={item.demand_id} to={`/zakazka/${item.demand_id}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-orange-50 transition-colors border border-orange-100"
                    data-testid={`supplier-unread-${item.demand_id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-white truncate text-sm">{item.demand_title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.last_sender}: {item.last_message}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {tabs.map(tab => {
                const tabUnread = unreadDemands.filter(u => {
                  if (tab.id === 'available') return u.demand_status === 'open';
                  return u.demand_status === tab.id;
                }).length;
                // Count new items (created in last 24h) for green badge
                const now = new Date();
                const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
                let newCount = 0;
                if (tab.id === 'available') {
                  newCount = availableDemands.filter(d => new Date(d.created_at) > dayAgo).length;
                } else if (tab.id === 'completed') {
                  newCount = completed.filter(d => {
                    const hasRecentPhoto = d.completion_photos_customer?.length > 0 || d.completion_photos_supplier?.length > 0;
                    const recentComplete = d.completed_at && new Date(d.completed_at) > dayAgo;
                    return (recentComplete || hasRecentPhoto) && !d.price_confirmed_by_supplier;
                  }).length;
                }
                const totalBadge = tabUnread + newCount;
                return (
                <div key={tab.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden" data-testid={`tab-section-${tab.id}`}>
                  {/* Tab header - clickable */}
                  <button onClick={() => toggleTab(tab.id)}
                    className={`w-full flex items-center justify-between p-5 transition-colors ${activeTab === tab.id ? tab.bgLight + ' dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                    data-testid={`tab-${tab.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${tab.color} rounded-lg flex items-center justify-center relative`}>
                        {tab.id === 'available' && <Briefcase weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'in_progress' && <Clock weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'completed' && <Check weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'cancelled' && <Warning weight="bold" className="w-5 h-5 text-white" />}
                        {tabUnread > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse" data-testid={`tab-unread-${tab.id}`}>
                            {tabUnread}
                          </span>
                        )}
                        {tabUnread === 0 && newCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse" data-testid={`tab-new-${tab.id}`}>
                            {newCount}
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold ${tab.textColor}`}>{tab.label}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{tab.count} zakázek</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${tab.textColor}`}>{tab.count}</span>
                      {activeTab === tab.id ? (
                        <CaretUp className={`w-5 h-5 ${tab.textColor}`} />
                      ) : (
                        <CaretDown className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                  </button>
                  {/* Tab content - expandable */}
                  {activeTab === tab.id && (
                    <div className={`border-t ${activeTab === tab.id ? 'border-zinc-200 dark:border-zinc-700' : ''}`}>
                      {renderTabContent(tab.id)}
                    </div>
                  )}
                </div>
                );
              })}

              {/* Overview map of all demands */}
              {(() => {
                const allDemands = [...availableDemands, ...myDemands];
                const withCoords = allDemands.filter(d => d.latitude && d.longitude);
                const uniqueMap = {};
                withCoords.forEach(d => { uniqueMap[d.id] = d; });
                const unique = Object.values(uniqueMap);
                if (unique.length === 0) return null;
                return (
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-5 mt-4" data-testid="supplier-overview-map">
                    <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                      <MapPin weight="fill" className="w-5 h-5 text-orange-500" />
                      Mapa zakázek
                    </h2>
                    <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Dostupné</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Rozdělané</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Dokončené</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> Nedokončené</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-80">
                      <MapContainer
                        center={myLocation ? [myLocation.lat, myLocation.lng] : [unique[0].latitude, unique[0].longitude]}
                        zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                        {unique.map(d => {
                          let icon = demandIcon;
                          let statusLabel = 'Dostupná';
                          if (d.status === 'in_progress') { icon = redIcon; statusLabel = 'Probíhá'; }
                          else if (d.status === 'completed') { icon = greyIcon; statusLabel = 'Dokončeno'; }
                          else if (d.status === 'cancelled') { icon = orangeIcon; statusLabel = 'Nedokončeno'; }
                          return (
                            <Marker key={d.id} position={[d.latitude, d.longitude]} icon={icon}>
                              <Popup>
                                <strong>{d.title}</strong><br/>
                                <small>{d.category} — {d.address}</small><br/>
                                <small>{statusLabel}</small>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800/60 lg:hidden z-40" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-home">
            <House className="w-6 h-6" />
            <span className="text-[10px] font-medium">Domů</span>
          </Link>
          <Link to="/dodavatel" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-orange-500" data-testid="mobile-nav-dashboard">
            <List className="w-6 h-6" weight="fill" />
            <span className="text-[10px] font-medium">Přehled</span>
          </Link>
          <Link to="/profil" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-profile">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
          <button onClick={() => setShowMobileMenu(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-more">
            <DotsThreeCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Více</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Více" Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-menu-drawer">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-5" />
            <div className="grid grid-cols-3 gap-3 mb-5">
              <Link to="/faktury" onClick={() => setShowMobileMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-invoices">
                <div className="w-11 h-11 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Faktury</span>
              </Link>
              <Link to="/dodavatel/prijmy" onClick={() => setShowMobileMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-income">
                <div className="w-11 h-11 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <CurrencyDollar className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Příjmy</span>
              </Link>
              <button onClick={() => { setShowMobileMenu(false); window.dispatchEvent(new CustomEvent('open-ai-chat')); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-ai-chat">
                <div className="w-11 h-11 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
                  <ChatCircleDots className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">AI Chat</span>
              </button>
              <button onClick={() => { setShowMobileMenu(false); document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-theme">
                <div className="w-11 h-11 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-300 dark:hidden" />
                  <Sun className="w-5 h-5 text-yellow-500 hidden dark:block" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Režim</span>
              </button>
              {user?.role === 'customer_supplier' && (
                <Link to="/zakaznik" onClick={() => setShowMobileMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-switch-role">
                  <div className="w-11 h-11 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium text-center">Zákazník</span>
                </Link>
              )}
            </div>
            {user?.trial_ends_at && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-800/40 rounded-xl p-3 mb-4" data-testid="mobile-trial-info">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  Zkušební doba: {new Date(user.trial_ends_at) > new Date()
                    ? `Končí ${new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}`
                    : 'Vypršela'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowMobileMenu(false); setShowDeactivate(true); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl text-sm font-medium" data-testid="mobile-menu-deactivate">
                <Trash className="w-4 h-4" /> Zrušit účet
              </button>
              <button onClick={() => { setShowMobileMenu(false); handleLogout(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium" data-testid="mobile-menu-logout">
                <SignOut className="w-4 h-4" /> Odhlásit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Account Modal */}
      {/* Cannot Complete Dialog */}
      {cancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCancelDialog(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full shadow-xl border border-zinc-200/50 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-500/15 rounded-lg flex items-center justify-center">
                <Warning weight="bold" className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Zakázku nemohu provést</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Popište prosím důvod, proč zakázku nemůžete provést. Zákazník bude o tomto informován emailem.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Např. Po příjezdu na místo jsem zjistil, že rozsah prací je výrazně větší, než bylo popsáno v poptávce..."
              rows={4}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm resize-none mb-4"
              data-testid="cannot-complete-reason"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelDialog(null); setCancelReason(''); }}
                className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                data-testid="cannot-complete-cancel"
              >
                Zpět
              </button>
              <button
                onClick={handleCannotComplete}
                disabled={cancelLoading || !cancelReason.trim()}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                data-testid="cannot-complete-submit"
              >
                {cancelLoading ? 'Odesílám...' : 'Odeslat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeactivate && (
        <DeactivateSupplierModal
          token={token}
          onClose={() => setShowDeactivate(false)}
          onSuccess={() => { logout(); navigate('/'); }}
        />
      )}
    </div>
  );
};

const DeactivateSupplierModal = ({ token, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

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
      <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md overflow-hidden border border-zinc-200/50 dark:border-zinc-800" data-testid="deactivate-modal">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-red-600" style={{ fontFamily: 'Outfit' }}>Zrušení účtu</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" data-testid="close-deactivate-btn">
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

export default SupplierDashboard;
