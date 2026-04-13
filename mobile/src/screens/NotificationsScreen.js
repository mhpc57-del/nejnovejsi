import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messageService } from '../services/api';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';

export default function NotificationsScreen({ navigation }) {
  const [unread, setUnread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await messageService.getUnreadSummary();
      setUnread(res.data || []);
    } catch (e) {
      console.log('Notifications fetch error:', e);
      setUnread([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={22} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Oznámení</Text>
      </View>
      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : unread.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.gray300} />
            </View>
            <Text style={styles.emptyTitle}>Žádná nová oznámení</Text>
            <Text style={styles.emptyText}>Budeme vás informovat o nových zprávách a zakázkách</Text>
          </View>
        ) : (
          unread.map((item, i) => (
            <TouchableOpacity key={i} style={styles.card} activeOpacity={0.7}
              onPress={() => {
                if (item.demand_id) {
                  navigation.navigate('DemandDetail', { demand: { id: item.demand_id, title: item.demand_title || 'Zakázka', status: 'in_progress' }, role: 'supplier' });
                }
              }}>
              <View style={styles.cardIcon}>
                <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Nová zpráva</Text>
                <Text style={styles.cardText}>{item.unread_count} nepřečtených zpráv</Text>
                {item.demand_title && <Text style={styles.cardDemand}>{item.demand_title}</Text>}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  list: { flex: 1, padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  cardText: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  cardDemand: { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginTop: 4 },
  badge: { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
