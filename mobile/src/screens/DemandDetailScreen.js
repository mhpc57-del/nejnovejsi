import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { demandService, messageService, reviewService } from '../services/api';
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
  const insets = useSafeAreaInsets();
  const [demand, setDemand] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSoftAccept, setShowSoftAccept] = useState(false);
  const [softAccepting, setSoftAccepting] = useState(false);
  const [showReview, setShowReview] = useState(false);
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
  const canCancel = (isCustomer || isAssignedSupplier) && (demand?.status === 'in_progress' || demand?.status === 'open');

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

  const handleCancel = () => {
    Alert.alert('Zrušit zakázku', 'Opravdu chcete zrušit tuto zakázku?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, zrušit', style: 'destructive', onPress: async () => {
        try {
          await demandService.cancel(id, 'Zrušeno přes mobilní aplikaci');
          Alert.alert('Zrušeno', 'Zakázka byla zrušena');
          fetchData();
        } catch (e) {
          Alert.alert('Chyba', e.response?.data?.detail || 'Chyba');
        }
      }},
    ]);
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detail zakázky</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} ref={scrollRef}>
        {/* Demand Info */}
        <View style={styles.infoCard}>
          <Text style={styles.title}>{demand.title}</Text>
          <View style={styles.catBadge}>
            <Ionicons name="pricetag-outline" size={13} color={COLORS.primary} />
            <Text style={styles.catText}>{demand.category}</Text>
          </View>
          <Text style={styles.desc}>{demand.description}</Text>

          {/* Demand Images */}
          {demand.images?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {demand.images.map((img, i) => (
                <Image key={i} source={{ uri: img.startsWith('http') ? img : `https://craftbolt.cz${img}` }}
                  style={styles.demandImage} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Adresa</Text>
                <Text style={styles.metaValue}>{demand.address}</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Vytvořeno</Text>
                <Text style={styles.metaValue}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
            </View>
            {demand.deadline && (
              <View style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Termín</Text>
                  <Text style={[styles.metaValue, { color: COLORS.primary, fontWeight: '600' }]}>
                    {new Date(demand.deadline).toLocaleDateString('cs-CZ')}
                  </Text>
                </View>
              </View>
            )}
            {demand.budget_max > 0 && (
              <View style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.green500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Rozpočet</Text>
                  <Text style={[styles.metaValue, { color: COLORS.green500, fontWeight: '600' }]}>
                    {demand.budget_min ? `${demand.budget_min} - ` : ''}{demand.budget_max} Kč
                  </Text>
                </View>
              </View>
            )}
            {demand.customer_name && (
              <View style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="person-outline" size={16} color={COLORS.gray500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Zákazník</Text>
                  <Text style={styles.metaValue}>{demand.customer_name}</Text>
                </View>
              </View>
            )}
            {demand.assigned_supplier_name && (
              <View style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="construct-outline" size={16} color={COLORS.gray500} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.metaLabel}>Dodavatel</Text>
                  <Text style={styles.metaValue}>{demand.assigned_supplier_name}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canAccept && (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.white} />
                <Text style={styles.acceptBtnText}>Závazně přijmout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.softAcceptBtn} onPress={() => setShowSoftAccept(true)} activeOpacity={0.8}>
                <Ionicons name="hand-right-outline" size={22} color={COLORS.primary} />
                <Text style={styles.softAcceptBtnText}>Nezávazně přijmout</Text>
              </TouchableOpacity>
            </>
          )}
          {isAssignedSupplier && demand.status === 'in_progress' && !demand.supplier_arrived && (
            <TouchableOpacity style={styles.arriveBtn} onPress={handleArrive}>
              <Ionicons name="navigate-outline" size={22} color={COLORS.white} />
              <Text style={styles.arriveBtnText}>Dorazil jsem</Text>
            </TouchableOpacity>
          )}
          {canComplete && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
              <Ionicons name="flag-outline" size={22} color={COLORS.white} />
              <Text style={styles.completeBtnText}>Dokončit zakázku</Text>
            </TouchableOpacity>
          )}
          {demand.status === 'completed' && (isCustomer || isAssignedSupplier) && (
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReview(true)}>
              <Ionicons name="star-outline" size={22} color={COLORS.primary} />
              <Text style={styles.reviewBtnText}>Ohodnotit</Text>
            </TouchableOpacity>
          )}
          {canChat && !showChat && !autoShowChat && (
            <TouchableOpacity style={styles.chatStartBtn} onPress={() => setShowChat(true)}>
              <Ionicons name="chatbubbles-outline" size={22} color={COLORS.gray700} />
              <Text style={styles.chatStartBtnText}>Spustit chat</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={22} color={COLORS.red500} />
              <Text style={styles.cancelBtnText}>Zrušit zakázku</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Soft Accepts */}
        {demand.soft_accepts?.length > 0 && (
          <View style={styles.softAcceptsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hand-right-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Nezávazné nabídky dodavatelů</Text>
            </View>
            {demand.soft_accepts.map((sa, i) => (
              <View key={i} style={styles.softAcceptCard}>
                <View style={styles.saHeader}>
                  <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.saSupplier}>{sa.supplier_name}</Text>
                </View>
                <Text style={styles.saReason}>{sa.reason}</Text>
                <Text style={styles.saDate}>{new Date(sa.created_at).toLocaleDateString('cs-CZ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Chat */}
        {canChat && (showChat || autoShowChat) && (
          <View style={styles.chatSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Chat</Text>
            </View>
            <View style={styles.chatContainer}>
              {messages.length === 0 ? (
                <View style={styles.noChatWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.gray300} />
                  <Text style={styles.noChatText}>Zatím žádné zprávy</Text>
                </View>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <View key={i} style={[styles.msgBubble, isMe ? styles.myMsg : styles.theirMsg]}>
                      <Text style={[styles.msgSender, !isMe && { color: COLORS.primary }]}>{msg.sender_name}</Text>
                      <Text style={[styles.msgContent, !isMe && { color: COLORS.gray900 }]}>{msg.content}</Text>
                      <Text style={[styles.msgTime, !isMe && { color: COLORS.gray500 }]}>
                        {new Date(msg.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Chat Input */}
      {canChat && (showChat || autoShowChat) && (
        <View style={[styles.chatInput, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={styles.chatTextInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Napište zprávu..."
            placeholderTextColor={COLORS.gray300}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && { opacity: 0.5 }]}
            onPress={handleSendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={20} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Review Modal */}
      {showReview && (
        <ReviewModal demandId={id} onClose={() => setShowReview(false)} onSuccess={() => { setShowReview(false); fetchData(); }} />
      )}

      {/* Soft Accept Modal */}
      <Modal visible={showSoftAccept} animationType="slide" transparent>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <View style={modalStyles.handle} />
            <View style={modalStyles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="hand-right-outline" size={22} color={COLORS.primary} />
                <Text style={modalStyles.title}>Nezávazné přijetí</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSoftAccept(false)} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.gray700} />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.subtitle}>Vyberte důvod podmíněného přijetí:</Text>
            <ScrollView style={modalStyles.body}>
              {SOFT_ACCEPT_REASONS.map((reason, i) => (
                <TouchableOpacity key={i} style={modalStyles.reasonBtn}
                  onPress={() => handleSoftAccept(reason)} disabled={softAccepting} activeOpacity={0.7}>
                  <View style={modalStyles.reasonNum}>
                    <Text style={modalStyles.reasonNumText}>{i + 1}</Text>
                  </View>
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

const ReviewModal = ({ demandId, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (rating === 0) { Alert.alert('Chyba', 'Vyberte hodnocení (1-5 hvězd)'); return; }
    if (!comment.trim()) { Alert.alert('Chyba', 'Napište komentář'); return; }
    setLoading(true);
    try {
      await reviewService.create({
        demand_id: demandId,
        rating,
        comment: comment.trim(),
        images: [],
        rating_percentage: rating * 20,
      });
      Alert.alert('Děkujeme', 'Hodnocení bylo odesláno');
      onSuccess();
    } catch (e) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat hodnocení');
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="star" size={22} color={COLORS.primary} />
              <Text style={modalStyles.title}>Hodnocení</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body}>
            <Text style={{ fontSize: 15, color: COLORS.gray700, marginBottom: 16 }}>Jak jste spokojeni se zakázkou?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={40} color={s <= rating ? COLORS.primary : COLORS.gray300} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 6 }}>Komentář</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 14, padding: 14, fontSize: 15, color: COLORS.gray900, height: 100, textAlignVertical: 'top', backgroundColor: COLORS.gray50 }}
              value={comment} onChangeText={setComment} placeholder="Popište vaši zkušenost..."
              placeholderTextColor={COLORS.gray300} multiline
            />
            <TouchableOpacity style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginTop: 20, marginBottom: 40 }}
              onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>Odeslat hodnocení</Text>
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
  container: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, color: COLORS.gray500, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  body: { padding: 20 },
  reasonBtn: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 16, padding: 16, marginBottom: 10, gap: 12, alignItems: 'flex-start' },
  reasonNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  reasonNumText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  reasonText: { fontSize: 14, color: COLORS.gray900, flex: 1, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: COLORS.gray900 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  infoCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.gray100, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginBottom: 10 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 14 },
  catText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  desc: { fontSize: 15, color: COLORS.gray700, lineHeight: 22, marginBottom: 18 },
  imagesScroll: { marginBottom: 14 },
  demandImage: { width: 160, height: 120, borderRadius: 12, marginRight: 10 },
  metaGrid: { gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  metaLabel: { fontSize: 12, color: COLORS.gray500 },
  metaValue: { fontSize: 14, color: COLORS.gray900, fontWeight: '500' },
  actions: { gap: 10, marginBottom: 16 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  acceptBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  softAcceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 16, paddingVertical: 16 },
  softAcceptBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  arriveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.blue500, borderRadius: 16, paddingVertical: 16 },
  arriveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.green500, borderRadius: 16, paddingVertical: 16 },
  completeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, backgroundColor: COLORS.primaryLight },
  reviewBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  chatStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 16, paddingVertical: 16 },
  chatStartBtnText: { color: COLORS.gray700, fontSize: 16, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.red500 + '40', borderRadius: 16, paddingVertical: 14, marginTop: 4 },
  cancelBtnText: { color: COLORS.red500, fontSize: 15, fontWeight: '600' },
  softAcceptsSection: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  softAcceptCard: { backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.orange100 },
  saHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  saSupplier: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  saReason: { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
  saDate: { fontSize: 12, color: COLORS.gray500, marginTop: 8 },
  chatSection: { marginBottom: 16 },
  chatContainer: { backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.gray100, minHeight: 100 },
  noChatWrap: { alignItems: 'center', paddingVertical: 24 },
  noChatText: { fontSize: 14, color: COLORS.gray500, marginTop: 8 },
  msgBubble: { borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: '80%' },
  myMsg: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMsg: { backgroundColor: COLORS.gray100, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgSender: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 3 },
  msgContent: { fontSize: 14, color: COLORS.white, lineHeight: 20 },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
  chatInput: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100, gap: 10, alignItems: 'flex-end' },
  chatTextInput: { flex: 1, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.gray900, maxHeight: 80, backgroundColor: COLORS.gray50 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 2 },
});
