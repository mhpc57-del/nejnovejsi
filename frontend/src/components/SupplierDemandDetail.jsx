import React, { useState, useEffect, useRef } from 'react';
import { API } from '../App';
import axios from 'axios';
import {
  X, Check, MapPin, Calendar, Clock, Warning, User, ChatCircle, PaperPlaneTilt, Briefcase,
  Upload, FileText
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

const DISPUTE_OPTIONS = [
  { key: 'a', label: 'Zakázku dodělám, ale zákazník musí potvrdit rozpočet na více práce.', hasBudget: true },
  { key: 'b', label: 'Přijel jsem na určené místo, ale zákazník neotevřel dveře, nebo jsem se nemohl dostat přes uzamčený plot.' },
  { key: 'c', label: 'Místo práce je nedostupné, nebo jsou na staveništi překážky, které brání k zahájení nebo pokračování mojí práce.' },
  { key: 'd', label: 'Nemohl jsem se dostavit z náhlého důvodu (porucha vozidla, nemoc, výluka autobusu). Zákazníkovi se omluvím na online chatu a napíši náhradní termín.' },
  { key: 'e', label: 'Zákazník neměl peníze na více práce.' },
  { key: 'f', label: 'Jiný důvod — popíši vlastními slovy', hasCustomDescription: true },
];

const SupplierDemandDetail = ({ demand: d, token, userId, onBack, onAccept, onRefresh }) => {
  const isVerified = d.verified;
  const isOpen = d.status === 'open';
  const isInProgress = d.status === 'in_progress';
  const isPendingCompletion = d.status === 'pending_completion';
  const isDispute = d.status === 'dispute';
  const isAssigned = d.assigned_supplier_id === userId;
  const canChat = isAssigned && !isOpen;
  const [verificationRequested, setVerificationRequested] = useState(
    () => Array.isArray(d.verification_requests) && d.verification_requests.some(r => r.supplier_id === userId)
  );

  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef(null);
  const chatPollRef = useRef(null);

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeStep, setDisputeStep] = useState(1);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputePhotos, setDisputePhotos] = useState([]);
  const [disputeReason, setDisputeReason] = useState('');
  const [budgetFiles, setBudgetFiles] = useState([]);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [uploadingDisputePhoto, setUploadingDisputePhoto] = useState(false);
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [disputeData, setDisputeData] = useState(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeType, setCompleteType] = useState('');
  const [completionPrice, setCompletionPrice] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [uploadingCompletionPhoto, setUploadingCompletionPhoto] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);

  // Auto-enable location sharing if previously enabled
  useEffect(() => {
    const checkLocationSharing = async () => {
      try {
        const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.location_sharing) {
          setLocationShared(true);
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                await axios.post(`${API}/users/location`, loc, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                setMyLocation(loc);
              },
              () => {}
            );
          }
        }
      } catch {}
    };
    if (isAssigned && !isOpen) checkLocationSharing();
  }, [d.id]);

  const fetchCustomerLocation = async () => {
    if (!d.customer_id) return;
    try {
      const res = await axios.get(`${API}/users/${d.customer_id}/location`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.latitude && res.data.longitude) setCustomerLocation(res.data);
    } catch { /* ignore */ }
  };

  const fetchMessages = async () => {
    if (!canChat) return;
    try {
      const res = await axios.get(`${API}/messages/${d.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
    } catch { /* ignore */ }
  };

  const fetchDispute = async () => {
    if (d.dispute_status) {
      try {
        const res = await axios.get(`${API}/demands/${d.id}/dispute`, { headers: { Authorization: `Bearer ${token}` } });
        setDisputeData(res.data.dispute);
      } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    if (canChat) {
      fetchMessages();
      chatPollRef.current = setInterval(fetchMessages, 5000);
    }
    fetchDispute();
    if (isAssigned && !isOpen) fetchCustomerLocation();

    // Poll for demand status changes (every 10s)
    const statusPoll = setInterval(async () => {
      try {
        const [avRes, myRes] = await Promise.all([
          axios.get(`${API}/demands/available`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/demands/my`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const all = [...(avRes.data || []), ...(myRes.data || [])];
        const updated = all.find(x => x.id === d.id);
        if (updated && updated.status !== d.status) {
          if (onRefresh) onRefresh();
          if (onBack) onBack();
        }
      } catch { /* ignore */ }
    }, 10000);

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

  const handleRequestVerification = async () => {
    try {
      await axios.post(`${API}/demands/${d.id}/request-verification`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setVerificationRequested(true);
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se odeslat žádost');
    }
  };

  const handleCompleteDemand = async () => {
    if (!completeType) { alert('Vyberte typ dokončení'); return; }
    const price = parseFloat(completionPrice);
    if (!price || price <= 0) { alert('Zadejte platnou cenu'); return; }
    setSubmittingComplete(true);
    try {
      await axios.post(`${API}/demands/${d.id}/complete`, {
        completion_type: completeType,
        final_price: price,
        completion_photos: completionPhotos,
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Zakázka byla označena jako dokončená.');
      onBack();
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se dokončit zakázku');
    }
    setSubmittingComplete(false);
  };

  const handleUploadCompletionPhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCompletionPhoto(true);
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file);
        const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCompletionPhotos(prev => [...prev, res.data.url]);
      } catch { /* ignore */ }
    }
    setUploadingCompletionPhoto(false);
    e.target.value = '';
  };

  const handleShareLocation = () => {
    if (locationShared) {
      setLocationShared(false);
      setMyLocation(null);
      axios.post(`${API}/users/location`, { latitude: null, longitude: null },
        { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      return;
    }
    if (!navigator.geolocation) { alert('Geolokace není podporována'); return; }
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          await axios.post(`${API}/users/location`, loc, { headers: { Authorization: `Bearer ${token}` } });
          setLocationShared(true);
          setMyLocation(loc);
        } catch { alert('Nepodařilo se sdílet polohu'); }
        setSharingLocation(false);
      },
      () => { alert('Přístup k poloze byl zamítnut'); setSharingLocation(false); }
    );
  };

  const handleUploadDisputePhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (disputePhotos.length + files.length > 20) { alert('Maximálně 20 fotografií'); return; }
    setUploadingDisputePhoto(true);
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file);
        const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDisputePhotos(prev => [...prev, res.data.url]);
      } catch { /* ignore */ }
    }
    setUploadingDisputePhoto(false);
    e.target.value = '';
  };

  const handleUploadBudget = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBudget(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await axios.post(`${API}/upload/public`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBudgetFiles(prev => [...prev, { url: res.data.url, name: file.name }]);
    } catch { /* ignore */ }
    setUploadingBudget(false);
    e.target.value = '';
  };

  const handleSubmitDispute = async () => {
    if (!disputeReason) { alert('Vyberte důvod'); return; }
    const selectedOpt = DISPUTE_OPTIONS.find(o => o.key === disputeReason);
    if (selectedOpt?.hasCustomDescription && !disputeDescription.trim()) { alert('Popište situaci'); return; }
    if (selectedOpt?.hasBudget && budgetFiles.length === 0) { alert('Přiložte rozpočet na více práce'); return; }
    const desc = selectedOpt?.hasCustomDescription ? disputeDescription.trim() : selectedOpt?.label || '';
    setSubmittingDispute(true);
    try {
      await axios.post(`${API}/demands/${d.id}/dispute`, {
        reason_type: disputeReason, description: desc,
        photos: disputePhotos, budget_files: budgetFiles.map(f => f.url),
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Spor byl vytvořen a zákazník byl informován.');
      setShowDisputeForm(false);
      onBack();
      onRefresh();
    } catch (error) { alert(error.response?.data?.detail || 'Nepodařilo se vytvořit spor'); }
    setSubmittingDispute(false);
  };

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], pending_completion: ['K potvrzení', 'bg-purple-100 text-purple-700'], dispute: ['V řešení', 'bg-amber-100 text-amber-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  if (showDisputeForm) {
    const selectedOption = DISPUTE_OPTIONS.find(o => o.key === disputeReason);
    return (
      <div data-testid="dispute-form">
        <button onClick={() => { if (disputeStep === 2) setDisputeStep(1); else setShowDisputeForm(false); }} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors">
          <X className="w-4 h-4" /> {disputeStep === 2 ? 'Zpět' : 'Zrušit'}
        </button>
        {disputeStep === 1 && (
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Zakázku nelze dodělat</h2>
            <p className="text-sm text-zinc-500">Krok 1/2 — Vyberte důvod</p>
            <div className="space-y-3">
              {DISPUTE_OPTIONS.map(opt => (
                <label key={opt.key} className={`block p-4 border rounded-xl cursor-pointer transition-all ${disputeReason === opt.key ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}>
                  <div className="flex items-start gap-3">
                    <input type="radio" name="disputeReason" value={opt.key} checked={disputeReason === opt.key} onChange={() => setDisputeReason(opt.key)} className="mt-0.5 accent-orange-500" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{opt.label}</span>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={() => { if (!disputeReason) { alert('Vyberte důvod'); return; } setDisputeStep(2); }}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50" disabled={!disputeReason} data-testid="dispute-next-step">
              Pokračovat
            </button>
          </div>
        )}
        {disputeStep === 2 && (
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Doplňující informace</h2>
            <p className="text-sm text-zinc-500">Krok 2/2 — {selectedOption?.label}</p>
            {/* Custom description for option "f" */}
            {selectedOption?.hasCustomDescription && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Popište situaci vlastními slovy *</label>
                <textarea value={disputeDescription} onChange={e => setDisputeDescription(e.target.value)} rows={4} placeholder="Popište, co se stalo a proč zakázku nelze dokončit..."
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="dispute-description" />
              </div>
            )}
            {/* Budget upload for option "a" */}
            {selectedOption?.hasBudget && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-800 rounded-xl p-5">
                <p className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-3">Přiložte rozpočet na více práce *</p>
                <div className="space-y-2 mb-3">
                  {budgetFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <FileText className="w-4 h-4 text-orange-500" /><span className="truncate flex-1">{f.name}</span>
                      <button onClick={() => setBudgetFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 rounded-lg text-sm text-orange-700 hover:bg-orange-100 cursor-pointer transition-colors">
                  {uploadingBudget ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" /> : <Upload className="w-4 h-4" />}
                  Nahrát rozpočet (Excel, PDF, foto)
                  <input type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleUploadBudget} className="hidden" disabled={uploadingBudget} />
                </label>
              </div>
            )}
            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fotografie (volitelné, max. 20)</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {disputePhotos.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`} alt="" className="w-20 h-20 object-cover rounded-lg border border-zinc-200" />
                    <button onClick={() => setDisputePhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                {uploadingDisputePhoto ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" /> : <Upload className="w-4 h-4" />}
                Nahrát fotografie
                <input type="file" accept="image/*" multiple onChange={handleUploadDisputePhoto} className="hidden" disabled={uploadingDisputePhoto} />
              </label>
              <span className="text-xs text-zinc-400 ml-2">{disputePhotos.length}/20</span>
            </div>
            <button onClick={handleSubmitDispute} disabled={submittingDispute || (selectedOption?.hasCustomDescription && !disputeDescription.trim()) || (selectedOption?.hasBudget && budgetFiles.length === 0)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors" data-testid="dispute-submit">
              {submittingDispute ? 'Odesílám...' : 'Odeslat zákazníkovi'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="supplier-demand-detail">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors"><X className="w-4 h-4" /> Zpět na seznam</button>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left column - demand detail */}
        <div className={`space-y-4 w-full ${canChat && showChat ? 'lg:max-w-[55%]' : ''}`}>
          <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{d.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(d.status)}
          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium">{d.category}</span>
          {isVerified ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Ověřená</span> : <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">Neověřená</span>}
          {isVerified && d.customer_name && (
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium flex items-center gap-1">
              <User className="w-3 h-3" /> {d.customer_name}
            </span>
          )}
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{d.description}</p>
        <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" /> {d.address}</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" /> {new Date(d.created_at).toLocaleDateString('cs-CZ')}</span>
        </div>
        {(d.budget_min || d.budget_max) && (
          <p className="text-orange-500 font-semibold text-sm">Rozpočet: {d.budget_min ? `${Number(d.budget_min).toLocaleString('cs-CZ')} - ` : ''}{d.budget_max ? `${Number(d.budget_max).toLocaleString('cs-CZ')} Kč` : ''}</p>
        )}
        {d.deadline && (
          <p className="text-orange-500 font-semibold text-sm flex items-center gap-1.5"><Clock className="w-4 h-4" />
            {d.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' : d.deadline === 'ASAP' ? 'Co nejdříve' : `Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`}
          </p>
        )}
        {!isVerified && isOpen && (
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-800 rounded-xl p-5" data-testid="unverified-notice">
            <div className="flex items-start gap-3">
              <Warning weight="bold" className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400 text-sm mb-1">Neověřená poptávka</p>
                <p className="text-sm text-orange-600 dark:text-orange-400/80 leading-relaxed">Informace o zákazníkovi, fotografie, online poloha a možnost nahrání rozpočtu jsou skryté. Zákazník musí nejprve ověřit poptávku.</p>
              </div>
            </div>
          </div>
        )}
        {isDispute && disputeData && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5" data-testid="dispute-info">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-sm mb-2">Spor — čeká na odpověď zákazníka</p>
            <p className="text-sm text-amber-600 dark:text-amber-400/80 mb-1"><strong>Důvod:</strong> {disputeData.reason_label}</p>
            <p className="text-sm text-amber-600 dark:text-amber-400/80"><strong>Popis:</strong> {disputeData.description}</p>
          </div>
        )}
        {d.images && d.images.length > 0 && isVerified && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Fotografie</p>
            <div className="flex gap-2 flex-wrap">
              {d.images.map((img, i) => (
                <img key={i} src={img.startsWith('http') ? img : `${API.replace('/api', '')}${img.startsWith('/') ? '' : '/'}${img}`} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
              ))}
            </div>
          </div>
        )}
        <hr className="border-zinc-200 dark:border-zinc-700" />
        <div className="flex gap-3 flex-wrap">
          {isVerified && isOpen && (
            <button onClick={() => onAccept(d.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors" data-testid="accept-demand-btn"><Check weight="bold" className="w-4 h-4 inline mr-1" /> Přijmout zakázku</button>
          )}
          {!isVerified && isOpen && (
            <>
              <button onClick={() => onAccept(d.id)} className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors" data-testid="accept-unverified-btn">
                <Check weight="bold" className="w-4 h-4 inline mr-1" /> Risknu to a zakázku přijímám bez ověření
              </button>
              {verificationRequested ? (
                <p className="w-full text-sm text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <Check weight="bold" className="w-4 h-4 inline mr-1" /> Návrh na ověření úspěšně odeslán zákazníkovi.
                </p>
              ) : (
                <button onClick={handleRequestVerification} className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors" data-testid="request-verification-btn">
                  <Warning weight="bold" className="w-4 h-4 inline mr-1.5" /> Zakázku bych přijmul, ale poptávka není ověřena
                </button>
              )}
            </>
          )}
          {isInProgress && isAssigned && (
            <>
              {showCompleteForm ? (
                <div className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-4">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Dokončení zakázky</p>
                  <div className="space-y-2">
                    <label className={`block p-3 border rounded-lg cursor-pointer transition-all ${completeType === 'agreed_price' ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="completeType" value="agreed_price" checked={completeType === 'agreed_price'} onChange={() => setCompleteType('agreed_price')} className="accent-emerald-500" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Zakázku jsem dokončil za předem dohodnutou cenu</span>
                      </div>
                    </label>
                    <label className={`block p-3 border rounded-lg cursor-pointer transition-all ${completeType === 'increased_price' ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      <div className="flex items-center gap-2">
                        <input type="radio" name="completeType" value="increased_price" checked={completeType === 'increased_price'} onChange={() => setCompleteType('increased_price')} className="accent-emerald-500" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Zakázku jsem dokončil s navýšením ceny</span>
                      </div>
                    </label>
                  </div>
                  {completeType && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Konečná cena (Kč) *</label>
                      <input type="number" value={completionPrice} onChange={e => setCompletionPrice(e.target.value)} placeholder="Zadejte částku v Kč"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white" />
                    </div>
                  )}
                  {/* Completion photos */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fotografie dokončené práce</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {completionPhotos.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`} alt="" className="w-20 h-20 object-cover rounded-lg border border-zinc-200" />
                          <button onClick={() => setCompletionPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-300 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors">
                      {uploadingCompletionPhoto ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" /> : <Upload className="w-4 h-4" />}
                      Nahrát fotografie
                      <input type="file" accept="image/*" multiple onChange={handleUploadCompletionPhoto} className="hidden" disabled={uploadingCompletionPhoto} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCompleteForm(false)} className="px-4 py-2 border border-zinc-300 text-zinc-600 rounded-lg text-sm">Zrušit</button>
                    <button onClick={handleCompleteDemand} disabled={submittingComplete || !completeType || !completionPrice}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors" data-testid="submit-complete">
                      {submittingComplete ? 'Odesílám...' : 'Potvrdit dokončení'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCompleteForm(true)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors" data-testid="complete-demand-btn">
                  <Check weight="bold" className="w-4 h-4 inline mr-1" /> Zakázku jsem dokončil
                </button>
              )}
              <button onClick={() => setShowDisputeForm(true)} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" data-testid="cannot-complete-btn"><X className="w-4 h-4 inline mr-1" /> Zakázku nelze dodělat</button>
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-2 cursor-pointer" data-testid="share-location-btn">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">Sdílení polohy</span>
                  <button type="button" role="switch" aria-checked={locationShared} onClick={handleShareLocation} disabled={sharingLocation}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${locationShared ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'} ${sharingLocation ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${locationShared ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </label>
                <p className="text-sm text-red-500 dark:text-red-400 font-semibold leading-relaxed ml-6">Doporučujeme Vám povolené sdílení Vaší polohy pro vyšší důvěryhodnost zákazníků, kteří tak mají vždy přehled o vašem příjezdu.</p>
              </div>
              {canChat && (
                <button onClick={() => { setShowChat(v => !v); if (!showChat) fetchMessages(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showChat ? 'bg-orange-500 text-white' : 'border border-orange-300 dark:border-orange-700 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'}`} data-testid="toggle-chat-btn">
                  <ChatCircle className="w-4 h-4 inline mr-1" /> Online chat
                </button>
              )}
            </>
          )}
          {/* Pending completion states */}
          {isPendingCompletion && isAssigned && d.completion_initiated_by === 'supplier' && (
            <div className="w-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4" data-testid="pending-completion-waiting-supplier">
              <p className="font-bold text-purple-700 dark:text-purple-400 mb-1">Čeká se na potvrzení od zákazníka</p>
              <p className="text-sm text-purple-600 dark:text-purple-400/80">Označili jste zakázku jako dokončenou. Zákazník musí dokončení potvrdit nebo odmítnout.</p>
              {d.completion_photos?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-purple-500 mb-1">Vaše fotky:</p>
                  <div className="flex gap-2 flex-wrap">
                    {d.completion_photos.map((p, i) => (
                      <img key={i} src={((p.url || p).startsWith('http') ? (p.url || p) : `${API.replace('/api', '')}${p.url || p}`)} alt="" className="w-16 h-16 object-cover rounded-lg border border-purple-200" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {isPendingCompletion && isAssigned && d.completion_initiated_by === 'customer' && (
            <div className="w-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-800 rounded-xl p-5 space-y-4" data-testid="pending-completion-confirm-supplier">
              <p className="font-bold text-purple-700 dark:text-purple-400">Zákazník označil zakázku jako dokončenou</p>
              <p className="text-sm text-purple-600 dark:text-purple-400/80">Potvrďte, že souhlasíte s dokončením.</p>
              <div className="flex gap-3">
                <button onClick={async () => {
                  try {
                    await axios.post(`${API}/demands/${d.id}/complete`, { completion_type: 'standard', final_price: d.final_price || 0 }, { headers: { Authorization: `Bearer ${token}` } });
                    alert('Dokončení potvrzeno!');
                    onBack(); onRefresh();
                  } catch (err) { alert(err.response?.data?.detail || 'Chyba'); }
                }} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors" data-testid="confirm-completion-supplier-btn">
                  <Check weight="bold" className="w-4 h-4 inline mr-1" /> Souhlasím s dokončením
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
          {(isVerified || isInProgress || isPendingCompletion || isAssigned) && d.latitude && d.longitude && (() => {
            const points = [];
            if (d.latitude && d.longitude) points.push({ lat: d.latitude, lng: d.longitude, type: 'work' });
            if (myLocation?.latitude) points.push({ lat: myLocation.latitude, lng: myLocation.longitude, type: 'supplier' });
            if (customerLocation?.latitude) points.push({ lat: customerLocation.latitude, lng: customerLocation.longitude, type: 'customer' });
            if (points.length === 0) return null;
            const center = [points.reduce((s,p) => s+p.lat, 0)/points.length, points.reduce((s,p) => s+p.lng, 0)/points.length];
            const bounds = points.length > 1 ? points.map(p => [p.lat, p.lng]) : undefined;
            return (
              <div className="mt-4">
                <div className="flex gap-4 text-xs text-zinc-500 mb-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Místo práce</span>
                  {myLocation && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Moje poloha</span>}
                  {customerLocation?.latitude && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Zákazník</span>}
                </div>
                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-72">
                  <MapContainer center={center} zoom={points.length > 1 ? 10 : 13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}
                    bounds={bounds} boundsOptions={{ padding: [50, 50] }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <Marker position={[d.latitude, d.longitude]} icon={orangeMarkerIcon}><Popup><strong>Místo práce</strong><br/><small>{d.address}</small></Popup></Marker>
                    {myLocation?.latitude && (
                      <Marker position={[myLocation.latitude, myLocation.longitude]} icon={blueIcon}><Popup><strong>Moje poloha</strong></Popup></Marker>
                    )}
                    {customerLocation?.latitude && (
                      <Marker position={[customerLocation.latitude, customerLocation.longitude]} icon={greenIcon}><Popup><strong>Zákazník</strong></Popup></Marker>
                    )}
                    {myLocation?.latitude && d.latitude && (
                      <Polyline positions={[[myLocation.latitude, myLocation.longitude], [d.latitude, d.longitude]]} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '8, 8' }} />
                    )}
                  </MapContainer>
                </div>
              </div>
            );
          })()}
        </div>
        {/* Right column - chat */}
        {canChat && showChat && (
          <div className="w-full lg:w-auto lg:min-w-[380px] bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden lg:sticky lg:top-4" data-testid="inline-chat">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <ChatCircle weight="bold" className="w-5 h-5 text-orange-500" />
              {messages.length > 0 && <span className="text-xs text-zinc-400">({messages.length} zpráv)</span>}
            </div>
            <div className="h-[300px] lg:h-[400px] overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50">
              {messages.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-8">Zatím žádné zprávy. Napište zákazníkovi.</p>
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

export default SupplierDemandDetail;
