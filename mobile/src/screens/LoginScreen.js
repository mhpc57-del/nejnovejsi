import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../utils/AuthContext';
import { COLORS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Chyba', 'Vyplňte email a heslo');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Přihlášení se nezdařilo';
      Alert.alert('Chyba', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={36} color={COLORS.white} />
          </View>
          <Text style={styles.logo}>
            Craft<Text style={styles.logoBold}>Bolt</Text>
          </Text>
          <Text style={styles.subtitle}>Propojujeme řemeslníky se zákazníky</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Přihlášení</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="vas@email.cz"
              placeholderTextColor={COLORS.gray300}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Vaše heslo"
              placeholderTextColor={COLORS.gray300}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray500} />
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
                <Text style={styles.buttonText}>Přihlásit se</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              Nemáte účet? <Text style={styles.linkBold}>Registrujte se</Text>
            </Text>
          </TouchableOpacity>
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
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  logo: { fontSize: 36, color: COLORS.gray900, fontWeight: '300' },
  logoBold: { fontWeight: '700', color: COLORS.primary },
  subtitle: { fontSize: 15, color: COLORS.gray500, marginTop: 8 },
  form: { width: '100%' },
  formTitle: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14,
    backgroundColor: COLORS.gray50, marginBottom: 14,
  },
  inputIcon: { paddingLeft: 16 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 16,
    fontSize: 16, color: COLORS.gray900,
  },
  eyeBtn: { paddingRight: 16, paddingVertical: 16 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginTop: 10,
    elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
  linkContainer: { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  linkText: { fontSize: 15, color: COLORS.gray500 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
