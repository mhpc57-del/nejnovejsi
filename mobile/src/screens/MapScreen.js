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

const DEFAULT_CENTER = { latitude: 49.8175, longitude: 15.4730 };

export default function MapScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchDemands = async () => {
    try {
      const res = await demandService.getAll();
      setDemands(res.data);
    } catch (e) {
      console.error('Map fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDemands(); }, []));

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return { icon: 'radio-button-on', color: COLORS.green500 };
      case 'in_progress': return { icon: 'time-outline', color: COLORS.blue500 };
      case 'completed': return { icon: 'checkmark-circle', color: COLORS.gray500 };
      case 'cancelled': return { icon: 'close-circle', color: COLORS.red500 };
      default: return { icon: 'ellipse', color: COLORS.primary };
    }
  };

  const filteredDemands = demands.filter(d => {
    if (!d.latitude || !d.longitude) return false;
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const FILTERS = [
    { key: 'all', label: 'Vše', icon: 'layers-outline' },
    { key: 'open', label: 'Otevřené', icon: 'radio-button-on' },
    { key: 'in_progress', label: 'Probíhající', icon: 'time-outline' },
    { key: 'completed', label: 'Hotové', icon: 'checkmark-circle-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Ionicons name="map" size={22} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Mapa zakázek</Text>
        <Text style={styles.headerCount}>{filteredDemands.length}</Text>
      </View>

      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)} activeOpacity={0.7}>
            <Ionicons name={f.icon} size={14}
              color={filter === f.key ? COLORS.white : COLORS.gray700} />
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemands(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Načítám zakázky...</Text>
          </View>
        ) : filteredDemands.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="map-outline" size={56} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>Žádné zakázky na mapě</Text>
            <Text style={styles.emptyText}>Zakázky s adresou se zobrazí zde</Text>
          </View>
        ) : (
          filteredDemands.map(demand => {
            const si = getStatusIcon(demand.status);
            return (
              <TouchableOpacity key={demand.id} style={styles.card}
                onPress={() => navigation.navigate('DemandDetail', { id: demand.id })} activeOpacity={0.7}>
                <View style={styles.cardRow}>
                  <View style={[styles.statusDot, { backgroundColor: si.color + '20' }]}>
                    <Ionicons name={si.icon} size={20} color={si.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{demand.title}</Text>
                    <View style={styles.cardMetaRow}>
                      <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.cardCat}>{demand.category}</Text>
                    </View>
                    <View style={styles.cardMetaRow}>
                      <Ionicons name="location-outline" size={12} color={COLORS.gray500} />
                      <Text style={styles.cardAddr} numberOfLines={1}>{demand.address}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
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
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  headerCount: { fontSize: 14, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  filtersRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.gray700 },
  filterTextActive: { color: COLORS.white },
  list: { flex: 1, padding: 16 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.gray100,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray900, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  cardCat: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  cardAddr: { fontSize: 12, color: COLORS.gray500, flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: COLORS.gray500, marginTop: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray900, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
});
