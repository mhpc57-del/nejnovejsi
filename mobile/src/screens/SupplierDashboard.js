import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { demandService, subscriptionService, messageService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, DEMAND_TABS_SUPPLIER, RADIUS, SHADOWS } from '../utils/theme';
import { DemandCard, TabBar, EmptyState } from '../components/SharedComponents';

export default function SupplierDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [availableDemands, setAvailableDemands] = useState([]);
  const [myDemands, setMyDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available_verified');
  const [subscriptionActive, setSubscriptionActive] = useState(null);
  const [unreadDemandIds, setUnreadDemandIds] = useState([]);

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
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const fetchUnread = async () => {
    try {
      const res = await messageService.getUnreadSummary();
      setUnreadDemandIds((res.data || []).map(d => d.demand_id));
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    fetchData();
    fetchUnread();
    const interval = setInterval(() => { fetchData(); fetchUnread(); }, 15000);
    return () => clearInterval(interval);
  }, []));

  const availVerified = availableDemands.filter(d => d.verified);
  const availUnverified = availableDemands.filter(d => !d.verified);
  const inProgress = myDemands.filter(d => d.status === 'in_progress');
  const pendingCompletion = myDemands.filter(d => d.status === 'pending_completion');
  const inDispute = myDemands.filter(d => d.status === 'dispute');
  const completed = myDemands.filter(d => d.status === 'completed');
  const cancelled = myDemands.filter(d => d.status === 'cancelled');

  const counts = {
    available_verified: availVerified.length, available_unverified: availUnverified.length,
    in_progress: inProgress.length, pending_completion: pendingCompletion.length,
    dispute: inDispute.length, completed: completed.length, cancelled: cancelled.length,
  };

  const getFiltered = () => {
    switch (activeTab) {
      case 'available_verified': return availVerified;
      case 'available_unverified': return availUnverified;
      case 'in_progress': return inProgress;
      case 'pending_completion': return pendingCompletion;
      case 'dispute': return inDispute;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const totalEarnings = myDemands.filter(d => d.status === 'completed' && d.invoiced_amount).reduce((sum, d) => sum + d.invoiced_amount, 0);
  const filtered = getFiltered();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Dodavatel</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.company_name || user?.first_name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerBtn}>
          <Ionicons name="person-outline" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

      {subscriptionActive === false && (
        <View style={styles.paywallBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Ionicons name="lock-closed" size={20} color={COLORS.red500} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.red700 }}>Neaktivní přístup</Text>
              <Text style={{ fontSize: 13, color: COLORS.red500, marginTop: 2 }}>Pro přístup k zakázkám uhraďte platbu.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.paywallBtn} onPress={() => Linking.openURL('https://craftbolt.cz/cenik')}>
            <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>Uhradit přístup</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.earningsBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.earningsIcon}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.green500} />
          </View>
          <Text style={{ fontSize: 14, color: COLORS.gray500 }}>Celkové příjmy</Text>
        </View>
        <Text style={styles.earningsAmount}>{totalEarnings.toLocaleString('cs-CZ')} Kč</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrapper}>
        <TabBar tabs={DEMAND_TABS_SUPPLIER} activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
      </ScrollView>

      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); fetchUnread(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Žádné zakázky" subtitle="V této kategorii zatím nic není" />
        ) : (
          filtered.map(d => (
            <DemandCard
              key={d.id}
              demand={d}
              onPress={() => navigation.navigate('DemandDetail', { demand: d, role: 'supplier' })}
              showNew={unreadDemandIds.includes(d.id)}
            />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 13, color: COLORS.gray500, letterSpacing: 0.3 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2 },
  headerBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  paywallBanner: { backgroundColor: COLORS.red50, borderBottomWidth: 1, borderBottomColor: COLORS.red100, padding: 16 },
  paywallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, ...SHADOWS.glow },
  earningsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  earningsIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.green50, justifyContent: 'center', alignItems: 'center' },
  earningsAmount: { fontSize: 20, fontWeight: '700', color: COLORS.green500 },
  tabsWrapper: { maxHeight: 56, backgroundColor: COLORS.white },
  list: { flex: 1, padding: 16 },
});
