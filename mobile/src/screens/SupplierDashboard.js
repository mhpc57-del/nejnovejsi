import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { demandService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS } from '../utils/theme';

const TABS = [
  { key: 'available', label: 'Dostupné', color: COLORS.green500, icon: '●' },
  { key: 'in_progress', label: 'Rozdělané', color: COLORS.red500, icon: '●' },
  { key: 'completed', label: 'Dokončené', color: COLORS.gray500, icon: '●' },
  { key: 'cancelled', label: 'Nedokončené', color: COLORS.primary, icon: '●' },
];

export default function SupplierDashboard({ navigation }) {
  const { user, logout } = useAuth();
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
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Dodavatel</Text>
          <Text style={styles.userName}>{user?.company_name || user?.first_name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Odhlásit</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings */}
      <View style={styles.earningsBar}>
        <Text style={styles.earningsLabel}>Celkové příjmy</Text>
        <Text style={styles.earningsAmount}>{totalEarnings.toLocaleString('cs-CZ')} Kč</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderColor: tab.color, backgroundColor: tab.color + '15' }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={[styles.tabDot, { backgroundColor: tab.color }]} />
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.color, fontWeight: '600' }]}>{tab.label}</Text>
            <Text style={[styles.tabCount, { color: tab.color }]}>{tabCounts[tab.key]}</Text>
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
              <Text style={styles.cardCategory}>{demand.category}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{demand.description}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>{demand.address}</Text>
                <Text style={styles.metaText}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
              {demand.deadline && (
                <Text style={styles.deadlineText}>Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</Text>
              )}
              {demand.customer_name && (
                <Text style={styles.customerText}>Zákazník: {demand.customer_name}</Text>
              )}
              {demand.invoiced_amount && (
                <Text style={styles.invoiceText}>{demand.invoiced_amount.toLocaleString('cs-CZ')} Kč</Text>
              )}
              {demand.cancellation_reason && (
                <Text style={styles.cancelText}>{demand.cancellation_reason}</Text>
              )}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 14, color: COLORS.gray500 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray200 },
  logoutText: { fontSize: 14, color: COLORS.gray700, fontWeight: '500' },
  earningsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  earningsLabel: { fontSize: 14, color: COLORS.gray500 },
  earningsAmount: { fontSize: 18, fontWeight: '700', color: COLORS.green500 },
  tabsScroll: { backgroundColor: COLORS.white, maxHeight: 70 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
  tabLabel: { fontSize: 13, color: COLORS.gray700 },
  tabCount: { fontSize: 13, fontWeight: '700' },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray100 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardCategory: { fontSize: 13, color: COLORS.primary, fontWeight: '500', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: COLORS.gray700, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 13, color: COLORS.gray500 },
  deadlineText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 6 },
  customerText: { fontSize: 13, color: COLORS.gray700, marginTop: 4 },
  invoiceText: { fontSize: 14, color: COLORS.green500, fontWeight: '700', marginTop: 6 },
  cancelText: { fontSize: 13, color: COLORS.red500, marginTop: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.gray500 },
});
