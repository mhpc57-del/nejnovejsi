import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { demandService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS } from '../utils/theme';

const TABS = [
  { key: 'available', label: 'Dostupné', color: COLORS.green500, icon: 'radio-button-on' },
  { key: 'in_progress', label: 'Rozdělané', color: COLORS.orange500, icon: 'time-outline' },
  { key: 'completed', label: 'Dokončené', color: COLORS.gray500, icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'Nedokončené', color: COLORS.red500, icon: 'close-circle-outline' },
];

export default function SupplierDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  const fetchDemands = async () => {
    try {
      const res = await demandService.getAll();
      setDemands(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDemands(); }, []));

  const myDemands = demands.filter(d => d.assigned_supplier_id === user?.id);
  const availableDemands = demands.filter(d => d.status === 'open');

  const getFilteredDemands = () => {
    switch (activeTab) {
      case 'available': return availableDemands;
      case 'in_progress': return myDemands.filter(d => d.status === 'in_progress');
      case 'completed': return myDemands.filter(d => d.status === 'completed');
      case 'cancelled': return myDemands.filter(d => d.status === 'cancelled');
      default: return [];
    }
  };

  const tabCounts = {
    available: availableDemands.length,
    in_progress: myDemands.filter(d => d.status === 'in_progress').length,
    completed: myDemands.filter(d => d.status === 'completed').length,
    cancelled: myDemands.filter(d => d.status === 'cancelled').length,
  };

  const totalEarnings = myDemands
    .filter(d => d.status === 'completed' && d.invoiced_amount)
    .reduce((sum, d) => sum + d.invoiced_amount, 0);

  const filtered = getFilteredDemands();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Dodavatel</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.company_name || user?.first_name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

      {/* Earnings */}
      <View style={styles.earningsBar}>
        <View style={styles.earningsLeft}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.green500} />
          <Text style={styles.earningsLabel}>Celkové příjmy</Text>
        </View>
        <Text style={styles.earningsAmount}>{totalEarnings.toLocaleString('cs-CZ')} Kč</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderColor: tab.color, backgroundColor: tab.color + '15' }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? tab.color : COLORS.gray500} />
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.color, fontWeight: '600' }]}>{tab.label}</Text>
            <View style={[styles.tabCountBadge, { backgroundColor: activeTab === tab.key ? tab.color : COLORS.gray200 }]}>
              <Text style={[styles.tabCount, { color: activeTab === tab.key ? COLORS.white : COLORS.gray700 }]}>{tabCounts[tab.key]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Demand List */}
      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemands(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyText}>Žádné zakázky v této kategorii</Text>
          </View>
        ) : (
          filtered.map(demand => (
            <TouchableOpacity key={demand.id} style={styles.card}
              onPress={() => navigation.navigate('DemandDetail', { id: demand.id })} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{demand.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[demand.status]?.bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[demand.status]?.text }]}>
                    {STATUS_COLORS[demand.status]?.label}
                  </Text>
                </View>
              </View>
              <View style={styles.cardCatRow}>
                <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
                <Text style={styles.cardCategory}>{demand.category}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{demand.description}</Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
                  <Text style={styles.metaText} numberOfLines={1}>{demand.address}</Text>
                </View>
                <Text style={styles.metaDate}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
              {demand.deadline && (
                <View style={styles.deadlineRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.deadlineText}>Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</Text>
                </View>
              )}
              {demand.customer_name && (
                <View style={styles.customerRow}>
                  <Ionicons name="person-outline" size={14} color={COLORS.gray500} />
                  <Text style={styles.customerText}>{demand.customer_name}</Text>
                </View>
              )}
              {demand.invoiced_amount > 0 && (
                <View style={styles.invoiceRow}>
                  <Ionicons name="cash-outline" size={14} color={COLORS.green500} />
                  <Text style={styles.invoiceText}>{demand.invoiced_amount.toLocaleString('cs-CZ')} Kč</Text>
                </View>
              )}
              <View style={styles.cardArrow}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 14, color: COLORS.gray500 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  earningsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earningsLabel: { fontSize: 14, color: COLORS.gray500 },
  earningsAmount: { fontSize: 20, fontWeight: '700', color: COLORS.green500 },
  tabsScroll: { backgroundColor: COLORS.white, maxHeight: 60, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabLabel: { fontSize: 13, color: COLORS.gray700 },
  tabCountBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabCount: { fontSize: 12, fontWeight: '700' },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardCategory: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  cardDesc: { fontSize: 14, color: COLORS.gray700, marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 13, color: COLORS.gray500, flex: 1 },
  metaDate: { fontSize: 13, color: COLORS.gray500 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  deadlineText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  customerText: { fontSize: 13, color: COLORS.gray700 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  invoiceText: { fontSize: 14, color: COLORS.green500, fontWeight: '700' },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: COLORS.gray500, marginTop: 12 },
});
