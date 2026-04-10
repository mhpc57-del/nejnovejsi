import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import WelcomeModal from '../components/WelcomeModal';
import { 
  House, Plus, List, User, SignOut, Bell, MapPin, 
  Calendar, Clock, ArrowRight, X, Check, Image as ImageIcon, Trash, Warning,
  ChatCircle, Envelope, Briefcase, Receipt, DotsThreeCircle, Moon, Sun, ChatCircleDots
} from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DraggableMap from '../components/DraggableMap';
import DemandRadiusMap from '../components/DemandRadiusMap';
import ThemeToggle from '../components/ThemeToggle';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

import HeaderWidget from '../components/HeaderWidget';

const CustomerDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadDemands, setUnreadDemands] = useState([]);

  const fetchDemands = async () => {
    try {
      const response = await axios.get(`${API}/demands/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemands(response.data);
    } catch (error) {
      console.error('Error fetching demands:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await axios.get(`${API}/messages/unread-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadDemands(res.data.unread_demands || []);
    } catch (err) {
      console.error('Error fetching unread:', err);
    }
  };

  useEffect(() => {
    fetchDemands();
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
      cancelled: 'bg-red-100 text-red-700'
    };
    const labels = {
      open: 'Otevřená',
      in_progress: 'Probíhá',
      completed: 'Dokončeno',
      cancelled: 'Zrušeno'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <WelcomeModal user={user} token={token} API={API} />
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800/60 p-6 hidden lg:block">
        <Link to="/" className="flex items-center mb-10">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Craft</span>
          <span className="text-2xl font-bold tracking-tight text-orange-500" style={{ fontFamily: 'Outfit' }}>Bolt</span>
        </Link>

        <nav className="space-y-1">
          <Link 
            to="/zakaznik" 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === '/zakaznik' ? 'bg-orange-500 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
            data-testid="nav-dashboard"
          >
            <House weight={location.pathname === '/zakaznik' ? 'fill' : 'regular'} className="w-5 h-5" />
            Hlavní menu
          </Link>
          <Link 
            to="/profil" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            data-testid="nav-profile"
          >
            <User className="w-5 h-5" />
            Profil
          </Link>
          <Link 
            to="/faktury" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            data-testid="nav-invoices"
          >
            <Receipt className="w-5 h-5" />
            Faktury
          </Link>
          {user?.role === 'customer_supplier' && (
            <Link 
              to="/dodavatel" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-orange-600 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors font-medium"
              data-testid="nav-switch-to-supplier"
            >
              <Briefcase className="w-5 h-5" />
              Přepnout na - Dodavatel
            </Link>
          )}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          {user?.trial_ends_at && (
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-800/40 rounded-lg p-3 mb-3" data-testid="trial-info-sidebar">
              <p className="text-sm text-orange-700 dark:text-orange-400 font-medium mb-1">Zkušební doba</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {new Date(user.trial_ends_at) > new Date()
                  ? `Končí ${new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}`
                  : 'Zkušební doba vypršela'}
              </p>
            </div>
          )}
          <button 
            onClick={() => setShowDeactivate(true)}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors mb-1"
            data-testid="deactivate-btn-sidebar"
          >
            <Trash className="w-5 h-5" />
            Zrušit účet
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
            data-testid="logout-btn"
          >
            <SignOut className="w-5 h-5" />
            Odhlásit se
          </button>
          <div className="px-4 py-2">
            <ThemeToggle className="w-full justify-center" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>Profil zákazníka</h1>
              <p className="text-sm text-zinc-500">Vítejte zpět, {user?.company_name || user?.email}</p>
              <div className="mt-1"><HeaderWidget /></div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowNewDemand(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 hover:-translate-y-px hover:shadow-lg hover:shadow-orange-500/20 text-sm"
                data-testid="new-demand-btn"
              >
                <Plus weight="bold" className="w-5 h-5" />
                Nová poptávka
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Stats - clickable cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Celkem poptávek', value: demands.length, color: 'bg-blue-500', filter: 'all' },
              { label: 'Otevřené', value: demands.filter(d => d.status === 'open').length, color: 'bg-emerald-500', filter: 'open' },
              { label: 'Probíhající', value: demands.filter(d => d.status === 'in_progress').length, color: 'bg-orange-500', filter: 'in_progress' },
              { label: 'Dokončené', value: demands.filter(d => d.status === 'completed').length, color: 'bg-zinc-500', filter: 'completed' },
            ].map((stat, i) => {
              const unreadCount = stat.filter === 'all' 
                ? unreadDemands.length
                : unreadDemands.filter(u => u.demand_status === stat.filter).length;
              const now = new Date();
              const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
              let newCount = 0;
              if (stat.filter === 'completed') {
                newCount = demands.filter(d => d.status === 'completed' && d.completed_at && new Date(d.completed_at) > dayAgo).length;
              } else if (stat.filter === 'in_progress') {
                newCount = demands.filter(d => d.status === 'in_progress' && d.accepted_at && new Date(d.accepted_at) > dayAgo).length;
              }
              return (
              <button key={i} 
                onClick={() => setActiveFilter(activeFilter === stat.filter ? null : stat.filter)}
                className={`bg-white dark:bg-zinc-900 rounded-xl p-5 border transition-all text-left relative ${
                  activeFilter === stat.filter ? 'border-orange-400 ring-2 ring-orange-200/50 dark:ring-orange-800/40 shadow-md' : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                }`}
                data-testid={`stat-card-${stat.filter}`}
              >
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse" data-testid={`unread-badge-${stat.filter}`}>
                    {unreadCount}
                  </span>
                )}
                {unreadCount === 0 && newCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse" data-testid={`new-badge-${stat.filter}`}>
                    {newCount}
                  </span>
                )}
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <List weight="bold" className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-zinc-500">{stat.label}</p>
              </button>
              );
            })}
          </div>

          {/* Unread messages notification */}
          {unreadDemands.length > 0 && (
            <div className="mb-6 bg-orange-50 dark:bg-orange-500/5 border border-orange-200/60 dark:border-orange-800/40 rounded-xl p-4" data-testid="unread-messages-banner">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <ChatCircle weight="fill" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-300">Nové zprávy ({unreadDemands.length})</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Máte nepřečtené zprávy v následujících poptávkách</p>
                </div>
              </div>
              <div className="space-y-2">
                {unreadDemands.slice(0, 5).map((item) => (
                  <Link key={item.demand_id} to={`/zakazka/${item.demand_id}`}
                    className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:bg-orange-50 dark:hover:bg-zinc-800/50 transition-colors border border-orange-100 dark:border-zinc-800"
                    data-testid={`unread-${item.demand_id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-white truncate text-sm">{item.demand_title}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.last_sender}: {item.last_message}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Map overview of demands */}
          {demands.length > 0 && demands.some(d => d.latitude && d.longitude) && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-5 mb-6" data-testid="customer-demands-map">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                <MapPin weight="fill" className="w-5 h-5 text-orange-500" />
                Mapa poptávek
              </h2>
              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Otevřené</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> Probíhající</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block"></span> Dokončené</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-80">
                <MapContainer 
                  center={(() => {
                    const withCoords = demands.filter(d => d.latitude && d.longitude);
                    if (withCoords.length > 0) return [withCoords[0].latitude, withCoords[0].longitude];
                    return [49.8, 15.5];
                  })()}
                  zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                  {demands.filter(d => d.latitude && d.longitude).map(d => (
                    <Marker key={d.id} position={[d.latitude, d.longitude]}
                      icon={d.status === 'open' ? greenIcon : d.status === 'in_progress' ? orangeIcon : greyIcon}>
                      <Popup>
                        <strong>{d.title}</strong><br/>
                        <small>{d.category} — {d.address}</small><br/>
                        <small style={{color: d.status === 'open' ? '#16a34a' : d.status === 'in_progress' ? '#ea580c' : '#6b7280'}}>
                          {d.status === 'open' ? 'Otevřená' : d.status === 'in_progress' ? 'Probíhá' : 'Dokončeno'}
                        </small>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Filtered Demands Modal - shown when a stat card is clicked */}
          {activeFilter && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setActiveFilter(null)}>
              <div 
                className="bg-white dark:bg-zinc-900 w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[85vh] flex flex-col border border-zinc-200/50 dark:border-zinc-800"
                onClick={(e) => e.stopPropagation()}
                data-testid="filtered-demands-modal"
              >
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
                  <h2 className="font-semibold text-zinc-900 dark:text-white" style={{ fontFamily: 'Outfit' }}>
                    {activeFilter === 'all' ? 'Všechny poptávky' : activeFilter === 'open' ? 'Otevřené poptávky' : activeFilter === 'in_progress' ? 'Probíhající poptávky' : 'Dokončené poptávky'}
                  </h2>
                  <button onClick={() => setActiveFilter(null)} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" data-testid="close-filter-btn">
                    <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {(() => {
                    const filtered = activeFilter === 'all' ? demands : demands.filter(d => d.status === activeFilter);
                    if (loading) return (
                      <div className="p-10 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                      </div>
                    );
                    if (filtered.length === 0) return (
                      <div className="p-10 text-center">
                        <List className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-zinc-500 mb-4">Žádné poptávky v této kategorii</p>
                        <button onClick={() => { setActiveFilter(null); setShowNewDemand(true); }} className="text-orange-500 hover:text-orange-600 font-medium" data-testid="empty-new-demand-btn">
                          Vytvořit poptávku
                        </button>
                      </div>
                    );
                    return (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filtered.map((demand) => (
                          <Link key={demand.id} to={`/zakazka/${demand.id}`}
                            className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            data-testid={`demand-item-${demand.id}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{demand.title}</h3>
                                  {getStatusBadge(demand.status)}
                                  {(demand.soft_accepts?.length > 0 || demand.status === 'in_progress') && demand.status !== 'completed' && demand.status !== 'cancelled' && (
                                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" data-testid={`response-badge-${demand.id}`}>
                                      <Bell weight="fill" className="w-3 h-3" />
                                      {demand.soft_accepts?.length > 0 ? `${demand.soft_accepts.length} ${demand.soft_accepts.length === 1 ? 'reakce' : 'reakcí'}` : 'Přijato'}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm text-zinc-500">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                    <span className="truncate">{demand.customer_name || 'Neznámý zadavatel'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                    <span className="truncate">{demand.address || 'Neuvedeno'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                    <span>
                                      {demand.deadline 
                                        ? (demand.deadline === 'ASAP' ? 'Co nejdříve' 
                                          : demand.deadline === 'URGENT' ? 'IHNED!' 
                                          : `Termín: ${new Date(demand.deadline).toLocaleDateString('cs-CZ')}`)
                                        : `Zadáno: ${new Date(demand.created_at).toLocaleDateString('cs-CZ')}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-zinc-300 flex-shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800/60 lg:hidden z-40" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around py-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-home">
            <House className="w-6 h-6" />
            <span className="text-[10px] font-medium">Domů</span>
          </Link>
          <Link to="/zakaznik" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-orange-500" data-testid="mobile-nav-dashboard">
            <List className="w-6 h-6" weight="fill" />
            <span className="text-[10px] font-medium">Přehled</span>
          </Link>
          <button onClick={() => setShowNewDemand(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 -mt-4" data-testid="mobile-nav-new-demand">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Plus weight="bold" className="w-6 h-6 text-white" />
            </div>
          </button>
          <Link to="/profil" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-profile">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
          <button onClick={() => setShowMobileMenu(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-zinc-400 hover:text-orange-500 transition-colors" data-testid="mobile-nav-more">
            <DotsThreeCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Více</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Více" Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-menu-drawer">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mb-5" />
            <div className="grid grid-cols-3 gap-3 mb-5">
              <Link to="/faktury" onClick={() => setShowMobileMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-invoices">
                <div className="w-11 h-11 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Faktury</span>
              </Link>
              <button onClick={() => { setShowMobileMenu(false); window.dispatchEvent(new CustomEvent('open-ai-chat')); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-ai-chat">
                <div className="w-11 h-11 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
                  <ChatCircleDots className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">AI Chat</span>
              </button>
              <button onClick={() => { setShowMobileMenu(false); document.documentElement.classList.toggle('dark'); localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); }} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-theme">
                <div className="w-11 h-11 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                  <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-300 dark:hidden" />
                  <Sun className="w-5 h-5 text-yellow-500 hidden dark:block" />
                </div>
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Režim</span>
              </button>
              {user?.role === 'customer_supplier' && (
                <Link to="/dodavatel" onClick={() => setShowMobileMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="mobile-menu-switch-role">
                  <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium text-center">Dodavatel</span>
                </Link>
              )}
            </div>
            {user?.trial_ends_at && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-800/40 rounded-xl p-3 mb-4" data-testid="mobile-trial-info">
                <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                  Zkušební doba: {new Date(user.trial_ends_at) > new Date()
                    ? `Končí ${new Date(user.trial_ends_at).toLocaleDateString('cs-CZ')}`
                    : 'Vypršela'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowMobileMenu(false); setShowDeactivate(true); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl text-sm font-medium" data-testid="mobile-menu-deactivate">
                <Trash className="w-4 h-4" /> Zrušit účet
              </button>
              <button onClick={() => { setShowMobileMenu(false); handleLogout(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium" data-testid="mobile-menu-logout">
                <SignOut className="w-4 h-4" /> Odhlásit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Demand Modal */}
      {showNewDemand && (
        <NewDemandModal 
          onClose={() => setShowNewDemand(false)} 
          onSuccess={() => {
            setShowNewDemand(false);
            fetchDemands();
          }}
          token={token}
        />
      )}

      {/* Deactivate Account Modal */}
      {showDeactivate && (
        <DeactivateModal
          token={token}
          onClose={() => setShowDeactivate(false)}
          onSuccess={() => { logout(); navigate('/'); }}
        />
      )}
    </div>
  );
};

const NewDemandModal = ({ onClose, onSuccess, token }) => {
  const [categories, setCategories] = useState([]);
  const [groupedCategories, setGroupedCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    latitude: null,
    longitude: null,
    budget_min: '',
    budget_max: '',
    payment_method: 'cash',
    deadline: '',
    supplier_radius: 30
  });

  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  // Address search with debounce
  const handleAddressChange = (value) => {
    setFormData(prev => ({ ...prev, address: value }));
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await axios.get(`${API}/geocode/search`, { params: { q: value } });
        setAddressSuggestions(response.data);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Geocode search error:', err);
      }
    }, 400);
    setSearchTimeout(timeout);
  };

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    setFormData(prev => ({
      ...prev,
      address: suggestion.display_name,
      latitude: lat,
      longitude: lon
    }));
    setShowSuggestions(false);
    setShowMap(true);
    setMapKey(prev => prev + 1);
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolokace není ve vašem prohlížeči podporována');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await axios.get(`${API}/geocode/reverse`, { params: { lat: latitude, lon: longitude } });
          setFormData(prev => ({
            ...prev,
            address: response.data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude
          }));
          setShowMap(true);
          setMapKey(prev => prev + 1);
        } catch (err) {
          setFormData(prev => ({ ...prev, latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          setShowMap(true);
          setMapKey(prev => prev + 1);
        }
        setGeoLoading(false);
      },
      (err) => {
        setError('Nepodařilo se získat vaši polohu. Povolte geolokaci v prohlížeči.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle map manually
  const toggleMap = () => {
    if (!showMap) {
      if (!formData.latitude) {
        setFormData(prev => ({ ...prev, latitude: 49.8175, longitude: 15.4730 }));
      }
      setShowMap(true);
      setMapKey(prev => prev + 1);
    } else {
      setShowMap(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImages.length + files.length > 5) {
      setError('Maximálně 5 fotografií');
      return;
    }
    setUploading(true);
    setError('');
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const response = await axios.post(`${API}/upload`, fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        setUploadedImages(prev => [...prev, response.data.url]);
      } catch (err) {
        setError(err.response?.data?.detail || 'Nepodařilo se nahrát fotografii');
      }
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API}/demands`, {
        ...formData,
        images: uploadedImages,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        deadline: formData.deadline || null,
        supplier_radius: formData.supplier_radius || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se vytvořit poptávku');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Nová poptávka</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center transition-colors"
            data-testid="close-modal-btn"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Název zakázky</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="např. Oprava elektroinstalace"
              required
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              data-testid="demand-title-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Kategorie</label>
            <div className="relative">
              <input
                type="text"
                value={catSearch || formData.category}
                onChange={(e) => { setCatSearch(e.target.value); setCatDropdownOpen(true); if (!e.target.value) setFormData(prev => ({ ...prev, category: '' })); }}
                onFocus={() => setCatDropdownOpen(true)}
                placeholder="Hledat kategorii..."
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="demand-category-search"
              />
              {formData.category && !catSearch && (
                <button type="button" onClick={() => { setFormData(prev => ({ ...prev, category: '' })); setCatSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400">&times;</button>
              )}
              {catDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCatDropdownOpen(false)} />
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const searchLower = catSearch.toLowerCase();
                      const hasGroups = Object.keys(groupedCategories).length > 0;
                      const entries = hasGroups
                        ? Object.entries(groupedCategories).map(([g, items]) => [g, catSearch ? items.filter(c => c.toLowerCase().includes(searchLower)) : items]).filter(([, items]) => items.length > 0)
                        : [['', catSearch ? categories.filter(c => c.toLowerCase().includes(searchLower)) : categories]];
                      const total = entries.reduce((s, [, items]) => s + items.length, 0);
                      if (total === 0) return <p className="px-4 py-3 text-sm text-zinc-400 text-center">Žádná kategorie nenalezena</p>;
                      return entries.map(([group, items]) => (
                        <div key={group || 'all'}>
                          {group && (
                            <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10 px-4 py-1.5 border-b border-zinc-200/80 dark:border-zinc-800">
                              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{group}</span>
                            </div>
                          )}
                          {items.map((cat) => (
                            <button key={cat} type="button" onClick={() => { setFormData(prev => ({ ...prev, category: cat })); setCatSearch(''); setCatDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors ${formData.category === cat ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-zinc-700 dark:text-zinc-300'}`}
                              data-testid={`demand-cat-option-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
            <input type="hidden" value={formData.category} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Popis práce</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Popište co potřebujete..."
              required
              rows={4}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              data-testid="demand-description-input"
            />
          </div>

          {/* Address with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Adresa realizace</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 z-10" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 400)}
                placeholder="Začněte psát adresu..."
                required
                className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                data-testid="demand-address-input"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-zinc-200 dark:border-zinc-700 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto" data-testid="address-suggestions">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 text-sm text-zinc-700 dark:text-zinc-300 border-b border-gray-50 last:border-0 flex items-start gap-2"
                      data-testid={`address-suggestion-${i}`}
                    >
                      <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>{s.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
                data-testid="use-current-location-btn"
              >
                {geoLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-orange-500"></div>
                ) : (
                  <MapPin weight="fill" className="w-3.5 h-3.5" />
                )}
                Použít aktuální polohu
              </button>
              <button
                type="button"
                onClick={toggleMap}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-400 hover:text-orange-600 transition-colors"
                data-testid="toggle-map-btn"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showMap ? 'Skrýt mapu' : 'Zvolit na mapě'}
              </button>
            </div>

            {/* Coordinates info */}
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                Poloha: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
              </p>
            )}

            {/* Interactive map */}
            {showMap && (
              <div className="mt-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700" data-testid="demand-location-map">
                <DemandRadiusMap
                  key={mapKey}
                  lat={formData.latitude || 49.8175}
                  lng={formData.longitude || 15.4730}
                  radiusKm={formData.supplier_radius}
                  onLocationChange={async (lat, lng) => {
                    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    try {
                      const response = await axios.get(`${API}/geocode/reverse`, { params: { lat, lon: lng } });
                      if (response.data.display_name) {
                        setFormData(prev => ({ ...prev, address: response.data.display_name }));
                      }
                    } catch (err) {
                      console.error('Reverse geocode error:', err);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Supplier radius */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Okruh dodavatelů</label>
            <p className="text-xs text-zinc-400 mb-2">Pouze dodavatelé působící v tomto okruhu od místa zakázky budou osloveni</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={formData.supplier_radius}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_radius: parseInt(e.target.value) }))}
                className="flex-1 accent-orange-500"
                data-testid="supplier-radius-slider"
              />
              <span className="text-sm font-semibold text-orange-600 w-16 text-right" data-testid="supplier-radius-value">{formData.supplier_radius} km</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5 px-0.5">
              <span>5 km</span>
              <span>75 km</span>
              <span>150 km</span>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Předpokládaná cena (Kč)</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Od"
                  value={formData.budget_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                  data-testid="demand-budget-min"
                />
              </div>
              <span className="text-zinc-400 text-sm">—</span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Do"
                  value={formData.budget_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                  data-testid="demand-budget-max"
                />
              </div>
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Fotografie (max 5)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group">
                  <img src={(() => { const u = url; if (!u || u === 'None') return ''; if (u.startsWith('http')) return u; const p = u.startsWith('/api/') ? u : u.startsWith('/') ? `/api${u}` : `/api/${u}`; return `${API.replace('/api', '')}${p}`; })()} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`remove-image-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploadedImages.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors" data-testid="upload-photo-btn">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-orange-500"></div>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 mt-1">Přidat</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-zinc-400">JPEG, PNG nebo WebP. Max 10 MB na soubor.</p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">Způsob platby</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'cash', label: 'Hotově' },
                { value: 'card', label: 'Kartou' },
                { value: 'transfer', label: 'Převodem' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, payment_method: opt.value }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    formData.payment_method === opt.value
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:border-zinc-600'
                  }`}
                  data-testid={`payment-${opt.value}-btn`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1.5">Požadovaný termín realizace</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deadline: 'ASAP' }))}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.deadline === 'ASAP'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                data-testid="deadline-asap-btn"
              >
                Pokud možno, co nejdříve
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deadline: 'URGENT' }))}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.deadline === 'URGENT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                data-testid="deadline-urgent-btn"
              >
                IHNED — klidně si připlatím
              </button>
            </div>
            <input
              type="date"
              value={formData.deadline === 'ASAP' || formData.deadline === 'URGENT' ? '' : formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white"
              data-testid="demand-deadline-input"
            />
            <p className="text-xs text-zinc-500 mt-1">Vyberte tlačítko nebo konkrétní datum z kalendáře</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              data-testid="cancel-demand-btn"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
              data-testid="submit-demand-btn"
            >
              {loading ? 'Vytváření...' : 'Vytvořit poptávku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerDashboard;

const DeactivateModal = ({ token, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = warning, 2 = password

  const handleDeactivate = async () => {
    if (!password.trim()) { setError('Zadejte heslo'); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/auth/deactivate`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { password }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Nepodařilo se deaktivovat účet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" data-testid="deactivate-modal">
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-600">Zrušení účtu</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center" data-testid="close-deactivate-btn">
            <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Warning className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-center font-semibold text-zinc-900 dark:text-white mb-2">Opravdu chcete zrušit účet?</h3>
              <p className="text-center text-sm text-zinc-500 mb-6">
                Váš účet bude deaktivován. Nebudete se moci přihlásit, dokud administrátor účet neobnoví. Vaše data zůstanou zachována.
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors" data-testid="cancel-deactivate-btn">
                  Zpět
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors" data-testid="confirm-deactivate-step1-btn">
                  Pokračovat
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Pro potvrzení deaktivace zadejte své heslo:</p>
              {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm mb-4">{error}</div>}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vaše heslo"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 mb-4"
                data-testid="deactivate-password-input"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setError(''); }} className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  Zpět
                </button>
                <button onClick={handleDeactivate} disabled={loading} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50" data-testid="confirm-deactivate-final-btn">
                  {loading ? 'Deaktivuji...' : 'Zrušit účet'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
