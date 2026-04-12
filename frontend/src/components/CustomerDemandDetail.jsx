import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../App';
import axios from 'axios';
import {
  X, Check, MapPin, Calendar, Clock, Warning, ChatCircle, PaperPlaneTilt, Briefcase, FileText, NavigationArrow, Star
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const orangeMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const CustomerDemandDetail = ({ demand: d, token, isOpen, isUnverified, isInProgress, hasSupplier, onBack, onVerify, onRefresh, userId }) => {
  const isDispute = d.status === 'dispute';
  const isCompleted = d.status === 'completed';
  const canChat = hasSupplier && !isOpen;

  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [disputeData, setDisputeData] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(!!d.customer_rating);
  const [responding, setResponding] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [supplierLocation, setSupplierLocation] = useState(null);
  const [sharingMyLocation, setSharingMyLocation] = useState(false);
  const [sharingWorkLocation, setSharingWorkLocation] = useState(d.latitude && d.longitude ? true : false);
  const [myLocation, setMyLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const messagesEndRef = useRef(null);
  const chatPollRef = useRef(null);

  const fetchMessages = async () => {
    if (!canChat) return;
    try {
      const res = await axios.get(`${API}/messages/${d.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
    } catch { /* ignore */ }
  };

  const fetchDispute = async () => {
    if (d.dispute_status || isDispute) {
      try {
        const res = await axios.get(`${API}/demands/${d.id}/dispute`, { headers: { Authorization: `Bearer ${token}` } });
        setDisputeData(res.data.dispute);
      } catch { /* ignore */ }
    }
  };

  const fetchSupplierLocation = async () => {
    if (!d.assigned_supplier_id) return;
    try {
      const res = await axios.get(`${API}/users/${d.assigned_supplier_id}/location`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.latitude && res.data.longitude) setSupplierLocation(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (canChat) {
      fetchMessages();
      chatPollRef.current = setInterval(fetchMessages, 5000);
    }
    fetchDispute();

    // Poll for demand status changes (every 10s)
    const statusPoll = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/demands/my`, { headers: { Authorization: `Bearer ${token}` } });
        const updated = (res.data || []).find(x => x.id === d.id);
        if (updated && updated.status !== d.status) {
          // Status changed! Refresh parent and close detail
          if (onRefresh) onRefresh();
          if (onBack) onBack();
        }
      } catch { /* ignore */ }
    }, 10000);

    if (hasSupplier && !isOpen) {
      fetchSupplierLocation();
      const locInterval = setInterval(fetchSupplierLocation, 15000);
      return () => {
        if (chatPollRef.current) clearInterval(chatPollRef.current);
        clearInterval(statusPoll);
        clearInterval(locInterval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); clearInterval(statusPoll); };
  }, [d.id, canChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      await axios.post(`${API}/messages`, { demand_id: d.id, content: chatMessage.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessage('');
      fetchMessages();
    } catch (e) { console.error(e); }
    setSendingChat(false);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) { alert('Vyberte hodnocení (1-5 hvězd)'); return; }
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/demands/${d.id}/review`, {
        rating, review: reviewText.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      setReviewSubmitted(true);
    } catch (e) { alert(e.response?.data?.detail || 'Nepodařilo se odeslat hodnocení'); }
    setSubmittingReview(false);
  };

  const handleRequestLocation = async () => {
    setRequestingLocation(true);
    try {
      await axios.post(`${API}/demands/${d.id}/request-location`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setLocationRequested(true);
    } catch (e) { alert(e.response?.data?.detail || 'Nepodařilo se odeslat žádost'); }
    setRequestingLocation(false);
  };

  const toggleShareMyLocation = () => {
    if (sharingMyLocation) {
      // Stop sharing
      if (watchId) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setSharingMyLocation(false);
      setMyLocation(null);
      axios.post(`${API}/users/location`, { latitude: null, longitude: null }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    } else {
      if (!navigator.geolocation) { alert('Geolokace není podporována'); return; }
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setMyLocation(loc);
          axios.post(`${API}/users/location`, loc, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        },
        () => { alert('Přístup k poloze byl zamítnut'); setSharingMyLocation(false); },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      setWatchId(id);
      setSharingMyLocation(true);
    }
  };

  const toggleShareWorkLocation = () => {
    setSharingWorkLocation(prev => !prev);
  };

  const handleDisputeResponse = async (action) => {
    if (action === 'reject_budget' && !rejectReason.trim()) {
      alert('Uveďte důvod zamítnutí rozpočtu');
      return;
    }
    if (action === 'cancel' && !window.confirm('Opravdu chcete odmítnout dodavatele a ukončit zakázku?')) return;
    if (action === 'reopen' && !window.confirm('Chcete poptávku znovu vystavit jako novou?')) return;

    setResponding(true);
    try {
      const res = await axios.post(`${API}/demands/${d.id}/dispute/respond`, {
        action,
        reject_reason: action === 'reject_budget' ? rejectReason.trim() : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      onBack();
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se provést akci');
    }
    setResponding(false);
  };

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], dispute: ['V řešení', 'bg-amber-100 text-amber-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  return (
    <div data-testid="demand-detail">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors" data-testid="back-to-list">
        <X className="w-4 h-4" /> Zpět na seznam
      </button>
      <div className="flex gap-4 items-start">
        {/* Left column - detail (fixed width) */}
        <div className="space-y-4 w-full" style={{ maxWidth: canChat && showChat ? '55%' : '100%' }}>
      <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{d.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(d.status)}
          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium">{d.category}</span>
          {d.verified ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Ověřená</span>
          ) : (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">Neověřená</span>
          )}
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{d.description}</p>
        {isUnverified && isOpen && (
          <p className="text-red-600 dark:text-red-400 text-sm font-semibold leading-relaxed" data-testid="unverified-warning">
            U neověřených poptávek dodavatelé neuvidí Vaše iniciály, fotografie a online mapu. Nemohou také přiložit rozpočet. DOPORUČUJEME POPTÁVKU OVĚŘIT.
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" /> {d.address}</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" /> {new Date(d.created_at).toLocaleDateString('cs-CZ')}</span>
        </div>
        {(d.budget_min || d.budget_max) && (
          <p className="text-orange-500 font-semibold text-sm">Rozpočet: {d.budget_min ? `${Number(d.budget_min).toLocaleString('cs-CZ')} - ` : ''}{d.budget_max ? `${Number(d.budget_max).toLocaleString('cs-CZ')} Kč` : ''}</p>
        )}
        {d.deadline && (
          <p className="text-orange-500 font-semibold text-sm flex items-center gap-1.5"><Clock className="w-4 h-4" />
            {d.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' : d.deadline === 'ASAP' ? 'Pokud možno, co nejdříve' : `Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`}
          </p>
        )}
        {hasSupplier && d.assigned_supplier_name && (
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Přiřazený dodavatel</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-blue-500" /> {d.assigned_supplier_name}</p>
          </div>
        )}

        {/* Dispute notification for customer */}
        {isDispute && disputeData && disputeData.status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-4" data-testid="dispute-response">
            <div>
              <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">Dodavatel nahlásil problém</p>
              <p className="text-sm text-amber-600 dark:text-amber-400/80 mb-1"><strong>Důvod:</strong> {disputeData.reason_label}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400/80"><strong>Popis:</strong> {disputeData.description}</p>
            </div>
            {disputeData.photos?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {disputeData.photos.map((url, i) => (
                  <img key={i} src={url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`} alt="" className="w-20 h-20 object-cover rounded-lg border border-amber-200" />
                ))}
              </div>
            )}
            {disputeData.budget_files?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-700 mb-2">Rozpočet na více práce:</p>
                {disputeData.budget_files.map((url, i) => (
                  <a key={i} href={url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 underline mb-1">
                    <FileText className="w-4 h-4" /> Stáhnout rozpočet {i + 1}
                  </a>
                ))}
              </div>
            )}
            <hr className="border-amber-200 dark:border-amber-800" />
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Jak chcete pokračovat?</p>
            <div className="flex flex-col gap-2">
              {disputeData.reason_type === 'a' && (
                <>
                  <button onClick={() => handleDisputeResponse('confirm_budget')} disabled={responding}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors" data-testid="confirm-budget-btn">
                    <Check weight="bold" className="w-4 h-4 inline mr-1" /> Rozpočet na více práce potvrzuji
                  </button>
                  {showRejectForm ? (
                    <div className="space-y-2">
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Uveďte důvod zamítnutí rozpočtu..."
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm resize-none" />
                      <button onClick={() => handleDisputeResponse('reject_budget')} disabled={responding}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors" data-testid="reject-budget-submit">
                        Odeslat zamítnutí
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowRejectForm(true)}
                      className="w-full py-2.5 border border-red-300 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors" data-testid="reject-budget-btn">
                      <X className="w-4 h-4 inline mr-1" /> Rozpočet na více práce nepotvrzuji
                    </button>
                  )}
                </>
              )}
              <button onClick={() => handleDisputeResponse('cancel')} disabled={responding}
                className="w-full py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" data-testid="cancel-demand-btn">
                Nechci pokračovat
              </button>
              <button onClick={() => handleDisputeResponse('reopen')} disabled={responding}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors" data-testid="reopen-demand-btn">
                Poptávku chci znovu vystavit
              </button>
            </div>
          </div>
        )}

        {d.images && d.images.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Fotografie</p>
            <div className="flex gap-2 flex-wrap">
              {d.images.map((img, i) => (
                <img key={i} src={img.startsWith('http') ? img : `${API.replace('/api', '')}${img.startsWith('/') ? '' : '/'}${img}`} alt={`Foto ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
              ))}
            </div>
          </div>
        )}

        {/* Completion photos */}
        {isCompleted && d.completion_photos?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Fotografie dokončené práce</p>
            <div className="flex gap-2 flex-wrap">
              {d.completion_photos.map((img, i) => (
                <img key={i} src={img.startsWith('http') ? img : `${API.replace('/api', '')}${img}`} alt={`Dokončení ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
              ))}
            </div>
          </div>
        )}

        {/* Completed info */}
        {isCompleted && d.final_price && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Dokončeno za {Number(d.final_price).toLocaleString('cs-CZ')} Kč
              {d.completion_type === 'increased_price' && <span className="text-xs ml-2 text-orange-500">(s navýšením ceny)</span>}
            </p>
          </div>
        )}

        {/* Rating form for completed demands */}
        {isCompleted && !reviewSubmitted && (
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-5 border border-amber-200 dark:border-amber-800 space-y-3" data-testid="review-form">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">Ohodnoťte dodavatele</p>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                  <Star weight={s <= rating ? 'fill' : 'regular'} className={`w-8 h-8 ${s <= rating ? 'text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                </button>
              ))}
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2} placeholder="Napište recenzi (volitelné)..."
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white resize-none" />
            <button onClick={handleSubmitReview} disabled={submittingReview || rating === 0}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors" data-testid="submit-review-btn">
              {submittingReview ? 'Odesílám...' : 'Odeslat hodnocení'}
            </button>
          </div>
        )}
        {isCompleted && reviewSubmitted && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check weight="bold" className="w-4 h-4 inline mr-1" /> Hodnocení odesláno. Děkujeme!</p>
          </div>
        )}

        <hr className="border-zinc-200 dark:border-zinc-700" />
        <div className="flex gap-3 flex-wrap">
          {isOpen && (
            <>
              <button className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" data-testid="cancel-demand-action">
                <X className="w-4 h-4 inline mr-1" /> Zrušit zakázku
              </button>
              <Link to={`/zakazka/${d.id}`} className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" data-testid="edit-demand-action">
                Upravit zakázku
              </Link>
              {isUnverified && (
                <button onClick={onVerify} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors" data-testid="verify-demand-btn">
                  <Check weight="bold" className="w-4 h-4 inline mr-1" /> Ověřit zakázku za 49 Kč
                </button>
              )}
            </>
          )}
          {canChat && (
            <>
              <button onClick={() => { setShowChat(v => !v); if (!showChat) fetchMessages(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showChat ? 'bg-orange-500 text-white' : 'border border-orange-300 dark:border-orange-700 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'}`} data-testid="toggle-chat-btn">
                <ChatCircle className="w-4 h-4 inline mr-1" /> Online chat
              </button>
              <button onClick={handleRequestLocation} disabled={requestingLocation || locationRequested}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${locationRequested ? 'bg-emerald-500 text-white' : 'border border-blue-300 dark:border-blue-700 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`} data-testid="request-location-btn">
                <NavigationArrow className="w-4 h-4 inline mr-1" /> {locationRequested ? 'Žádost odeslána' : 'Požádat dodavatele o polohu'}
              </button>
            </>
          )}
          {canChat && (
            <div className="w-full flex flex-col gap-2 mt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer" data-testid="share-my-location-toggle">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Sdílet moji polohu</span>
                <button type="button" role="switch" aria-checked={sharingMyLocation} onClick={toggleShareMyLocation}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${sharingMyLocation ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${sharingMyLocation ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer" data-testid="share-work-location-toggle">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Sdílet polohu místa práce</span>
                <button type="button" role="switch" aria-checked={sharingWorkLocation} onClick={toggleShareWorkLocation}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${sharingWorkLocation ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${sharingWorkLocation ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>
          )}
        </div>
      </div>
      {(sharingWorkLocation || supplierLocation || myLocation) && (() => {
        const points = [];
        if (sharingWorkLocation && d.latitude && d.longitude) points.push({ lat: d.latitude, lng: d.longitude, type: 'work' });
        if (supplierLocation?.latitude) points.push({ lat: supplierLocation.latitude, lng: supplierLocation.longitude, type: 'supplier' });
        if (myLocation?.latitude) points.push({ lat: myLocation.latitude, lng: myLocation.longitude, type: 'customer' });
        if (points.length === 0) return null;
        const center = [points.reduce((s,p) => s+p.lat, 0)/points.length, points.reduce((s,p) => s+p.lng, 0)/points.length];
        const bounds = points.length > 1 ? points.map(p => [p.lat, p.lng]) : undefined;
        return (
          <div className="mt-4">
            <div className="flex gap-4 text-xs text-zinc-500 mb-2">
              {sharingWorkLocation && d.latitude && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Místo práce</span>}
              {supplierLocation?.latitude && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Dodavatel</span>}
              {myLocation?.latitude && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Moje poloha</span>}
            </div>
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-72">
              <MapContainer center={center} zoom={points.length > 1 ? 10 : 13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}
                bounds={bounds} boundsOptions={{ padding: [50, 50] }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {sharingWorkLocation && d.latitude && d.longitude && (
                  <Marker position={[d.latitude, d.longitude]} icon={orangeMarkerIcon}><Popup><strong>Místo práce</strong><br/><small>{d.address}</small></Popup></Marker>
                )}
                {supplierLocation?.latitude && (
                  <Marker position={[supplierLocation.latitude, supplierLocation.longitude]} icon={blueIcon}><Popup><strong>Dodavatel</strong></Popup></Marker>
                )}
                {myLocation?.latitude && (
                  <Marker position={[myLocation.latitude, myLocation.longitude]} icon={greenIcon}><Popup><strong>Moje poloha</strong></Popup></Marker>
                )}
                {supplierLocation?.latitude && sharingWorkLocation && d.latitude && (
                  <Polyline positions={[[supplierLocation.latitude, supplierLocation.longitude], [d.latitude, d.longitude]]} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '8, 8' }} />
                )}
              </MapContainer>
            </div>
          </div>
        );
      })()}
        </div>
        {/* Right column - chat */}
        {canChat && showChat && (
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden sticky top-4" data-testid="inline-chat">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <ChatCircle weight="bold" className="w-5 h-5 text-orange-500" />
              {messages.length > 0 && <span className="text-xs text-zinc-400">({messages.length} zpráv)</span>}
            </div>
            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50">
              {messages.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-8">Zatím žádné zprávy. Napište dodavateli.</p>
              ) : messages.map((msg, i) => {
                const isMine = msg.sender_id === userId;
                return (
                  <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-orange-500 text-white rounded-br-md' : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-md'}`}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-orange-200' : 'text-zinc-400'}`}>{new Date(msg.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
              <input value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Napište zprávu..." className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="chat-input" />
              <button onClick={handleSendMessage} disabled={!chatMessage.trim() || sendingChat}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition-colors" data-testid="chat-send-btn">
                <PaperPlaneTilt weight="bold" className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDemandDetail;
