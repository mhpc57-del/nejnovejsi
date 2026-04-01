import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { userService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS } from '../utils/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await userService.getById(user.id);
      setProfile(res.data);
      setForm(res.data);
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

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Profil</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Odhlásit</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.first_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        <Text style={styles.profileEmail}>{profile?.email}</Text>
        <Text style={styles.roleBadge}>{profile?.role === 'supplier' ? 'Dodavatel' : 'Zákazník'}</Text>
      </View>

      {/* Stats */}
      {profile?.rating && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.rating?.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Hodnocení</Text>
          </View>
          {profile.punctuality_score != null && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.blue500 }]}>{profile.punctuality_score?.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Dochvilnost</Text>
            </View>
          )}
          {profile.trust_score > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.green500 }]}>{profile.trust_score}/5</Text>
              <Text style={styles.statLabel}>Důvěra</Text>
            </View>
          )}
        </View>
      )}

      {/* Fields */}
      <View style={styles.fieldsCard}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldsTitle}>Osobní údaje</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
              <Text style={styles.editBtn}>{editing ? 'Uložit' : 'Upravit'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {[
          { key: 'first_name', label: 'Jméno' },
          { key: 'last_name', label: 'Příjmení' },
          { key: 'company_name', label: 'Firma', show: profile?.role === 'supplier' },
          { key: 'phone', label: 'Telefon' },
          { key: 'address', label: 'Adresa' },
        ].filter(f => f.show !== false).map(field => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
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
          <Text style={styles.fieldsTitle}>Kategorie služeb</Text>
          <View style={styles.catsGrid}>
            {profile.categories.map(cat => (
              <View key={cat} style={styles.catChip}>
                <Text style={styles.catChipText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray200 },
  logoutText: { fontSize: 14, color: COLORS.gray700, fontWeight: '500' },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.white },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.primary },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  profileEmail: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
  roleBadge: { fontSize: 12, color: COLORS.primary, fontWeight: '600', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  fieldsCard: { backgroundColor: COLORS.white, margin: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.gray100 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  fieldsTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray900 },
  editBtn: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.gray500, marginBottom: 4 },
  fieldValue: { fontSize: 15, color: COLORS.gray900 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.gray900 },
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  catChip: { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  catChipText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
});
