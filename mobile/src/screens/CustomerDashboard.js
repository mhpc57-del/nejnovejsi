import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Image, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { demandService, messageService, miscService, uploadService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, DEMAND_TABS_CUSTOMER, RADIUS, SHADOWS } from '../utils/theme';
import { DemandCard, TabBar, EmptyState } from '../components/SharedComponents';

export default function CustomerDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [activeTab, setActiveTab] = useState('verified');
  const [unreadDemandIds, setUnreadDemandIds] = useState([]);

  const fetchDemands = async () => {
    try {
      const res = await demandService.getMy();
      setDemands(res.data || []);
    } catch (e) {
      console.error('Fetch demands error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await messageService.getUnreadSummary();
      setUnreadDemandIds((res.data || []).map(d => d.demand_id));
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    fetchDemands();
    fetchUnread();
    const interval = setInterval(() => { fetchDemands(); fetchUnread(); }, 15000);
    return () => clearInterval(interval);
  }, []));

  const verified = demands.filter(d => d.verified && d.status === 'open');
  const unverified = demands.filter(d => !d.verified && d.status === 'open');
  const inProgress = demands.filter(d => d.status === 'in_progress');
  const pendingCompletion = demands.filter(d => d.status === 'pending_completion');
  const inDispute = demands.filter(d => d.status === 'dispute');
  const completed = demands.filter(d => d.status === 'completed');
  const cancelled = demands.filter(d => d.status === 'cancelled');

  const counts = {
    verified: verified.length, unverified: unverified.length,
    in_progress: inProgress.length, pending_completion: pendingCompletion.length,
    dispute: inDispute.length, completed: completed.length, cancelled: cancelled.length,
  };

  const getFiltered = () => {
    switch (activeTab) {
      case 'verified': return verified;
      case 'unverified': return unverified;
      case 'in_progress': return inProgress;
      case 'pending_completion': return pendingCompletion;
      case 'dispute': return inDispute;
      case 'completed': return completed;
      case 'cancelled': return cancelled;
      default: return [];
    }
  };

  const filtered = getFiltered();

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Dobrý den,</Text>
          <Text style={styles.userName}>{user?.first_name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerBtn}>
          <Ionicons name="person-outline" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrapper}>
        <TabBar tabs={DEMAND_TABS_CUSTOMER} activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
      </ScrollView>

      <ScrollView style={styles.list} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDemands(); fetchUnread(); }} colors={[COLORS.primary]} />
      }>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === 'verified' ? 'shield-checkmark-outline' : 'folder-open-outline'}
            title={`Žádné ${DEMAND_TABS_CUSTOMER.find(t => t.key === activeTab)?.label?.toLowerCase() || ''} poptávky`}
            subtitle={activeTab === 'verified' ? 'Zadejte novou poptávku pomocí tlačítka +' : undefined}
          />
        ) : (
          filtered.map(d => (
            <DemandCard
              key={d.id}
              demand={d}
              onPress={() => navigation.navigate('DemandDetail', { demand: d, role: 'customer' })}
              showNew={unreadDemandIds.includes(d.id)}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowNewDemand(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

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
        setAddressSuggestions((Array.isArray(res.data) ? res.data : []).slice(0, 5));
      } catch { setAddressSuggestions([]); }
    }, 500);
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Oprávnění', 'Potřebujeme přístup ke galerii'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.7 });
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Oprávnění', 'Potřebujeme přístup k fotoaparátu'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const filteredCats = catSearch ? categories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase())) : categories;

  const submit = async () => {
    if (!form.title || !form.description || !form.category || !form.address) {
      Alert.alert('Chyba', 'Vyplňte název, popis, kategorii a adresu');
      return;
    }
    setLoading(true);
    try {
      const uploadedUrls = [];
      for (const uri of images) {
        try { const res = await uploadService.upload(uri); uploadedUrls.push(res.data.url); } catch {}
      }
      await demandService.create({
        ...form, images: uploadedUrls,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        deadline: form.deadline || null,
      });
      Alert.alert('Hotovo', 'Poptávka vytvořena');
      onSuccess();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se vytvořit poptávku');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
              <Text style={modalStyles.title}>Nová poptávka</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            <Text style={styles.label}>Název *</Text>
            <TextInput style={styles.modalInput} value={form.title} onChangeText={v => update('title', v)} placeholder="Např. Výměna zásuvek" placeholderTextColor={COLORS.gray300} />

            <Text style={styles.label}>Popis *</Text>
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => update('description', v)} placeholder="Podrobný popis" placeholderTextColor={COLORS.gray300} multiline />

            <Text style={styles.label}>Kategorie *</Text>
            <TouchableOpacity style={[styles.modalInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowCatModal(true)}>
              <Text style={{ color: form.category ? COLORS.gray900 : COLORS.gray300, fontSize: 16, flex: 1 }} numberOfLines={1}>{form.category || 'Vyberte kategorii'}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.gray500} />
            </TouchableOpacity>

            <Text style={styles.label}>Adresa *</Text>
            <TextInput style={styles.modalInput} value={form.address} onChangeText={onAddressChange} placeholder="Začněte psát adresu..." placeholderTextColor={COLORS.gray300} />
            {addressSuggestions.length > 0 && (
              <View style={{ borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.white, elevation: 8, maxHeight: 180 }}>
                <FlatList data={addressSuggestions} keyExtractor={(_, i) => i.toString()} keyboardShouldPersistTaps="handled" nestedScrollEnabled
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, flexDirection: 'row', gap: 8 }}
                      onPress={() => { update('address', item.display_name); setAddressSuggestions([]); }}>
                      <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                      <Text style={{ flex: 1, fontSize: 14, color: COLORS.gray700 }} numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  )} />
              </View>
            )}

            <Text style={styles.label}>Max. cena (Kč)</Text>
            <TextInput style={styles.modalInput} value={form.budget_max} onChangeText={v => update('budget_max', v)} placeholder="Nepovinné" placeholderTextColor={COLORS.gray300} keyboardType="numeric" />

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
                <>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
                    <Ionicons name="images-outline" size={24} color={COLORS.gray500} />
                    <Text style={styles.photoBtnText}>Galerie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={24} color={COLORS.gray500} />
                    <Text style={styles.photoBtnText}>Fotit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Vytvořit poptávku</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { maxHeight: '80%' }]}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Vyberte kategorii</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.gray700} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, backgroundColor: COLORS.gray50, paddingHorizontal: 12 }}>
                <Ionicons name="search-outline" size={18} color={COLORS.gray500} />
                <TextInput style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 12, fontSize: 15, color: COLORS.gray900 }}
                  value={catSearch} onChangeText={setCatSearch} placeholder="Hledat..." placeholderTextColor={COLORS.gray300} autoFocus />
              </View>
            </View>
            <FlatList data={filteredCats} keyExtractor={(_, i) => i.toString()} style={{ paddingHorizontal: 20, marginTop: 8 }}
              keyboardShouldPersistTaps="handled" nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, flexDirection: 'row', justifyContent: 'space-between' }}
                  onPress={() => { update('category', item); setShowCatModal(false); setCatSearch(''); }}>
                  <Text style={{ fontSize: 15, color: form.category === item ? COLORS.primary : COLORS.gray900, fontWeight: form.category === item ? '600' : '400' }}>{item}</Text>
                  {form.category === item && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  greeting: { fontSize: 13, color: COLORS.gray500 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2 },
  headerBtn: { width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  tabsWrapper: { maxHeight: 56, backgroundColor: COLORS.white },
  list: { flex: 1, padding: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.glow },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 6, marginTop: 14 },
  modalInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.gray900, backgroundColor: COLORS.gray50 },
  photoBtn: { width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  photoBtnText: { fontSize: 10, color: COLORS.gray500, marginTop: 2 },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 20, ...SHADOWS.glow },
  submitButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
});
