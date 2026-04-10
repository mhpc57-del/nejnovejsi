import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  ArrowLeft, MapPin, Calendar, User, Clock, Check, X,
  PaperPlaneTilt, Star, ChatCircle, Phone, NavigationArrow, Warning, HandWaving, CurrencyCircleDollar,
  PencilSimple, ImageSquare, Plus, Camera, Trash
} from '@phosphor-icons/react';
import LiveMap from '../components/LiveMap';
import ThemeToggle from '../components/ThemeToggle';

const DemandDetail = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [demand, setDemand] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [supplierLocation, setSupplierLocation] = useState(null);
  const [customerDisplayName, setCustomerDisplayName] = useState(null);
  const chatPollRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const prevDemandStatusRef = useRef(null);
  const messagesEndRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const [statusNotification, setStatusNotification] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showSoftAcceptModal, setShowSoftAcceptModal] = useState(false);
  const [softAccepting, setSoftAccepting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeType, setCompleteType] = useState(null);
  const [completePriceIncrease, setCompletePriceIncrease] = useState('');
  const [completeBlacklistReason, setCompleteBlacklistReason] = useState('');
  const [completeAgreedPrice, setCompleteAgreedPrice] = useState('');
  const [completeFinalPrice, setCompleteFinalPrice] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completePhotos, setCompletePhotos] = useState([]);
  const [uploadingCompletePhoto, setUploadingCompletePhoto] = useState(false);
  const [uploadingPostPhoto, setUploadingPostPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [priceDisputeReason, setPriceDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [confirmingPrice, setConfirmingPrice] = useState(false);

  const [notificationToast, setNotificationToast] = useState(null);

  // Sound notification for new messages
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log('Sound notification not available');
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const newMessages = res.data;
      
      // Play sound and show toast if new messages arrived from the other user
      if (prevMessageCountRef.current > 0 && newMessages.length > prevMessageCountRef.current) {
        const latestMsg = newMessages[newMessages.length - 1];
        if (latestMsg.sender_id !== user?.id) {
          playNotificationSound();
          setNotificationToast({
            sender: latestMsg.sender_name,
            text: latestMsg.content.length > 60 ? latestMsg.content.substring(0, 60) + '...' : latestMsg.content
          });
          setTimeout(() => setNotificationToast(null), 5000);
        }
      }
      prevMessageCountRef.current = newMessages.length;
      setMessages(newMessages);
    } catch (err) {
      console.error('Error polling messages:', err);
    }
  }, [id, token, user?.id, playNotificationSound]);

  const fetchDemandStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/demands/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const newDemand = res.data;
      
      // Check if status changed
      if (prevDemandStatusRef.current && prevDemandStatusRef.current !== newDemand.status) {
        if (newDemand.status === 'in_progress' && user?.role === 'customer') {
          setStatusNotification({
            type: 'accepted',
            message: 'Dodavatel přijal vaši zakázku! Nyní vyčkejte, až dodavatel dorazí a provede práci.'
          });
        } else if (newDemand.status === 'completed') {
          setStatusNotification({
            type: 'completed',
            message: 'Zakázka byla dokončena!'
          });
        }
        playNotificationSound();
      }
      prevDemandStatusRef.current = newDemand.status;
      setDemand(newDemand);
    } catch (err) {
      console.error('Error polling demand:', err);
    }
  }, [id, token, user?.role, playNotificationSound]);

  const fetchData = async () => {
    try {
      const [demandRes, messagesRes] = await Promise.all([
        axios.get(`${API}/demands/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDemand(demandRes.data);
      setMessages(messagesRes.data);
      prevMessageCountRef.current = messagesRes.data.length;
      prevDemandStatusRef.current = demandRes.data.status;
      
      // Fetch customer display name
      if (demandRes.data.customer_id) {
        try {
          const custRes = await axios.get(`${API}/users/${demandRes.data.customer_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const c = custRes.data;
          const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email;
          setCustomerDisplayName(name);
        } catch (e) { /* use demand.customer_name as fallback */ }
      }
      
      // Fetch user locations if demand is in progress
      if (demandRes.data.status === 'in_progress') {
        fetchLocations(demandRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async (demandData) => {
    try {
      if (demandData.customer_id) {
        const customerRes = await axios.get(`${API}/users/${demandData.customer_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (customerRes.data.location) {
          setCustomerLocation(customerRes.data.location);
        }
      }
      if (demandData.assigned_supplier_id) {
        const supplierRes = await axios.get(`${API}/users/${demandData.assigned_supplier_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (supplierRes.data.location) {
          setSupplierLocation(supplierRes.data.location);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const openEditModal = () => {
    setEditForm({
      title: demand.title,
      description: demand.description,
      address: demand.address,
      budget_min: demand.budget_min || '',
      budget_max: demand.budget_max || '',
      deadline: demand.deadline || '',
      images: demand.images || [],
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/demands/${id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemand(res.data);
      setShowEditModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEditPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setEditForm(prev => ({ ...prev, images: [...(prev.images || []), res.data.url] }));
    } catch (err) {
      alert('Nepodařilo se nahrát fotografii');
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  const removeEditPhoto = (index) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    fetchData();
    
    // Start polling for messages and demand status every 5 seconds
    chatPollRef.current = setInterval(() => {
      fetchMessages();
      fetchDemandStatus();
    }, 5000);
    
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      if (chatPollRef.current) {
        clearInterval(chatPollRef.current);
      }
    };
  }, [id, token, fetchMessages, fetchDemandStatus]);

  useEffect(() => {
    if (demand?.status === 'in_progress' && showMap) {
      locationIntervalRef.current = setInterval(() => {
        fetchLocations(demand);
      }, 10000);
      
      return () => {
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
      };
    }
  }, [demand, showMap]);

  useEffect(() => {
    // Scroll only within the chat container, not the whole page
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.parentElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Handle location update
  const handleLocationUpdate = useCallback(async (location) => {
    try {
      await axios.post(`${API}/users/location`, {
        latitude: location.lat,
        longitude: location.lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, [token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await axios.post(`${API}/messages`, {
        demand_id: id,
        content: newMessage.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.detail || 'Nepodařilo se odeslat zprávu');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptDemand = async () => {
    try {
      await axios.post(`${API}/demands/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se přijmout zakázku');
    }
  };

  const handleCompleteDemand = async () => {
    setCompleting(true);
    try {
      const payload = { completion_type: completeType };
      payload.agreed_price = parseFloat(completeAgreedPrice) || 0;
      if (completeType === 'price_increase') {
        payload.price_increase = parseFloat(completePriceIncrease) || 0;
        payload.final_price = payload.agreed_price + payload.price_increase;
      } else {
        payload.final_price = payload.agreed_price;
      }
      if (completeType === 'blacklist') {
        payload.blacklist_reason = completeBlacklistReason;
      }
      if (completePhotos.length > 0) {
        payload.completion_photos = completePhotos.map(url => ({ url }));
      }
      await axios.post(`${API}/demands/${id}/complete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCompleteDialog(false);
      setCompleteType(null);
      setCompletePriceIncrease('');
      setCompleteBlacklistReason('');
      setCompleteAgreedPrice('');
      setCompleteFinalPrice('');
      setCompletePhotos([]);
      fetchData();
      setShowReviewModal(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se dokončit zakázku');
    } finally {
      setCompleting(false);
    }
  };

  const handleCompletePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCompletePhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setCompletePhotos(prev => [...prev, res.data.url]);
    } catch (error) {
      alert('Nepodařilo se nahrát fotku');
    } finally {
      setUploadingCompletePhoto(false);
      e.target.value = '';
    }
  };

  const handlePostCompletionPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPostPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      await axios.post(`${API}/demands/${id}/completion-photos`, { url: uploadRes.data.url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se nahrát fotku');
    } finally {
      setUploadingPostPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveCompletionPhoto = async (photoUrl) => {
    if (!window.confirm('Opravdu chcete smazat tuto fotku?')) return;
    try {
      await axios.delete(`${API}/demands/${id}/completion-photos`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { url: photoUrl }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se smazat fotku');
    }
  };

  const handleConfirmPrice = async (confirmed) => {
    setConfirmingPrice(true);
    try {
      const payload = { confirmed };
      if (!confirmed) payload.reason = priceDisputeReason;
      await axios.post(`${API}/demands/${id}/confirm-price`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPriceDisputeReason('');
      setShowDisputeForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Chyba při potvrzování ceny');
    } finally {
      setConfirmingPrice(false);
    }
  };

  const handleCancelDemand = async () => {
    if (!window.confirm('Opravdu chcete zrušit tuto zakázku?')) return;
    try {
      await axios.post(`${API}/demands/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se zrušit zakázku');
    }
  };

  const handleSupplierArrived = async () => {
    try {
      const res = await axios.post(`${API}/demands/${id}/arrive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Příjezd potvrzen! Čas příjezdu: ${res.data.arrival_minutes ? Math.round(res.data.arrival_minutes) + ' minut' : 'zaznamenán'}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se potvrdit příjezd');
    }
  };

  const handleSoftAccept = async (reason) => {
    setSoftAccepting(true);
    try {
      await axios.post(`${API}/demands/${id}/soft-accept`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { reason }
      });
      setShowSoftAcceptModal(false);
      fetchData();
      alert('Vaše podmínka byla odeslána zákazníkovi.');
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se odeslat');
    } finally {
      setSoftAccepting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-zinc-100 text-zinc-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      open: 'Otevřená',
      in_progress: 'Probíhá',
      completed: 'Dokončeno',
      cancelled: 'Zrušeno'
    };
    return (
      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Auto-show chat for customer when new messages arrive (must be before early returns)
  useEffect(() => {
    if (demand && user?.id === demand.customer_id && messages.length > 0 && !showChat) {
      setShowChat(true);
    }
  }, [demand, user?.id, messages.length, showChat]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Zakázka nenalezena</p>
          <button onClick={() => navigate(-1)} className="text-orange-500 hover:text-orange-600">
            Zpět
          </button>
        </div>
      </div>
    );
  }

  const isCustomer = user?.id === demand.customer_id;
  const isAssignedSupplier = user?.id === demand.assigned_supplier_id;
  const canChat = isAssignedSupplier || (user?.role === 'supplier' && demand.status === 'open') || (isCustomer && demand.status !== 'open') || (isCustomer && messages.length > 0);
  const canAccept = user?.role === 'supplier' && demand.status === 'open';
  const canComplete = (isCustomer || isAssignedSupplier) && demand.status === 'in_progress';

  const canEdit = isCustomer && (demand.status === 'open' || demand.status === 'in_progress');
  const autoShowChat = isCustomer || isAssignedSupplier;
  const canCancel = isCustomer && (demand.status === 'open' || demand.status === 'in_progress');
  const showMapButton = demand.status === 'in_progress' && (isCustomer || isAssignedSupplier);

  // Mock destination location from address (in real app, would use geocoding)
  const destinationLocation = demand.latitude && demand.longitude 
    ? { lat: demand.latitude, lng: demand.longitude }
    : { lat: 49.8175 + (Math.random() * 0.1 - 0.05), lng: 15.4730 + (Math.random() * 0.1 - 0.05) };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 relative">
      {/* Chat notification toast */}
      {notificationToast && (
        <div
          className="fixed top-4 right-4 z-[9999] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-orange-200 p-4 max-w-sm animate-slide-in cursor-pointer"
          onClick={() => { setNotificationToast(null); setShowChat(true); }}
          data-testid="chat-notification-toast"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ChatCircle weight="fill" className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{notificationToast.sender}</p>
              <p className="text-sm text-zinc-500 truncate">{notificationToast.text}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNotificationToast(null); }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex-1">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-zinc-900 dark:text-white">Craft</span>
              <span className="text-xl font-bold text-orange-500">Bolt</span>
            </Link>
          </div>
          {showMapButton && (
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                showMap 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
              }`}
              data-testid="toggle-map-btn"
            >
              <NavigationArrow className="w-5 h-5" />
              {showMap ? 'Skrýt mapu' : 'Sledovat polohu'}
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Live Map */}
        {showMap && demand.status === 'in_progress' && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6 mb-6">
            <h2 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <NavigationArrow className="w-5 h-5 text-orange-500" />
              Live sledování
            </h2>
            <LiveMap
              customerLocation={customerLocation}
              supplierLocation={supplierLocation}
              destinationLocation={destinationLocation}
              customerName={customerDisplayName || demand.customer_name}
              supplierName={demand.assigned_supplier_name}
              destinationName={demand.address}
              onLocationUpdate={handleLocationUpdate}
              isSupplier={isAssignedSupplier}
              showTracking={true}
            />
          </div>
        )}

        {/* Status notification banner */}
        {statusNotification && (
          <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 ${
            statusNotification.type === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`} data-testid="status-notification-banner">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              statusNotification.type === 'accepted' ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              <Check weight="bold" className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${statusNotification.type === 'accepted' ? 'text-green-800' : 'text-blue-800'}`}>
                {statusNotification.type === 'accepted' ? 'Zakázka přijata!' : 'Zakázka dokončena!'}
              </p>
              <p className={`text-sm mt-1 ${statusNotification.type === 'accepted' ? 'text-green-600' : 'text-blue-600'}`}>
                {statusNotification.message}
              </p>
            </div>
            <button onClick={() => setStatusNotification(null)} className="text-zinc-400 hover:text-zinc-600" data-testid="dismiss-notification-btn">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Customer waiting banner when demand is in_progress */}
        {demand.status === 'in_progress' && isCustomer && !statusNotification && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3" data-testid="waiting-banner">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Clock weight="bold" className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">Dodavatel přijal zakázku</p>
              <p className="text-sm text-amber-600 mt-1">Nyní vyčkejte, až dodavatel dorazí a provede práci.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Demand Info */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{demand.title}</h1>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(demand.status)}
                    <span className="text-sm text-zinc-500 px-3 py-1 bg-zinc-100 rounded-full">
                      {demand.category}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-zinc-600 mb-6">{demand.description}</p>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-500">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                  {demand.address}
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <Calendar className="w-5 h-5 text-zinc-400" />
                  {new Date(demand.created_at).toLocaleDateString('cs-CZ')}
                </div>
                {demand.budget_max && (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    Rozpočet: {demand.budget_min ? `${demand.budget_min} - ` : ''}{demand.budget_max} Kč
                  </div>
                )}
                {demand.deadline && (
                  <div className={`flex items-center gap-2 font-medium ${demand.deadline === 'URGENT' ? 'text-red-600' : 'text-orange-600'}`} data-testid="demand-deadline-display">
                    <Clock className="w-5 h-5" />
                    {demand.deadline === 'ASAP' ? 'Pokud možno, co nejdříve' :
                     demand.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' :
                     `Termín: ${new Date(demand.deadline).toLocaleDateString('cs-CZ')}`}
                  </div>
                )}
              </div>

              {/* Financial Summary for completed demands */}
              {demand.status === 'completed' && demand.agreed_price > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100" data-testid="completed-financial-summary">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Finanční přehled</h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Dohodnutá cena</span>
                      <span className="font-semibold text-zinc-900 dark:text-white" data-testid="agreed-price-display">
                        {Number(demand.agreed_price).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    {demand.completion_type === 'price_increase' && demand.price_increase > 0 && (
                      <div className="flex items-center justify-between text-orange-600">
                        <span className="text-sm">Navýšení ceny</span>
                        <span className="font-semibold" data-testid="price-increase-display">
                          +{Number(demand.price_increase).toLocaleString('cs-CZ')} Kč
                        </span>
                      </div>
                    )}
                    {demand.final_price > 0 && demand.final_price !== demand.agreed_price && (
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">Konečná cena</span>
                        <span className="font-bold text-lg text-gray-900" data-testid="final-price-display">
                          {Number(demand.final_price).toLocaleString('cs-CZ')} Kč
                        </span>
                      </div>
                    )}
                    {demand.completion_type === 'blacklist' && demand.blacklist_reason && (
                      <div className="mt-2 pt-2 border-t border-zinc-200">
                        <div className="flex items-start gap-2">
                          <Warning weight="bold" className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-red-700">Zákazník označen — příště neposkytovat</span>
                            <p className="text-sm text-red-600 mt-0.5" data-testid="blacklist-reason-display">{demand.blacklist_reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {demand.completed_at && (
                      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-200">
                        <span>Dokončeno</span>
                        <span data-testid="completed-at-display">{new Date(demand.completed_at).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completion Photos / Fotodokumentace */}
              {demand.status === 'completed' && (
                <>
                  {/* Price Confirmation by Supplier */}
                  {demand.agreed_price > 0 && user?.id === demand.assigned_supplier_id && demand.price_confirmed_by_supplier === null && (
                    <div className="mt-6 pt-6 border-t border-gray-100" data-testid="price-confirmation-section">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wider mb-2">Potvrzení ceny</h3>
                        <p className="text-sm text-zinc-700 mb-1">
                          Zákazník uvedl konečnou cenu za tuto zakázku:
                        </p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white mb-4" data-testid="price-to-confirm">
                          {Number(demand.final_price || demand.agreed_price).toLocaleString('cs-CZ')} Kč
                        </p>
                        {!showDisputeForm ? (
                          <div className="flex gap-3">
                            <button onClick={() => handleConfirmPrice(true)} disabled={confirmingPrice}
                              className="px-6 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50" data-testid="confirm-price-btn">
                              {confirmingPrice ? 'Potvrzuji...' : 'Souhlasím s cenou'}
                            </button>
                            <button onClick={() => setShowDisputeForm(true)}
                              className="px-6 py-2.5 bg-white border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors" data-testid="dispute-price-btn">
                              Nesouhlasím
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea value={priceDisputeReason} onChange={e => setPriceDisputeReason(e.target.value)} rows={3}
                              placeholder="Uveďte důvod nesouhlasu..." className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500" data-testid="dispute-reason-input" />
                            <div className="flex gap-3">
                              <button onClick={() => handleConfirmPrice(false)} disabled={confirmingPrice || !priceDisputeReason.trim()}
                                className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50" data-testid="submit-dispute-btn">
                                {confirmingPrice ? 'Odesílám...' : 'Odeslat nesouhlas'}
                              </button>
                              <button onClick={() => { setShowDisputeForm(false); setPriceDisputeReason(''); }}
                                className="px-6 py-2.5 text-zinc-600 hover:bg-zinc-50 rounded-xl text-sm font-medium transition-colors">
                                Zrušit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price Confirmation Status */}
                  {demand.agreed_price > 0 && demand.price_confirmed_by_supplier === true && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2.5 rounded-xl" data-testid="price-confirmed-badge">
                      <Check weight="bold" className="w-4 h-4" />
                      <span className="text-sm font-medium">Dodavatel potvrdil cenu {demand.price_confirmed_at ? `dne ${new Date(demand.price_confirmed_at).toLocaleDateString('cs-CZ')}` : ''}</span>
                    </div>
                  )}
                  {demand.agreed_price > 0 && demand.price_confirmed_by_supplier === false && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3" data-testid="price-disputed-badge">
                      <div className="flex items-center gap-2 text-red-600 mb-1">
                        <Warning weight="bold" className="w-4 h-4" />
                        <span className="text-sm font-medium">Dodavatel nesouhlasí s cenou</span>
                      </div>
                      {demand.price_dispute_reason && (
                        <p className="text-sm text-red-600 ml-6">{demand.price_dispute_reason}</p>
                      )}
                    </div>
                  )}
                  {demand.agreed_price > 0 && demand.price_confirmed_by_supplier === null && user?.id !== demand.assigned_supplier_id && (
                    <div className="mt-4 flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl" data-testid="price-pending-badge">
                      <Clock weight="bold" className="w-4 h-4" />
                      <span className="text-sm font-medium">Čeká na potvrzení ceny dodavatelem</span>
                    </div>
                  )}
                </>
              )}
              {demand.status === 'completed' && (
                <div className="mt-6 pt-6 border-t border-gray-100" data-testid="completion-photos-section">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Fotodokumentace</h3>
                    <span className="text-xs text-zinc-400">
                      {(demand.completion_photos || []).length} / 20 fotek
                    </span>
                  </div>
                  {(demand.completion_photos || []).length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {demand.completion_photos.map((photo, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-200 cursor-pointer"
                          onClick={() => setLightboxPhoto(photo)}>
                          <img src={`${API.replace('/api', '')}${photo.url}`} alt={`Foto ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white truncate">{photo.uploaded_by_name}</p>
                          </div>
                          {(photo.uploaded_by === user?.id || user?.role === 'admin') && (
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveCompletionPhoto(photo.url); }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`delete-completion-photo-${i}`}>
                              <Trash className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">Zatím žádné fotky.</p>
                  )}
                  {(demand.completion_photos || []).length < 20 && (
                    (user?.id === demand.customer_id || user?.id === demand.assigned_supplier_id) && (
                      <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl font-medium text-sm text-zinc-700 cursor-pointer transition-colors" data-testid="add-post-completion-photo-btn">
                        {uploadingPostPhoto ? (
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        Přidat fotku
                        <input type="file" className="hidden" onChange={handlePostCompletionPhotoUpload}
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingPostPhoto} />
                      </label>
                    )
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
                {canAccept && (
                  <>
                    <button
                      onClick={handleAcceptDemand}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium text-white transition-colors flex items-center gap-2"
                      data-testid="accept-demand-btn"
                    >
                      <Check weight="bold" className="w-5 h-5" />
                      Závazně přijmout
                    </button>
                    <button
                      onClick={() => setShowSoftAcceptModal(true)}
                      className="px-5 py-2.5 border-2 border-orange-400 hover:bg-orange-50 rounded-xl font-medium text-orange-600 transition-colors flex items-center gap-2"
                      data-testid="soft-accept-btn"
                    >
                      <HandWaving weight="bold" className="w-5 h-5" />
                      Nezávazně přijmout
                    </button>
                  </>
                )}
                {canChat && !showChat && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="px-5 py-2.5 border border-zinc-200 hover:bg-zinc-50 rounded-xl font-medium text-zinc-700 transition-colors flex items-center gap-2"
                    data-testid="start-chat-btn"
                  >
                    <ChatCircle weight="bold" className="w-5 h-5" />
                    Spustit chat
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={() => setShowCompleteDialog(true)}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 rounded-xl font-medium text-white transition-colors flex items-center gap-2"
                    data-testid="complete-demand-btn"
                  >
                    <Check weight="bold" className="w-5 h-5" />
                    Označit jako dokončené
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancelDemand}
                    className="px-5 py-2.5 border border-red-200 hover:bg-red-50 rounded-xl font-medium text-red-600 transition-colors flex items-center gap-2"
                    data-testid="cancel-demand-btn"
                  >
                    <X weight="bold" className="w-5 h-5" />
                    Zrušit zakázku
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={openEditModal}
                    className="px-5 py-2.5 border border-zinc-200 hover:bg-zinc-50 rounded-xl font-medium text-zinc-700 transition-colors flex items-center gap-2"
                    data-testid="edit-demand-btn"
                  >
                    <PencilSimple weight="bold" className="w-5 h-5" />
                    Upravit zakázku
                  </button>
                )}
                {/* Supplier arrived button */}
                {isAssignedSupplier && demand.status === 'in_progress' && !demand.supplier_arrived && (
                  <button
                    onClick={handleSupplierArrived}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl font-medium text-white transition-colors flex items-center gap-2"
                    data-testid="supplier-arrived-btn"
                  >
                    <NavigationArrow weight="bold" className="w-5 h-5" />
                    Dorazil jsem
                  </button>
                )}
                {/* Arrival confirmed badge */}
                {demand.supplier_arrived && demand.status === 'in_progress' && (
                  <div className="px-5 py-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700" data-testid="arrived-badge">
                    <Check weight="bold" className="w-5 h-5" />
                    <span className="font-medium">Dodavatel na místě</span>
                    {demand.supplier_arrived_at && (
                      <span className="text-sm text-green-500 ml-1">
                        ({new Date(demand.supplier_arrived_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Soft Accepts display */}
              {demand.soft_accepts && demand.soft_accepts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100" data-testid="soft-accepts-section">
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Nezávazné nabídky dodavatelů</h3>
                  <div className="space-y-3">
                    {demand.soft_accepts.map((sa, i) => (
                      <div key={i} className="p-4 bg-orange-50 border border-orange-200 rounded-xl" data-testid={`soft-accept-${i}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-orange-500" />
                          <span className="font-medium text-zinc-900 dark:text-white">{sa.supplier_name}</span>
                          <span className="text-sm text-zinc-500">{new Date(sa.created_at).toLocaleDateString('cs-CZ')}</span>
                        </div>
                        <p className="text-zinc-800 dark:text-zinc-200">{sa.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat - shown only after clicking "Spustit chat" */}
            {canChat && (showChat || autoShowChat) && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <ChatCircle className="w-5 h-5 text-zinc-400" />
                  <h2 className="font-semibold text-zinc-900 dark:text-white">Chat</h2>
                </div>

                <div className="h-80 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                      Zatím žádné zprávy. Začněte konverzaci.
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          msg.sender_id === user?.id 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-zinc-100 text-gray-900'
                        }`}>
                          <p className={`text-xs mb-1 ${msg.sender_id === user?.id ? 'text-orange-100' : 'text-zinc-500'}`}>
                            {msg.sender_name}
                          </p>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Napište zprávu..."
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="message-input"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-white transition-colors disabled:opacity-50"
                    data-testid="send-message-btn"
                  >
                    <PaperPlaneTilt weight="fill" className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Zákazník</h3>
              <Link to={`/profil/${demand.customer_id}`} className="flex items-center gap-3 group cursor-pointer" data-testid="customer-profile-link">
                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <User className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white group-hover:text-orange-600 transition-colors">{customerDisplayName || demand.customer_name}</p>
                  <p className="text-sm text-zinc-500">Zákazník — zobrazit profil</p>
                </div>
              </Link>
            </div>

            {/* Supplier Info */}
            {demand.assigned_supplier_id && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Přiřazený dodavatel</h3>
                <Link to={`/profil/${demand.assigned_supplier_id}`} className="flex items-center gap-3 group cursor-pointer" data-testid="supplier-profile-link">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <User className="w-6 h-6 text-orange-500 group-hover:text-orange-700 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white group-hover:text-orange-600 transition-colors">{demand.assigned_supplier_name}</p>
                    <p className="text-sm text-zinc-500">Dodavatel — zobrazit profil</p>
                  </div>
                </Link>
                {demand.accepted_at && (
                  <p className="text-xs text-zinc-400 mt-3">
                    Přijato: {new Date(demand.accepted_at).toLocaleDateString('cs-CZ')}
                  </p>
                )}
              </div>
            )}

            {/* Quick Map Preview (when not in full map mode) */}
            {demand.status === 'in_progress' && !showMap && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Poloha</h3>
                  <button
                    onClick={() => setShowMap(true)}
                    className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                    data-testid="show-map-btn"
                  >
                    Zobrazit mapu
                  </button>
                </div>
                <div className="aspect-video bg-zinc-100 flex items-center justify-center">
                  <div className="text-center p-4">
                    <NavigationArrow className="w-12 h-12 text-orange-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Klikněte pro sledování polohy</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {/* Complete Demand Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCompleteDialog(false); setCompleteType(null); }}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Dokončení zakázky</h3>
            <p className="text-sm text-zinc-500 mb-5">Vyberte, jak byla zakázka dokončena:</p>

            {!completeType && (
              <div className="space-y-3">
                <button onClick={() => setCompleteType('standard')}
                  className="w-full text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-green-500 hover:bg-green-50 transition-all"
                  data-testid="complete-standard-btn">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check weight="bold" className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Dokončeno za sjednanou cenu</p>
                      <p className="text-sm text-zinc-500 mt-0.5">Zakázka byla v pořádku dokončena za sjednanou cenu dle domluvy.</p>
                    </div>
                  </div>
                </button>

                <button onClick={() => setCompleteType('price_increase')}
                  className="w-full text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-orange-500 hover:bg-orange-50 transition-all"
                  data-testid="complete-price-increase-btn">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CurrencyCircleDollar weight="bold" className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Dokončeno s navýšením ceny</p>
                      <p className="text-sm text-zinc-500 mt-0.5">Zakázka byla v pořádku dokončena s navýšením ceny oproti původní domluvě.</p>
                    </div>
                  </div>
                </button>

                <button onClick={() => setCompleteType('blacklist')}
                  className="w-full text-left p-4 rounded-xl border-2 border-zinc-200 hover:border-red-500 hover:bg-red-50 transition-all"
                  data-testid="complete-blacklist-btn">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Warning weight="bold" className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Dokončeno — příště nebudu poskytovat</p>
                      <p className="text-sm text-zinc-500 mt-0.5">Zakázka dokončena, ale příště už tomuto zákazníkovi služby poskytovat nebudu.</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {completeType === 'standard' && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-green-800 font-medium">Zakázka bude označena jako dokončená za sjednanou cenu.</p>
                </div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Sjednaná cena (Kč) <span className="text-red-500">*</span></label>
                <input type="number" value={completeAgreedPrice} onChange={e => setCompleteAgreedPrice(e.target.value)}
                  placeholder="Zadejte cenu zakázky v Kč"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 mb-4"
                  data-testid="agreed-price-input" autoFocus />
                {/* Photo upload section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Fotodokumentace (nepovinné)</label>
                  <div className="flex flex-wrap gap-2">
                    {completePhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200">
                        <img src={`${API.replace('/api', '')}${url}`} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCompletePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5" data-testid={`remove-complete-photo-${i}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {completePhotos.length < 20 && (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="add-complete-photo-btn">
                        {uploadingCompletePhoto ? (
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-zinc-400" />
                        )}
                        <input type="file" className="hidden" onChange={handleCompletePhotoUpload}
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingCompletePhoto} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Max 20 fotek. Můžete přidat i po dokončení.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCompleteType(null)}
                    className="flex-1 py-3 px-4 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50">
                    Zpět
                  </button>
                  <button onClick={handleCompleteDemand} disabled={completing || !completeAgreedPrice}
                    className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl disabled:opacity-50"
                    data-testid="confirm-complete-btn">
                    {completing ? 'Dokončuji...' : 'Potvrdit dokončení'}
                  </button>
                </div>
              </div>
            )}

            {completeType === 'price_increase' && (
              <div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <p className="text-orange-800 font-medium">Zakázka dokončena s navýšením ceny</p>
                </div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Původně sjednaná cena (Kč) <span className="text-red-500">*</span></label>
                <input type="number" value={completeAgreedPrice} onChange={e => setCompleteAgreedPrice(e.target.value)}
                  placeholder="Původní cena v Kč"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 mb-3"
                  data-testid="agreed-price-input" autoFocus />
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">O kolik bylo navýšení? (Kč) <span className="text-red-500">*</span></label>
                <input type="number" value={completePriceIncrease} onChange={e => setCompletePriceIncrease(e.target.value)}
                  placeholder="Částka navýšení v Kč"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 mb-3"
                  data-testid="price-increase-input" />
                {completeAgreedPrice && completePriceIncrease && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4 text-sm">
                    <span className="text-zinc-600">Konečná cena: </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{(parseFloat(completeAgreedPrice) + parseFloat(completePriceIncrease)).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}
                {/* Photo upload section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Fotodokumentace (nepovinné)</label>
                  <div className="flex flex-wrap gap-2">
                    {completePhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200">
                        <img src={`${API.replace('/api', '')}${url}`} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCompletePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {completePhotos.length < 20 && (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        {uploadingCompletePhoto ? (
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-zinc-400" />
                        )}
                        <input type="file" className="hidden" onChange={handleCompletePhotoUpload}
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingCompletePhoto} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Max 20 fotek. Můžete přidat i po dokončení.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setCompleteType(null); setCompletePriceIncrease(''); setCompleteAgreedPrice(''); }}
                    className="flex-1 py-3 px-4 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50">
                    Zpět
                  </button>
                  <button onClick={handleCompleteDemand} disabled={completing || !completePriceIncrease || !completeAgreedPrice}
                    className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:opacity-50"
                    data-testid="confirm-complete-btn">
                    {completing ? 'Dokončuji...' : 'Potvrdit dokončení'}
                  </button>
                </div>
              </div>
            )}

            {completeType === 'blacklist' && (
              <div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-800 font-medium">Zakázka dokončena — zákazník bude označen</p>
                </div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Sjednaná cena (Kč) <span className="text-red-500">*</span></label>
                <input type="number" value={completeAgreedPrice} onChange={e => setCompleteAgreedPrice(e.target.value)}
                  placeholder="Cena zakázky v Kč"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 mb-3"
                  data-testid="agreed-price-input" autoFocus />
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Důvod: <span className="text-red-500">*</span></label>
                <textarea value={completeBlacklistReason} onChange={e => setCompleteBlacklistReason(e.target.value)}
                  placeholder="Popište důvod..."
                  rows={3}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none mb-4"
                  data-testid="blacklist-reason-input" />
                {/* Photo upload section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">Fotodokumentace (nepovinné)</label>
                  <div className="flex flex-wrap gap-2">
                    {completePhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200">
                        <img src={`${API.replace('/api', '')}${url}`} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCompletePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {completePhotos.length < 20 && (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                        {uploadingCompletePhoto ? (
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-zinc-400" />
                        )}
                        <input type="file" className="hidden" onChange={handleCompletePhotoUpload}
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          disabled={uploadingCompletePhoto} />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Max 20 fotek. Můžete přidat i po dokončení.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setCompleteType(null); setCompleteBlacklistReason(''); setCompleteAgreedPrice(''); }}
                    className="flex-1 py-3 px-4 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50">
                    Zpět
                  </button>
                  <button onClick={handleCompleteDemand} disabled={completing || !completeBlacklistReason.trim() || !completeAgreedPrice}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl disabled:opacity-50"
                    data-testid="confirm-complete-btn">
                    {completing ? 'Dokončuji...' : 'Potvrdit dokončení'}
                  </button>
                </div>
              </div>
            )}

            {!completeType && (
              <button onClick={() => setShowCompleteDialog(false)}
                className="w-full mt-4 py-3 px-4 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50"
                data-testid="cancel-complete-btn">
                Zrušit
              </button>
            )}
          </div>
        </div>
      )}

      {showReviewModal && (
        <ReviewModal 
          demandId={id} 
          token={token} 
          onClose={() => setShowReviewModal(false)} 
        />
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)} data-testid="photo-lightbox">
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-white/70 hover:text-white" data-testid="close-lightbox-btn">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={`${API.replace('/api', '')}${lightboxPhoto.url}`} alt="Fotodokumentace"
              className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            <div className="mt-3 text-center">
              <p className="text-white/80 text-sm">{lightboxPhoto.uploaded_by_name}</p>
              <p className="text-white/50 text-xs">{new Date(lightboxPhoto.uploaded_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Soft Accept Modal */}
      {showSoftAcceptModal && (
        <SoftAcceptModal
          onSelect={handleSoftAccept}
          onClose={() => setShowSoftAcceptModal(false)}
          loading={softAccepting}
        />
      )}

      {/* Edit Demand Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowEditModal(false)}>
          <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="edit-demand-modal">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="font-bold text-zinc-900 dark:text-white text-lg">Upravit zakázku</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center" data-testid="close-edit-modal-btn">
                <X className="w-4 h-4 text-zinc-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Název</label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="edit-demand-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Popis</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  data-testid="edit-demand-description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Adresa</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="edit-demand-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Rozpočet od (Kč)</label>
                  <input
                    type="number"
                    value={editForm.budget_min || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget_min: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="edit-demand-budget-min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Rozpočet do (Kč)</label>
                  <input
                    type="number"
                    value={editForm.budget_max || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget_max: e.target.value ? parseFloat(e.target.value) : null }))}
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="edit-demand-budget-max"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Termín</label>
                <input
                  type="date"
                  value={editForm.deadline || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  data-testid="edit-demand-deadline"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Fotografie</label>
                <div className="flex flex-wrap gap-3">
                  {(editForm.images || []).map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200">
                      <img src={(() => { const u = img; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeEditPhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        data-testid={`remove-edit-photo-${i}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="add-edit-photo-btn">
                    {uploadingEditPhoto ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-zinc-400" />
                        <span className="text-xs text-zinc-400 mt-1">Přidat</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      onChange={handleEditPhotoUpload}
                      className="hidden"
                      disabled={uploadingEditPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="save-edit-demand-btn"
                >
                  {saving ? 'Ukládám...' : 'Uložit změny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewModal = ({ demandId, token, onClose }) => {
  const [rating, setRating] = useState(5);
  const [ratingPercentage, setRatingPercentage] = useState(80);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/reviews`, {
        demand_id: demandId,
        rating,
        comment,
        rating_percentage: ratingPercentage
      }, { headers: { Authorization: `Bearer ${token}` } });
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se odeslat hodnocení');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (pct) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getPercentageBarColor = (pct) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Ohodnoťte spolupráci</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-3">Hodnocení hvězdičkami</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-2"
                  data-testid={`rating-${value}`}
                >
                  <Star 
                    weight={value <= rating ? 'fill' : 'regular'} 
                    className={`w-8 h-8 ${value <= rating ? 'text-orange-500' : 'text-zinc-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Percentage slider */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Celkové hodnocení</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ratingPercentage}
                  onChange={(e) => setRatingPercentage(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-orange-500"
                  style={{
                    background: `linear-gradient(to right, ${ratingPercentage >= 80 ? '#22c55e' : ratingPercentage >= 50 ? '#f97316' : '#ef4444'} ${ratingPercentage}%, #e5e7eb ${ratingPercentage}%)`
                  }}
                  data-testid="rating-percentage-slider"
                />
                <div className="flex justify-between text-xs text-zinc-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className={`text-2xl font-bold min-w-[60px] text-right ${getPercentageColor(ratingPercentage)}`} data-testid="rating-percentage-value">
                {ratingPercentage}%
              </div>
            </div>
            <div className="mt-2 h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${getPercentageBarColor(ratingPercentage)}`}
                style={{ width: `${ratingPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Komentář</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Popište svou zkušenost..."
              rows={4}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              data-testid="review-comment-input"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-zinc-200 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Přeskočit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl disabled:opacity-50"
              data-testid="submit-review-btn"
            >
              {loading ? 'Odesílání...' : 'Odeslat hodnocení'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DemandDetail;

const SOFT_ACCEPT_REASONS = [
  "Zakázku bych přijal, ale zákazník musí zaplatit víc. Jeho cenová představa je nereálná.",
  "Požadovaný termín realizace je nevyhovující. Navrhněte například v chatu jiný termín.",
  "Nepřijímám platby kartou. Pouze hotovost.",
  "Zakázku bych přijal, ale nemám potřebné nářadí a vybavení. Pokud jej máte vy, zakázku přijmu.",
  "Zakázka je většího rozsahu a budu ji dělat více dnů. Navrhuji upřesnit termíny realizace přes chat."
];

const SoftAcceptModal = ({ onSelect, onClose, loading }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="soft-accept-modal">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-zinc-900 dark:text-white text-lg">Nezávazné přijetí — vyberte důvod</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center" data-testid="close-soft-accept-btn">
          <X className="w-4 h-4 text-zinc-600" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        {SOFT_ACCEPT_REASONS.map((reason, i) => (
          <button
            key={i}
            onClick={() => onSelect(reason)}
            disabled={loading}
            className="w-full text-left p-4 border border-zinc-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl transition-all text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
            data-testid={`soft-accept-reason-${i}`}
          >
            <span className="font-medium text-orange-500 mr-2">{i + 1}.</span>
            {reason}
          </button>
        ))}
      </div>
    </div>
  </div>
);
