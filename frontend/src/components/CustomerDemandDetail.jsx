import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../App';
import axios from 'axios';
import {
  X, Check, MapPin, Calendar, Clock, Warning, ChatCircle, PaperPlaneTilt, Briefcase
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CustomerDemandDetail = ({ demand: d, token, isOpen, isUnverified, isInProgress, hasSupplier, onBack, onVerify, onRefresh, userId }) => {
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesEndRef = useRef(null);
  const chatPollRef = useRef(null);

  const canChat = hasSupplier && !isOpen;

  const fetchMessages = async () => {
    if (!canChat) return;
    try {
      const res = await axios.get(`${API}/messages/${d.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data || []);
    } catch (e) { /* ignore */ }
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

  const getStatusBadge = (status) => {
    const map = { open: ['Otevřená', 'bg-green-100 text-green-700'], in_progress: ['Probíhá', 'bg-blue-100 text-blue-700'], completed: ['Dokončeno', 'bg-zinc-200 text-zinc-700'], cancelled: ['Zrušeno', 'bg-red-100 text-red-700'] };
    const [label, cls] = map[status] || ['—', 'bg-zinc-100 text-zinc-500'];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  return (
    <div data-testid="demand-detail">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500 mb-4 transition-colors" data-testid="back-to-list">
        <X className="w-4 h-4" /> Zpět na seznam
      </button>
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

        {/* Warning for unverified demands */}
        {isUnverified && isOpen && (
          <p className="text-red-600 dark:text-red-400 text-sm font-semibold leading-relaxed" data-testid="unverified-warning">
            U neověřených poptávek dodavatelé neuvidí Vaše iniciály a online mapu. Nemohou také přiložit rozpočet. DOPORUČUJEME POPTÁVKU OVĚŘIT.
          </p>
        )}

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
            {d.deadline === 'URGENT' ? 'IHNED — zákazník si rád připlatí!' : d.deadline === 'ASAP' ? 'Pokud možno, co nejdříve' : `Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`}
          </p>
        )}

        {/* Assigned supplier info */}
        {hasSupplier && d.assigned_supplier_name && (
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">Přiřazený dodavatel</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-500" /> {d.assigned_supplier_name}
            </p>
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
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Chat s dodavatelem</h3>
            {messages.length > 0 && <span className="text-xs text-zinc-400">({messages.length} zpráv)</span>}
          </div>
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50">
            {messages.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-8">Zatím žádné zprávy. Napište dodavateli.</p>
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

export default CustomerDemandDetail;
