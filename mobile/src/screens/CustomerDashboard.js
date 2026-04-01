import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, Modal, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { demandService, miscService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS } from '../utils/theme';

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
};

const DemandCard = ({ demand, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle} numberOfLines={1}>{demand.title}</Text>
      <StatusBadge status={demand.status} />
    </View>
    <Text style={styles.cardDesc} numberOfLines={2}>{demand.description}</Text>
    <View style={styles.cardMeta}>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={COLORS.gray500} />
        <Text style={styles.metaText} numberOfLines={1}>{demand.address}</Text>
      </View>
      <Text style={styles.metaDate}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
    </View>
    {demand.deadline && (
      <View style={styles.deadlineRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
        <Text style={styles.deadlineText}>Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</Text>
      </View>
    )}
    {demand.soft_accepts?.length > 0 && (
      <View style={styles.softAcceptBadge}>
        <Ionicons name="hand-right-outline" size={14} color={COLORS.primary} />
        <Text style={styles.softAcceptText}>{demand.soft_accepts.length} nezávazných nabídek</Text>
      </View>
    )}
    <View style={styles.cardArrow}>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
    </View>
  </TouchableOpacity>
);

export default function CustomerDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [filter, setFilter] = useState(null);

  const fetchDemands = async () => {
    try {
      const res = await demandService.getAll();
      setDemands(res.data);
    } catch (e) {
      console.error('Fetch demands error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDemands(); }, []));

  const stats = {
    all: demands.length,
    open: demands.filter(d => d.status === 'open').length,
    in_progress: demands.filter(d => d.status === 'in_progress').length,
    completed: demands.filter(d => d.status === 'completed').length,
  };

  const filtered = filter ? (filter === 'all' ? demands : demands.filter(d => d.status === filter)) : [];

  const statItems = [
    { key: 'all', label: 'Celkem', count: stats.all, color: COLORS.primary, icon: 'layers-outline' },
    { key: 'open', label: 'Otevřené', count: stats.open, color: COLORS.green500, icon: 'radio-button-on' },
    { key: 'in_progress', label: 'Probíhající', count: stats.in_progress, color: COLORS.blue500, icon: 'time-outline' },
    { key: 'completed', label: 'Dokončené', count: stats.completed, color: COLORS.gray500, icon: 'checkmark-circle-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Dobrý den,</Text>
          <Text style={styles.userName}>{user?.first_name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemands(); }} colors={[COLORS.primary]} />
      }>
        {/* Stats */}
        <View style={styles.statsGrid}>
          {statItems.map(stat => (
            <TouchableOpacity key={stat.key} style={[styles.statCard, filter === stat.key && { borderColor: stat.color }]}
              onPress={() => setFilter(filter === stat.key ? null : stat.key)} activeOpacity={0.7}>
              <Ionicons name={stat.icon} size={22} color={stat.color} style={{ marginBottom: 6 }} />
              <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtered list */}
        {filter && (
          <View style={styles.filteredSection}>
            <View style={styles.filteredHeader}>
              <Text style={styles.filteredTitle}>
                {filter === 'all' ? 'Všechny' : filter === 'open' ? 'Otevřené' : filter === 'in_progress' ? 'Probíhající' : 'Dokončené'}
              </Text>
              <TouchableOpacity onPress={() => setFilter(null)} style={styles.closeFilterBtn}>
                <Ionicons name="close" size={18} color={COLORS.gray700} />
              </TouchableOpacity>
            </View>
            {filtered.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptyText}>Žádné poptávky v této kategorii</Text>
              </View>
            ) : (
              filtered.map(d => (
                <DemandCard key={d.id} demand={d} onPress={() => navigation.navigate('DemandDetail', { id: d.id })} />
              ))
            )}
          </View>
        )}

        {/* Recent demands */}
        {!filter && (
          <>
            <Text style={styles.sectionTitle}>Poslední poptávky</Text>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : demands.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={56} color={COLORS.gray300} />
                <Text style={styles.emptyTitle}>Zatím nemáte žádné poptávky</Text>
                <Text style={styles.emptyText}>Vytvořte svou první poptávku</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setShowNewDemand(true)}>
                  <Ionicons name="add" size={20} color={COLORS.white} />
                  <Text style={styles.emptyButtonText}>Vytvořit poptávku</Text>
                </TouchableOpacity>
              </View>
            ) : (
              demands.slice(0, 10).map(d => (
                <DemandCard key={d.id} demand={d} onPress={() => navigation.navigate('DemandDetail', { id: d.id })} />
              ))
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowNewDemand(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      {/* New Demand Modal */}
      {showNewDemand && (
        <NewDemandModal
          onClose={() => setShowNewDemand(false)}
          onSuccess={() => { setShowNewDemand(false); fetchDemands(); }}
        />
      )}
    </View>
  );
}

const NewDemandModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', description: '', category: '', address: '', deadline: '', budget_max: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCats, setShowCats] = useState(false);

  useEffect(() => {
    miscService.getCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.description || !form.category || !form.address) {
      Alert.alert('Chyba', 'Vyplňte název, popis, kategorii a adresu');
      return;
    }
    setLoading(true);
    try {
      await demandService.create({
        ...form,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        deadline: form.deadline || null,
      });
      Alert.alert('Hotovo', 'Poptávka byla vytvořena');
      onSuccess();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se vytvořit poptávku');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <View style={modalStyles.headerLeft}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
              <Text style={modalStyles.title}>Nová poptávka</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Název *</Text>
            <TextInput style={styles.modalInput} value={form.title} onChangeText={v => update('title', v)} placeholder="Např. Elektromontážní práce" placeholderTextColor={COLORS.gray300} />

            <Text style={styles.label}>Popis *</Text>
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => update('description', v)} placeholder="Podrobný popis zakázky" placeholderTextColor={COLORS.gray300} multiline />

            <Text style={styles.label}>Kategorie *</Text>
            <TouchableOpacity style={styles.modalInput} onPress={() => setShowCats(!showCats)}>
              <Text style={{ color: form.category ? COLORS.gray900 : COLORS.gray300, fontSize: 16 }}>
                {form.category || 'Vyberte kategorii'}
              </Text>
            </TouchableOpacity>
            {showCats && (
              <View style={modalStyles.catList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat} style={modalStyles.catItem}
                      onPress={() => { update('category', cat); setShowCats(false); }}>
                      <Text style={[modalStyles.catItemText, form.category === cat && { color: COLORS.primary, fontWeight: '600' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.label}>Adresa *</Text>
            <TextInput style={styles.modalInput} value={form.address} onChangeText={v => update('address', v)} placeholder="Ulice, město" placeholderTextColor={COLORS.gray300} />

            <Text style={styles.label}>Rozpočet (Kč)</Text>
            <TextInput style={styles.modalInput} value={form.budget_max} onChangeText={v => update('budget_max', v)} placeholder="Nepovinné" placeholderTextColor={COLORS.gray300} keyboardType="numeric" />

            <Text style={styles.label}>Termín realizace</Text>
            <TextInput style={styles.modalInput} value={form.deadline} onChangeText={v => update('deadline', v)} placeholder="RRRR-MM-DD" placeholderTextColor={COLORS.gray300} />

            <TouchableOpacity style={[styles.submitButton, { marginBottom: 40 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Vytvořit poptávku</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 20 },
  catList: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: 4 },
  catItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  catItemText: { fontSize: 14, color: COLORS.gray700 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 14, color: COLORS.gray500 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flex: 1, padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.gray100, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  statCount: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 14, color: COLORS.gray700, marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 13, color: COLORS.gray500, flex: 1 },
  metaDate: { fontSize: 13, color: COLORS.gray500 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  deadlineText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  softAcceptBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.orange100, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8, alignSelf: 'flex-start' },
  softAcceptText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },
  filteredSection: { marginBottom: 20 },
  filteredHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  filteredTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  closeFilterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptySmall: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray900, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4, marginBottom: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 6, marginTop: 14 },
  modalInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.gray900, backgroundColor: COLORS.gray50 },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 20, elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  submitButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
});
