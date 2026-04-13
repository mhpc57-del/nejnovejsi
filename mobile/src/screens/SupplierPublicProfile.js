import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Modal, Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../services/api';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SupplierPublicProfile({ route, navigation }) {
  const { supplierId, supplierName } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (supplierId) {
      userService.getById(supplierId)
        .then(res => setProfile(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [supplierId]);

  const photos = profile?.reference_photos || [];

  const openGallery = (index) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  if (!profile) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
      <Ionicons name="person-outline" size={48} color={COLORS.gray300} />
      <Text style={{ fontSize: 16, color: COLORS.gray500, marginTop: 12 }}>Profil nenalezen</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Zpět</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Profil dodavatele</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileTop}>
          {profile.profile_image ? (
            <Image source={{ uri: profile.profile_image.startsWith('http') ? profile.profile_image : `https://craftbolt.cz${profile.profile_image}` }}
              style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.white }}>
                {(profile.company_name?.[0] || profile.first_name?.[0] || 'D').toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{profile.company_name || `${profile.first_name} ${profile.last_name}`}</Text>
          {profile.address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
              <Text style={{ fontSize: 13, color: COLORS.gray500 }}>{profile.address}</Text>
            </View>
          )}
          {profile.average_rating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= Math.round(profile.average_rating) ? 'star' : 'star-outline'} size={18} color={COLORS.orange500} />
              ))}
              <Text style={{ fontSize: 13, color: COLORS.gray600, fontWeight: '600' }}>
                {profile.average_rating?.toFixed(1)} ({profile.rating_count || 0} hodnocení)
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.card}>
          {profile.bio && (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.sectionTitle}>O firmě</Text>
              <Text style={{ fontSize: 14, color: COLORS.gray700, lineHeight: 22 }}>{profile.bio}</Text>
            </View>
          )}
          {profile.ico && <InfoItem icon="business-outline" label="IČO" value={profile.ico} />}
          {profile.dic && <InfoItem icon="receipt-outline" label="DIČ" value={profile.dic} />}
          {profile.phone && <InfoItem icon="call-outline" label="Telefon" value={profile.phone} />}
          {profile.website && <InfoItem icon="globe-outline" label="Web" value={profile.website} />}
        </View>

        {/* Categories */}
        {profile.categories?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Služby</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.categories.map((cat, i) => (
                <View key={i} style={styles.catChip}>
                  <Text style={styles.catChipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reference photos gallery */}
        {photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Referenční fotky ({photos.length})</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, i) => {
                const url = (photo.url || photo);
                const fullUrl = url.startsWith('http') ? url : `https://craftbolt.cz${url}`;
                return (
                  <TouchableOpacity key={i} onPress={() => openGallery(i)} activeOpacity={0.8}>
                    <Image source={{ uri: fullUrl }} style={styles.gridPhoto} />
                    {i === 0 && photos.length > 4 && (
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoOverlayText}>+{photos.length - 4}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {photos.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Referenční fotky</Text>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="images-outline" size={36} color={COLORS.gray300} />
              <Text style={{ fontSize: 13, color: COLORS.gray400, marginTop: 8 }}>Dodavatel zatím nepřidal fotky</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fullscreen gallery modal */}
      <Modal visible={galleryVisible} transparent animationType="fade">
        <View style={styles.galleryOverlay}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>{galleryIndex + 1} / {photos.length}</Text>
            <TouchableOpacity onPress={() => setGalleryVisible(false)} style={styles.galleryClose}>
              <Ionicons name="close" size={26} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={galleryIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setGalleryIndex(idx);
            }}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => {
              const url = (item.url || item);
              const fullUrl = url.startsWith('http') ? url : `https://craftbolt.cz${url}`;
              return (
                <View style={{ width: SCREEN_WIDTH, justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: fullUrl }}
                    style={{ width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32, borderRadius: 12 }}
                    resizeMode="contain" />
                </View>
              );
            }}
          />
          {/* Navigation dots */}
          {photos.length > 1 && (
            <View style={styles.galleryDots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === galleryIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const InfoItem = ({ icon, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray50 }}>
    <Ionicons name={icon} size={18} color={COLORS.primary} />
    <View>
      <Text style={{ fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 15, color: COLORS.gray900, marginTop: 1 }}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900, flex: 1 },
  profileTop: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, margin: 16, marginBottom: 0, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  catChip: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  catChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridPhoto: { width: (SCREEN_WIDTH - 80) / 3, height: (SCREEN_WIDTH - 80) / 3, borderRadius: 10 },
  photoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  photoOverlayText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  galleryTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  galleryClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  galleryDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
});
