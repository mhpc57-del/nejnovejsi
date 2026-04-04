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
  Buildings, UserCircle, Check, MapPin, Camera, MagnifyingGlass, X, Image as ImageIcon
} from '@phosphor-icons/react';

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
    email: '',
    password: '',
    phone: '',
    role: searchParams.get('role') || '',
    account_type: searchParams.get('type') || '',
    company_name: '',
    first_name: '',
    last_name: '',
    ico: '',
    dic: '',
    address: '',
    branch_address: '',
    permanent_address: '',
    actual_address: '',
    date_of_birth: '',
    profile_image: '',
    bio: '',
    website: '',
    categories: [],
    custom_categories: [],
    custom_category_input: ''
  });
  
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

  // Determine steps based on role + account_type
  const getSteps = () => {
    if (formData.role === 'customer') {
      return ['basic', 'role', 'customer_type', 'details'];
    }
    if (formData.role === 'supplier') {
      return ['basic', 'role', 'supplier_type', 'details', 'categories'];
    }
    return ['basic', 'role'];
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
      case 'customer_type':
        if (!formData.account_type) { setError('Vyberte prosím typ účtu'); return false; }
        break;
      case 'supplier_type':
        if (!formData.account_type) { setError('Vyberte prosím typ účtu'); return false; }
        break;
      case 'details':
        if (!formData.first_name) { setError('Vyplňte jméno'); return false; }
        if (!formData.last_name) { setError('Vyplňte příjmení'); return false; }
        if (!formData.phone) { setError('Vyplňte telefonní číslo'); return false; }
        if (formData.role === 'supplier' || formData.account_type !== 'nepodnikatel') {
          if (!formData.ico) { setError('Vyplňte IČO'); return false; }
        }
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
      delete submitData.custom_category_input;
      
      await register(submitData);
      
      // Show verification screen
      setRegisteredEmail(formData.email);
      setRegistrationComplete(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registrace se nezdařila');
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
              { value: 'customer', label: 'Zákazník', desc: 'Hledám řemeslníky a služby', price: '190 Kč/měsíc', Icon: User },
              { value: 'supplier', label: 'Dodavatel', desc: 'Nabízím své služby', price: 'od 290 Kč/měsíc', Icon: Briefcase },
            ].map(({ value, label, desc, price, Icon }) => (
              <button key={value} type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: value, account_type: '' }))}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.role === value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
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

      case 'customer_type':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Jaký typ zákazníka jste?</p>
            {[
              { value: 'nepodnikatel', label: 'Nepodnikatel', desc: 'Fyzická osoba', Icon: User },
              { value: 'osvc', label: 'OSVČ', desc: 'Fyzická osoba podnikající', Icon: UserCircle },
              { value: 'company', label: 'Firma / Organizace', desc: 'Právnická osoba', Icon: Buildings },
            ].map(({ value, label, desc, Icon }) => (
              <button key={value} type="button"
                onClick={() => setFormData(prev => ({ ...prev, account_type: value }))}
                className={`w-full p-6 border-2 rounded-xl text-left transition-all ${formData.account_type === value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                data-testid={`customer-type-${value}-btn`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.account_type === value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon weight="bold" className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{label}</h3>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <span className="text-sm font-medium text-orange-500">190 Kč/měsíc</span>
                  {formData.account_type === value && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        );

      case 'supplier_type':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Jaký je váš typ podnikání?</p>
            {[
              { value: 'nepodnikatel', label: 'Nepodnikatel', desc: 'Fyzická osoba nepodnikající', price: '290 Kč/měsíc', Icon: User },
              { value: 'osvc', label: 'OSVČ', desc: 'Fyzická osoba podnikající', price: '490 Kč/měsíc', Icon: UserCircle },
              { value: 'company', label: 'Firma / Organizace', desc: 'Právnická osoba', price: '490 Kč/měsíc', Icon: Buildings },
            ].map(({ value, label, desc, price, Icon }) => (
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
                  <span className="text-sm font-medium text-orange-500">{price}</span>
                  {formData.account_type === value && <Check weight="bold" className="w-6 h-6 text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        );

      case 'details':
        const isNepodnikatel = formData.account_type === 'nepodnikatel';
        const isCustomer = formData.role === 'customer';
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
              {isNepodnikatel ? 'Klikněte na ikonu pro nahrání fotografie' : 'Logo nebo fotografie firmy'}
            </p>

            {/* IČO + ARES — only for OSVČ/firma */}
            {!isNepodnikatel && (
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
            )}

            {/* DIČ — only for OSVČ/firma */}
            {!isNepodnikatel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DIČ</label>
                <input type="text" name="dic" value={formData.dic} onChange={handleInputChange}
                  placeholder="CZ12345678"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="register-dic-input" />
              </div>
            )}

            {/* Name */}
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

            {/* Company name - only for OSVČ and Firma */}
            {!isNepodnikatel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Název firmy
                </label>
                <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange}
                  placeholder="Firma s.r.o."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="register-company-input" />
              </div>
            )}

            {/* Phone */}
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

            {/* Nepodnikatel customer: trvalý pobyt, skutečná adresa, datum narození */}
            {isNepodnikatel && isCustomer && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Trvalý pobyt</label>
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
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Skutečná adresa bydliště</label>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Datum narození</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select name="dob_day" value={formData.date_of_birth ? parseInt(formData.date_of_birth.split('-')[2]) || '' : ''}
                      onChange={(e) => {
                        const parts = (formData.date_of_birth || '--').split('-');
                        parts[2] = e.target.value.padStart(2, '0');
                        setFormData(prev => ({ ...prev, date_of_birth: parts.join('-') }));
                      }}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                      data-testid="register-dob-day">
                      <option value="">Den</option>
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                    <select name="dob_month" value={formData.date_of_birth ? parseInt(formData.date_of_birth.split('-')[1]) || '' : ''}
                      onChange={(e) => {
                        const parts = (formData.date_of_birth || '--').split('-');
                        parts[1] = e.target.value.padStart(2, '0');
                        setFormData(prev => ({ ...prev, date_of_birth: parts.join('-') }));
                      }}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                      data-testid="register-dob-month">
                      <option value="">Měsíc</option>
                      {['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'].map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select name="dob_year" value={formData.date_of_birth ? parseInt(formData.date_of_birth.split('-')[0]) || '' : ''}
                      onChange={(e) => {
                        const parts = (formData.date_of_birth || '--').split('-');
                        parts[0] = e.target.value;
                        setFormData(prev => ({ ...prev, date_of_birth: parts.join('-') }));
                      }}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                      data-testid="register-dob-year">
                      <option value="">Rok</option>
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* OSVČ/firma: sídlo, pobočka */}
            {!isNepodnikatel && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sídlo</label>
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
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pobočka</label>
                  <div className="relative">
                    <Buildings className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" name="branch_address" value={formData.branch_address}
                      onChange={handleAddressInput}
                      onFocus={() => setActiveAddressField('branch_address')}
                      placeholder="Adresa pobočky (pokud se liší od sídla)"
                      autoComplete="off"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      data-testid="register-branch-input" />
                  </div>
                  {activeAddressField === 'branch_address' && addressSuggestions.branch_address?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {addressSuggestions.branch_address.map((s, i) => (
                        <button key={i} type="button" onClick={() => selectAddress(s, 'branch_address')}
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

            {/* Supplier: WEB */}
            {formData.role === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Webová stránka</label>
                <input type="url" name="website" value={formData.website} onChange={handleInputChange}
                  placeholder="https://www.vase-firma.cz"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="register-website-input" />
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

            {/* Trust message for customers */}
            {isCustomer && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-700">
                  Vyplněním všech polí a vložením fotografie bude váš profil důvěryhodnější a lépe tak najdete svého dodavatele.
                </p>
              </div>
            )}
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
      customer_type: 'Typ zákazníka',
      supplier_type: 'Typ dodavatele',
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
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Zpět
          </Link>
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
