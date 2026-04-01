import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  House, Plus, List, User, SignOut, Bell, MapPin, 
  Calendar, Clock, ArrowRight, X, Check, Image as ImageIcon
} from '@phosphor-icons/react';
import DraggableMap from '../components/DraggableMap';

const CustomerDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

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

  useEffect(() => {
    fetchDemands();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      open: 'Otevřená',
      in_progress: 'Probíhá',
      completed: 'Dokončeno',
      cancelled: 'Zrušeno'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
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
          <Link 
            to="/zakaznik" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              location.pathname === '/zakaznik' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
            data-testid="nav-dashboard"
          >
            <House weight={location.pathname === '/zakaznik' ? 'fill' : 'regular'} className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/profil" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            data-testid="nav-profile"
          >
            <User className="w-5 h-5" />
            Profil
          </Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            data-testid="logout-btn"
          >
            <SignOut className="w-5 h-5" />
            Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Profil zákazníka</h1>
              <p className="text-sm text-gray-500">Vítejte zpět, {user?.company_name || user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowNewDemand(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                data-testid="new-demand-btn"
              >
                <Plus weight="bold" className="w-5 h-5" />
                Nová poptávka
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Stats - clickable cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Celkem poptávek', value: demands.length, color: 'bg-blue-500', filter: 'all' },
              { label: 'Otevřené', value: demands.filter(d => d.status === 'open').length, color: 'bg-green-500', filter: 'open' },
              { label: 'Probíhající', value: demands.filter(d => d.status === 'in_progress').length, color: 'bg-orange-500', filter: 'in_progress' },
              { label: 'Dokončené', value: demands.filter(d => d.status === 'completed').length, color: 'bg-gray-500', filter: 'completed' },
            ].map((stat, i) => (
              <button key={i} 
                onClick={() => setActiveFilter(activeFilter === stat.filter ? null : stat.filter)}
                className={`bg-white rounded-xl p-5 border transition-all text-left ${
                  activeFilter === stat.filter ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
                data-testid={`stat-card-${stat.filter}`}
              >
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <List weight="bold" className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </button>
            ))}
          </div>

          {/* Filtered Demands Modal - shown when a stat card is clicked */}
          {activeFilter && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setActiveFilter(null)}>
              <div 
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
                data-testid="filtered-demands-modal"
              >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <h2 className="font-semibold text-gray-900">
                    {activeFilter === 'all' ? 'Všechny poptávky' : activeFilter === 'open' ? 'Otevřené poptávky' : activeFilter === 'in_progress' ? 'Probíhající poptávky' : 'Dokončené poptávky'}
                  </h2>
                  <button onClick={() => setActiveFilter(null)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" data-testid="close-filter-btn">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {(() => {
                    const filtered = activeFilter === 'all' ? demands : demands.filter(d => d.status === activeFilter);
                    if (loading) return (
                      <div className="p-10 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                      </div>
                    );
                    if (filtered.length === 0) return (
                      <div className="p-10 text-center">
                        <List className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Žádné poptávky v této kategorii</p>
                        <button onClick={() => { setActiveFilter(null); setShowNewDemand(true); }} className="text-orange-500 hover:text-orange-600 font-medium" data-testid="empty-new-demand-btn">
                          Vytvořit poptávku
                        </button>
                      </div>
                    );
                    return (
                      <div className="divide-y divide-gray-100">
                        {filtered.map((demand) => (
                          <Link key={demand.id} to={`/zakazka/${demand.id}`}
                            className="block p-5 hover:bg-gray-50 transition-colors"
                            data-testid={`demand-item-${demand.id}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900 truncate">{demand.title}</h3>
                                  {getStatusBadge(demand.status)}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{demand.description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {demand.address}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(demand.created_at).toLocaleDateString('cs-CZ')}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
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
          <Link to="/zakaznik" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-orange-500" data-testid="mobile-nav-dashboard">
            <List className="w-6 h-6" weight="fill" />
            <span className="text-[10px] font-medium">Přehled</span>
          </Link>
          <button onClick={() => setShowNewDemand(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 -mt-4" data-testid="mobile-nav-new-demand">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Plus weight="bold" className="w-6 h-6 text-white" />
            </div>
          </button>
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

      {/* New Demand Modal */}
      {showNewDemand && (
        <NewDemandModal 
          onClose={() => setShowNewDemand(false)} 
          onSuccess={() => {
            setShowNewDemand(false);
            fetchDemands();
          }}
          token={token}
        />
      )}
    </div>
  );
};

const NewDemandModal = ({ onClose, onSuccess, token }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    latitude: null,
    longitude: null,
    budget_min: '',
    budget_max: '',
    payment_method: 'cash'
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
        const fd = new FormData();
        fd.append('file', file);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API}/demands`, {
        ...formData,
        images: uploadedImages,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nová poptávka</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Název zakázky</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="např. Oprava elektroinstalace"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="demand-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorie</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="demand-category-select"
            >
              <option value="">Vyberte kategorii</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Popis práce</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Popište co potřebujete..."
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              data-testid="demand-description-input"
            />
          </div>

          {/* Address with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa realizace</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Začněte psát adresu..."
                required
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="demand-address-input"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto" data-testid="address-suggestions">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 text-sm text-gray-700 border-b border-gray-50 last:border-0 flex items-start gap-2"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors"
                data-testid="toggle-map-btn"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showMap ? 'Skrýt mapu' : 'Zvolit na mapě'}
              </button>
            </div>

            {/* Coordinates info */}
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                Poloha: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
              </p>
            )}

            {/* Interactive map */}
            {showMap && (
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200" data-testid="demand-location-map">
                <DraggableMap
                  key={mapKey}
                  lat={formData.latitude || 49.8175}
                  lng={formData.longitude || 15.4730}
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

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fotografie (max 5)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={`${API.replace('/api', '')}${url}`} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
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
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="upload-photo-btn">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-[10px] text-gray-400 mt-1">Přidat</span>
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
            <p className="text-xs text-gray-400">JPEG, PNG nebo WebP. Max 10 MB na soubor.</p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Způsob platby</label>
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
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  data-testid={`payment-${opt.value}-btn`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              data-testid="cancel-demand-btn"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
              data-testid="submit-demand-btn"
            >
              {loading ? 'Vytváření...' : 'Vytvořit poptávku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerDashboard;
