import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { demandService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS, RADIUS } from '../utils/theme';

const DEFAULT_REGION = {
  latitude: 49.8175,
  longitude: 15.4730,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

const FILTERS = [
  { key: 'all', label: 'Vse', icon: 'layers-outline' },
  { key: 'open', label: 'Otevrene', icon: 'radio-button-on', color: COLORS.green500 },
  { key: 'in_progress', label: 'Probihajici', icon: 'time-outline', color: COLORS.blue500 },
  { key: 'completed', label: 'Hotove', icon: 'checkmark-circle-outline', color: COLORS.gray500 },
];

const getMarkerColor = (status) => {
  switch (status) {
    case 'open': return COLORS.green500;
    case 'in_progress': return COLORS.blue500;
    case 'completed': return COLORS.gray500;
    case 'cancelled': return COLORS.red500;
    default: return COLORS.primary;
  }
};

export default function MapScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDemand, setSelectedDemand] = useState(null);

  const fetchDemands = async () => {
    try {
      const res = user?.role === 'supplier' || user?.role === 'customer_supplier'
        ? await demandService.getAvailable().catch(() => demandService.getAll())
        : await demandService.getAll();
      setDemands(res.data || []);
    } catch (e) {
      console.error('Map fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDemands(); }, []));

  const filteredDemands = demands.filter(d => {
    if (!d.latitude || !d.longitude) return false;
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const handleMarkerPress = (demand) => {
    setSelectedDemand(demand);
  };

  const fitToMarkers = () => {
    if (filteredDemands.length > 0 && mapRef.current) {
      const coords = filteredDemands.map(d => ({ latitude: d.latitude, longitude: d.longitude }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Ionicons name="map" size={20} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Mapa zakazek</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredDemands.length}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)} activeOpacity={0.7}>
            <Ionicons name={f.icon} size={14} color={filter === f.key ? COLORS.white : COLORS.gray600} />
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Nacitam zakazky...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            onMapReady={fitToMarkers}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {filteredDemands.map(demand => (
              <Marker
                key={demand.id}
                coordinate={{ latitude: demand.latitude, longitude: demand.longitude }}
                pinColor={getMarkerColor(demand.status)}
                onPress={() => handleMarkerPress(demand)}
              >
                <Callout onPress={() => navigation.navigate('DemandDetail', { id: demand.id })}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>{demand.title}</Text>
                    <Text style={styles.calloutCat}>{demand.category}</Text>
                    <Text style={styles.calloutAddr} numberOfLines={1}>{demand.address}</Text>
                    <Text style={styles.calloutTap}>Klepnete pro detail</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* My location button */}
          <TouchableOpacity style={[styles.locBtn, { bottom: selectedDemand ? 180 : 24 }]}
            onPress={fitToMarkers} activeOpacity={0.8}>
            <Ionicons name="locate" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Selected demand card */}
          {selectedDemand && (
            <TouchableOpacity style={styles.selectedCard} activeOpacity={0.9}
              onPress={() => navigation.navigate('DemandDetail', { id: selectedDemand.id })}>
              <View style={styles.selectedCardInner}>
                <View style={[styles.selectedStatusDot, { backgroundColor: getMarkerColor(selectedDemand.status) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedTitle} numberOfLines={1}>{selectedDemand.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.selectedCat}>{selectedDemand.category}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={COLORS.gray500} />
                    <Text style={styles.selectedAddr} numberOfLines={1}>{selectedDemand.address}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
              </View>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => setSelectedDemand(null)}>
                <Ionicons name="close" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.gray900, letterSpacing: -0.3 },
  countBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  countText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  filtersRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.gray200,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.gray600 },
  filterTextActive: { color: COLORS.white },
  map: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: COLORS.gray500, marginTop: 12 },
  callout: { width: 180, padding: 4 },
  calloutTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 2 },
  calloutCat: { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginBottom: 2 },
  calloutAddr: { fontSize: 11, color: COLORS.gray500, marginBottom: 4 },
  calloutTap: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  locBtn: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  selectedCard: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  selectedCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedStatusDot: { width: 10, height: 10, borderRadius: 5 },
  selectedTitle: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  selectedCat: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  selectedAddr: { fontSize: 12, color: COLORS.gray500, flex: 1 },
  dismissBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center',
  },
});
