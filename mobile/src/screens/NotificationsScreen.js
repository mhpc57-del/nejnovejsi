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

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
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

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // Build notification items from demands
  const notifications = [];
  demands.forEach(d => {
    const isCustomer = d.customer_id === user?.id;
    const isSupplier = d.assigned_supplier_id === user?.id;

    // Soft accepts (for customer)
    if (isCustomer && d.soft_accepts?.length > 0) {
      d.soft_accepts.forEach(sa => {
        notifications.push({
          id: `sa_${d.id}_${sa.created_at}`,
          icon: 'hand-right-outline',
          color: COLORS.orange500,
          title: `Nezávazná nabídka na "${d.title}"`,
          subtitle: `${sa.supplier_name}: ${sa.reason}`,
          time: sa.created_at,
          demandId: d.id,
        });
      });
    }
    // Accepted (for customer)
    if (isCustomer && d.status === 'in_progress' && d.accepted_at) {
      notifications.push({
        id: `acc_${d.id}`,
        icon: 'checkmark-circle-outline',
        color: COLORS.green500,
        title: `Zakázka "${d.title}" přijata`,
        subtitle: d.assigned_supplier_name ? `Dodavatel: ${d.assigned_supplier_name}` : 'Dodavatel přijal zakázku',
        time: d.accepted_at,
        demandId: d.id,
      });
    }
    // Completed
    if ((isCustomer || isSupplier) && d.status === 'completed' && d.completed_at) {
      notifications.push({
        id: `comp_${d.id}`,
        icon: 'flag-outline',
        color: COLORS.blue500,
        title: `Zakázka "${d.title}" dokončena`,
        subtitle: 'Můžete ohodnotit druhou stranu',
        time: d.completed_at,
        demandId: d.id,
      });
    }
    // Supplier arrived
    if (isCustomer && d.supplier_arrived && d.supplier_arrived_at) {
      notifications.push({
        id: `arr_${d.id}`,
        icon: 'navigate-outline',
        color: COLORS.primary,
        title: `Dodavatel dorazil — "${d.title}"`,
        subtitle: d.assigned_supplier_name || 'Dodavatel je na místě',
        time: d.supplier_arrived_at,
        demandId: d.id,
      });
    }
  });

  // Sort by time descending
  notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return 'Právě teď';
    if (diffMin < 60) return `před ${diffMin} min`;
    if (diffHrs < 24) return `před ${diffHrs} hod`;
    if (diffDays < 7) return `před ${diffDays} dny`;
    return d.toLocaleDateString('cs-CZ');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.pageTitle}>Oznámení</Text>
        {notifications.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{notifications.length}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={56} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Žádná oznámení</Text>
            <Text style={styles.emptyText}>Až se něco stane, uvidíte to zde</Text>
          </View>
        ) : (
          notifications.map(notif => (
            <TouchableOpacity key={notif.id} style={styles.notifCard}
              onPress={() => navigation.navigate('DemandDetail', { id: notif.demandId })} activeOpacity={0.7}>
              <View style={[styles.notifIcon, { backgroundColor: notif.color + '15' }]}>
                <Ionicons name={notif.icon} size={22} color={notif.color} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                <Text style={styles.notifSubtitle} numberOfLines={2}>{notif.subtitle}</Text>
                <Text style={styles.notifTime}>{formatTime(notif.time)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
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
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  countBadge: { backgroundColor: COLORS.primary, minWidth: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  list: { flex: 1, padding: 16 },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray100, gap: 14 },
  notifIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray900, marginBottom: 3 },
  notifSubtitle: { fontSize: 13, color: COLORS.gray700, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 12, color: COLORS.gray500 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray900, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
});
