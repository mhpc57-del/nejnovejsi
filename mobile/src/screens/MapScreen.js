import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { demandService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS } from '../utils/theme';

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 49.8175,
  longitude: 15.4730,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
};

export default function MapScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [filter, setFilter] = useState('all');

  const fetchDemands = async () => {
    try {
      const res = await demandService.getAll();
      setDemands(res.data);
    } catch (e) {
      console.error('Map fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      });
    } catch (e) {
      console.log('Location not available');
    }
  };

  useFocusEffect(useCallback(() => {
    fetchDemands();
    getUserLocation();
  }, []));

  const getMarkerColor = (status) => {
    switch (status) {
      case 'open': return COLORS.green500;
      case 'in_progress': return COLORS.blue500;
      case 'completed': return COLORS.gray500;
      case 'cancelled': return COLORS.red500;
      default: return COLORS.primary;
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Ionicons name="map" size={22} color={COLORS.primary} />
        <Text style={styles.headerTitle}>Mapa zakázek</Text>
        <Text style={styles.headerCount}>{filteredDemands.length}</Text>
      </View>

      {/* Filter chips */}
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

      {/* Map */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Načítám zakázky...</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {filteredDemands.map(demand => (
            <Marker
              key={demand.id}
              coordinate={{ latitude: demand.latitude, longitude: demand.longitude }}
              pinColor={getMarkerColor(demand.status)}
            >
              <Callout tooltip onPress={() => navigation.navigate('DemandDetail', { id: demand.id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{demand.title}</Text>
                  <View style={styles.calloutRow}>
                    <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.calloutCat}>{demand.category}</Text>
                  </View>
                  <View style={styles.calloutRow}>
                    <Ionicons name="location-outline" size={12} color={COLORS.gray500} />
                    <Text style={styles.calloutAddr} numberOfLines={1}>{demand.address}</Text>
                  </View>
                  <View style={[styles.calloutBadge, { backgroundColor: getMarkerColor(demand.status) + '20' }]}>
                    <Text style={[styles.calloutStatus, { color: getMarkerColor(demand.status) }]}>
                      {STATUS_COLORS[demand.status]?.label || demand.status}
                    </Text>
                  </View>
                  <Text style={styles.calloutTap}>Klepněte pro detail</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* My Location Button */}
      {userLocation && (
        <TouchableOpacity style={[styles.myLocBtn, { bottom: 24 }]}
          onPress={() => setRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          })}>
          <Ionicons name="navigate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      )}
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
  map: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: COLORS.gray500, marginTop: 12 },
  callout: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, width: 220,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
  },
  calloutTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, marginBottom: 6 },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  calloutCat: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  calloutAddr: { fontSize: 12, color: COLORS.gray500, flex: 1 },
  calloutBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6 },
  calloutStatus: { fontSize: 11, fontWeight: '600' },
  calloutTap: { fontSize: 11, color: COLORS.gray500, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  myLocBtn: {
    position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
  },
});
