import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { miscService } from '../services/api';
import { COLORS } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
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
      <Text style={styles.stepTitle}>1. Přihlašovací údaje</Text>
      <Text style={styles.label}>Email *</Text>
      <TextInput style={styles.input} value={form.email} onChangeText={v => update('email', v)}
        placeholder="vas@email.cz" placeholderTextColor={COLORS.gray300}
        keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.label}>Heslo *</Text>
      <TextInput style={styles.input} value={form.password} onChangeText={v => update('password', v)}
        placeholder="Min. 8 znaků" placeholderTextColor={COLORS.gray300} secureTextEntry />
      <Text style={styles.label}>Telefon *</Text>
      <TextInput style={styles.input} value={form.phone} onChangeText={v => update('phone', v)}
        placeholder="+420..." placeholderTextColor={COLORS.gray300} keyboardType="phone-pad" />
      <TouchableOpacity style={styles.button} onPress={() => {
        if (!form.email || !form.password || !form.phone) { Alert.alert('Chyba', 'Vyplňte všechna pole'); return; }
        setStep(2);
      }}>
        <Text style={styles.buttonText}>Pokračovat</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>2. Typ účtu</Text>
      {[
        { value: 'customer', label: 'Zákazník', desc: 'Hledám řemeslníky a dodavatele' },
        { value: 'supplier', label: 'Dodavatel / Řemeslník', desc: 'Nabízím své služby' },
      ].map(role => (
        <TouchableOpacity key={role.value}
          style={[styles.roleCard, form.role === role.value && styles.roleCardActive]}
          onPress={() => update('role', role.value)}>
          <Text style={[styles.roleLabel, form.role === role.value && styles.roleLabelActive]}>{role.label}</Text>
          <Text style={styles.roleDesc}>{role.desc}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.backButtonText}>Zpět</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={() => {
          if (!form.role) { Alert.alert('Chyba', 'Vyberte typ účtu'); return; }
          setStep(3);
        }}>
          <Text style={styles.buttonText}>Pokračovat</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>3. Osobní údaje</Text>
      <Text style={styles.label}>Jméno</Text>
      <TextInput style={styles.input} value={form.first_name} onChangeText={v => update('first_name', v)}
        placeholder="Jan" placeholderTextColor={COLORS.gray300} />
      <Text style={styles.label}>Příjmení</Text>
      <TextInput style={styles.input} value={form.last_name} onChangeText={v => update('last_name', v)}
        placeholder="Novák" placeholderTextColor={COLORS.gray300} />
      {form.role === 'supplier' && (
        <>
          <Text style={styles.label}>Název firmy</Text>
          <TextInput style={styles.input} value={form.company_name} onChangeText={v => update('company_name', v)}
            placeholder="Nepovinné" placeholderTextColor={COLORS.gray300} />
        </>
      )}
      <Text style={styles.label}>Adresa</Text>
      <TextInput style={styles.input} value={form.address} onChangeText={v => update('address', v)}
        placeholder="Ulice, město" placeholderTextColor={COLORS.gray300} />

      {form.role === 'supplier' && (
        <>
          <Text style={[styles.label, { marginTop: 20 }]}>Kategorie služeb</Text>
          <ScrollView horizontal={false} style={{ maxHeight: 200 }}>
            {categories.map(cat => (
              <TouchableOpacity key={cat} style={[styles.catChip, form.categories.includes(cat) && styles.catChipActive]}
                onPress={() => update('categories', form.categories.includes(cat)
                  ? form.categories.filter(c => c !== cat)
                  : [...form.categories, cat])}>
                <Text style={[styles.catChipText, form.categories.includes(cat) && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>Zpět</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Dokončit registraci</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Craft<Text style={styles.logoBold}>Bolt</Text></Text>
        <View style={styles.progress}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
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
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  logo: { fontSize: 32, color: COLORS.gray900, fontWeight: '300', textAlign: 'center' },
  logoBold: { fontWeight: '700', color: COLORS.primary },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 24 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gray200 },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  stepTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray900, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.gray900,
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 20,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  roleCard: {
    borderWidth: 2, borderColor: COLORS.gray200, borderRadius: 16,
    padding: 20, marginBottom: 12,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  roleLabel: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, marginBottom: 4 },
  roleLabelActive: { color: COLORS.primary },
  roleDesc: { fontSize: 13, color: COLORS.gray500 },
  stepButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backButton: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.gray700 },
  catChip: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  catChipText: { fontSize: 14, color: COLORS.gray700 },
  catChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  linkContainer: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  linkText: { fontSize: 14, color: COLORS.gray500 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
