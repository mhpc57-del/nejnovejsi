import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { API } from '../App';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Eye, EyeSlash, ArrowLeft, ArrowRight, User, Briefcase, 
  Buildings, UserCircle, Check, MapPin, Camera, MagnifyingGlass, X, Image as ImageIcon, Plus, Trash, MapTrifold
} from '@phosphor-icons/react';
import ThemeToggle from '../components/ThemeToggle';
import CraftBoltLogo from '../components/CraftBoltLogo';

// Leaflet marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

// Interactive map for selecting service areas during registration
const RegServiceAreaMap = ({ areas, onChange }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circlesRef = useRef([]);
  const radiusRef = useRef(20);
  const selectedRef = useRef(null);
  const [radius, setRadius] = useState(20);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [49.8175, 15.4730], zoom: 7 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    if (areas?.length > 0) {
      areas.forEach((area, idx) => addCircle(map, area, idx));
    }

    map.on('click', (e) => {
      const r = radiusRef.current;
      const newArea = { lat: e.latlng.lat, lng: e.latlng.lng, radius_km: r };
      const idx = circlesRef.current.length;
      addCircle(map, newArea, idx);
      onChange(circlesRef.current.map(c => c.data));
      doSelect(idx);
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstanceRef.current = null; circlesRef.current = []; };
  }, []);

  const addCircle = (map, area, idx) => {
    const circle = L.circle([area.lat, area.lng], {
      radius: (area.radius_km || 20) * 1000,
      color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 2
    }).addTo(map);
    circle.on('click', (e) => { L.DomEvent.stopPropagation(e); doSelect(idx); });
    circlesRef.current.push({ circle, data: area });
  };

  const doSelect = (idx) => {
    circlesRef.current.forEach((c, i) => {
      c.circle.setStyle({ color: i === idx ? '#ea580c' : '#f97316', weight: i === idx ? 3 : 2, fillOpacity: i === idx ? 0.25 : 0.15 });
    });
    selectedRef.current = idx;
    setSelectedIdx(idx);
    if (circlesRef.current[idx]) {
      const r = circlesRef.current[idx].data.radius_km || 20;
      setRadius(r);
      radiusRef.current = r;
    }
  };

  const handleRadiusChange = (val) => {
    setRadius(val);
    radiusRef.current = val;
    const idx = selectedRef.current;
    if (idx !== null && circlesRef.current[idx]) {
      circlesRef.current[idx].circle.setRadius(val * 1000);
      circlesRef.current[idx].data = { ...circlesRef.current[idx].data, radius_km: val };
      onChange(circlesRef.current.map(c => c.data));
    }
  };

  const removeSelected = () => {
    const idx = selectedRef.current;
    if (idx === null || !circlesRef.current[idx]) return;
    mapInstanceRef.current.removeLayer(circlesRef.current[idx].circle);
    circlesRef.current.splice(idx, 1);
    selectedRef.current = null;
    setSelectedIdx(null);
    onChange(circlesRef.current.map(c => c.data));
  };

  const clearAll = () => {
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
          className="flex-1 accent-orange-500" data-testid="reg-radius-slider" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-14 text-right">{radius} km</span>
      </div>
      <div ref={mapRef} style={{ height: '300px', width: '100%' }} className="rounded-xl border border-zinc-200 dark:border-zinc-700" data-testid="reg-service-area-map" />
      <div className="flex gap-2 mt-2">
        {selectedIdx !== null && (
          <button type="button" onClick={removeSelected}
            className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100" data-testid="reg-remove-selected-area">
            Odebrat vybranou
          </button>
        )}
        <button type="button" onClick={clearAll}
          className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50" data-testid="reg-clear-areas">
          Smazat vše
        </button>
      </div>
      <p className="text-xs text-zinc-400 mt-1">Klikněte na mapu pro přidání oblasti. Klikněte na kruh pro úpravu poloměru.</p>
    </div>
  );
};

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState({});
  const [aresLoading, setAresLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const galleryInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    password: '',
    phone: '',
    sms_notifications: false,
    role: searchParams.get('role') || '',
    account_type: searchParams.get('type') || '',
    has_ico: null,
    company_name: '',
    first_name: '',
    last_name: '',
    ico: '',
    dic: '',
    address: '',
    branch_address: '',
    branch_addresses: [],
    branch_address_input: '',
    permanent_address: '',
    actual_address: '',
    date_of_birth: '',
    profile_image: '',
    bio: '',
    website: '',
    categories: [],
    custom_categories: [],
    custom_category_input: '',
    preferred_languages: [],
    service_areas: [],
    reference_photos: []
  });

  const claimDemandId = searchParams.get('claim_demand');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState({});
  const [activeAddressField, setActiveAddressField] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [permanentCoords, setPermanentCoords] = useState(null);
  const [actualCoords, setActualCoords] = useState(null);
  const searchTimers = React.useRef({});

  const handleAddressInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setActiveAddressField(name);
    
    // Clear old timer
    if (searchTimers.current[name]) clearTimeout(searchTimers.current[name]);
    
    if (!value || value.length < 3) {
      setAddressSuggestions(prev => ({ ...prev, [name]: [] }));
      return;
    }
    
    searchTimers.current[name] = setTimeout(async () => {
      try {
        const response = await axios.get(`${API}/geocode/search`, { params: { q: value } });
        setAddressSuggestions(prev => ({ ...prev, [name]: Array.isArray(response.data) ? response.data : [] }));
      } catch (err) {
        console.error('Geocode search error:', err);
      }
    }, 800);
  };

  const selectAddress = (suggestion, fieldName) => {
    const displayName = suggestion.display_name;
    setFormData(prev => ({ ...prev, [fieldName]: displayName }));
    setAddressSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    setActiveAddressField(null);
    if (suggestion.lat && suggestion.lon) {
      const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];
      setMapCenter(coords);
      if (fieldName === 'permanent_address') setPermanentCoords(coords);
      if (fieldName === 'actual_address') setActualCoords(coords);
    }
  };

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleAddCustomCategory = async () => {
    const cat = formData.custom_category_input.trim();
    if (!cat) return;
    if (formData.custom_categories.includes(cat)) return;
    setFormData(prev => ({
      ...prev,
      custom_categories: [...prev.custom_categories, cat],
      custom_category_input: ''
    }));
  };

  const handleRemoveCustomCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      custom_categories: prev.custom_categories.filter(c => c !== cat)
    }));
  };

  const handleAresLookup = async () => {
    if (!formData.ico || formData.ico.length < 7) {
      setError('Zadejte platné IČ (min. 7 číslic)');
      return;
    }
    setAresLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/ares/${formData.ico}`);
      const data = response.data;
      setFormData(prev => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        dic: data.dic || prev.dic,
        address: data.address || prev.address
      }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se načíst údaje z ARES');
    } finally {
      setAresLoading(false);
    }
  };

  // Compress image before upload (avoids proxy size limits on production)
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 25 * 1024 * 1024) {
      setError(`Soubor je příliš velký (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      return;
    }
    
    setUploadingPhoto(true);
    setError('');
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const response = await axios.post(`${API}/upload/public`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, profile_image: response.data.url }));
    } catch (err) {
      const detail = err.response?.data?.detail || 'Nepodařilo se nahrát fotografii. Zkuste jiný formát (JPEG, PNG).';
      setError(detail);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Reference photo upload during registration (public endpoint, no auth)
  const handleRefPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (formData.reference_photos.length + files.length > 20) {
      setError('Maximálně 20 referenčních fotografií');
      return;
    }
    setUploadingRef(true);
    setError('');
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        setError(`Soubor ${file.name} je příliš velký (max 25 MB).`);
        continue;
      }
      try {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append('file', compressed);
        const response = await axios.post(`${API}/upload/public`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({ ...prev, reference_photos: [...prev.reference_photos, response.data.url] }));
      } catch (err) {
        setError('Nepodařilo se nahrát fotografii. Zkuste jiný formát.');
      }
    }
    setUploadingRef(false);
  };

  const removeRefPhoto = (index) => {
    setFormData(prev => ({ ...prev, reference_photos: prev.reference_photos.filter((_, i) => i !== index) }));
  };

  // Determine steps based on role + IČ choice
  const getSteps = () => {
    const base = ['basic', 'role', 'ico_choice'];
    if (formData.has_ico === true) {
      base.push('ico_type');
    }
    base.push('details');
    if (formData.role === 'supplier') {
      base.push('categories');
      base.push('service_areas');
      base.push('portfolio');
    }
    return base;
  };

  const steps = getSteps();

  const validateStep = () => {
    setError('');
    const step = steps[currentStep];
    switch (step) {
      case 'basic':
        if (!formData.email || !formData.password) { setError('Vyplňte e-mail a heslo'); return false; }
        if (formData.password.length < 6) { setError('Heslo musí mít alespoň 6 znaků'); return false; }
        break;
      case 'role':
        if (!formData.role) { setError('Vyberte prosím roli'); return false; }
        break;
      case 'ico_choice':
        if (formData.has_ico === null) { setError('Vyberte prosím jednu z možností'); return false; }
        break;
      case 'ico_type':
        if (!formData.account_type) { setError('Vyberte prosím typ subjektu'); return false; }
        break;
      case 'details':
        if (formData.has_ico) {
          if (!formData.ico) { setError('Vyplňte IČ'); return false; }
          if (!formData.address) { setError('Vyplňte adresu sídla'); return false; }
        } else {
          if (!formData.first_name || !formData.last_name) { setError('Vyplňte jméno a příjmení'); return false; }
        }
        if (!formData.phone) { setError('Vyplňte telefonní číslo'); return false; }
        break;
      case 'categories':
        if (formData.categories.length === 0 && formData.custom_categories.length === 0) {
          setError('Vyberte alespoň jednu kategorii nebo navrhněte vlastní');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const submitData = { ...formData };
      // Remove frontend-only fields
      delete submitData.custom_category_input;
      delete submitData.has_ico;
      delete submitData.branch_address_input;
      // Set account_type for Nemám IČ
      if (formData.has_ico === false) {
        submitData.account_type = 'nepodnikatel';
      }
      // Clean up empty optional arrays to avoid validation issues
      if (!submitData.preferred_languages || submitData.preferred_languages.length === 0) {
        submitData.preferred_languages = [];
      }
      if (!submitData.branch_addresses || submitData.branch_addresses.length === 0) {
        submitData.branch_addresses = [];
      }
      if (!submitData.categories) submitData.categories = [];
      if (!submitData.custom_categories) submitData.custom_categories = [];
      if (!submitData.reference_photos) submitData.reference_photos = [];
      if (!submitData.service_areas) submitData.service_areas = [];
      
      await register(submitData);
      
      // Show verification screen
      setRegisteredEmail(formData.email);
      setRegistrationComplete(true);
    } catch (err) {
      console.error('Registration error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', '));
      } else {
        setError('Registrace se nezdařila. Zkontrolujte prosím vyplněné údaje.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await axios.post(`${API}/auth/resend-verification`, { email: registeredEmail });
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se odeslat email');
    } finally {
      setResending(false);
    }
  };

  const handleAddBranchAddress = () => {
    const addr = formData.branch_address_input?.trim();
    if (!addr) return;
    setFormData(prev => ({
      ...prev,
      branch_addresses: [...prev.branch_addresses, addr],
      branch_address_input: ''
    }));
  };

  const handleRemoveBranchAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      branch_addresses: prev.branch_addresses.filter((_, i) => i !== index)
    }));
  };

  const toggleLanguage = (lang) => {
    setFormData(prev => ({
      ...prev,
      preferred_languages: prev.preferred_languages.includes(lang)
        ? prev.preferred_languages.filter(l => l !== lang)
        : [...prev.preferred_languages, lang]
    }));
  };

  const getImageUrl = (url) => {
    if (!url || url === 'None' || url === 'null') return null;
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/api/') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    return `${API.replace('/api', '')}${path}`;
  };

  const renderStep = () => {
    const step = steps[currentStep];
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-mail <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                placeholder="vas@email.cz"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-email-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Heslo <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                  placeholder="Minimálně 6 znaků"
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-12"
                  data-testid="register-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400">
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'role':
        return (
          <div className="space-y-4">
            {/* Zákazník */}
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'customer', account_type: '', has_ico: null }))}
              className={`w-full p-5 border-2 rounded-xl text-left transition-all ${formData.role === 'customer' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
              data-testid="role-customer-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === 'customer' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <User weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Zákazník</h3>
                  <p className="text-sm text-zinc-500">Hledám řemeslníky a služby</p>
                </div>
                <span className="text-sm font-bold text-green-600">ZDARMA</span>
                {formData.role === 'customer' && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>

            {/* Dodavatel - měsíční */}
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'supplier', billing_period: 'monthly', account_type: '', has_ico: null }))}
              className={`w-full p-5 border-2 rounded-xl text-left transition-all ${formData.role === 'supplier' && formData.billing_period === 'monthly' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
              data-testid="role-supplier-monthly-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === 'supplier' && formData.billing_period === 'monthly' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <Briefcase weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Dodavatel — měsíční</h3>
                  <p className="text-sm text-zinc-500">Nabízím své služby</p>
                </div>
                <span className="text-sm font-bold text-orange-500">190 Kč/měsíc</span>
                {formData.role === 'supplier' && formData.billing_period === 'monthly' && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>

            {/* Dodavatel - roční */}
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, role: 'supplier', billing_period: 'annual', account_type: '', has_ico: null }))}
              className={`w-full p-5 border-2 rounded-xl text-left transition-all ${formData.role === 'supplier' && formData.billing_period === 'annual' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
              data-testid="role-supplier-annual-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === 'supplier' && formData.billing_period === 'annual' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <Briefcase weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Dodavatel — roční</h3>
                  <p className="text-sm text-zinc-500">Nabízím své služby</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-orange-500">1 890 Kč/rok</span>
                  <p className="text-xs text-green-600 font-semibold">ušetříte 390 Kč</p>
                </div>
                {formData.role === 'supplier' && formData.billing_period === 'annual' && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>
            <p className="text-xs text-zinc-400 text-center mt-2">Všechny ceny jsou uvedeny včetně 21% DPH.</p>
          </div>
        );

      case 'ico_choice':
        return (
          <div className="space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Podnikáte nebo máte IČ?</p>
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, has_ico: false, account_type: 'nepodnikatel' }))}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.has_ico === false ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:border-zinc-600'}`}
              data-testid="ico-no-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.has_ico === false ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <User weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Nemám IČ</h3>
                  <p className="text-sm text-zinc-500">Fyzická osoba nepodnikající</p>
                </div>
                {formData.has_ico === false && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, has_ico: true, account_type: '' }))}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.has_ico === true ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:border-zinc-600'}`}
              data-testid="ico-yes-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.has_ico === true ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                  <Briefcase weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Mám IČ</h3>
                  <p className="text-sm text-zinc-500">OSVČ nebo firma</p>
                </div>
                {formData.has_ico === true && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>
          </div>
        );

      case 'ico_type':
        return (
          <div className="space-y-4">
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Jaký je váš typ podnikání?</p>
            {[
              { value: 'osvc', label: 'OSVČ', desc: 'Fyzická osoba podnikající', Icon: UserCircle },
              { value: 'company', label: 'Firma / Organizace', desc: 'Právnická osoba', Icon: Buildings },
            ].map(({ value, label, desc, Icon }) => (
              <button key={value} type="button"
                onClick={() => setFormData(prev => ({ ...prev, account_type: value }))}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.account_type === value ? 'border-orange-500 bg-orange-50' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:border-zinc-600'}`}
                data-testid={`type-${value}-btn`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.account_type === value ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                    <Icon weight="bold" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{label}</h3>
                    <p className="text-sm text-zinc-500">{desc}</p>
                  </div>
                  {formData.account_type === value && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            {/* Profile photo */}
            <div className="flex justify-center mb-2">
              <div className="relative">
                {formData.profile_image ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-200">
                    <img src={(() => { const u = formData.profile_image; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt="Profil" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600">
                    <UserCircle className="w-10 h-10 text-zinc-400" />
                  </div>
                )}
                <label
                  className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors"
                  data-testid="upload-profile-photo-btn"
                >
                  {uploadingPhoto ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  ) : (
                    <Camera weight="fill" className="w-4 h-4 text-white" />
                  )}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
            </div>
            <p className="text-center text-xs text-zinc-400 -mt-2 mb-2">
              Klikněte na ikonu pro nahrání fotografie
              <span className="block text-xs text-zinc-400 mt-1">Max 25 MB, JPEG/PNG. Automaticky zmenšeno na 1200px.</span>
            </p>

            {formData.has_ico ? (
              /* ======= MÁM IČ ======= */
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">IČ <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="text" name="ico" value={formData.ico} onChange={handleInputChange}
                      placeholder="12345678"
                      className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-ico-input" />
                    <button type="button" onClick={handleAresLookup} disabled={aresLoading || !formData.ico}
                      className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      data-testid="ares-lookup-btn">
                      {aresLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-gray-600"></div> : <MagnifyingGlass className="w-4 h-4" />}
                      Načíst z ARES
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Klikněte pro automatické vyplnění údajů</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">DIČ</label>
                  <input type="text" name="dic" value={formData.dic} onChange={handleInputChange}
                    placeholder="CZ12345678"
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="register-dic-input" />
                </div>

                {/* Name (optional for IČ) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Jméno</label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange}
                      placeholder="Jan"
                      className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-first-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Příjmení</label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange}
                      placeholder="Novák"
                      className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-last-name-input" />
                  </div>
                </div>

                {/* Company name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název firmy</label>
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange}
                    placeholder="Firma s.r.o."
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="register-company-input" />
                </div>

                {/* Sídlo (povinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa sídla <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input type="text" name="address" value={formData.address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('address')}
                      placeholder="Začněte psát adresu..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-address-input" />
                  </div>
                  {activeAddressField === 'address' && addressSuggestions.address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-zinc-700 dark:text-zinc-300">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pobočky (nepovinné, více) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa pobočky</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <input type="text" name="branch_address_input" value={formData.branch_address_input || ''}
                        onChange={handleAddressInput}
                        onFocus={() => setActiveAddressField('branch_address_input')}
                        placeholder="Začněte psát adresu pobočky..."
                        autoComplete="off"
                        className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        data-testid="register-branch-input" />
                    </div>
                    <button type="button" onClick={handleAddBranchAddress}
                      className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                      data-testid="add-branch-btn">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {activeAddressField === 'branch_address_input' && addressSuggestions.branch_address_input?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.branch_address_input.map((s, i) => (
                        <button key={i} type="button" onClick={() => {
                          setFormData(prev => ({ ...prev, branch_address_input: s.display_name }));
                          setAddressSuggestions(prev => ({ ...prev, branch_address_input: [] }));
                          setActiveAddressField(null);
                        }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-zinc-700 dark:text-zinc-300">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.branch_addresses.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {formData.branch_addresses.map((addr, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm">
                          <Buildings className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          <span className="flex-1 text-zinc-700 dark:text-zinc-300 truncate">{addr}</span>
                          <button type="button" onClick={() => handleRemoveBranchAddress(i)} className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ======= NEMÁM IČ ======= */
              <>
                {/* Name (povinné) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Jméno <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange}
                      placeholder="Jan"
                      className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-first-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Příjmení <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange}
                      placeholder="Novák"
                      className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-last-name-input" />
                  </div>
                </div>

                {/* Trvalý pobyt (nepovinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa trvalého pobytu</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input type="text" name="permanent_address" value={formData.permanent_address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('permanent_address')}
                      placeholder="Začněte psát adresu..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-permanent-address-input" />
                  </div>
                  {activeAddressField === 'permanent_address' && addressSuggestions.permanent_address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.permanent_address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'permanent_address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                          data-testid={`address-suggestion-${i}`}>
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-zinc-700 dark:text-zinc-300">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {permanentCoords && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-32" data-testid="permanent-address-map">
                      <MapContainer center={permanentCoords} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                        <Marker position={permanentCoords} />
                        <MapUpdater center={permanentCoords} />
                      </MapContainer>
                    </div>
                  )}
                </div>

                {/* Skutečná adresa (nepovinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa skutečného bydliště</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input type="text" name="actual_address" value={formData.actual_address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('actual_address')}
                      placeholder="Pokud se liší od trvalého pobytu"
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-actual-address-input" />
                  </div>
                  {activeAddressField === 'actual_address' && addressSuggestions.actual_address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.actual_address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'actual_address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-zinc-700 dark:text-zinc-300">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {actualCoords && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-32" data-testid="actual-address-map">
                      <MapContainer center={actualCoords} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                        <Marker position={actualCoords} />
                        <MapUpdater center={actualCoords} />
                      </MapContainer>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Phone (povinné for all) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Telefonní číslo <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                placeholder="+420 xxx xxx xxx"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-phone-input" />
              <label className="flex items-center gap-3 mt-3 cursor-pointer" data-testid="register-sms-toggle">
                <div className="relative" onClick={() => setFormData(prev => ({ ...prev, sms_notifications: !prev.sms_notifications }))}>
                  <div className={`w-11 h-6 rounded-full transition-colors ${formData.sms_notifications ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.sms_notifications ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Chci dostávat notifikační SMS</span>
              </label>
            </div>

            {/* Email readonly */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">E-mail <span className="text-red-500">*</span></label>
              <input type="email" value={formData.email} readOnly
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                data-testid="register-email-readonly" />
              <p className="text-xs text-zinc-400 mt-1">Zadáno v prvním kroku</p>
            </div>

            {/* Web (nepovinné for all) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Webová stránka</label>
              <input type="url" name="website" value={formData.website} onChange={handleInputChange}
                placeholder="https://www.vase-stranka.cz"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-website-input" />
            </div>

            {/* Preferred languages */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Preferovaný jazyk</label>
              <div className="flex gap-3">
                {[
                  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
                  { code: 'en', label: 'Angličtina', flag: '🇬🇧' },
                  { code: 'de', label: 'Němčina', flag: '🇩🇪' },
                ].map(lang => (
                  <button key={lang.code} type="button" onClick={() => toggleLanguage(lang.code)}
                    className={`flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      formData.preferred_languages.includes(lang.code)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                    }`}
                    data-testid={`lang-${lang.code}`}>
                    <span>{lang.flag}</span>
                    {lang.label}
                    {formData.preferred_languages.includes(lang.code) && <Check weight="bold" className="w-4 h-4 text-orange-500" />}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-1">Můžete vybrat více jazyků</p>
            </div>

            {/* Bio — for all */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">O mně / O firmě</label>
              <textarea name="bio" value={formData.bio} onChange={handleInputChange}
                placeholder="Napište pár slov o sobě nebo o vaší firmě..."
                rows={3}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                data-testid="register-bio-input" />
            </div>
          </div>
        );

      case 'categories':
        const filterLower = categoryFilter.toLowerCase();
        const hasGroups = Object.keys(groupedCategories).length > 0;
        const groupEntries = hasGroups
          ? Object.entries(groupedCategories).map(([group, items]) => {
              const filtered = filterLower ? items.filter(c => c.toLowerCase().includes(filterLower)) : items;
              return [group, filtered];
            }).filter(([, items]) => items.length > 0)
          : [['', filterLower ? categories.filter(c => c.toLowerCase().includes(filterLower)) : categories]];
        const totalFiltered = groupEntries.reduce((sum, [, items]) => sum + items.length, 0);
        return (
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-3">Vyberte kategorie služeb, které nabízíte:</p>

            {/* Selected categories panel */}
            {formData.categories.length > 0 && (
              <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl" data-testid="selected-categories-panel">
                <p className="text-xs font-medium text-orange-600 mb-2">Vybráno ({formData.categories.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {formData.categories.map((cat) => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500 text-white rounded-lg text-xs font-medium" data-testid={`selected-tag-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
                      {cat}
                      <button type="button" onClick={() => handleCategoryToggle(cat)} className="hover:text-orange-200 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category search filter */}
            <div className="relative mb-3">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input type="text" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filtrovat kategorie..."
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                data-testid="category-filter-input" />
              {categoryFilter && (
                <button type="button" onClick={() => setCategoryFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-1" data-testid="category-list">
              {totalFiltered === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Žádná kategorie nebyla nalezena</p>
              ) : (
                groupEntries.map(([group, items]) => (
                  <div key={group || 'all'}>
                    {group && (
                      <div className="sticky top-0 bg-white z-10 px-2 py-2 border-b border-zinc-200/80 dark:border-zinc-800 mb-1" data-testid={`group-header-${group.toLowerCase()}`}>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{group}</span>
                      </div>
                    )}
                    {items.map((category) => (
                      <button key={category} type="button" onClick={() => handleCategoryToggle(category)}
                        className={`w-full p-2.5 rounded-lg text-left text-sm transition-all flex items-center justify-between ${
                          formData.categories.includes(category) ? 'bg-orange-500 text-white' : 'bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        data-testid={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                        {category}
                        {formData.categories.includes(category) && <Check weight="bold" className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Custom category */}
            <div className="mt-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Chybí vám kategorie? Navrhněte vlastní:</label>
              <div className="flex gap-2">
                <input type="text" name="custom_category_input" value={formData.custom_category_input} onChange={handleInputChange}
                  placeholder="Název kategorie"
                  className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  data-testid="custom-category-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory(); } }} />
                <button type="button" onClick={handleAddCustomCategory}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                  data-testid="add-custom-category-btn">
                  Přidat
                </button>
              </div>
              {formData.custom_categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.custom_categories.map((cat) => (
                    <span key={cat} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm flex items-center gap-1.5">
                      {cat}
                      <button type="button" onClick={() => handleRemoveCustomCategory(cat)} className="hover:text-red-500">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-400 mt-2">Váš návrh bude odeslán ke schválení administrátorovi.</p>
            </div>
          </div>
        );

      case 'service_areas':
        return (
          <div data-testid="reg-step-service-areas">
            <p className="text-zinc-600 dark:text-zinc-400 mb-3">Označte na mapě oblasti, kde nabízíte své služby:</p>
            <RegServiceAreaMap
              areas={formData.service_areas}
              onChange={(areas) => setFormData(prev => ({ ...prev, service_areas: areas }))}
            />
            {formData.service_areas.length > 0 && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl" data-testid="reg-areas-count">
                <p className="text-sm text-orange-700 font-medium">
                  Přidáno oblastí: {formData.service_areas.length}
                </p>
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-2">Tento krok můžete přeskočit a nastavit oblast působení později v profilu.</p>
          </div>
        );

      case 'portfolio':
        return (
          <div data-testid="reg-step-portfolio">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">Nahrajte referenční fotografie vaší práce (max 20, JPEG/PNG, auto-zmenšení na 1200px):</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.reference_photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group" data-testid={`reg-ref-photo-${i}`}>
                  <img src={getImageUrl(url)} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeRefPhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`reg-remove-ref-${i}`}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.reference_photos.length < 20 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="reg-upload-ref-btn">
                  {uploadingRef ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 mt-1">Přidat</span>
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" multiple
                    onChange={handleRefPhotoUpload} className="hidden" disabled={uploadingRef} />
                </label>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-4">Nahráno: {formData.reference_photos.length}/20</p>
            <p className="text-xs text-zinc-400">Tento krok můžete přeskočit a přidat fotografie i certifikace později v profilu.</p>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const step = steps[currentStep];
    const titles = {
      basic: 'Základní údaje',
      role: 'Zvolte typ účtu',
      ico_choice: 'Máte IČ?',
      ico_type: 'Typ podnikání',
      details: 'Údaje o účtu',
      categories: 'Kategorie služeb',
      service_areas: 'Oblast působení',
      portfolio: 'Portfolio a reference'
    };
    return titles[step] || '';
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <CraftBoltLogo size="sm" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Zpět
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {registrationComplete ? (
            /* ========= VERIFICATION SCREEN ========= */
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 p-8 text-center" data-testid="verification-pending-screen">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13L2 4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Ověřte svůj email</h1>
              <p className="text-zinc-500 mb-2">
                Na adresu <strong className="text-zinc-900 dark:text-white">{registeredEmail}</strong> jsme odeslali ověřovací email.
              </p>
              <p className="text-zinc-500 mb-4">
                Klikněte na odkaz v emailu pro dokončení registrace.
              </p>
              
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6" data-testid="spam-warning">
                <p className="text-sm font-semibold text-amber-800 mb-1">Zkontrolujte také složku SPAM / Hromadné</p>
                <p className="text-xs text-amber-700">Ověřovací email může být v některých schránkách automaticky přesunut do spamu. Pokud email nenajdete ve složce Doručené, podívejte se prosím do složky Spam nebo Hromadné a označte odesílatele jako důvěryhodného.</p>
              </div>
              
              {claimDemandId && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6" data-testid="claim-demand-info">
                  <p className="text-sm text-green-700 font-medium">
                    Po ověření emailu bude vaše rychlá poptávka automaticky propojena s vaším novým účtem.
                  </p>
                </div>
              )}
              
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-zinc-500 mb-1">Nedostali jste email?</p>
                <p className="text-xs text-zinc-400 mb-3">Zkontrolujte složku SPAM nebo si nechte email poslat znovu.</p>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="text-orange-500 hover:text-orange-600 font-medium text-sm transition-colors disabled:opacity-50"
                  data-testid="resend-verification-btn"
                >
                  {resending ? 'Odesílám...' : 'Odeslat znovu'}
                </button>
              </div>

              <Link
                to="/prihlaseni"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 text-sm transition-colors"
                data-testid="go-to-login-link"
              >
                <ArrowLeft className="w-4 h-4" />
                Zpět na přihlášení
              </Link>
            </div>
          ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 p-8">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((step, index) => (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index <= currentStep ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {index < currentStep ? <Check weight="bold" className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 rounded-full transition-colors ${index < currentStep ? 'bg-orange-500' : 'bg-zinc-100 dark:bg-zinc-800'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>{getStepTitle()}</h1>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/5 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 text-sm" data-testid="register-error">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              {renderStep()}

              <div className="flex gap-4 mt-8">
                {currentStep > 0 && (
                  <button type="button" onClick={handleBack}
                    className="flex-1 py-3 px-6 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
                    data-testid="register-back-btn">
                    Zpět
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20 text-sm"
                  data-testid="register-next-btn">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Zpracování...
                    </span>
                  ) : (
                    <>
                      {currentStep === steps.length - 1 ? 'Dokončit registraci' : 'Pokračovat'}
                      <ArrowRight weight="bold" className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-zinc-500">
                Už máte účet?{' '}
                <Link to="/prihlaseni" className="text-orange-500 hover:text-orange-600 font-medium" data-testid="login-link">
                  Přihlaste se
                </Link>
              </p>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
