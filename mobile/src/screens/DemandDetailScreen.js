import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { demandService, messageService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS } from '../utils/theme';

const SOFT_ACCEPT_REASONS = [
  'Zakázku bych přijal, ale zákazník musí zaplatit víc. Jeho cenová představa je nereálná.',
  'Požadovaný termín realizace je nevyhovující. Navrhněte například v chatu jiný termín.',
  'Nepřijímám platby kartou. Pouze hotovost.',
  'Zakázku bych přijal, ale nemám potřebné nářadí a vybavení. Pokud jej máte vy, zakázku přijmu.',
  'Zakázka je většího rozsahu a budu ji dělat více dnů. Navrhuji upřesnit termíny realizace přes chat.',
];

export default function DemandDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [demand, setDemand] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSoftAccept, setShowSoftAccept] = useState(false);
  const [softAccepting, setSoftAccepting] = useState(false);
  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  const fetchData = async () => {
    try {
      const [demandRes, msgRes] = await Promise.all([
        demandService.getById(id),
        messageService.getByDemand(id).catch(() => ({ data: [] })),
      ]);
      setDemand(demandRes.data);
      setMessages(msgRes.data || []);
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se načíst zakázku');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for new messages every 5s
    pollRef.current = setInterval(async () => {
      try {
        const res = await messageService.getByDemand(id);
        setMessages(res.data || []);
      } catch {}
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  const isCustomer = user?.id === demand?.customer_id;
  const isAssignedSupplier = user?.id === demand?.assigned_supplier_id;
  const canAccept = user?.role === 'supplier' && demand?.status === 'open';
  const canChat = isCustomer || isAssignedSupplier || (user?.role === 'supplier' && demand?.status === 'open');
  const autoShowChat = isCustomer || isAssignedSupplier;
  const canComplete = (isCustomer || isAssignedSupplier) && demand?.status === 'in_progress';

  const handleAccept = async () => {
    Alert.alert('Závazné přijetí', 'Opravdu chcete závazně přijmout tuto zakázku?', [
      { text: 'Zpět', style: 'cancel' },
      {
        text: 'Závazně přijmout', onPress: async () => {
          try {
            await demandService.accept(id);
            Alert.alert('Hotovo', 'Zakázka přijata');
            fetchData();
          } catch (e) {
            Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přijmout');
          }
        }
      },
    ]);
  };

  const handleSoftAccept = async (reason) => {
    setSoftAccepting(true);
    try {
      await demandService.softAccept(id, reason);
      setShowSoftAccept(false);
      Alert.alert('Odesláno', 'Vaše podmínka byla odeslána zákazníkovi (email + SMS).');
      fetchData();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat');
    } finally {
      setSoftAccepting(false);
    }
  };

  const handleArrive = async () => {
    try {
      const res = await demandService.arrive(id);
      Alert.alert('Příjezd potvrzen', `Čas: ${res.data.arrival_minutes ? Math.round(res.data.arrival_minutes) + ' min' : 'zaznamenán'}`);
      fetchData();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Chyba');
    }
  };

  const handleComplete = async () => {
    try {
      await demandService.complete(id);
      Alert.alert('Hotovo', 'Zakázka dokončena');
      fetchData();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Chyba');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await messageService.send(id, newMessage.trim());
      setNewMessage('');
      const res = await messageService.getByDemand(id);
      setMessages(res.data || []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e) {
      Alert.alert('Chyba', 'Zprávu se nepodařilo odeslat');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!demand) return null;

  const statusInfo = STATUS_COLORS[demand.status] || STATUS_COLORS.open;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'} Zpět</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} ref={scrollRef}>
        {/* Demand Info */}
        <View style={styles.infoCard}>
          <Text style={styles.title}>{demand.title}</Text>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{demand.category}</Text>
          </View>
          <Text style={styles.desc}>{demand.description}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Adresa</Text>
              <Text style={styles.metaValue}>{demand.address}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Vytvořeno</Text>
              <Text style={styles.metaValue}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
            </View>
            {demand.deadline && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Termín</Text>
                <Text style={[styles.metaValue, { color: COLORS.primary, fontWeight: '600' }]}>
                  {new Date(demand.deadline).toLocaleDateString('cs-CZ')}
                </Text>
              </View>
            )}
            {demand.budget_max && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Rozpočet</Text>
                <Text style={[styles.metaValue, { color: COLORS.green500, fontWeight: '600' }]}>
                  {demand.budget_min ? `${demand.budget_min} - ` : ''}{demand.budget_max} Kč
                </Text>
              </View>
            )}
            {demand.customer_name && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Zákazník</Text>
                <Text style={styles.metaValue}>{demand.customer_name}</Text>
              </View>
            )}
            {demand.assigned_supplier_name && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dodavatel</Text>
                <Text style={styles.metaValue}>{demand.assigned_supplier_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canAccept && (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.8}>
                <Text style={styles.acceptBtnText}>Závazně přijmout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.softAcceptBtn} onPress={() => setShowSoftAccept(true)} activeOpacity={0.8}>
                <Text style={styles.softAcceptBtnText}>Nezávazně přijmout</Text>
              </TouchableOpacity>
            </>
          )}
          {isAssignedSupplier && demand.status === 'in_progress' && !demand.supplier_arrived && (
            <TouchableOpacity style={styles.arriveBtn} onPress={handleArrive}>
              <Text style={styles.arriveBtnText}>Dorazil jsem</Text>
            </TouchableOpacity>
          )}
          {canComplete && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <Text style={styles.completeBtnText}>Dokončit zakázku</Text>
            </TouchableOpacity>
          )}
          {canChat && !showChat && !autoShowChat && (
            <TouchableOpacity style={styles.chatStartBtn} onPress={() => setShowChat(true)}>
              <Text style={styles.chatStartBtnText}>Spustit chat</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Soft Accepts */}
        {demand.soft_accepts?.length > 0 && (
          <View style={styles.softAcceptsSection}>
            <Text style={styles.sectionTitle}>Nezávazné nabídky dodavatelů</Text>
            {demand.soft_accepts.map((sa, i) => (
              <View key={i} style={styles.softAcceptCard}>
                <Text style={styles.saSupplier}>{sa.supplier_name}</Text>
                <Text style={styles.saReason}>{sa.reason}</Text>
                <Text style={styles.saDate}>{new Date(sa.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Chat */}
        {canChat && (showChat || autoShowChat) && (
          <View style={styles.chatSection}>
            <Text style={styles.sectionTitle}>Chat</Text>
            <View style={styles.chatContainer}>
              {messages.length === 0 ? (
                <Text style={styles.noChatText}>Zatím žádné zprávy</Text>
              ) : (
                messages.map((msg, i) => (
                  <View key={i} style={[styles.msgBubble, msg.sender_id === user?.id ? styles.myMsg : styles.theirMsg]}>
                    <Text style={styles.msgSender}>{msg.sender_name}</Text>
                    <Text style={styles.msgContent}>{msg.content}</Text>
                    <Text style={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat Input */}
      {canChat && (showChat || autoShowChat) && (
        <View style={styles.chatInput}>
          <TextInput
            style={styles.chatTextInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Napište zprávu..."
            placeholderTextColor={COLORS.gray300}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage} disabled={sending || !newMessage.trim()}>
            {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.sendBtnText}>Odeslat</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Soft Accept Modal */}
      <Modal visible={showSoftAccept} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Nezávazné přijetí</Text>
              <TouchableOpacity onPress={() => setShowSoftAccept(false)}>
                <Text style={modalStyles.close}>Zavřít</Text>
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.subtitle}>Vyberte důvod:</Text>
            <ScrollView style={modalStyles.body}>
              {SOFT_ACCEPT_REASONS.map((reason, i) => (
                <TouchableOpacity key={i} style={modalStyles.reasonBtn}
                  onPress={() => handleSoftAccept(reason)} disabled={softAccepting} activeOpacity={0.7}>
                  <Text style={modalStyles.reasonNum}>{i + 1}.</Text>
                  <Text style={modalStyles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  close: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  subtitle: { fontSize: 14, color: COLORS.gray500, paddingHorizontal: 20, paddingTop: 16 },
  body: { padding: 20 },
  reasonBtn: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, padding: 16, marginBottom: 10, gap: 8 },
  reasonNum: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  reasonText: { fontSize: 14, color: COLORS.gray900, flex: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  backBtn: { paddingVertical: 8 },
  backText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  infoCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.gray100 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginBottom: 8 },
  catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 12 },
  catText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  desc: { fontSize: 15, color: COLORS.gray700, lineHeight: 22, marginBottom: 16 },
  metaGrid: { gap: 12 },
  metaItem: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 14, color: COLORS.gray500 },
  metaValue: { fontSize: 14, color: COLORS.gray900, fontWeight: '500' },
  actions: { gap: 10, marginBottom: 16 },
  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  acceptBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  softAcceptBtn: { borderWidth: 2, borderColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  softAcceptBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  arriveBtn: { backgroundColor: COLORS.blue500, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  arriveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  completeBtn: { backgroundColor: COLORS.green500, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  completeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  chatStartBtn: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  chatStartBtnText: { color: COLORS.gray700, fontSize: 16, fontWeight: '600' },
  softAcceptsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, marginBottom: 10 },
  softAcceptCard: { backgroundColor: COLORS.primaryLight, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.orange100 },
  saSupplier: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 4 },
  saReason: { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
  saDate: { fontSize: 12, color: COLORS.gray500, marginTop: 6 },
  chatSection: { marginBottom: 16 },
  chatContainer: { backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.gray100, minHeight: 100 },
  noChatText: { fontSize: 14, color: COLORS.gray500, textAlign: 'center', paddingVertical: 20 },
  msgBubble: { borderRadius: 14, padding: 12, marginBottom: 8, maxWidth: '80%' },
  myMsg: { backgroundColor: COLORS.primary, alignSelf: 'flex-end' },
  theirMsg: { backgroundColor: COLORS.gray100, alignSelf: 'flex-start' },
  msgSender: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginBottom: 2 },
  msgContent: { fontSize: 14, color: COLORS.white },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  chatInput: { flexDirection: 'row', padding: 12, paddingBottom: 28, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100, gap: 8 },
  chatTextInput: { flex: 1, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.gray900, maxHeight: 80 },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
});
