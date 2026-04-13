import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { messageService } from '../services/api';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await messageService.getUnreadSummary();
      setUnread(res.data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Oznámení</Text>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : unread.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Žádná nová oznámení</Text>
            <Text style={styles.emptyText}>Budeme vás informovat o nových zprávách a zakázkách</Text>
          </View>
        ) : (
          unread.map((item, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Nová zpráva</Text>
                <Text style={styles.cardText}>{item.unread_count} nepřečtených zpráv v zakázce</Text>
                <Text style={styles.cardTime}>{item.demand_title}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  cardText: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  cardTime: { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginTop: 4 },
  badge: { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
