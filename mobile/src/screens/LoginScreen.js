import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Chyba', 'Vyplnte email a heslo');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Prihlaseni se nezdarilo';
      Alert.alert('Chyba', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.logo}>
            Craft<Text style={styles.logoBold}>Bolt</Text>
          </Text>
          <Text style={styles.subtitle}>Propojujeme remeslniky se zakazniky</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Prihlaseni</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={COLORS.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="vas@email.cz"
              placeholderTextColor={COLORS.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Vase heslo"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Prihlasit se</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Nemate ucet? <Text style={styles.linkBold}>Registrujte se</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pricing info */}
        <View style={styles.pricingInfo}>
          <View style={styles.pricingRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.green500} />
            <Text style={styles.pricingText}>Zakaznik — <Text style={styles.pricingBold}>ZDARMA</Text></Text>
          </View>
          <View style={styles.pricingRow}>
            <Ionicons name="construct-outline" size={16} color={COLORS.primary} />
            <Text style={styles.pricingText}>Dodavatel — <Text style={styles.pricingBold}>od 190 Kc/mesic</Text></Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 60, height: 60, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    ...SHADOWS.glow,
  },
  logo: { fontSize: 34, color: COLORS.gray900, fontWeight: '300', letterSpacing: -0.5 },
  logoBold: { fontWeight: '700', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.gray500, marginTop: 6 },
  form: { width: '100%' },
  formTitle: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginBottom: 20, letterSpacing: -0.3 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50, marginBottom: 12,
  },
  inputIcon: { paddingLeft: 14 },
  input: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 15,
    fontSize: 15, color: COLORS.gray900,
  },
  eyeBtn: { paddingRight: 14, paddingVertical: 15 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    ...SHADOWS.glow,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  linkContainer: { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  linkText: { fontSize: 14, color: COLORS.gray500 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
  pricingInfo: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: COLORS.gray100, gap: 10 },
  pricingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pricingText: { fontSize: 13, color: COLORS.gray500 },
  pricingBold: { fontWeight: '700', color: COLORS.gray900 },
});
