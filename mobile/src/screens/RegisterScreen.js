import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
  FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { miscService } from '../services/api';
import { COLORS } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    email: '', password: '', phone: '', role: '',
    first_name: '', last_name: '', company_name: '',
    ico: '', dic: '', address: '', branch_address: '', website: '',
    categories: [], service_areas: [],
  });
  const [aresLoading, setAresLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [branchSuggestions, setBranchSuggestions] = useState([]);
  const addressTimeout = useRef(null);
  const branchTimeout = useRef(null);

  useEffect(() => {
    miscService.getCategories().then(r => {
      const data = r.data;
      setCategories(Array.isArray(data) ? data : (data.categories || []));
    }).catch(() => {});
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const searchAddress = (text, setter, timeoutRef) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (text.length < 3) { setter([]); return; }
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await miscService.geocodeSearch(text);
        const results = Array.isArray(res.data) ? res.data : [];
        setter(results.slice(0, 5));
      } catch (e) { setter([]); }
    }, 500);
  };

  const handleAresLookup = async () => {
    if (!form.ico || form.ico.length < 7) {
      Alert.alert('Chyba', 'Zadejte platné IČO (min. 7 číslic)');
      return;
    }
    setAresLoading(true);
    try {
      const res = await miscService.aresLookup(form.ico);
      const data = res.data;
      setForm(prev => ({
        ...prev,
        company_name: data.company_name || prev.company_name,
        dic: data.dic || prev.dic,
        address: data.address || prev.address,
      }));
      Alert.alert('ARES', `Data načtena: ${data.company_name}`);
    } catch (e) {
      Alert.alert('ARES', e.response?.data?.detail || 'IČO nenalezeno v registru ARES');
    } finally {
      setAresLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.phone || !form.role) {
      Alert.alert('Chyba', 'Vyplňte všechna povinná pole');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      // If register succeeds, AuthContext automatically logs user in
      // So we don't need to show success alert — user will see dashboard
    } catch (e) {
      const detail = e.response?.data?.detail || '';
      if (detail === 'Email already registered') {
        Alert.alert('Registrace proběhla', 'Registrace proběhla úspěšně. Na váš email byl odeslán potvrzovací email.');
      } else {
        Alert.alert('Chyba', detail || 'Registrace se nezdařila');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== STEP 1: Login credentials =====
  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Přihlašovací údaje</Text>
      <InputField icon="mail-outline" value={form.email} onChange={v => update('email', v)}
        placeholder="vas@email.cz" keyboardType="email-address" autoCapitalize="none" />
      <InputField icon="lock-closed-outline" value={form.password} onChange={v => update('password', v)}
        placeholder="Min. 8 znaků" secureTextEntry />
      <InputField icon="call-outline" value={form.phone} onChange={v => update('phone', v)}
        placeholder="+420..." keyboardType="phone-pad" />
      <TouchableOpacity style={styles.button} onPress={() => {
        if (!form.email || !form.password || !form.phone) { Alert.alert('Chyba', 'Vyplňte všechna pole'); return; }
        setStep(2);
      }}>
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>Pokračovat</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    </>
  );

  // ===== STEP 2: Account type =====
  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>Typ účtu</Text>
      {[
        { value: 'customer', label: 'Zákazník', desc: 'Hledám řemeslníky a dodavatele', icon: 'person-outline' },
        { value: 'supplier', label: 'Dodavatel / Řemeslník', desc: 'Nabízím své služby', icon: 'construct-outline' },
      ].map(role => (
        <TouchableOpacity key={role.value}
          style={[styles.roleCard, form.role === role.value && styles.roleCardActive]}
          onPress={() => update('role', role.value)}>
          <View style={[styles.roleIconWrap, form.role === role.value && styles.roleIconWrapActive]}>
            <Ionicons name={role.icon} size={24} color={form.role === role.value ? COLORS.primary : COLORS.gray500} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleLabel, form.role === role.value && styles.roleLabelActive]}>{role.label}</Text>
            <Text style={styles.roleDesc}>{role.desc}</Text>
          </View>
          {form.role === role.value && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
        </TouchableOpacity>
      ))}
      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={() => {
          if (!form.role) { Alert.alert('Chyba', 'Vyberte typ účtu'); return; }
          setStep(3);
        }}>
          <View style={styles.buttonInner}>
            <Text style={styles.buttonText}>Pokračovat</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  // ===== STEP 3: Personal + company info =====
  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Osobní údaje</Text>
      <InputField icon="person-outline" value={form.first_name} onChange={v => update('first_name', v)} placeholder="Jméno *" />
      <InputField icon="person-outline" value={form.last_name} onChange={v => update('last_name', v)} placeholder="Příjmení *" />

      {form.role === 'supplier' && (
        <>
          {/* IČO + ARES */}
          <Text style={styles.sectionLabel}>Firemní údaje</Text>
          <View style={styles.icoRow}>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
              <TextInput style={styles.input} value={form.ico} onChangeText={v => update('ico', v)}
                placeholder="IČO" placeholderTextColor={COLORS.gray300} keyboardType="numeric" />
            </View>
            <TouchableOpacity style={styles.aresBtn} onPress={handleAresLookup} disabled={aresLoading}>
              {aresLoading ? <ActivityIndicator size="small" color={COLORS.white} /> :
                <Text style={styles.aresBtnText}>ARES</Text>}
            </TouchableOpacity>
          </View>

          <InputField icon="receipt-outline" value={form.dic} onChange={v => update('dic', v)} placeholder="DIČ" />
          <InputField icon="business-outline" value={form.company_name} onChange={v => update('company_name', v)} placeholder="Název firmy" />

          {/* Sídlo s našeptávačem */}
          <Text style={styles.fieldLabel}>Sídlo</Text>
          <InputField icon="location-outline" value={form.address}
            onChange={v => { update('address', v); searchAddress(v, setAddressSuggestions, addressTimeout); }}
            placeholder="Zadejte adresu sídla" />
          {addressSuggestions.length > 0 && (
            <SuggestionList items={addressSuggestions} onSelect={item => { update('address', item.display_name); setAddressSuggestions([]); }} />
          )}

          {/* Pobočka s našeptávačem */}
          <Text style={styles.fieldLabel}>Pobočka</Text>
          <InputField icon="location-outline" value={form.branch_address}
            onChange={v => { update('branch_address', v); searchAddress(v, setBranchSuggestions, branchTimeout); }}
            placeholder="Adresa pobočky (nepovinné)" />
          {branchSuggestions.length > 0 && (
            <SuggestionList items={branchSuggestions} onSelect={item => { update('branch_address', item.display_name); setBranchSuggestions([]); }} />
          )}

          <InputField icon="globe-outline" value={form.website} onChange={v => update('website', v)}
            placeholder="Web (např. www.firma.cz)" autoCapitalize="none" />
        </>
      )}

      {form.role === 'customer' && (
        <>
          <Text style={styles.fieldLabel}>Adresa</Text>
          <InputField icon="location-outline" value={form.address}
            onChange={v => { update('address', v); searchAddress(v, setAddressSuggestions, addressTimeout); }}
            placeholder="Vaše adresa" />
          {addressSuggestions.length > 0 && (
            <SuggestionList items={addressSuggestions} onSelect={item => { update('address', item.display_name); setAddressSuggestions([]); }} />
          )}
        </>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={() => {
          if (!form.first_name || !form.last_name) { Alert.alert('Chyba', 'Vyplňte jméno a příjmení'); return; }
          if (form.role === 'supplier') { setStep(4); } else { handleRegister(); }
        }}>
          <View style={styles.buttonInner}>
            <Text style={styles.buttonText}>{form.role === 'supplier' ? 'Pokračovat' : 'Dokončit registraci'}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  // ===== STEP 4: Categories (supplier only) =====
  const renderStep4 = () => (
    <>
      <Text style={styles.stepTitle}>Kategorie služeb</Text>
      <Text style={styles.stepDesc}>Vyberte kategorie, ve kterých nabízíte služby</Text>
      <View style={styles.catsGrid}>
        {categories.map((cat, idx) => (
          <TouchableOpacity key={idx} style={[styles.catChip, form.categories.includes(cat) && styles.catChipActive]}
            onPress={() => update('categories', form.categories.includes(cat)
              ? form.categories.filter(c => c !== cat) : [...form.categories, cat])}>
            <Text style={[styles.catChipText, form.categories.includes(cat) && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {form.categories.length > 0 && (
        <Text style={styles.selectedCount}>{form.categories.length} vybráno</Text>
      )}

      <View style={[styles.stepButtons, { marginTop: 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
          <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : (
            <View style={styles.buttonInner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Dokončit registraci</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const totalSteps = form.role === 'supplier' ? 4 : 3;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray900} />
          </TouchableOpacity>
          <Text style={styles.logo}>Craft<Text style={styles.logoBold}>Bolt</Text></Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progress}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <View key={s} style={styles.progressStep}>
              <View style={[styles.dot, step >= s && styles.dotActive]}>
                {step > s ? <Ionicons name="checkmark" size={14} color={COLORS.white} /> :
                  <Text style={[styles.dotText, step >= s && styles.dotTextActive]}>{s}</Text>}
              </View>
              {s < totalSteps && <View style={[styles.line, step > s && styles.lineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
          <Text style={styles.linkText}>Již máte účet? <Text style={styles.linkBold}>Přihlaste se</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Reusable input field component
const InputField = ({ icon, value, onChange, placeholder, ...props }) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color={COLORS.gray500} style={styles.inputIcon} />
    <TextInput style={styles.input} value={value} onChangeText={onChange}
      placeholder={placeholder} placeholderTextColor={COLORS.gray300} {...props} />
  </View>
);

// Address suggestion list
const SuggestionList = ({ items, onSelect }) => (
  <View style={styles.suggestList}>
    {items.map((item, idx) => (
      <TouchableOpacity key={idx} style={styles.suggestItem} onPress={() => onSelect(item)}>
        <Ionicons name="location-outline" size={16} color={COLORS.primary} />
        <Text style={styles.suggestText} numberOfLines={2}>{item.display_name}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBack: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 24, color: COLORS.gray900, fontWeight: '300' },
  logoBold: { fontWeight: '700', color: COLORS.primary },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center' },
  dotActive: { backgroundColor: COLORS.primary },
  dotText: { fontSize: 14, fontWeight: '600', color: COLORS.gray500 },
  dotTextActive: { color: COLORS.white },
  line: { width: 32, height: 3, backgroundColor: COLORS.gray200, marginHorizontal: 4 },
  lineActive: { backgroundColor: COLORS.primary },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginBottom: 8 },
  stepDesc: { fontSize: 14, color: COLORS.gray500, marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, marginTop: 20, marginBottom: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray700, marginTop: 10, marginBottom: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14,
    backgroundColor: COLORS.gray50, marginBottom: 12,
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 15, fontSize: 16, color: COLORS.gray900 },
  icoRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  aresBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 12 },
  aresBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 10,
    elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.gray200, borderRadius: 16,
    padding: 18, marginBottom: 12, gap: 14,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  roleIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  roleIconWrapActive: { backgroundColor: COLORS.white },
  roleLabel: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, marginBottom: 2 },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 13, color: COLORS.gray500 },
  stepButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  backButton: {
    width: 52, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  catChipText: { fontSize: 14, color: COLORS.gray700 },
  catChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  selectedCount: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 8 },
  suggestList: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, marginTop: -8, marginBottom: 12, backgroundColor: COLORS.white },
  suggestItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  suggestText: { fontSize: 14, color: COLORS.gray700, flex: 1 },
  linkContainer: { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  linkText: { fontSize: 15, color: COLORS.gray500 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
