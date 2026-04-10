import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, User, MapPin, Phone, Star, Calendar, 
  Briefcase, Check, PencilSimple, Camera, Envelope, Buildings, 
  MagnifyingGlass, Globe, X, Plus, Image as ImageIcon, Trash, Clock
} from '@phosphor-icons/react';
import ThemeToggle from '../components/ThemeToggle';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ServiceAreaMapView = ({ areas }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (mapInstanceRef.current || !areas?.length) return;

    const map = L.map(mapRef.current, {
      center: [areas[0].lat, areas[0].lng],
      zoom: 8,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const bounds = [];
    areas.forEach(area => {
      const circle = L.circle([area.lat, area.lng], {
        radius: (area.radius_km || 20) * 1000,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.12,
        weight: 2
      }).addTo(map);
      bounds.push(circle.getBounds());
      L.marker([area.lat, area.lng]).addTo(map)
        .bindPopup(`Poloměr: ${area.radius_km || 20} km`);
    });

    if (bounds.length > 0) {
      const combined = bounds[0];
      bounds.slice(1).forEach(b => combined.extend(b));
      map.fitBounds(combined, { padding: [30, 30] });
    }

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [areas]);

  if (!areas?.length) return null;

  return (
    <div ref={mapRef} style={{ height: '300px', width: '100%' }} className="rounded-xl border border-zinc-200 dark:border-zinc-700" data-testid="service-area-map-view" />
  );
};

const ServiceAreaMap = ({ areas, onChange }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circlesRef = useRef([]);
  const radiusRef = useRef(20);
  const selectedRef = useRef(null);
  const [radius, setRadius] = useState(20);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [49.8175, 15.4730],
      zoom: 7,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Draw existing areas
    if (areas && areas.length > 0) {
      areas.forEach((area, idx) => {
        addCircleToMap(map, area, idx);
      });
    }

    map.on('click', (e) => {
      const r = radiusRef.current;
      const newArea = { lat: e.latlng.lat, lng: e.latlng.lng, radius_km: r };
      const idx = circlesRef.current.length;
      addCircleToMap(map, newArea, idx);
      const updated = circlesRef.current.map(c => c.data);
      onChange(updated);
      // Select the new circle
      selectCircle(idx);
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      circlesRef.current = [];
    };
  }, []);

  const addCircleToMap = (map, area, idx) => {
    const circle = L.circle([area.lat, area.lng], {
      radius: (area.radius_km || 20) * 1000,
      color: '#f97316',
      fillColor: '#f97316',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map);
    circle.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      selectCircle(idx);
    });
    circlesRef.current.push({ circle, data: area });
  };

  const selectCircle = (idx) => {
    // Deselect previous
    circlesRef.current.forEach((c, i) => {
      c.circle.setStyle({ color: i === idx ? '#ea580c' : '#f97316', weight: i === idx ? 3 : 2, fillOpacity: i === idx ? 0.25 : 0.15 });
    });
    selectedRef.current = idx;
    setSelectedIdx(idx);
    if (circlesRef.current[idx]) {
      setRadius(circlesRef.current[idx].data.radius_km || 20);
      radiusRef.current = circlesRef.current[idx].data.radius_km || 20;
    }
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    radiusRef.current = newRadius;
    // If a circle is selected, update it in real-time
    const idx = selectedRef.current;
    if (idx !== null && circlesRef.current[idx]) {
      circlesRef.current[idx].circle.setRadius(newRadius * 1000);
      circlesRef.current[idx].data = { ...circlesRef.current[idx].data, radius_km: newRadius };
      const updated = circlesRef.current.map(c => c.data);
      onChange(updated);
    }
  };

  const removeSelected = () => {
    const idx = selectedRef.current;
    if (idx === null || !circlesRef.current[idx]) return;
    mapInstanceRef.current.removeLayer(circlesRef.current[idx].circle);
    circlesRef.current.splice(idx, 1);
    selectedRef.current = null;
    setSelectedIdx(null);
    const updated = circlesRef.current.map(c => c.data);
    onChange(updated);
  };

  const removeLastArea = () => {
    if (circlesRef.current.length === 0) return;
    const last = circlesRef.current.pop();
    mapInstanceRef.current.removeLayer(last.circle);
    selectedRef.current = null;
    setSelectedIdx(null);
    const updated = circlesRef.current.map(c => c.data);
    onChange(updated);
  };

  const clearAreas = () => {
    circlesRef.current.forEach(c => mapInstanceRef.current.removeLayer(c.circle));
    circlesRef.current = [];
    selectedRef.current = null;
    setSelectedIdx(null);
    onChange([]);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">Poloměr:</label>
        <input type="range" min="5" max="100" value={radius} onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
          className="flex-1 accent-orange-500" data-testid="radius-slider" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-14 text-right">{radius} km</span>
      </div>
      <div ref={mapRef} style={{ height: '300px', width: '100%' }} className="rounded-xl border border-zinc-200 dark:border-zinc-700" data-testid="service-area-map" />
      <div className="flex gap-2 mt-2">
        {selectedIdx !== null && (
          <button type="button" onClick={removeSelected}
            className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100" data-testid="remove-selected-area-btn">
            Odebrat vybranou
          </button>
        )}
        <button type="button" onClick={removeLastArea}
          className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50" data-testid="remove-last-area-btn">
          Odebrat poslední
        </button>
        <button type="button" onClick={clearAreas}
          className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50" data-testid="clear-areas-btn">
          Smazat vše
        </button>
      </div>
      <p className="text-xs text-zinc-400 mt-1">Klikněte na mapu pro přidání oblasti. Klikněte na kruh pro jeho výběr a úpravu poloměru.</p>
    </div>
  );
};

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [aresLoading, setAresLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState({});
  const [formData, setFormData] = useState({});
  const [customCatInput, setCustomCatInput] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isOwnProfile = !id || id === 'me' || id === currentUser?.id;
  const userId = (id && id !== 'me') ? id : currentUser?.id;

  // Close photo menu on outside click
  useEffect(() => {
    if (!showPhotoMenu) return;
    const close = () => setShowPhotoMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showPhotoMenu]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let profileData;
        if (isOwnProfile) {
          profileData = currentUser;
        } else {
          const response = await axios.get(`${API}/users/${userId}`);
          profileData = response.data;
        }
        setProfile(profileData);
        setFormData({
          company_name: profileData?.company_name || '',
          first_name: profileData?.first_name || '',
          last_name: profileData?.last_name || '',
          phone: profileData?.phone || '',
          sms_notifications: profileData?.sms_notifications || false,
          ico: profileData?.ico || '',
          dic: profileData?.dic || '',
          address: profileData?.address || '',
          branch_address: profileData?.branch_address || '',
          permanent_address: profileData?.permanent_address || '',
          actual_address: profileData?.actual_address || '',
          date_of_birth: profileData?.date_of_birth || '',
          profile_image: profileData?.profile_image || '',
          bio: profileData?.bio || '',
          website: profileData?.website || '',
          categories: profileData?.categories || [],
          custom_categories: profileData?.custom_categories || [],
          reference_photos: profileData?.reference_photos || [],
          service_areas: profileData?.service_areas || [],
        });

        const reviewsRes = await axios.get(`${API}/reviews/user/${userId}`);
        setReviews(reviewsRes.data);

        const catRes = await axios.get(`${API}/categories`);
        setCategories(catRes.data.categories);
        if (catRes.data.grouped) setGroupedCategories(catRes.data.grouped);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchData();
  }, [userId, currentUser, isOwnProfile]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const response = await axios.post(`${API}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, profile_image: response.data.url }));
    } catch (err) { setError('Nepodařilo se nahrát fotografii'); }
    finally { setUploadingPhoto(false); }
  };

  const handleRefPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (formData.reference_photos.length + files.length > 20) {
      setError('Maximálně 20 referenčních fotografií');
      return;
    }
    setUploadingRef(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const response = await axios.post(`${API}/upload`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({ ...prev, reference_photos: [...prev.reference_photos, response.data.url] }));
      } catch (err) { setError('Nepodařilo se nahrát fotografii'); }
    }
    setUploadingRef(false);
  };

  const removeRefPhoto = (index) => {
    setFormData(prev => ({ ...prev, reference_photos: prev.reference_photos.filter((_, i) => i !== index) }));
  };

  const handleAresLookup = async () => {
    if (!formData.ico || formData.ico.length < 7) { setError('Zadejte platné IČ (min. 7 číslic)'); return; }
    setAresLoading(true); setError('');
    try {
      const response = await axios.get(`${API}/ares/${formData.ico}`);
      const data = response.data;
      setFormData(prev => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        dic: data.dic || prev.dic,
        address: data.address || prev.address
      }));
    } catch (err) { setError(err.response?.data?.detail || 'Nepodařilo se načíst údaje z ARES'); }
    finally { setAresLoading(false); }
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category) ? prev.categories.filter(c => c !== category) : [...prev.categories, category]
    }));
  };

  const handleAddCustomCategory = async () => {
    const cat = customCatInput.trim();
    if (!cat || formData.custom_categories.includes(cat)) return;
    setFormData(prev => ({ ...prev, custom_categories: [...prev.custom_categories, cat] }));
    try {
      await axios.post(`${API}/categories/suggest`, { name: cat }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error('Suggest error:', e); }
    setCustomCatInput('');
  };

  const handleSaveProfile = async () => {
    setSaving(true); setError('');
    try {
      const response = await axios.put(`${API}/users/profile`, formData, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(prev => ({ ...prev, ...response.data }));
      setEditing(false);
    } catch (err) { setError('Nepodařilo se uložit profil'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (<div className="min-h-screen bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>);
  }

  if (!profile) {
    return (<div className="min-h-screen bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center">
      <div className="text-center"><p className="text-zinc-500 mb-4">Uživatel nenalezen</p>
        <button onClick={() => navigate(-1)} className="text-orange-500 hover:text-orange-600">Zpět</button>
      </div>
    </div>);
  }

  const getRoleName = (role) => ({ customer: 'Zákazník', supplier: 'Dodavatel', admin: 'Administrátor' }[role] || role);
  const getTypeName = (type) => ({ osvc: 'OSVČ', nepodnikatel: 'Nepodnikatel', company: 'Firma' }[type] || type);

  const getImageUrl = (url) => {
    if (!url || url === 'None' || url === 'null') return null;
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/api/') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    return `${API.replace('/api', '')}${path}`;
  };

  const accountType = profile.account_type || profile.supplier_type;
  const isCustomer = profile.role === 'customer';
  const isSupplier = profile.role === 'supplier' || profile.role === 'customer_supplier';
  const isNepodnikatel = accountType === 'nepodnikatel' || (isCustomer && !isSupplier && accountType !== 'osvc' && accountType !== 'company');

  const profileImageUrl = getImageUrl(editing ? formData.profile_image : profile.profile_image);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" data-testid="back-btn">
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Craft</span>
              <span className="text-xl font-bold tracking-tight text-orange-500" style={{ fontFamily: 'Outfit' }}>Bolt</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Profile Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              {profileImageUrl ? (
                <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-100 dark:border-orange-800/40">
                  <img src={profileImageUrl} alt="Profil" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-500/15 rounded-xl flex items-center justify-center">
                  <User className="w-12 h-12 text-orange-500" />
                </div>
              )}
              {isOwnProfile && editing && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPhotoMenu(!showPhotoMenu); }}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors"
                    data-testid="profile-upload-photo-btn"
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : <Camera weight="fill" className="w-4 h-4 text-white" />}
                  </button>
                  {showPhotoMenu && !uploadingPhoto && (
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50 w-48" data-testid="profile-photo-menu-popup">
                      <button
                        type="button"
                        onClick={() => { cameraInputRef.current?.click(); setShowPhotoMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 transition-colors"
                        data-testid="profile-photo-menu-camera"
                      >
                        <Camera className="w-4 h-4 text-orange-500" />
                        Vyfotit
                      </button>
                      <button
                        type="button"
                        onClick={() => { galleryInputRef.current?.click(); setShowPhotoMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 transition-colors border-t border-zinc-200/80 dark:border-zinc-800"
                        data-testid="profile-photo-menu-gallery"
                      >
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        Vybrat z galerie
                      </button>
                    </div>
                  )}
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp,image/tiff,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                </>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1" style={{ fontFamily: 'Outfit' }}>
                    {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.company_name || profile.email}
                  </h1>
                  {profile.company_name && (profile.first_name || profile.last_name) && (
                    <p className="text-sm text-zinc-500 mb-1">{profile.company_name}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-zinc-500 flex-wrap">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs font-medium">{getRoleName(profile.role)}</span>
                    {accountType && <span className="px-2 py-1 bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 rounded-md text-xs font-medium">{getTypeName(accountType)}</span>}
                    {profile.is_verified && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Check weight="bold" className="w-4 h-4" />Ověřeno</span>}
                  </div>
                </div>
                {isOwnProfile && !editing && (
                  <button onClick={() => setEditing(true)} className="p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" data-testid="edit-profile-btn">
                    <PencilSimple className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                )}
              </div>
              {isSupplier && (
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star weight="fill" className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold">{profile.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm">({profile.reviews_count || 0} hodnocení)</span>
                  </div>
                  {/* Percentage rating */}
                  <div className="flex items-center gap-2" data-testid="rating-percentage-display">
                    <div className="w-24 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${
                        (profile.rating_percentage || 0) >= 80 ? 'bg-emerald-500' : (profile.rating_percentage || 0) >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`} style={{ width: `${profile.rating_percentage || 0}%` }} />
                    </div>
                    <span className={`font-semibold text-sm ${
                      (profile.rating_percentage || 0) >= 80 ? 'text-green-600' : (profile.rating_percentage || 0) >= 50 ? 'text-orange-500' : 'text-red-500'
                    }`}>{(profile.rating_percentage || 0).toFixed(0)}%</span>
                  </div>
                  {/* Punctuality score */}
                  {profile.punctuality_score != null && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full" data-testid="punctuality-score-badge">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm font-semibold ${
                        profile.punctuality_score >= 80 ? 'text-blue-600' : profile.punctuality_score >= 50 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {profile.punctuality_score.toFixed(0)}% dochvilnost
                      </span>
                    </div>
                  )}
                  {/* Trust score (admin-set) */}
                  {profile.trust_score > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-full" data-testid="trust-score-badge">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} weight={i < profile.trust_score ? 'fill' : 'regular'} className={`w-3.5 h-3.5 ${i < profile.trust_score ? 'text-yellow-500' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-xs text-yellow-700 ml-1 font-medium">Ověřeno</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div className="mb-6 p-4 bg-red-500/5 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm">{error}</div>}

        {editing ? (
          /* ========= EDIT MODE ========= */
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-4" style={{ fontFamily: 'Outfit' }}>Osobní údaje</h2>
              <div className="space-y-4">
                {/* IČ + ARES — for OSVČ/firma */}
                {!isNepodnikatel && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">IČ</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.ico} onChange={(e) => setFormData(prev => ({ ...prev, ico: e.target.value }))}
                        placeholder="12345678" className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-ico-input" />
                      <button type="button" onClick={handleAresLookup} disabled={aresLoading || !formData.ico}
                        className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap" data-testid="profile-ares-btn">
                        {aresLoading ? <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-gray-600"></div> : <MagnifyingGlass className="w-3.5 h-3.5" />}
                        ARES
                      </button>
                    </div>
                  </div>
                )}

                {/* DIČ */}
                {!isNepodnikatel && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">DIČ</label>
                    <input type="text" value={formData.dic} onChange={(e) => setFormData(prev => ({ ...prev, dic: e.target.value }))}
                      placeholder="CZ12345678" className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-dic-input" />
                  </div>
                )}

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Jméno</label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Jan" className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-first-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Příjmení</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Novák" className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-last-name-input" />
                  </div>
                </div>

                {/* Company name - only for non-nepodnikatel */}
                {!isNepodnikatel && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název firmy</label>
                    <input type="text" value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Firma s.r.o." className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-company-input" />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefon</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+420 xxx xxx xxx" className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-phone-input" />
                  <label className="flex items-center gap-3 mt-3 cursor-pointer" data-testid="edit-sms-toggle">
                    <div className="relative" onClick={() => setFormData(prev => ({ ...prev, sms_notifications: !prev.sms_notifications }))}>
                      <div className={`w-11 h-6 rounded-full transition-colors ${formData.sms_notifications ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.sms_notifications ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Chci dostávat notifikační SMS</span>
                  </label>
                </div>

                {/* Email readonly */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-mail</label>
                  <input type="email" value={profile.email} readOnly className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500" data-testid="edit-email-readonly" />
                </div>

                {/* Nepodnikatel customer: trvalý pobyt, skutečná adresa, datum narození */}
                {isNepodnikatel && isCustomer && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Trvalý pobyt</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input type="text" value={formData.permanent_address} onChange={(e) => setFormData(prev => ({ ...prev, permanent_address: e.target.value }))}
                          placeholder="Ulice, PSČ Město" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-permanent-address-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Skutečná adresa bydliště</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input type="text" value={formData.actual_address} onChange={(e) => setFormData(prev => ({ ...prev, actual_address: e.target.value }))}
                          placeholder="Pokud se liší od trvalého pobytu" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-actual-address-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Datum narození</label>
                      <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-dob-input" />
                    </div>
                  </>
                )}

                {/* OSVČ/firma: sídlo, pobočka */}
                {!isNepodnikatel && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Sídlo</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Ulice, PSČ Město" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-address-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Pobočka</label>
                      <div className="relative">
                        <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input type="text" value={formData.branch_address} onChange={(e) => setFormData(prev => ({ ...prev, branch_address: e.target.value }))}
                          placeholder="Adresa pobočky" className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-branch-input" />
                      </div>
                    </div>
                  </>
                )}

                {/* Supplier: website */}
                {isSupplier && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Webová stránka</label>
                    <input type="url" value={formData.website} onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://www.vase-firma.cz" className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="edit-website-input" />
                  </div>
                )}

                {/* Bio — for all */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">O mně / O firmě</label>
                  <textarea value={formData.bio} onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Napište pár slov o sobě nebo o vaší firmě..."
                    rows={3} className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none" data-testid="edit-bio-input" />
                </div>

                {/* Trust message for customers */}
                {isCustomer && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm text-blue-700">
                      Vyplněním všech polí a vložením fotografie bude váš profil důvěryhodnější a lépe tak najdete svého dodavatele.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Supplier: Reference Photos */}
            {isSupplier && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
                <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Referenční fotografie (max 20)</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.reference_photos.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                      <img src={getImageUrl(url)} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeRefPhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`remove-ref-photo-${i}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {formData.reference_photos.length < 20 && (
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="upload-ref-photo-btn">
                      {uploadingRef ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div> : (
                        <><Plus className="w-5 h-5 text-zinc-400" /><span className="text-[10px] text-zinc-400 mt-1">Přidat</span></>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp,image/tiff,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff" multiple onChange={handleRefPhotoUpload} className="hidden" disabled={uploadingRef} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-zinc-400">Nahráno: {formData.reference_photos.length}/20</p>
              </div>
            )}

            {/* Supplier: Categories */}
            {isSupplier && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
                <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Kategorie služeb</h2>
                {/* Selected categories as tags */}
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.categories.map((cat) => (
                      <span key={cat} className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-xs font-medium flex items-center gap-1.5">
                        {cat}
                        <button type="button" onClick={() => handleCategoryToggle(cat)} className="hover:text-orange-200 transition-colors">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-zinc-500 mb-2">Vybráno: {formData.categories.length}</p>
                {/* Search input */}
                <input type="text" value={catSearch} onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Hledat kategorii..." className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 mb-2" data-testid="category-search-input" />
                <div className="max-h-56 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-1">
                  {(() => {
                    const searchLower = catSearch.toLowerCase();
                    const hasGroups = Object.keys(groupedCategories).length > 0;
                    const entries = hasGroups
                      ? Object.entries(groupedCategories).map(([g, items]) => [g, catSearch ? items.filter(c => c.toLowerCase().includes(searchLower)) : items]).filter(([, items]) => items.length > 0)
                      : [['', catSearch ? categories.filter(c => c.toLowerCase().includes(searchLower)) : categories]];
                    const total = entries.reduce((s, [, items]) => s + items.length, 0);
                    if (total === 0) return <p className="text-sm text-zinc-400 text-center py-2">Žádná kategorie nenalezena</p>;
                    return entries.map(([group, items]) => (
                      <div key={group || 'all'}>
                        {group && (
                          <div className="sticky top-0 bg-white z-10 px-2 py-1.5 border-b border-zinc-200/80 dark:border-zinc-800 mb-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{group}</span>
                          </div>
                        )}
                        {items.map((category) => (
                          <button key={category} type="button" onClick={() => handleCategoryToggle(category)}
                            className={`w-full p-2 rounded-lg text-left text-sm transition-all flex items-center justify-between ${
                              formData.categories.includes(category) ? 'bg-orange-500 text-white' : 'bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`} data-testid={`profile-cat-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                            {category}
                            {formData.categories.includes(category) && <Check weight="bold" className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    ));
                  })()}
                </div>

                {/* Custom category */}
                <div className="mt-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Navrhněte vlastní kategorii:</label>
                  <div className="flex gap-2">
                    <input type="text" value={customCatInput} onChange={(e) => setCustomCatInput(e.target.value)}
                      placeholder="Název kategorie" className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white" data-testid="profile-custom-cat-input"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory(); } }} />
                    <button type="button" onClick={handleAddCustomCategory} className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium" data-testid="profile-add-custom-cat-btn">Přidat</button>
                  </div>
                  {formData.custom_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.custom_categories.map((cat) => (
                        <span key={cat} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center gap-1">
                          {cat}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, custom_categories: prev.custom_categories.filter(c => c !== cat) }))} className="hover:text-red-500">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Areas Map - all roles */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">
                {isSupplier ? 'Oblast působení' : 'Místa zájmu'}
              </h2>
              <p className="text-sm text-zinc-500 mb-3">
                {isSupplier 
                  ? 'Klikněte na mapu a označte oblasti, kde nabízíte své služby.'
                  : 'Klikněte na mapu a označte místa, kde hledáte řemeslníky.'}
              </p>
              <ServiceAreaMap areas={formData.service_areas} onChange={(areas) => setFormData(prev => ({ ...prev, service_areas: areas }))} />
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3">
              <button onClick={() => { setEditing(false); setError(''); }} className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50" data-testid="cancel-edit-btn">Zrušit</button>
              <button onClick={handleSaveProfile} disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl disabled:opacity-50" data-testid="save-profile-btn">
                {saving ? 'Ukládání...' : 'Uložit změny'}
              </button>
            </div>
          </div>
        ) : (
          /* ========= VIEW MODE ========= */
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Informace</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Phone className="w-5 h-5 text-zinc-400 flex-shrink-0" />{profile.phone || '-'}</div>
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Envelope className="w-5 h-5 text-zinc-400 flex-shrink-0" />{profile.email}</div>
                {profile.ico && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Briefcase className="w-5 h-5 text-zinc-400 flex-shrink-0" />IČ: {profile.ico}</div>}
                {profile.dic && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Briefcase className="w-5 h-5 text-zinc-400 flex-shrink-0" />DIČ: {profile.dic}</div>}
                {profile.address && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />Sídlo: {profile.address}</div>}
                {profile.branch_address && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Buildings className="w-5 h-5 text-zinc-400 flex-shrink-0" />Pobočka: {profile.branch_address}</div>}
                {profile.permanent_address && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />Trvalý pobyt: {profile.permanent_address}</div>}
                {profile.actual_address && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />Bydliště: {profile.actual_address}</div>}
                {profile.date_of_birth && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Calendar className="w-5 h-5 text-zinc-400 flex-shrink-0" />Nar.: {new Date(profile.date_of_birth).toLocaleDateString('cs-CZ')}</div>}
                {profile.website && <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Globe className="w-5 h-5 text-zinc-400 flex-shrink-0" /><a href={profile.website} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">{profile.website}</a></div>}
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400"><Calendar className="w-5 h-5 text-zinc-400 flex-shrink-0" />Registrován: {new Date(profile.created_at).toLocaleDateString('cs-CZ')}</div>
              </div>
              {profile.bio && (
                <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">O mně / O firmě</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Categories */}
            {isSupplier && (profile.categories?.length > 0 || profile.custom_categories?.length > 0) && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
                <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Kategorie služeb</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.categories?.map((cat) => (
                    <span key={cat} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-700 dark:text-zinc-300">{cat}</span>
                  ))}
                  {profile.custom_categories?.map((cat) => (
                    <span key={cat} className="px-3 py-1.5 bg-orange-100 rounded-full text-sm text-orange-700">{cat}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Photos */}
            {isSupplier && profile.reference_photos?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 lg:col-span-2">
                <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Reference ({profile.reference_photos.length})</h2>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {profile.reference_photos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                      <img src={getImageUrl(url)} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Areas Map - View Mode */}
            {profile.service_areas?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 lg:col-span-2" data-testid="service-areas-view">
                <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">
                  {isSupplier ? 'Oblast působení' : 'Místa zájmu'} ({profile.service_areas.length})
                </h2>
                <ServiceAreaMapView areas={profile.service_areas} />
              </div>
            )}

            {/* Certifications */}
            {isSupplier && (
              <CertificationsSection 
                userId={userId}
                isOwnProfile={isOwnProfile}
                token={token}
              />
            )}
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 mt-6">
            <h2 className="font-semibold text-zinc-900 dark:text-white mb-4">Hodnocení ({reviews.length})</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-zinc-200/80 dark:border-zinc-800 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} weight={star <= review.rating ? 'fill' : 'regular'} className={`w-4 h-4 ${star <= review.rating ? 'text-orange-500' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    {review.rating_percentage != null && (
                      <span className={`text-sm font-semibold ${review.rating_percentage >= 80 ? 'text-green-600' : review.rating_percentage >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {review.rating_percentage}%
                      </span>
                    )}
                    <span className="text-sm text-zinc-500">{review.reviewer_name}</span>
                    <span className="text-sm text-zinc-400">{new Date(review.created_at).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CertificationsSection = ({ userId, isOwnProfile, token }) => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [certName, setCertName] = useState('');
  const [certDesc, setCertDesc] = useState('');

  const getFileUrl = (url) => {
    if (!url || url === 'None' || url === 'null') return null;
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/api/') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    return `${API.replace('/api', '')}${path}`;
  };
  useEffect(() => {
    fetchCerts();
  }, [userId]);

  const fetchCerts = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}/certifications`);
      setCerts(res.data.certifications || []);
    } catch (err) {
      console.error('Failed to load certifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCert = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!certName.trim()) {
      alert('Zadejte název certifikace');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await axios.post(`${API}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      await axios.post(`${API}/users/certifications`, {
        name: certName.trim(),
        description: certDesc.trim() || null,
        file_url: uploadRes.data.url
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCertName('');
      setCertDesc('');
      setShowAdd(false);
      fetchCerts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Nepodařilo se nahrát certifikaci');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (certId) => {
    if (!window.confirm('Opravdu chcete odebrat tuto certifikaci?')) return;
    try {
      await axios.delete(`${API}/users/certifications/${certId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCerts();
    } catch (err) {
      alert('Nepodařilo se odstranit certifikaci');
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 lg:col-span-2" data-testid="certifications-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900 dark:text-white">
          Certifikace a oprávnění ({certs.length})
        </h2>
        {isOwnProfile && (
          <button onClick={() => setShowAdd(!showAdd)} className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1" data-testid="add-cert-btn">
            <Plus className="w-4 h-4" /> Přidat
          </button>
        )}
      </div>

      {/* Add certification form */}
      {showAdd && (
        <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3" data-testid="add-cert-form">
          <input type="text" value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="Název certifikace *"
            className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
            data-testid="cert-name-input" />
          <input type="text" value={certDesc} onChange={(e) => setCertDesc(e.target.value)} placeholder="Popis (volitelný)"
            className="w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
            data-testid="cert-desc-input" />
          <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <Plus className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-orange-600 font-medium">{uploading ? 'Nahrávání...' : 'Vybrat soubor'}</span>
            <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" onChange={handleUploadCert} className="hidden" disabled={uploading || !certName.trim()} data-testid="cert-file-input" />
          </label>
        </div>
      )}

      {certs.length === 0 ? (
        <p className="text-sm text-zinc-400">Žádné certifikace zatím nebyly nahrány</p>
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <div key={cert.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl" data-testid={`cert-item-${cert.id}`}>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{cert.name}</p>
                {cert.description && <p className="text-xs text-zinc-500 truncate">{cert.description}</p>}
                <p className="text-xs text-zinc-400">{new Date(cert.uploaded_at).toLocaleDateString('cs-CZ')}</p>
              </div>
              {cert.verified && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ověřeno
                </span>
              )}
              {cert.file_url && (
                <a href={getFileUrl(cert.file_url)} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-600 text-xs font-medium">
                  Zobrazit
                </a>
              )}
              {isOwnProfile && (
                <button onClick={() => handleDelete(cert.id)} className="text-zinc-400 hover:text-red-500" data-testid={`delete-cert-${cert.id}`}>
                  <Trash className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
