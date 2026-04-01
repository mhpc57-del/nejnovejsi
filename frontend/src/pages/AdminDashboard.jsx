import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  House, Users, Briefcase, ChartBar, SignOut, 
  User, Calendar, Check, X, Eye, Star
} from '@phosphor-icons/react';

const AdminDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingTrust, setUpdatingTrust] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, demandsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/demands`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDemands(demandsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleTrustScoreUpdate = async (userId, score) => {
    setUpdatingTrust(userId);
    try {
      await axios.put(`${API}/admin/users/${userId}/trust-score`, {
        user_id: userId,
        trust_score: score
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Nepodařilo se aktualizovat hodnocení');
    } finally {
      setUpdatingTrust(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Přehled', icon: House },
    { id: 'users', label: 'Uživatelé', icon: Users },
    { id: 'demands', label: 'Zakázky', icon: Briefcase },
  ];

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const styles = {
      customer: 'bg-blue-100 text-blue-700',
      supplier: 'bg-green-100 text-green-700',
      admin: 'bg-purple-100 text-purple-700'
    };
    const labels = {
      customer: 'Zákazník',
      supplier: 'Dodavatel',
      admin: 'Admin'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Celkem uživatelů', value: stats?.total_users || 0, icon: Users, color: 'bg-blue-500' },
                { label: 'Zákazníků', value: stats?.customers || 0, icon: User, color: 'bg-green-500' },
                { label: 'Dodavatelů', value: stats?.suppliers || 0, icon: Briefcase, color: 'bg-orange-500' },
                { label: 'Celkem zakázek', value: stats?.total_demands || 0, icon: Briefcase, color: 'bg-purple-500' },
                { label: 'Otevřených', value: stats?.open_demands || 0, icon: Check, color: 'bg-green-500' },
                { label: 'Dokončených', value: stats?.completed_demands || 0, icon: Check, color: 'bg-gray-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-5">
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
                  </tr>
                </thead>
                <tbody>
                  {demands.slice(0, 5).map((demand) => (
                    <tr key={demand.id} className="border-b border-gray-100 last:border-0">
                      <td className="p-4 text-sm text-gray-900">{demand.title}</td>
                      <td className="p-4 text-sm text-gray-500">{demand.category}</td>
                      <td className="p-4">{getStatusBadge(demand.status)}</td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(demand.created_at).toLocaleDateString('cs-CZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">E-mail</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Jméno</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Certifikace</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Důvěryhodnost</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Registrace</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Ověřen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-900">{u.email}</td>
                    <td className="p-4 text-sm text-gray-500">{u.company_name || '-'}</td>
                    <td className="p-4">{getRoleBadge(u.role)}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {u.role === 'supplier' ? (u.certifications?.length || 0) : '-'}
                    </td>
                    <td className="p-4">
                      {u.role === 'supplier' ? (
                        <div className="flex items-center gap-1" data-testid={`trust-score-${u.id}`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => handleTrustScoreUpdate(u.id, star)}
                              disabled={updatingTrust === u.id}
                              className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
                              data-testid={`trust-star-${u.id}-${star}`}>
                              <Star weight={star <= (u.trust_score || 0) ? 'fill' : 'regular'}
                                className={`w-4 h-4 ${star <= (u.trust_score || 0) ? 'text-yellow-500' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="p-4">
                      {u.is_verified ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'demands':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Název</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Kategorie</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Zákazník</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Dodavatel</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Stav</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Datum</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {demands.map((demand) => (
                  <tr key={demand.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-900">{demand.title}</td>
                    <td className="p-4 text-sm text-gray-500">{demand.category}</td>
                    <td className="p-4 text-sm text-gray-500">{demand.customer_name}</td>
                    <td className="p-4 text-sm text-gray-500">{demand.assigned_supplier_name || '-'}</td>
                    <td className="p-4">{getStatusBadge(demand.status)}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(demand.created_at).toLocaleDateString('cs-CZ')}
                    </td>
                    <td className="p-4">
                      <Link 
                        to={`/zakazka/${demand.id}`}
                        className="text-orange-500 hover:text-orange-600"
                        data-testid={`view-demand-${demand.id}`}
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6 hidden lg:block">
        <Link to="/" className="flex items-center mb-10">
          <span className="text-2xl font-bold text-gray-900">Craft</span>
          <span className="text-2xl font-bold text-orange-500">Bolt</span>
        </Link>

        <nav className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${
                activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              data-testid={`nav-${tab.id}`}
            >
              <tab.icon weight={activeTab === tab.id ? 'fill' : 'regular'} className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            data-testid="logout-btn"
          >
            <SignOut className="w-5 h-5" />
            Odhlásit se
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">Správa platformy CraftBolt</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-100">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
