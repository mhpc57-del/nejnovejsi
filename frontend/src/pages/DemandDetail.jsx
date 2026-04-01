import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  ArrowLeft, MapPin, Calendar, User, Clock, Check, X,
  PaperPlaneTilt, Star, ChatCircle, Phone, NavigationArrow
} from '@phosphor-icons/react';
import LiveMap from '../components/LiveMap';

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
  const chatPollRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const prevDemandStatusRef = useRef(null);
  const messagesEndRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const [statusNotification, setStatusNotification] = useState(null);

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
      
      // Play sound if new messages arrived from the other user
      if (prevMessageCountRef.current > 0 && newMessages.length > prevMessageCountRef.current) {
        const latestMsg = newMessages[newMessages.length - 1];
        if (latestMsg.sender_id !== user?.id) {
          playNotificationSound();
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
      // Fetch customer location
      if (demandData.customer_id) {
        const customerRes = await axios.get(`${API}/users/${demandData.customer_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (customerRes.data.location) {
          setCustomerLocation(customerRes.data.location);
        }
      }
      
      // Fetch supplier location
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    try {
      await axios.post(`${API}/demands/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      setShowReviewModal(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se dokončit zakázku');
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
      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Zakázka nenalezena</p>
          <button onClick={() => navigate(-1)} className="text-orange-500 hover:text-orange-600">
            Zpět
          </button>
        </div>
      </div>
    );
  }

  const isCustomer = user?.id === demand.customer_id;
  const isAssignedSupplier = user?.id === demand.assigned_supplier_id;
  const canChat = isCustomer || isAssignedSupplier || (user?.role === 'supplier' && demand.status === 'open');
  const canAccept = user?.role === 'supplier' && demand.status === 'open';
  const canComplete = (isCustomer || isAssignedSupplier) && demand.status === 'in_progress';
  const canCancel = isCustomer && (demand.status === 'open' || demand.status === 'in_progress');
  const showMapButton = demand.status === 'in_progress' && (isCustomer || isAssignedSupplier);

  // Mock destination location from address (in real app, would use geocoding)
  const destinationLocation = demand.latitude && demand.longitude 
    ? { lat: demand.latitude, lng: demand.longitude }
    : { lat: 49.8175 + (Math.random() * 0.1 - 0.05), lng: 15.4730 + (Math.random() * 0.1 - 0.05) };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Craft</span>
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
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Live Map */}
        {showMap && demand.status === 'in_progress' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <NavigationArrow className="w-5 h-5 text-orange-500" />
              Live sledování
            </h2>
            <LiveMap
              customerLocation={customerLocation}
              supplierLocation={supplierLocation}
              destinationLocation={destinationLocation}
              customerName={demand.customer_name}
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
            <button onClick={() => setStatusNotification(null)} className="text-gray-400 hover:text-gray-600" data-testid="dismiss-notification-btn">
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
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{demand.title}</h1>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(demand.status)}
                    <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                      {demand.category}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-6">{demand.description}</p>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  {demand.address}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  {new Date(demand.created_at).toLocaleDateString('cs-CZ')}
                </div>
                {demand.budget_max && (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    Rozpočet: {demand.budget_min ? `${demand.budget_min} - ` : ''}{demand.budget_max} Kč
                  </div>
                )}
                {demand.deadline && (
                  <div className="flex items-center gap-2 text-orange-600 font-medium" data-testid="demand-deadline-display">
                    <Clock className="w-5 h-5" />
                    Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
                {canAccept && (
                  <button
                    onClick={handleAcceptDemand}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium text-white transition-colors flex items-center gap-2"
                    data-testid="accept-demand-btn"
                  >
                    <Check weight="bold" className="w-5 h-5" />
                    Přijmout zakázku
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={handleCompleteDemand}
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
            </div>

            {/* Chat */}
            {canChat && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <ChatCircle className="w-5 h-5 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Chat</h2>
                </div>

                <div className="h-80 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
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
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className={`text-xs mb-1 ${msg.sender_id === user?.id ? 'text-orange-100' : 'text-gray-500'}`}>
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
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Zákazník</h3>
              <Link to={`/profil/${demand.customer_id}`} className="flex items-center gap-3 group cursor-pointer" data-testid="customer-profile-link">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <User className="w-6 h-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{demand.customer_name}</p>
                  <p className="text-sm text-gray-500">Zákazník — zobrazit profil</p>
                </div>
              </Link>
            </div>

            {/* Supplier Info */}
            {demand.assigned_supplier_id && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Přiřazený dodavatel</h3>
                <Link to={`/profil/${demand.assigned_supplier_id}`} className="flex items-center gap-3 group cursor-pointer" data-testid="supplier-profile-link">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <User className="w-6 h-6 text-orange-500 group-hover:text-orange-700 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{demand.assigned_supplier_name}</p>
                    <p className="text-sm text-gray-500">Dodavatel — zobrazit profil</p>
                  </div>
                </Link>
                {demand.accepted_at && (
                  <p className="text-xs text-gray-400 mt-3">
                    Přijato: {new Date(demand.accepted_at).toLocaleDateString('cs-CZ')}
                  </p>
                )}
              </div>
            )}

            {/* Quick Map Preview (when not in full map mode) */}
            {demand.status === 'in_progress' && !showMap && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Poloha</h3>
                  <button
                    onClick={() => setShowMap(true)}
                    className="text-orange-500 hover:text-orange-600 text-sm font-medium"
                    data-testid="show-map-btn"
                  >
                    Zobrazit mapu
                  </button>
                </div>
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-center p-4">
                    <NavigationArrow className="w-12 h-12 text-orange-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Klikněte pro sledování polohy</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal 
          demandId={id} 
          token={token} 
          onClose={() => setShowReviewModal(false)} 
        />
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
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Ohodnoťte spolupráci</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Hodnocení hvězdičkami</label>
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
                    className={`w-8 h-8 ${value <= rating ? 'text-orange-500' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Percentage slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Celkové hodnocení</label>
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
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className={`text-2xl font-bold min-w-[60px] text-right ${getPercentageColor(ratingPercentage)}`} data-testid="rating-percentage-value">
                {ratingPercentage}%
              </div>
            </div>
            <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${getPercentageBarColor(ratingPercentage)}`}
                style={{ width: `${ratingPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Komentář</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Popište svou zkušenost..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              data-testid="review-comment-input"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
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
