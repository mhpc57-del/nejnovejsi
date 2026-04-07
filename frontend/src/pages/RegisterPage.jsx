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
  Buildings, UserCircle, Check, MapPin, Camera, MagnifyingGlass, X, Image as ImageIcon, Plus
} from '@phosphor-icons/react';
import ThemeToggle from '../components/ThemeToggle';

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

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [aresLoading, setAresLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const galleryInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    password: '',
    phone: '',
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
    preferred_languages: []
  });

  const claimDemandId = searchParams.get('claim_demand');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState({});
  const [activeAddressField, setActiveAddressField] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
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
        setAddressSuggestions(prev => ({ ...prev, [name]: response.data || [] }));
      } catch (err) {
        console.error('Geocode search error:', err);
      }
    }, 400);
  };

  const selectAddress = (suggestion, fieldName) => {
    const displayName = suggestion.display_name;
    setFormData(prev => ({ ...prev, [fieldName]: displayName }));
    setAddressSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    setActiveAddressField(null);
    if (suggestion.lat && suggestion.lon) {
      setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    }
  };

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
      setError('Zadejte platné IČO (min. 7 číslic)');
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size client-side (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError(`Soubor je příliš velký (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      return;
    }
    
    setUploadingPhoto(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Use public upload endpoint (no auth needed during registration)
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

  // Determine steps based on role + IČ choice
  const getSteps = () => {
    const base = ['basic', 'role', 'ico_choice'];
    if (formData.has_ico === true) {
      base.push('ico_type');
    }
    base.push('details');
    if (formData.role === 'supplier' || formData.role === 'customer_supplier') {
      base.push('categories');
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
          if (!formData.ico) { setError('Vyplňte IČO'); return false; }
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

  const renderStep = () => {
    const step = steps[currentStep];
    switch (step) {
      case 'basic':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                placeholder="vas@email.cz"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-email-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Heslo <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                  placeholder="Minimálně 6 znaků"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-12"
                  data-testid="register-password-input" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'role':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Jak chcete platformu používat?</p>
            {[
              { value: 'customer', label: 'Zákazník', desc: 'Hledám řemeslníky a služby', price: '199 Kč/měsíc', Icon: User },
              { value: 'supplier', label: 'Dodavatel', desc: 'Nabízím své služby', price: '299 Kč/měsíc', Icon: Briefcase },
              { value: 'customer_supplier', label: 'Zákazník i dodavatel', desc: 'Hledám i nabízím služby', price: '399 Kč/měsíc', Icon: Buildings },
            ].map(({ value, label, desc, price, Icon }) => (
              <button key={value} type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: value, account_type: '', has_ico: null }))}
                className={`w-full p-5 border-2 rounded-xl text-left transition-all ${formData.role === value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                data-testid={`role-${value}-btn`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon weight="bold" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <span className="text-sm font-medium text-orange-500">{price}</span>
                  {formData.role === value && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        );

      case 'ico_choice':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Podnikáte nebo máte IČO?</p>
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, has_ico: false, account_type: 'nepodnikatel' }))}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.has_ico === false ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              data-testid="ico-no-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.has_ico === false ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <User weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Nemám IČO</h3>
                  <p className="text-sm text-gray-500">Fyzická osoba nepodnikající</p>
                </div>
                {formData.has_ico === false && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, has_ico: true, account_type: '' }))}
              className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.has_ico === true ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              data-testid="ico-yes-btn">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.has_ico === true ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Briefcase weight="bold" className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Mám IČO</h3>
                  <p className="text-sm text-gray-500">OSVČ nebo firma</p>
                </div>
                {formData.has_ico === true && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
              </div>
            </button>
          </div>
        );

      case 'ico_type':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Jaký je váš typ podnikání?</p>
            {[
              { value: 'osvc', label: 'OSVČ', desc: 'Fyzická osoba podnikající', Icon: UserCircle },
              { value: 'company', label: 'Firma / Organizace', desc: 'Právnická osoba', Icon: Buildings },
            ].map(({ value, label, desc, Icon }) => (
              <button key={value} type="button"
                onClick={() => setFormData(prev => ({ ...prev, account_type: value }))}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.account_type === value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                data-testid={`type-${value}-btn`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.account_type === value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon weight="bold" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-500">{desc}</p>
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
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <UserCircle className="w-10 h-10 text-gray-400" />
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
            <p className="text-center text-xs text-gray-400 -mt-2 mb-2">
              Klikněte na ikonu pro nahrání fotografie
            </p>

            {formData.has_ico ? (
              /* ======= MÁM IČO ======= */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">IČO <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="text" name="ico" value={formData.ico} onChange={handleInputChange}
                      placeholder="12345678"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-ico-input" />
                    <button type="button" onClick={handleAresLookup} disabled={aresLoading || !formData.ico}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      data-testid="ares-lookup-btn">
                      {aresLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-gray-600"></div> : <MagnifyingGlass className="w-4 h-4" />}
                      Načíst z ARES
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Klikněte pro automatické vyplnění údajů</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">DIČ</label>
                  <input type="text" name="dic" value={formData.dic} onChange={handleInputChange}
                    placeholder="CZ12345678"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="register-dic-input" />
                </div>

                {/* Name (optional for IČO) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Jméno</label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange}
                      placeholder="Jan"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-first-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Příjmení</label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange}
                      placeholder="Novák"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-last-name-input" />
                  </div>
                </div>

                {/* Company name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Název firmy</label>
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange}
                    placeholder="Firma s.r.o."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="register-company-input" />
                </div>

                {/* Sídlo (povinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa sídla <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="address" value={formData.address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('address')}
                      placeholder="Začněte psát adresu..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-address-input" />
                  </div>
                  {activeAddressField === 'address' && addressSuggestions.address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pobočky (nepovinné, více) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa pobočky</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" name="branch_address_input" value={formData.branch_address_input || ''}
                        onChange={handleAddressInput}
                        onFocus={() => setActiveAddressField('branch_address_input')}
                        placeholder="Začněte psát adresu pobočky..."
                        autoComplete="off"
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        data-testid="register-branch-input" />
                    </div>
                    <button type="button" onClick={handleAddBranchAddress}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
                      data-testid="add-branch-btn">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {activeAddressField === 'branch_address_input' && addressSuggestions.branch_address_input?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.branch_address_input.map((s, i) => (
                        <button key={i} type="button" onClick={() => {
                          setFormData(prev => ({ ...prev, branch_address_input: s.display_name }));
                          setAddressSuggestions(prev => ({ ...prev, branch_address_input: [] }));
                          setActiveAddressField(null);
                        }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.branch_addresses.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {formData.branch_addresses.map((addr, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                          <Buildings className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="flex-1 text-gray-700 truncate">{addr}</span>
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
              /* ======= NEMÁM IČO ======= */
              <>
                {/* Name (povinné) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Jméno <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange}
                      placeholder="Jan"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-first-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Příjmení <span className="text-red-500">*</span>
                    </label>
                    <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange}
                      placeholder="Novák"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-last-name-input" />
                  </div>
                </div>

                {/* Trvalý pobyt (nepovinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa trvalého pobytu</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="permanent_address" value={formData.permanent_address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('permanent_address')}
                      placeholder="Začněte psát adresu..."
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-permanent-address-input" />
                  </div>
                  {activeAddressField === 'permanent_address' && addressSuggestions.permanent_address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.permanent_address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'permanent_address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                          data-testid={`address-suggestion-${i}`}>
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skutečná adresa (nepovinné) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa skutečného bydliště</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="actual_address" value={formData.actual_address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('actual_address')}
                      placeholder="Pokud se liší od trvalého pobytu"
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-actual-address-input" />
                  </div>
                  {activeAddressField === 'actual_address' && addressSuggestions.actual_address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.actual_address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'actual_address')}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Phone (povinné for all) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefonní číslo <span className="text-red-500">*</span></label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                placeholder="+420 xxx xxx xxx"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-phone-input" />
            </div>

            {/* Email readonly */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail <span className="text-red-500">*</span></label>
              <input type="email" value={formData.email} readOnly
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                data-testid="register-email-readonly" />
              <p className="text-xs text-gray-400 mt-1">Zadáno v prvním kroku</p>
            </div>

            {/* Web (nepovinné for all) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Webová stránka</label>
              <input type="url" name="website" value={formData.website} onChange={handleInputChange}
                placeholder="https://www.vase-stranka.cz"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="register-website-input" />
            </div>

            {/* Preferred languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferovaný jazyk</label>
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
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    data-testid={`lang-${lang.code}`}>
                    <span>{lang.flag}</span>
                    {lang.label}
                    {formData.preferred_languages.includes(lang.code) && <Check weight="bold" className="w-4 h-4 text-orange-500" />}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Můžete vybrat více jazyků</p>
            </div>

            {/* Map preview */}
            {mapCenter && (
              <div className="rounded-xl overflow-hidden border border-gray-200 h-48" data-testid="register-map-preview">
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  <Marker position={mapCenter} />
                  <MapUpdater center={mapCenter} />
                </MapContainer>
              </div>
            )}

            {/* Bio — for all */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">O mně / O firmě</label>
              <textarea name="bio" value={formData.bio} onChange={handleInputChange}
                placeholder="Napište pár slov o sobě nebo o vaší firmě..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                data-testid="register-bio-input" />
            </div>
          </div>
        );

      case 'categories':
        const filteredCategories = categoryFilter
          ? categories.filter(cat => cat.toLowerCase().includes(categoryFilter.toLowerCase()))
          : categories;
        return (
          <div>
            <p className="text-gray-600 mb-3">Vyberte kategorie služeb, které nabízíte:</p>
            {/* Category search filter */}
            <div className="relative mb-3">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filtrovat kategorie..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                data-testid="category-filter-input" />
              {categoryFilter && (
                <button type="button" onClick={() => setCategoryFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-1.5">
              {filteredCategories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Žádná kategorie nebyla nalezena</p>
              ) : (
                filteredCategories.map((category) => (
                  <button key={category} type="button" onClick={() => handleCategoryToggle(category)}
                    className={`w-full p-2.5 rounded-lg text-left text-sm transition-all flex items-center justify-between ${
                      formData.categories.includes(category) ? 'bg-orange-500 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                    data-testid={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                    {category}
                    {formData.categories.includes(category) && <Check weight="bold" className="w-4 h-4" />}
                  </button>
                ))
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Vybráno: {formData.categories.length} kategorií</p>

            {/* Custom category */}
            <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Chybí vám kategorie? Navrhněte vlastní:</label>
              <div className="flex gap-2">
                <input type="text" name="custom_category_input" value={formData.custom_category_input} onChange={handleInputChange}
                  placeholder="Název kategorie"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
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
              <p className="text-xs text-gray-400 mt-2">Váš návrh bude odeslán ke schválení administrátorovi.</p>
            </div>
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
      role: 'Výběr role',
      ico_choice: 'Máte IČO?',
      ico_type: 'Typ podnikání',
      details: 'Údaje o účtu',
      categories: 'Kategorie služeb'
    };
    return titles[step] || '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900">Craft</span>
            <span className="text-2xl font-bold text-orange-500">Bolt</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center" data-testid="verification-pending-screen">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13L2 4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Ověřte svůj email</h1>
              <p className="text-gray-500 mb-2">
                Na adresu <strong className="text-gray-900">{registeredEmail}</strong> jsme odeslali ověřovací email.
              </p>
              <p className="text-gray-500 mb-8">
                Klikněte na odkaz v emailu pro dokončení registrace.
              </p>
              
              {claimDemandId && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6" data-testid="claim-demand-info">
                  <p className="text-sm text-green-700 font-medium">
                    Po ověření emailu bude vaše rychlá poptávka automaticky propojena s vaším novým účtem.
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Nedostali jste email?</p>
                <p className="text-xs text-gray-400 mb-3">Zkontrolujte složku SPAM nebo si nechte email poslat znovu.</p>
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
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                data-testid="go-to-login-link"
              >
                <ArrowLeft className="w-4 h-4" />
                Zpět na přihlášení
              </Link>
            </div>
          ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((step, index) => (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index <= currentStep ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index < currentStep ? <Check weight="bold" className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 rounded-full transition-colors ${index < currentStep ? 'bg-orange-500' : 'bg-gray-100'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{getStepTitle()}</h1>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm" data-testid="register-error">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              {renderStep()}

              <div className="flex gap-4 mt-8">
                {currentStep > 0 && (
                  <button type="button" onClick={handleBack}
                    className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    data-testid="register-back-btn">
                    Zpět
                  </button>
                )}
                <button type="submit" disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
              <p className="text-gray-500">
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
