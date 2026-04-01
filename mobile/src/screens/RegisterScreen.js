import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
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
    categories: [], address: '',
  });

  useEffect(() => {
    miscService.getCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.phone || !form.role) {
      Alert.alert('Chyba', 'Vyplňte všechna povinná pole');
      return;
    }
    setLoading(true);
    try {
      await register(form);
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Registrace se nezdařila');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>Přihlašovací údaje</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.email} onChangeText={v => update('email', v)}
          placeholder="vas@email.cz" placeholderTextColor={COLORS.gray300}
          keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.inputWrapper}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.password} onChangeText={v => update('password', v)}
          placeholder="Min. 8 znaků" placeholderTextColor={COLORS.gray300} secureTextEntry />
      </View>
      <View style={styles.inputWrapper}>
        <Ionicons name="call-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.phone} onChangeText={v => update('phone', v)}
          placeholder="+420..." placeholderTextColor={COLORS.gray300} keyboardType="phone-pad" />
      </View>
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

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>Osobní údaje</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="person-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.first_name} onChangeText={v => update('first_name', v)}
          placeholder="Jméno" placeholderTextColor={COLORS.gray300} />
      </View>
      <View style={styles.inputWrapper}>
        <Ionicons name="person-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.last_name} onChangeText={v => update('last_name', v)}
          placeholder="Příjmení" placeholderTextColor={COLORS.gray300} />
      </View>
      {form.role === 'supplier' && (
        <View style={styles.inputWrapper}>
          <Ionicons name="business-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
          <TextInput style={styles.input} value={form.company_name} onChangeText={v => update('company_name', v)}
            placeholder="Název firmy (nepovinné)" placeholderTextColor={COLORS.gray300} />
        </View>
      )}
      <View style={styles.inputWrapper}>
        <Ionicons name="location-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
        <TextInput style={styles.input} value={form.address} onChangeText={v => update('address', v)}
          placeholder="Ulice, město" placeholderTextColor={COLORS.gray300} />
      </View>

      {form.role === 'supplier' && (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Kategorie služeb</Text>
          <View style={styles.catsGrid}>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catChip, form.categories.includes(cat) && styles.catChipActive]}
                onPress={() => update('categories', form.categories.includes(cat)
                  ? form.categories.filter(c => c !== cat)
                  : [...form.categories, cat])}>
                <Text style={[styles.catChipText, form.categories.includes(cat) && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.gray900} />
          </TouchableOpacity>
          <Text style={styles.logo}>Craft<Text style={styles.logoBold}>Bolt</Text></Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progress}>
          {[1, 2, 3].map(s => (
            <View key={s} style={styles.progressStep}>
              <View style={[styles.dot, step >= s && styles.dotActive]}>
                {step > s ? <Ionicons name="checkmark" size={14} color={COLORS.white} /> :
                  <Text style={[styles.dotText, step >= s && styles.dotTextActive]}>{s}</Text>}
              </View>
              {s < 3 && <View style={[styles.line, step > s && styles.lineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
          <Text style={styles.linkText}>Již máte účet? <Text style={styles.linkBold}>Přihlaste se</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, padding: 24 },
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
  line: { width: 40, height: 3, backgroundColor: COLORS.gray200, marginHorizontal: 4 },
  lineActive: { backgroundColor: COLORS.primary },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14,
    backgroundColor: COLORS.gray50, marginBottom: 14,
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 15, fontSize: 16, color: COLORS.gray900 },
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
  linkContainer: { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  linkText: { fontSize: 15, color: COLORS.gray500 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
