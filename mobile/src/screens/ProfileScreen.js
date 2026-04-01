import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Image, ActionSheetIOS, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { userService, uploadService, reviewService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS } from '../utils/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await userService.getById(user.id);
      setProfile(res.data);
      setForm(res.data);
      if (res.data.profile_image) {
        setAvatarUri(res.data.profile_image);
      }
      // Fetch reviews
      const reviewRes = await reviewService.getByUser(user.id).catch(() => ({ data: [] }));
      setReviews(reviewRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name,
        phone: form.phone,
        address: form.address,
      });
      Alert.alert('Uloženo', 'Profil byl aktualizován');
      setEditing(false);
      fetchProfile();
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se uložit');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async (useCamera) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Oprávnění', 'Pro fotografování je potřeba přístup k fotoaparátu');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Oprávnění', 'Pro výběr fotky je potřeba přístup ke galerii');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });

      if (!result.canceled && result.assets?.[0]) {
        setAvatarUri(result.assets[0].uri);
        setUploading(true);
        try {
          const uploadRes = await uploadService.upload(result.assets[0].uri);
          const imageUrl = uploadRes.data.url;
          await userService.updateProfile({ profile_image: imageUrl });
          setAvatarUri(imageUrl);
          Alert.alert('Hotovo', 'Profilová fotka nastavena a uložena');
        } catch (uploadErr) {
          console.error('Upload error:', uploadErr);
          Alert.alert('Fotka vybrána', 'Fotka nastavena lokálně (upload na server selhal)');
        } finally {
          setUploading(false);
        }
      }
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se vybrat fotku');
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Zrušit', 'Vyfotit', 'Vybrat z galerie'], cancelButtonIndex: 0 },
        (index) => { if (index === 1) pickImage(true); else if (index === 2) pickImage(false); }
      );
    } else {
      Alert.alert('Profilová fotka', 'Vyberte zdroj', [
        { text: 'Vyfotit', onPress: () => pickImage(true) },
        { text: 'Vybrat z galerie', onPress: () => pickImage(false) },
        { text: 'Zrušit', style: 'cancel' },
      ]);
    }
  };

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.pageTitle}>Profil</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={showImageOptions} style={styles.avatarWrap} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.first_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        <Text style={styles.profileEmail}>{profile?.email}</Text>
        <View style={styles.roleBadgeWrap}>
          <Ionicons name={profile?.role === 'supplier' ? 'construct-outline' : 'person-outline'} size={14} color={COLORS.primary} />
          <Text style={styles.roleBadgeText}>{profile?.role === 'supplier' ? 'Dodavatel' : 'Zákazník'}</Text>
        </View>
      </View>

      {/* Stats */}
      {(profile?.rating || profile?.punctuality_score != null) && (
        <View style={styles.statsRow}>
          {profile?.rating > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{profile.rating?.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Hodnocení</Text>
            </View>
          )}
          {profile?.punctuality_score != null && (
            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color={COLORS.blue500} />
              <Text style={[styles.statValue, { color: COLORS.blue500 }]}>{profile.punctuality_score?.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Dochvilnost</Text>
            </View>
          )}
          {profile?.trust_score > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.green500} />
              <Text style={[styles.statValue, { color: COLORS.green500 }]}>{profile.trust_score}/5</Text>
              <Text style={styles.statLabel}>Důvěra</Text>
            </View>
          )}
        </View>
      )}

      {/* Fields */}
      <View style={styles.fieldsCard}>
        <View style={styles.fieldHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="create-outline" size={18} color={COLORS.gray900} />
            <Text style={styles.fieldsTitle}>Osobní údaje</Text>
          </View>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editBtnWrap}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
              <>
                <Ionicons name={editing ? 'checkmark' : 'pencil'} size={16} color={COLORS.primary} />
                <Text style={styles.editBtn}>{editing ? 'Uložit' : 'Upravit'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {[
          { key: 'first_name', label: 'Jméno', icon: 'person-outline' },
          { key: 'last_name', label: 'Příjmení', icon: 'person-outline' },
          { key: 'company_name', label: 'Firma', icon: 'business-outline', show: profile?.role === 'supplier' },
          { key: 'phone', label: 'Telefon', icon: 'call-outline' },
          { key: 'address', label: 'Adresa', icon: 'location-outline' },
        ].filter(f => f.show !== false).map(field => (
          <View key={field.key} style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Ionicons name={field.icon} size={16} color={COLORS.gray500} />
              <Text style={styles.fieldLabel}>{field.label}</Text>
            </View>
            {editing ? (
              <TextInput style={styles.fieldInput} value={form[field.key] || ''}
                onChangeText={v => update(field.key, v)} placeholder={field.label}
                placeholderTextColor={COLORS.gray300} />
            ) : (
              <Text style={styles.fieldValue}>{profile?.[field.key] || '—'}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Categories for suppliers */}
      {profile?.role === 'supplier' && profile?.categories?.length > 0 && (
        <View style={styles.fieldsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="pricetags-outline" size={18} color={COLORS.gray900} />
            <Text style={styles.fieldsTitle}>Kategorie služeb</Text>
          </View>
          <View style={styles.catsGrid}>
            {profile.categories.map(cat => (
              <View key={cat} style={styles.catChip}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.catChipText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <View style={styles.fieldsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="chatbubbles-outline" size={18} color={COLORS.gray900} />
            <Text style={styles.fieldsTitle}>Hodnocení ({reviews.length})</Text>
          </View>
          {reviews.slice(0, 5).map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={14} color={s <= review.rating ? COLORS.primary : COLORS.gray300} />
                  ))}
                </View>
                <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
              <Text style={styles.reviewAuthor}>{review.reviewer_name}</Text>
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upload indicator */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.gray700, marginTop: 8 }}>Nahrávám fotku...</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.white },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.primary + '30' },
  avatarText: { fontSize: 34, fontWeight: '700', color: COLORS.primary },
  avatarImage: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: COLORS.primary + '30' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.gray900 },
  profileEmail: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
  roleBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginTop: 10 },
  roleBadgeText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray500 },
  fieldsCard: { backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.gray100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  fieldsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  editBtnWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primaryLight },
  editBtn: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  field: { marginBottom: 18 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabel: { fontSize: 13, color: COLORS.gray500 },
  fieldValue: { fontSize: 15, color: COLORS.gray900, fontWeight: '500', paddingLeft: 22 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray900, backgroundColor: COLORS.gray50, marginLeft: 22 },
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  catChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  reviewCard: { borderBottomWidth: 1, borderBottomColor: COLORS.gray100, paddingBottom: 14, marginBottom: 14 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 12, color: COLORS.gray500 },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: COLORS.gray900, marginBottom: 4 },
  reviewComment: { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
});
