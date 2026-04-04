import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  House, Briefcase, User, SignOut, MapPin, Calendar, ArrowRight, 
  Check, Clock, Star, Camera, X, CurrencyDollar, Warning,
  CaretDown, CaretUp, Plus, Trash, Eye, List
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  useEffect(() => {
    fetchData();
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

  const tabs = [
    { id: 'available', label: 'Dostupné', count: availableDemands.length, color: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-500', bgLight: 'bg-green-50' },
    { id: 'in_progress', label: 'Rozdělané', count: inProgress.length, color: 'bg-red-500', textColor: 'text-red-600', borderColor: 'border-red-500', bgLight: 'bg-red-50' },
    { id: 'completed', label: 'Dokončené', count: completed.length, color: 'bg-gray-500', textColor: 'text-gray-600', borderColor: 'border-gray-500', bgLight: 'bg-gray-50' },
    { id: 'cancelled', label: 'Nedokončené', count: cancelled.length, color: 'bg-orange-500', textColor: 'text-orange-600', borderColor: 'border-orange-500', bgLight: 'bg-orange-50' },
  ];

  const toggleTab = (id) => setActiveTab(activeTab === id ? null : id);

  const renderDemandCard = (demand, type) => (
    <Link key={demand.id} to={`/zakazka/${demand.id}`}
      className="block p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
      data-testid={`demand-${type}-${demand.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-900">{demand.title}</h3>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm">{demand.category}</span>
          </div>
          <p className="text-sm text-gray-900 line-clamp-1 mb-2">{demand.description}</p>
          <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{demand.address}</span>
            <span className="flex items-center gap-1"><User className="w-4 h-4" />{demand.customer_name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</span>
            {demand.deadline && (
              <span className="flex items-center gap-1 text-orange-600 font-medium"><Clock className="w-4 h-4" />Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</span>
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
        <div className="rounded-xl overflow-hidden border border-gray-200 mb-4 h-80" data-testid="available-map">
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
          <p className="text-gray-700">Momentálně nejsou dostupné žádné zakázky ve vašich kategoriích</p>
        </div>
      ) : (
        <div>
          {availableDemands.map(demand => (
            <div key={demand.id} className="p-4 border-b border-gray-100 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{demand.title}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm">{demand.category}</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">{demand.description}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap mb-3">
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
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
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
          <p className="text-gray-700">Žádné rozdělané zakázky</p>
        </div>
      ) : (
        inProgress.map(demand => (
          <div key={demand.id} className="p-4 border-b border-gray-100 last:border-0">
            <Link to={`/zakazka/${demand.id}`} className="block" data-testid={`demand-progress-${demand.id}`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900">{demand.title}</h3>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm">Probíhá</span>
                {demand.supplier_arrived && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                    <Check className="w-3 h-3" /> Na místě
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-900 line-clamp-1 mb-2">{demand.description}</p>
              <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap">
                <span className="flex items-center gap-1"><User className="w-4 h-4" />{demand.customer_name}</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{demand.address}</span>
              </div>
            </Link>
            {/* Progress photos */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {(demand.progress_photos || []).map((url, i) => (
                <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                  <img src={(() => { const u = url; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <label className={`w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors ${uploadingPhoto === demand.id ? 'opacity-50' : ''}`}>
                {uploadingPhoto === demand.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-orange-500"></div>
                ) : (
                  <Camera className="w-5 h-5 text-gray-400" />
                )}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto === demand.id}
                  onChange={(e) => handleProgressPhoto(demand.id, e.target.files[0])}
                  data-testid={`progress-photo-${demand.id}`} />
              </label>
              <span className="text-sm text-gray-700">Přidat foto</span>
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
          <p className="text-gray-700">Žádné dokončené zakázky</p>
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
          <p className="text-gray-700">Žádné nedokončené zakázky</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block">
        <Link to="/" className="flex items-center mb-10">
          <span className="text-2xl font-bold text-gray-900">Craft</span>
          <span className="text-2xl font-bold text-orange-500">Bolt</span>
        </Link>
        <nav className="space-y-2">
          <Link to="/dodavatel"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname === '/dodavatel' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            data-testid="nav-dashboard">
            <House weight={location.pathname === '/dodavatel' ? 'fill' : 'regular'} className="w-5 h-5" /> Dashboard
          </Link>
          <Link to="/profil" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50" data-testid="nav-profile">
            <User className="w-5 h-5" /> Profil
          </Link>
        </nav>
        <div className="absolute bottom-6 left-6 right-6">
          {/* Finance widget */}
          {finances && (
            <div className="bg-green-50 rounded-xl p-4 mb-3" data-testid="sidebar-finance">
              <p className="text-xs text-green-600 font-medium">Celkové příjmy</p>
              <p className="text-lg font-bold text-green-800">{(finances.total_income || 0).toLocaleString('cs-CZ')} Kč</p>
            </div>
          )}
          <div className="bg-orange-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-orange-700 font-medium mb-1">Zkušební doba</p>
            <p className="text-xs text-orange-600">
              {user?.trial_ends_at ? `Končí ${new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}` : 'Aktivní předplatné'}
            </p>
          </div>
          <button onClick={() => setShowDeactivate(true)}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl mb-1" data-testid="deactivate-btn-sidebar">
            <Trash className="w-5 h-5" /> Zrušit účet
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 rounded-xl" data-testid="logout-btn">
            <SignOut className="w-5 h-5" /> Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard dodavatele</h1>
              <p className="text-sm text-gray-500">Vítejte zpět, {user?.company_name || user?.email}</p>
            </div>
            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star weight="fill" className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">{user?.rating?.toFixed(1) || '0.0'}</span>
              {user?.rating_percentage > 0 && (
                <span className={`text-sm font-semibold ${user.rating_percentage >= 80 ? 'text-green-600' : user.rating_percentage >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                  ({user.rating_percentage.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="p-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {tabs.map(tab => (
                <div key={tab.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-testid={`tab-section-${tab.id}`}>
                  {/* Tab header - clickable */}
                  <button onClick={() => toggleTab(tab.id)}
                    className={`w-full flex items-center justify-between p-5 transition-colors ${activeTab === tab.id ? tab.bgLight : 'hover:bg-gray-50'}`}
                    data-testid={`tab-${tab.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${tab.color} rounded-lg flex items-center justify-center`}>
                        {tab.id === 'available' && <Briefcase weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'in_progress' && <Clock weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'completed' && <Check weight="bold" className="w-5 h-5 text-white" />}
                        {tab.id === 'cancelled' && <Warning weight="bold" className="w-5 h-5 text-white" />}
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold ${tab.textColor}`}>{tab.label}</p>
                        <p className="text-sm text-gray-600">{tab.count} zakázek</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${tab.textColor}`}>{tab.count}</span>
                      {activeTab === tab.id ? (
                        <CaretUp className={`w-5 h-5 ${tab.textColor}`} />
                      ) : (
                        <CaretDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {/* Tab content - expandable */}
                  {activeTab === tab.id && (
                    <div className={`border-t ${activeTab === tab.id ? 'border-gray-200' : ''}`}>
                      {renderTabContent(tab.id)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-home">
            <House className="w-6 h-6" />
            <span className="text-[10px] font-medium">Domů</span>
          </Link>
          <Link to="/dodavatel" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-orange-500" data-testid="mobile-nav-dashboard">
            <List className="w-6 h-6" weight="fill" />
            <span className="text-[10px] font-medium">Přehled</span>
          </Link>
          <Link to="/profil" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-profile">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-red-500 transition-colors" data-testid="mobile-nav-logout">
            <SignOut className="w-6 h-6" />
            <span className="text-[10px] font-medium">Odhlásit</span>
          </button>
        </div>
      </nav>

      {/* Deactivate Account Modal */}
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
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" data-testid="deactivate-modal">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-600">Zrušení účtu</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center" data-testid="close-deactivate-btn">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="p-6">
          {step === 1 ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-center font-semibold text-gray-900 mb-2">Opravdu chcete zrušit účet?</h3>
              <p className="text-center text-sm text-gray-500 mb-6">
                Váš účet bude deaktivován. Nebudete se moci přihlásit, dokud administrátor účet neobnoví. Vaše data zůstanou zachována.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors" data-testid="cancel-deactivate-btn">
                  Zpět
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors" data-testid="confirm-deactivate-step1-btn">
                  Pokračovat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">Pro potvrzení deaktivace zadejte své heslo:</p>
              {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm mb-4">{error}</div>}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vaše heslo"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 mb-4"
                data-testid="deactivate-password-input"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setError(''); }} className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">
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
