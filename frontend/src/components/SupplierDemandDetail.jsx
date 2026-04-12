import React, { useState, useEffect, useRef } from 'react';
import { API } from '../App';
import axios from 'axios';
import {
  X, Check, MapPin, Calendar, Clock, Warning, User, ChatCircle, PaperPlaneTilt, Briefcase
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SupplierDemandDetail = ({ demand: d, token, userId, onBack, onAccept, onRefresh }) => {
  const isVerified = d.verified;
  const isOpen = d.status === 'open';
  const isInProgress = d.status === 'in_progress';
  const isAssigned = d.assigned_supplier_id === userId;
  const canChat = isAssigned && !isOpen;

  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesEndRef = useRef(null);
  const chatPollRef = useRef(null);

  const fetchMessages = async () => {
    if (!canChat) return;
    try {
      const res = await axios.get(`${API}/messages/${d.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (canChat) {
      fetchMessages();
      chatPollRef.current = setInterval(fetchMessages, 5000);
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
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
      alert('Žádost o ověření byla odeslána zákazníkovi emailem i SMS.');
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se odeslat žádost');
    }
  };

  const handleCannotComplete = async () => {
    const reason = prompt('Uveďte důvod, proč zakázku nelze dodělat:');
    if (!reason || !reason.trim()) return;
    try {
      await axios.post(`${API}/demands/${d.id}/cannot-complete`, { reason: reason.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Zakázka byla označena jako nedokončitelná. Zákazník byl informován.');
      onBack();
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se provést akci');
    }
  };

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  return (
    <div data-testid="supplier-demand-detail">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors">
        <X className="w-4 h-4" /> Zpět na seznam
      </button>
      <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{d.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(d.status)}
          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-medium">{d.category}</span>
          {isVerified ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Ověřená</span>
          ) : (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">Neověřená</span>
          )}
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{d.description}</p>

        <div className="flex items-center gap-4 text-sm text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-400" /> {d.address}</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-400" /> {new Date(d.created_at).toLocaleDateString('cs-CZ')}</span>
        </div>

        {(d.budget_min || d.budget_max) && (
          <p className="text-orange-500 font-semibold text-sm">
            Rozpočet: {d.budget_min ? `${Number(d.budget_min).toLocaleString('cs-CZ')} - ` : ''}{d.budget_max ? `${Number(d.budget_max).toLocaleString('cs-CZ')} Kč` : ''}
          </p>
        )}

        {d.deadline && (
          <p className="text-orange-500 font-semibold text-sm flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {d.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' : d.deadline === 'ASAP' ? 'Co nejdříve' : `Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`}
          </p>
        )}

        {/* Customer info - ONLY for verified demands */}
        {isVerified && d.customer_name && (
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Zákazník</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
              <User className="w-4 h-4 text-zinc-400" /> {d.customer_name}
            </p>
          </div>
        )}

        {/* Unverified demand restriction notice */}
        {!isVerified && isOpen && (
          <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-800 rounded-xl p-5" data-testid="unverified-notice">
            <div className="flex items-start gap-3">
              <Warning weight="bold" className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400 text-sm mb-1">Neověřená poptávka</p>
                <p className="text-sm text-orange-600 dark:text-orange-400/80 leading-relaxed">
                  Informace o zákazníkovi, online poloha a možnost nahrání rozpočtu jsou skryté.
                  Zákazník musí nejprve ověřit poptávku, abyste mohli zakázku přijmout.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Images */}
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

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <div className="flex gap-3 flex-wrap">
          {/* Verified + open: accept */}
          {isVerified && isOpen && (
            <button onClick={() => onAccept(d.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors" data-testid="accept-demand-btn">
              <Check weight="bold" className="w-4 h-4 inline mr-1" /> Přijmout zakázku
            </button>
          )}

          {/* Unverified + open: request verification */}
          {!isVerified && isOpen && (
            <button onClick={handleRequestVerification} className="w-full px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors" data-testid="request-verification-btn">
              <Warning weight="bold" className="w-4 h-4 inline mr-1.5" />
              Zakázku bych přijmul, ale poptávka není ověřena
            </button>
          )}

          {/* In progress: cannot complete */}
          {isInProgress && isAssigned && (
            <button onClick={handleCannotComplete} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" data-testid="cannot-complete-btn">
              <X className="w-4 h-4 inline mr-1" /> Zakázku nelze dodělat
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      {d.latitude && d.longitude && (
        <div className="mt-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-64">
          <MapContainer center={[d.latitude, d.longitude]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Marker position={[d.latitude, d.longitude]}>
              <Popup>{d.title}<br /><small>{d.address}</small></Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      {/* Inline Chat */}
      {canChat && (
        <div className="mt-4 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden" data-testid="inline-chat">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
            <ChatCircle weight="bold" className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Chat se zákazníkem</h3>
            {messages.length > 0 && <span className="text-xs text-zinc-400">({messages.length} zpráv)</span>}
          </div>
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50">
            {messages.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-8">Zatím žádné zprávy. Napište zákazníkovi.</p>
            ) : (
              messages.map((msg, i) => {
                const isMine = msg.sender_id === userId;
                return (
                  <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${isMine
                      ? 'bg-orange-500 text-white rounded-br-md'
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-md'
                      }`}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMine ? 'text-orange-200' : 'text-zinc-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
            <input
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Napište zprávu..."
              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="chat-input"
            />
            <button onClick={handleSendMessage} disabled={!chatMessage.trim() || sendingChat}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition-colors"
              data-testid="chat-send-btn">
              <PaperPlaneTilt weight="bold" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDemandDetail;
