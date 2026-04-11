import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { demandService, subscriptionService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, SHADOWS, RADIUS, STATUS_COLORS } from '../utils/theme';

const TABS = [
  { key: 'available', label: 'Dostupné', color: COLORS.green500, icon: 'radio-button-on' },
  { key: 'in_progress', label: 'Rozdělané', color: COLORS.orange500, icon: 'time-outline' },
  { key: 'completed', label: 'Dokončené', color: COLORS.gray500, icon: 'checkmark-circle-outline' },
  { key: 'cancelled', label: 'Nedokončené', color: COLORS.red500, icon: 'close-circle-outline' },
];

export default function SupplierDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [availableDemands, setAvailableDemands] = useState([]);
  const [myDemands, setMyDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [subscriptionActive, setSubscriptionActive] = useState(null);

  const fetchData = async () => {
    try {
      const [availRes, myRes, subRes] = await Promise.all([
        demandService.getAvailable().catch(() => ({ data: [] })),
        demandService.getMy().catch(() => ({ data: [] })),
        subscriptionService.getMy().catch(() => ({ data: { subscription_active: false } })),
      ]);
      setAvailableDemands(availRes.data || []);
      setMyDemands(myRes.data || []);
      setSubscriptionActive(subRes.data?.subscription_active ?? false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

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

      {/* Paywall banner */}
      {subscriptionActive === false && (
        <View style={styles.paywallBanner}>
          <View style={styles.paywallContent}>
            <Ionicons name="lock-closed" size={20} color={COLORS.red500} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paywallTitle}>Neaktivni pristup</Text>
              <Text style={styles.paywallDesc}>Pro pristup k zakazkam uhradte platbu.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.paywallBtn} onPress={() => Linking.openURL('https://craftbolt.cz/cenik')}>
            <Text style={styles.paywallBtnText}>Uhradit pristup</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Earnings */}
      <View style={styles.earningsBar}>
        <View style={styles.earningsLeft}>
          <View style={styles.earningsIcon}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.green500} />
          </View>
          <Text style={styles.earningsLabel}>Celkove prijmy</Text>
        </View>
        <Text style={styles.earningsAmount}>{totalEarnings.toLocaleString('cs-CZ')} Kc</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderColor: tab.color, backgroundColor: tab.color + '12' }]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? tab.color : COLORS.gray400} />
            <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.color, fontWeight: '600' }]}>{tab.label}</Text>
            <View style={[styles.tabCountBadge, { backgroundColor: activeTab === tab.key ? tab.color : COLORS.gray200 }]}>
              <Text style={[styles.tabCount, { color: activeTab === tab.key ? COLORS.white : COLORS.gray600 }]}>{tabCounts[tab.key]}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Demand List */}
      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="folder-open-outline" size={40} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Zadne zakazky</Text>
            <Text style={styles.emptyText}>V teto kategorii zatim nic neni</Text>
          </View>
        ) : (
          filtered.map(demand => {
            const st = STATUS_COLORS[demand.status] || STATUS_COLORS.open;
            return (
              <TouchableOpacity key={demand.id} style={styles.card}
                onPress={() => navigation.navigate('DemandDetail', { id: demand.id })} activeOpacity={0.7}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{demand.title}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                {demand.category && (
                  <View style={styles.catRow}>
                    <Ionicons name="pricetag-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.catText}>{demand.category}</Text>
                  </View>
                )}
                <Text style={styles.cardDesc} numberOfLines={2}>{demand.description}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={COLORS.gray400} />
                    <Text style={styles.metaText} numberOfLines={1}>{demand.address}</Text>
                  </View>
                  <Text style={styles.metaDate}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
                </View>
                {demand.deadline && (
                  <View style={styles.deadlineRow}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.deadlineText}>Termin: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</Text>
                  </View>
                )}
                {demand.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={13} color={COLORS.green500} />
                    <Text style={styles.verifiedText}>Overena poptavka</Text>
                  </View>
                )}
                <View style={styles.cardArrow}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 13, color: COLORS.gray500, letterSpacing: 0.3 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2, letterSpacing: -0.3 },
  logoutBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  paywallBanner: { backgroundColor: COLORS.red50, borderBottomWidth: 1, borderBottomColor: COLORS.red100, padding: 16 },
  paywallContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  paywallTitle: { fontSize: 15, fontWeight: '700', color: COLORS.red700 },
  paywallDesc: { fontSize: 13, color: COLORS.red500, marginTop: 2 },
  paywallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, ...SHADOWS.glow },
  paywallBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  earningsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earningsIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.green50, justifyContent: 'center', alignItems: 'center' },
  earningsLabel: { fontSize: 14, color: COLORS.gray500 },
  earningsAmount: { fontSize: 20, fontWeight: '700', color: COLORS.green500, letterSpacing: -0.3 },
  tabsScroll: { backgroundColor: COLORS.white, maxHeight: 56, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7, gap: 6 },
  tabLabel: { fontSize: 13, color: COLORS.gray600 },
  tabCountBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabCount: { fontSize: 12, fontWeight: '700' },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, flex: 1, marginRight: 8, letterSpacing: -0.2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  catText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  cardDesc: { fontSize: 14, color: COLORS.gray600, marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: COLORS.gray500, flex: 1 },
  metaDate: { fontSize: 12, color: COLORS.gray400 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  deadlineText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.green50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8, alignSelf: 'flex-start' },
  verifiedText: { fontSize: 12, color: COLORS.green700, fontWeight: '600' },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
});
