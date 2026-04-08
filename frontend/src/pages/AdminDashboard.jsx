import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  House, Users, Briefcase, SignOut, 
  User, Check, X, Eye, Star, ShieldWarning,
  PencilSimple, Envelope, Trash, Tag, Warning, 
  ChatCircle, ArrowClockwise, Lock, LockOpen,
  CaretDown, MagnifyingGlass, Receipt, Download
} from '@phosphor-icons/react';

const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [demands, setDemands] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTrust, setUpdatingTrust] = useState(null);
  
  // Modal states
  const [modal, setModal] = useState(null); // { type, data }
  const [modalInput, setModalInput] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [demandFilter, setDemandFilter] = useState('all');
  const [aresLoading, setAresLoading] = useState(false);
  const [adminInvoices, setAdminInvoices] = useState([]);
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [zipDownloading, setZipDownloading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, demandsRes, suggestionsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/demands`, { headers }),
        axios.get(`${API}/admin/category-suggestions`, { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDemands(demandsRes.data);
      setSuggestions(suggestionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleAresLookup = async () => {
    const ico = modalInput.ico?.trim();
    if (!ico || ico.length < 7) { alert('Zadejte platné IČ (min. 7 znaků)'); return; }
    setAresLoading(true);
    try {
      const res = await axios.get(`${API}/ares/${ico}`);
      const data = res.data;
      setModalInput(prev => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        address: data.address || prev.address,
        ico: data.ico || prev.ico,
        dic: data.dic || prev.dic,
      }));
    } catch (error) {
      alert(error.response?.data?.detail || 'IČ nenalezeno v ARES');
    } finally {
      setAresLoading(false);
    }
  };

  const handleTrustScoreUpdate = async (userId, score) => {
    setUpdatingTrust(userId);
    try {
      await axios.put(`${API}/admin/users/${userId}/trust-score`, { user_id: userId, trust_score: score }, { headers });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Chyba');
    } finally {
      setUpdatingTrust(null);
    }
  };

  const handleAction = async (action, ...args) => {
    setModalLoading(true);
    try {
      switch (action) {
        case 'block':
          await axios.put(`${API}/admin/users/${args[0]}/block`, {}, { headers });
          break;
        case 'unblock':
          await axios.put(`${API}/admin/users/${args[0]}/unblock`, {}, { headers });
          break;
        case 'editUser':
          await axios.put(`${API}/admin/users/${args[0]}/edit`, args[1], { headers });
          break;
        case 'reactivate':
          await axios.put(`${API}/admin/users/${args[0]}/reactivate`, {}, { headers });
          break;
        case 'verificationReminder':
          await axios.post(`${API}/admin/users/${args[0]}/send-verification-reminder`, {}, { headers });
          break;
        case 'messageUser':
          await axios.post(`${API}/admin/users/${args[0]}/message`, args[1], { headers });
          break;
        case 'cancelDemand':
          await axios.put(`${API}/admin/demands/${args[0]}/cancel`, args[1], { headers });
          break;
        case 'notifyDemand':
          await axios.post(`${API}/admin/demands/${args[0]}/notify`, args[1], { headers });
          break;
        case 'approveCategory':
          await axios.put(`${API}/admin/category-suggestions/${args[0]}/approve`, {}, { headers });
          break;
        case 'rejectCategory':
          await axios.put(`${API}/admin/category-suggestions/${args[0]}/reject`, args[1] || {}, { headers });
          break;
        default: break;
      }
      setModal(null);
      setModalInput({});
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Chyba při provádění akce');
    } finally {
      setModalLoading(false);
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  // ============ INVOICE FUNCTIONS ============
  const fetchAdminInvoices = async (month) => {
    setInvoicesLoading(true);
    try {
      const res = await axios.get(`${API}/admin/invoices`, { headers, params: { month } });
      setAdminInvoices(res.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    setZipDownloading(true);
    try {
      const res = await axios.get(`${API}/admin/invoices/download-zip`, {
        headers, params: { month: invoiceMonth }, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `CraftBolt_Faktury_${invoiceMonth}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.status === 404 ? 'Za toto obdobi nejsou zadne faktury' : 'Chyba pri stahovani');
    } finally {
      setZipDownloading(false);
    }
  };

  const handleDownloadSingle = async (invoiceId, format) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/${format}`, {
        headers, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      const inv = adminInvoices.find(i => i.id === invoiceId);
      link.href = url;
      link.download = format === 'pdf' ? `${inv?.invoice_number}.pdf` : `${inv?.invoice_number}.isdoc.xml`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Nepodarilo se stahnout fakturu');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Přehled', icon: House },
    { id: 'users', label: 'Uživatelé', icon: Users },
    { id: 'demands', label: 'Zakázky', icon: Briefcase },
    { id: 'categories', label: 'Kategorie', icon: Tag, badge: pendingSuggestions.length },
    { id: 'invoices', label: 'Faktury', icon: Receipt },
  ];

  const getStatusBadge = (status) => {
    const map = {
      open: { style: 'bg-green-100 text-green-700', label: 'Otevřená' },
      in_progress: { style: 'bg-blue-100 text-blue-700', label: 'Probíhá' },
      completed: { style: 'bg-gray-100 text-gray-700', label: 'Dokončeno' },
      cancelled: { style: 'bg-red-100 text-red-700', label: 'Zrušeno' },
    };
    const s = map[status] || { style: 'bg-gray-100 text-gray-700', label: status };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.style}`}>{s.label}</span>;
  };

  const getRoleBadge = (role) => {
    const map = {
      customer: { style: 'bg-blue-100 text-blue-700', label: 'Zákazník' },
      supplier: { style: 'bg-green-100 text-green-700', label: 'Dodavatel' },
      customer_supplier: { style: 'bg-orange-100 text-orange-700', label: 'Obojí' },
      admin: { style: 'bg-purple-100 text-purple-700', label: 'Admin' },
    };
    const r = map[role] || { style: 'bg-gray-100', label: role };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.style}`}>{r.label}</span>;
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.company_name?.toLowerCase().includes(q) || 
           u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q);
  });

  const filteredDemands = demands.filter(d => {
    if (demandFilter !== 'all' && d.status !== demandFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.title?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q) || d.customer_name?.toLowerCase().includes(q);
  });

  // ============ RENDER TABS ============

  const renderOverview = () => (
    <div className="p-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Celkem uživatelů', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
          { label: 'Zákazníků', value: stats?.customers || 0, icon: User, color: 'bg-green-500' },
          { label: 'Dodavatelů', value: stats?.suppliers || 0, icon: Briefcase, color: 'bg-orange-500' },
          { label: 'Zablokovaných', value: stats?.blocked_users || 0, icon: ShieldWarning, color: 'bg-red-500' },
          { label: 'Celkem zakázek', value: stats?.total_demands || 0, icon: Briefcase, color: 'bg-purple-500' },
          { label: 'Otevřených', value: stats?.open_demands || 0, icon: Check, color: 'bg-green-500' },
          { label: 'Dokončených', value: stats?.completed_demands || 0, icon: Check, color: 'bg-gray-500' },
          { label: 'Čekající kategorie', value: stats?.pending_suggestions || 0, icon: Tag, color: 'bg-yellow-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-5" data-testid={`stat-${i}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon weight="bold" className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-gray-900 mb-4">Poslední zakázky</h3>
      <div className="bg-gray-50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 text-sm font-medium text-gray-500">Název</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500">Kategorie</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500">Stav</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500">Datum</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {demands.slice(0, 5).map((demand) => (
              <tr key={demand.id} className="border-b border-gray-100 last:border-0">
                <td className="p-4 text-sm text-gray-900">{demand.title}</td>
                <td className="p-4 text-sm text-gray-500">{demand.category}</td>
                <td className="p-4">{getStatusBadge(demand.status)}</td>
                <td className="p-4 text-sm text-gray-500">{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</td>
                <td className="p-4">
                  <Link to={`/zakazka/${demand.id}`} className="text-orange-500 hover:text-orange-600">
                    <Eye className="w-5 h-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Hledat uživatele..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="search-users" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Jméno / Firma</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Stav</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Důvěra</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Registrace</th>
              <th className="text-right p-3 text-xs font-medium text-gray-500 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${u.is_blocked ? 'bg-red-50/50' : ''}`} data-testid={`user-row-${u.id}`}>
                <td className="p-3 text-sm text-gray-900">{u.email}</td>
                <td className="p-3 text-sm text-gray-600">{u.company_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '-'}</td>
                <td className="p-3">{getRoleBadge(u.role)}</td>
                <td className="p-3">
                  {u.is_blocked ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Blokován</span>
                  ) : u.is_deactivated ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Deaktivován</span>
                  ) : u.is_verified ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktivní</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Neověřen</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => handleTrustScoreUpdate(u.id, star)}
                        disabled={updatingTrust === u.id} className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50">
                        <Star weight={star <= (u.trust_score || 0) ? 'fill' : 'regular'}
                          className={`w-3.5 h-3.5 ${star <= (u.trust_score || 0) ? 'text-yellow-500' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('cs-CZ')}</td>
                <td className="p-3">
                  {u.role !== 'admin' && (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { 
                        setModal({ type: 'editUser', data: u }); 
                        setModalInput({ 
                          email: u.email || '', company_name: u.company_name || '', first_name: u.first_name || '', 
                          last_name: u.last_name || '', phone: u.phone || '', ico: u.ico || '', dic: u.dic || '',
                          address: u.address || '', branch_address: u.branch_address || '', 
                          permanent_address: u.permanent_address || '', actual_address: u.actual_address || '',
                          date_of_birth: u.date_of_birth || '', bio: u.bio || '', website: u.website || '',
                          account_type: u.account_type || '', role: u.role || ''
                        }); 
                      }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Upravit" data-testid={`edit-user-${u.id}`}>
                        <PencilSimple className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setModal({ type: 'messageUser', data: u }); setModalInput({ subject: '', message: '' }); }}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Poslat zprávu" data-testid={`message-user-${u.id}`}>
                        <Envelope className="w-4 h-4" />
                      </button>
                      {!u.is_verified && (
                        <button onClick={() => handleAction('verificationReminder', u.id)}
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Připomenout ověření" data-testid={`verify-remind-${u.id}`}>
                          <Warning className="w-4 h-4" />
                        </button>
                      )}
                      {u.is_deactivated && (
                        <button onClick={() => handleAction('reactivate', u.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Reaktivovat účet" data-testid={`reactivate-user-${u.id}`}>
                          <ArrowClockwise className="w-4 h-4" />
                        </button>
                      )}
                      {u.is_blocked ? (
                        <button onClick={() => handleAction('unblock', u.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Odblokovat" data-testid={`unblock-user-${u.id}`}>
                          <LockOpen className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => setModal({ type: 'blockUser', data: u })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Zablokovat" data-testid={`block-user-${u.id}`}>
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDemands = () => (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Hledat zakázky..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" data-testid="search-demands" />
        </div>
        <select value={demandFilter} onChange={e => setDemandFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" data-testid="filter-demands">
          <option value="all">Všechny stavy</option>
          <option value="open">Otevřené</option>
          <option value="in_progress">Probíhající</option>
          <option value="completed">Dokončené</option>
          <option value="cancelled">Zrušené</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Název</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Kategorie</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Zákazník</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Dodavatel</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Stav</th>
              <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th className="text-right p-3 text-xs font-medium text-gray-500 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filteredDemands.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50" data-testid={`demand-row-${d.id}`}>
                <td className="p-3 text-sm text-gray-900 max-w-[200px] truncate">{d.title}</td>
                <td className="p-3 text-sm text-gray-500">{d.category}</td>
                <td className="p-3 text-sm text-gray-500">{d.customer_name}</td>
                <td className="p-3 text-sm text-gray-500">{d.assigned_supplier_name || '-'}</td>
                <td className="p-3">{getStatusBadge(d.status)}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString('cs-CZ')}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link to={`/zakazka/${d.id}`} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Detail" data-testid={`view-demand-${d.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                    {d.status !== 'completed' && d.status !== 'cancelled' && (
                      <>
                        <DemandActionsMenu demand={d} onAction={(type) => {
                          if (type === 'cancel') {
                            setModal({ type: 'cancelDemand', data: d });
                            setModalInput({ reason: '' });
                          } else {
                            setModal({ type: 'notifyDemand', data: { ...d, notify_type: type } });
                            setModalInput({ message: '', flagged_words: '' });
                          }
                        }} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">Navržené kategorie</h3>
        <p className="text-sm text-gray-500">Dodavatelé mohou navrhovat nové kategorie služeb. Zde je schválíte nebo zamítnete.</p>
      </div>

      {pendingSuggestions.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-orange-600 mb-3">Čekající na schválení ({pendingSuggestions.length})</h4>
          <div className="space-y-3">
            {pendingSuggestions.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-4" data-testid={`suggestion-${s.id}`}>
                <div>
                  <p className="font-medium text-gray-900">{s.category_name}</p>
                  <p className="text-sm text-gray-500">Navrhl: {s.suggested_by_name} | {new Date(s.created_at).toLocaleDateString('cs-CZ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction('approveCategory', s.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors" data-testid={`approve-${s.id}`}>
                    Schválit
                  </button>
                  <button onClick={() => { setModal({ type: 'rejectCategory', data: s }); setModalInput({ reason: '' }); }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors" data-testid={`reject-${s.id}`}>
                    Zamítnout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.filter(s => s.status !== 'pending').length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-3">Historie</h4>
          <div className="space-y-2">
            {suggestions.filter(s => s.status !== 'pending').map(s => (
              <div key={s.id} className={`flex items-center justify-between rounded-xl p-4 ${s.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div>
                  <p className="font-medium text-gray-900">{s.category_name}</p>
                  <p className="text-sm text-gray-500">Navrhl: {s.suggested_by_name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.status === 'approved' ? 'Schváleno' : 'Zamítnuto'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && (
        <p className="text-center text-gray-400 py-10">Zatím žádné návrhy kategorií.</p>
      )}
    </div>
  );

  const renderInvoices = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Faktury</h2>
          <p className="text-sm text-gray-500">Prehled vsech faktur platformy</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="invoice-month-filter" />
          <button onClick={() => fetchAdminInvoices(invoiceMonth)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors" data-testid="invoice-filter-btn">
            Zobrazit
          </button>
          <button onClick={handleDownloadZip} disabled={zipDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50" data-testid="invoice-zip-btn">
            <Download className="w-4 h-4" /> {zipDownloading ? 'Stahuji...' : 'ZIP export'}
          </button>
        </div>
      </div>

      {invoicesLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : adminInvoices.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Klikněte "Zobrazit" pro načtení faktur za vybraný měsíc</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="admin-invoices-table">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Číslo</th>
                <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Zákazník</th>
                <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Plán</th>
                <th className="text-right p-3 text-xs font-medium text-gray-500 uppercase">Částka</th>
                <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase">Stav</th>
                <th className="text-right p-3 text-xs font-medium text-gray-500 uppercase">Akce</th>
              </tr>
            </thead>
            <tbody>
              {adminInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50" data-testid={`admin-invoice-${inv.id}`}>
                  <td className="p-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="p-3 text-sm text-gray-600">{inv.customer?.name || inv.user_email}</td>
                  <td className="p-3 text-sm text-gray-500">{new Date(inv.issue_date).toLocaleDateString('cs-CZ')}</td>
                  <td className="p-3 text-sm text-gray-500">{inv.plan_name || '-'}</td>
                  <td className="p-3 text-sm font-semibold text-gray-900 text-right">{inv.total?.toLocaleString('cs-CZ')} Kc</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.payment_status === 'paid' ? 'Uhrazeno' : 'Ceka'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => handleDownloadSingle(inv.id, 'pdf')}
                        className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors" data-testid={`admin-pdf-${inv.id}`}>
                        PDF
                      </button>
                      <button onClick={() => handleDownloadSingle(inv.id, 'xml')}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors" data-testid={`admin-xml-${inv.id}`}>
                        XML
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-gray-100 text-sm text-gray-500">
            Celkem {adminInvoices.length} faktur | Suma: {adminInvoices.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString('cs-CZ')} Kc
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div></div>;
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'users': return renderUsers();
      case 'demands': return renderDemands();
      case 'categories': return renderCategories();
      case 'invoices': return renderInvoices();
      default: return null;
    }
  };

  // ============ MODAL ============

  const renderModal = () => {
    if (!modal) return null;
    const { type, data } = modal;

    const modalContent = {
      blockUser: {
        title: `Zablokovat uživatele: ${data.email}`,
        body: <p className="text-gray-600 mb-4">Opravdu chcete zablokovat tohoto uživatele? Nebude se moci přihlásit a obdrží emailové oznámení.</p>,
        confirm: () => handleAction('block', data.id),
        confirmLabel: 'Zablokovat',
        confirmClass: 'bg-red-500 hover:bg-red-600',
      },
      rejectCategory: {
        title: `Zamítnout kategorii: ${data.category_name || ''}`,
        body: (
          <div className="space-y-3">
            <p className="text-gray-600">Navrhovateli bude odeslán email s oznámením o zamítnutí.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Důvod zamítnutí (volitelné)</label>
              <textarea value={modalInput.reason || ''} onChange={e => setModalInput(prev => ({ ...prev, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Např.: Kategorie je příliš úzká, spadá pod existující kategorii..." data-testid="modal-reject-reason" />
            </div>
          </div>
        ),
        confirm: () => handleAction('rejectCategory', data.id, { reason: modalInput.reason }),
        confirmLabel: 'Zamítnout kategorii',
        confirmClass: 'bg-red-500 hover:bg-red-600',
      },
      editUser: {
        title: `Upravit profil: ${data.email}`,
        body: (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
            <p className="text-xs text-gray-400 uppercase font-medium tracking-wider mb-1">Přihlašovací údaje</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" value={modalInput.email || ''} onChange={e => setModalInput(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="modal-email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={modalInput.role || ''} onChange={e => setModalInput(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="modal-role">
                  <option value="customer">Zákazník</option>
                  <option value="supplier">Dodavatel</option>
                  <option value="customer_supplier">Zákazník i dodavatel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ účtu</label>
                <select value={modalInput.account_type || ''} onChange={e => setModalInput(prev => ({ ...prev, account_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="modal-account-type">
                  <option value="">-</option>
                  <option value="osvc">OSVČ</option>
                  <option value="firma">Firma</option>
                  <option value="nepodnikatel">Nepodnikatel</option>
                </select>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider mb-2">Osobní údaje</p>
            </div>
            {[
              { key: 'company_name', label: 'Firma' },
              { key: 'first_name', label: 'Jméno' },
              { key: 'last_name', label: 'Příjmení' },
              { key: 'phone', label: 'Telefon' },
              { key: 'ico', label: 'IČ', hasAres: true },
              { key: 'dic', label: 'DIČ' },
              { key: 'date_of_birth', label: 'Datum narození' },
              { key: 'website', label: 'Web' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <div className={f.hasAres ? 'flex gap-2' : ''}>
                  <input type="text" value={modalInput[f.key] || ''} onChange={e => setModalInput(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className={`${f.hasAres ? 'flex-1' : 'w-full'} px-3 py-2 border border-gray-200 rounded-lg text-sm`} data-testid={`modal-${f.key}`} />
                  {f.hasAres && (
                    <button onClick={handleAresLookup} disabled={aresLoading}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 whitespace-nowrap" data-testid="ares-lookup-btn">
                      {aresLoading ? 'Hledám...' : 'Načíst z ARES'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider mb-2">Adresy</p>
            </div>
            {[
              { key: 'address', label: 'Sídlo firmy' },
              { key: 'branch_address', label: 'Adresa pobočky' },
              { key: 'permanent_address', label: 'Trvalé bydliště' },
              { key: 'actual_address', label: 'Skutečné bydliště' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="text" value={modalInput[f.key] || ''} onChange={e => setModalInput(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid={`modal-${f.key}`} />
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-xs text-gray-400 uppercase font-medium tracking-wider mb-2">Popis</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={modalInput.bio || ''} onChange={e => setModalInput(prev => ({ ...prev, bio: e.target.value }))} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="modal-bio" />
            </div>
          </div>
        ),
        confirm: () => handleAction('editUser', data.id, modalInput),
        confirmLabel: 'Uložit změny',
        confirmClass: 'bg-blue-500 hover:bg-blue-600',
      },
      messageUser: {
        title: `Poslat zprávu: ${data.email}`,
        body: (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Předmět</label>
              <input type="text" value={modalInput.subject || ''} onChange={e => setModalInput(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Např.: Informace o vašem účtu" data-testid="modal-subject" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zpráva</label>
              <textarea value={modalInput.message || ''} onChange={e => setModalInput(prev => ({ ...prev, message: e.target.value }))} rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Text emailu..." data-testid="modal-message" />
            </div>
          </div>
        ),
        confirm: () => handleAction('messageUser', data.id, modalInput),
        confirmLabel: 'Odeslat email',
        confirmClass: 'bg-orange-500 hover:bg-orange-600',
      },
      cancelDemand: {
        title: `Zrušit zakázku: ${data.title}`,
        body: (
          <div className="space-y-3">
            <p className="text-gray-600">Zákazník obdrží emailové oznámení s důvodem zrušení.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Důvod zrušení</label>
              <textarea value={modalInput.reason || ''} onChange={e => setModalInput(prev => ({ ...prev, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Popište důvod..." data-testid="modal-reason" />
            </div>
          </div>
        ),
        confirm: () => handleAction('cancelDemand', data.id, { reason: modalInput.reason }),
        confirmLabel: 'Zrušit zakázku',
        confirmClass: 'bg-red-500 hover:bg-red-600',
      },
      notifyDemand: {
        title: data.notify_type === 'wrong_category' ? `Špatná kategorie: ${data.title}` 
             : data.notify_type === 'improve_description' ? `Vylepšit popis: ${data.title}`
             : data.notify_type === 'vulgar_language' ? `Nevhodná slova: ${data.title}`
             : `Oznámení: ${data.title}`,
        body: (
          <div className="space-y-3">
            <p className="text-gray-600">
              {data.notify_type === 'wrong_category' && 'Zákazník bude vyzván ke změně kategorie poptávky.'}
              {data.notify_type === 'improve_description' && 'Zákazník bude vyzván k vylepšení popisu poptávky.'}
              {data.notify_type === 'vulgar_language' && 'Zákazník bude upozorněn na nevhodná slova v poptávce.'}
              {data.notify_type === 'custom' && 'Pošlete zákazníkovi vlastní oznámení k této poptávce.'}
            </p>
            {data.notify_type === 'vulgar_language' && (
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">Nevhodná slova (co jste našli)</label>
                <input type="text" value={modalInput.flagged_words || ''} onChange={e => setModalInput(prev => ({ ...prev, flagged_words: e.target.value }))}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50" placeholder='Např.: "slovo1, slovo2"' data-testid="modal-flagged-words" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doplňující zpráva (volitelné)</label>
              <textarea value={modalInput.message || ''} onChange={e => setModalInput(prev => ({ ...prev, message: e.target.value }))} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Vaše zpráva zákazníkovi..." data-testid="modal-notify-message" />
            </div>
          </div>
        ),
        confirm: () => handleAction('notifyDemand', data.id, {
          notify_type: data.notify_type,
          message: modalInput.message,
          flagged_words: modalInput.flagged_words
        }),
        confirmLabel: 'Odeslat oznámení',
        confirmClass: data.notify_type === 'vulgar_language' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600',
      },
    };

    const mc = modalContent[type];
    if (!mc) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setModal(null); setModalInput({}); }} data-testid="admin-modal-overlay">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="admin-modal">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{mc.title}</h3>
          </div>
          <div className="p-6">
            {mc.body}
          </div>
          <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={() => { setModal(null); setModalInput({}); }}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium" data-testid="modal-cancel">
              Zrušit
            </button>
            <button onClick={mc.confirm} disabled={modalLoading}
              className={`px-6 py-2.5 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${mc.confirmClass}`} data-testid="modal-confirm">
              {modalLoading ? 'Provádím...' : mc.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block">
        <Link to="/" className="flex items-center mb-10">
          <span className="text-2xl font-bold text-gray-900">Craft</span>
          <span className="text-2xl font-bold text-orange-500">Bolt</span>
        </Link>

        <nav className="space-y-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`} data-testid={`nav-${tab.id}`}>
              <tab.icon weight={activeTab === tab.id ? 'fill' : 'regular'} className="w-5 h-5" />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 rounded-xl transition-colors" data-testid="logout-btn">
            <SignOut className="w-5 h-5" />
            Odhlásit se
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">Správa platformy CraftBolt</p>
            </div>
            {/* Mobile tabs */}
            <div className="flex gap-1 lg:hidden">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                  className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>
                  <tab.icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-100">
            {renderContent()}
          </div>
        </div>
      </main>

      {renderModal()}
    </div>
  );
};

// ============ DEMAND ACTIONS DROPDOWN ============

const DemandActionsMenu = ({ demand, onAction }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" data-testid={`demand-actions-${demand.id}`}>
        <CaretDown className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 w-56" data-testid={`demand-menu-${demand.id}`}>
            <button onClick={() => { onAction('wrong_category'); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700" data-testid={`notify-wrong-cat-${demand.id}`}>
              <Tag className="w-4 h-4 text-orange-500" /> Špatná kategorie
            </button>
            <button onClick={() => { onAction('improve_description'); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700" data-testid={`notify-improve-${demand.id}`}>
              <PencilSimple className="w-4 h-4 text-blue-500" /> Vylepšit popis
            </button>
            <button onClick={() => { onAction('vulgar_language'); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600" data-testid={`notify-vulgar-${demand.id}`}>
              <Warning className="w-4 h-4" /> Nevhodná slova / vulgarita
            </button>
            <button onClick={() => { onAction('custom'); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700" data-testid={`notify-custom-${demand.id}`}>
              <ChatCircle className="w-4 h-4 text-gray-500" /> Vlastní oznámení
            </button>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button onClick={() => { onAction('cancel'); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-2 text-red-600" data-testid={`cancel-demand-${demand.id}`}>
                <Trash className="w-4 h-4" /> Zrušit zakázku
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
