import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Alert, ActivityIndicator, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authService, userService, uploadService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, RADIUS, SHADOWS } from '../utils/theme';

export default function ProfileScreen() {
  const { user, logout, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await authService.getMe();
      setProfile(res.data);
      setForm(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateProfile({
        first_name: form.first_name, last_name: form.last_name,
        company_name: form.company_name, phone: form.phone,
        address: form.address, permanent_address: form.permanent_address,
        actual_address: form.actual_address, bio: form.bio,
        ico: form.ico, dic: form.dic, website: form.website,
        sms_notifications: form.sms_notifications,
      });
      Alert.alert('Uloženo', 'Profil byl aktualizován');
      setEditing(false);
      fetchProfile();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se uložit'); }
    finally { setSaving(false); }
  };

  const handleSmsToggle = async (val) => {
    update('sms_notifications', val);
    try { await userService.updateProfile({ sms_notifications: val }); } catch {}
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]) {
      try {
        const res = await uploadService.upload(result.assets[0].uri);
        await userService.updateProfile({ profile_image: res.data.url });
        fetchProfile();
      } catch { Alert.alert('Chyba', 'Nepodařilo se nahrát fotku'); }
    }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const isSupplier = profile?.role === 'supplier' || profile?.role === 'customer_supplier';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Můj profil</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 14 }}>Upravit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.white} /> :
              <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>Uložit</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image.startsWith('http') ? profile.profile_image : `https://craftbolt.cz${profile.profile_image}` }}
                style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.white }}>{(profile?.first_name?.[0] || 'U').toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}><Ionicons name="camera" size={14} color={COLORS.white} /></View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.company_name || `${profile?.first_name} ${profile?.last_name}`}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <Text style={styles.profileRole}>{isSupplier ? 'Dodavatel' : 'Zákazník'}</Text>
        </View>

        {/* SMS Toggle */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.gray900 }}>SMS notifikace</Text>
            </View>
            <Switch
              value={form.sms_notifications || false}
              onValueChange={handleSmsToggle}
              trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Basic info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Základní údaje</Text>
          <ProfileField label="Jméno" value={form.first_name} editing={editing} onChange={v => update('first_name', v)} />
          <ProfileField label="Příjmení" value={form.last_name} editing={editing} onChange={v => update('last_name', v)} />
          <ProfileField label="Telefon" value={form.phone} editing={editing} onChange={v => update('phone', v)} keyboardType="phone-pad" />
          {isSupplier && (
            <>
              <ProfileField label="Firma" value={form.company_name} editing={editing} onChange={v => update('company_name', v)} />
              <ProfileField label="IČO" value={form.ico} editing={editing} onChange={v => update('ico', v)} keyboardType="numeric" />
              <ProfileField label="DIČ" value={form.dic} editing={editing} onChange={v => update('dic', v)} />
              <ProfileField label="Adresa sídla" value={form.address} editing={editing} onChange={v => update('address', v)} />
              <ProfileField label="Web" value={form.website} editing={editing} onChange={v => update('website', v)} />
            </>
          )}
          {!isSupplier && <ProfileField label="Adresa" value={form.address} editing={editing} onChange={v => update('address', v)} />}
        </View>

        {/* Bio */}
        {isSupplier && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>O firmě</Text>
            {editing ? (
              <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                value={form.bio || ''} onChangeText={v => update('bio', v)} multiline placeholder="Popis vaší firmy..." placeholderTextColor={COLORS.gray300} />
            ) : (
              <Text style={styles.fieldValue}>{form.bio || 'Nevyplněno'}</Text>
            )}
          </View>
        )}

        {/* Categories */}
        {isSupplier && profile?.categories?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Kategorie služeb</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.categories.map((cat, i) => (
                <View key={i} style={styles.catChip}>
                  <Text style={styles.catChipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => {
          Alert.alert('Odhlášení', 'Opravdu se chcete odhlásit?', [
            { text: 'Ne', style: 'cancel' },
            { text: 'Ano', style: 'destructive', onPress: logout },
          ]);
        }}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red500} />
          <Text style={{ color: COLORS.red500, fontWeight: '600', fontSize: 15 }}>Odhlásit se</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const ProfileField = ({ label, value, editing, onChange, keyboardType }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {editing ? (
      <TextInput style={styles.fieldInput} value={value || ''} onChangeText={onChange}
        placeholder={label} placeholderTextColor={COLORS.gray300} keyboardType={keyboardType} />
    ) : (
      <Text style={styles.fieldValue}>{value || '–'}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 10 },
  profileEmail: { fontSize: 14, color: COLORS.gray500, marginTop: 2 },
  profileRole: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: COLORS.gray900 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.gray900, backgroundColor: COLORS.gray50 },
  catChip: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  catChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.red100, borderRadius: RADIUS.md, paddingVertical: 14, marginTop: 8 },
});
