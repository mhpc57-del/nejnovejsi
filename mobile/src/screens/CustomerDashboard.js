import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { demandService, miscService, uploadService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS, SHADOWS, RADIUS } from '../utils/theme';

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
        <Text style={styles.softAcceptText}>{demand.soft_accepts.length} nezavaznych nabidek</Text>
      </View>
    )}
    {demand.verified && (
      <View style={[styles.softAcceptBadge, { backgroundColor: COLORS.green50 }]}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.green500} />
        <Text style={[styles.softAcceptText, { color: COLORS.green700 }]}>Overena poptavka</Text>
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
  const [showCatModal, setShowCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [images, setImages] = useState([]);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const addressTimeout = React.useRef(null);

  useEffect(() => {
    miscService.getCategories().then(r => {
      const data = r.data;
      setCategories(Array.isArray(data) ? data : (data.categories || []));
    }).catch(() => {});
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onAddressChange = (text) => {
    update('address', text);
    if (addressTimeout.current) clearTimeout(addressTimeout.current);
    if (text.length < 3) { setAddressSuggestions([]); return; }
    addressTimeout.current = setTimeout(async () => {
      try {
        const res = await miscService.geocodeSearch(text);
        const results = Array.isArray(res.data) ? res.data : [];
        setAddressSuggestions(results.slice(0, 5));
      } catch (e) {
        console.log('Geocode error:', e.message);
        setAddressSuggestions([]);
      }
    }, 500);
  };

  const selectAddress = (item) => {
    update('address', item.display_name);
    setAddressSuggestions([]);
  };

  const filteredCats = catSearch
    ? categories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  const submitCustomCategory = async () => {
    if (!customCat.trim()) return;
    try {
      await miscService.suggestCategory(customCat.trim());
      Alert.alert('Odesláno', 'Návrh kategorie byl odeslán ke schválení administrátorem.');
      update('category', customCat.trim());
      setCustomCat('');
      setShowCatModal(false);
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se odeslat návrh kategorie');
    }
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Oprávnění', 'Pro výběr fotek je potřeba přístup ke galerii'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Oprávnění', 'Pro fotografování je potřeba přístup k fotoaparátu'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const submit = async () => {
    if (!form.title || !form.description || !form.category || !form.address) {
      Alert.alert('Chyba', 'Vyplňte název, popis, kategorii a adresu');
      return;
    }
    setLoading(true);
    try {
      const uploadedUrls = [];
      for (const uri of images) {
        try {
          const res = await uploadService.upload(uri);
          uploadedUrls.push(res.data.url);
        } catch (e) {
          console.error('Image upload failed:', e);
        }
      }
      await demandService.create({
        ...form,
        images: uploadedUrls,
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
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <Text style={styles.label}>Název *</Text>
            <TextInput style={styles.modalInput} value={form.title} onChangeText={v => update('title', v)} placeholder="Např. Elektromontážní práce" placeholderTextColor={COLORS.gray300} />

            <Text style={styles.label}>Popis *</Text>
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => update('description', v)} placeholder="Podrobný popis zakázky" placeholderTextColor={COLORS.gray300} multiline />

            <Text style={styles.label}>Kategorie *</Text>
            <TouchableOpacity style={[styles.modalInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowCatModal(true)}>
              <Text style={{ color: form.category ? COLORS.gray900 : COLORS.gray300, fontSize: 16, flex: 1 }} numberOfLines={1}>
                {form.category || 'Vyberte kategorii'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray500} />
            </TouchableOpacity>

            <Text style={styles.label}>Adresa *</Text>
            <TextInput style={styles.modalInput} value={form.address} onChangeText={onAddressChange} placeholder="Začněte psát adresu..." placeholderTextColor={COLORS.gray300} />
            {addressSuggestions.length > 0 && (
              <View style={{ borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: 4, marginBottom: 8, backgroundColor: COLORS.white, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, zIndex: 100, maxHeight: 200 }}>
                <FlatList
                  data={addressSuggestions}
                  keyExtractor={(_, idx) => idx.toString()}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: index < addressSuggestions.length - 1 ? 1 : 0, borderBottomColor: COLORS.gray100 }}
                      onPress={() => selectAddress(item)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                        <Text style={{ fontSize: 14, color: COLORS.gray700, flex: 1 }} numberOfLines={2}>{item.display_name}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            <Text style={styles.label}>Předpokládaná cena (Kč)</Text>
            <TextInput style={styles.modalInput} value={form.budget_max} onChangeText={v => update('budget_max', v)} placeholder="Nepovinné" placeholderTextColor={COLORS.gray300} keyboardType="numeric" />

            <Text style={styles.label}>Termín realizace</Text>
            <TextInput style={styles.modalInput} value={form.deadline} onChangeText={v => update('deadline', v)} placeholder="RRRR-MM-DD" placeholderTextColor={COLORS.gray300} />

            <Text style={styles.label}>Fotky (max 5)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {images.map((uri, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10 }} />
                  <TouchableOpacity style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.red500, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>
                    <Ionicons name="close" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                    onPress={pickImages}>
                    <Ionicons name="images-outline" size={24} color={COLORS.gray500} />
                    <Text style={{ fontSize: 10, color: COLORS.gray500, marginTop: 2 }}>Galerie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                    onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={24} color={COLORS.gray500} />
                    <Text style={{ fontSize: 10, color: COLORS.gray500, marginTop: 2 }}>Fotit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.submitButton, { marginBottom: 80 }]} onPress={submit} disabled={loading}>
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

      {/* Category Selection Modal */}
      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: '80%' }]}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <View style={modalStyles.headerLeft}>
                <Ionicons name="pricetags-outline" size={22} color={COLORS.primary} />
                <Text style={modalStyles.title}>Vyberte kategorii</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCatModal(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.gray700} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, backgroundColor: COLORS.gray50, paddingHorizontal: 12 }}>
                <Ionicons name="search-outline" size={18} color={COLORS.gray500} />
                <TextInput
                  style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 15, color: COLORS.gray900 }}
                  value={catSearch} onChangeText={setCatSearch}
                  placeholder="Hledat kategorii..." placeholderTextColor={COLORS.gray300} autoFocus
                />
                {catSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCatSearch('')}>
                    <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <FlatList
              data={filteredCats}
              keyExtractor={(item, index) => index.toString()}
              style={{ paddingHorizontal: 20, marginTop: 8 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => { update('category', item); setShowCatModal(false); setCatSearch(''); }}>
                  <Text style={{ fontSize: 15, color: form.category === item ? COLORS.primary : COLORS.gray900, fontWeight: form.category === item ? '600' : '400' }}>{item}</Text>
                  {form.category === item && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.gray200, marginTop: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 8 }}>Nenašli jste? Navrhněte vlastní:</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={{ flex: 1, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.gray900, backgroundColor: COLORS.gray50 }}
                      value={customCat} onChangeText={setCustomCat}
                      placeholder="Název nové kategorie" placeholderTextColor={COLORS.gray300}
                    />
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}
                      onPress={submitCustomCategory}>
                      <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>Odeslat</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.gray500, marginTop: 6 }}>Admin musí kategorii schválit</Text>
                </View>
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ fontSize: 14, color: COLORS.gray500 }}>Žádné výsledky pro "{catSearch}"</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  catList: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: 4, maxHeight: 200 },
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
