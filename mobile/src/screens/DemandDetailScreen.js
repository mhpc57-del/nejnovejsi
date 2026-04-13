import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { demandService, disputeService, messageService, userService, uploadService, authService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { COLORS, STATUS_COLORS, RADIUS, SHADOWS } from '../utils/theme';
import { StatusBadge } from '../components/SharedComponents';

export default function DemandDetailScreen({ route, navigation }) {
  const { demand: initialDemand, role } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState(initialDemand);
  const [messages, setMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [disputeData, setDisputeData] = useState(null);
  const [locationShared, setLocationShared] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const scrollRef = useRef(null);
  const chatPollRef = useRef(null);

  const isSupplier = role === 'supplier';
  const isCustomer = role === 'customer';
  const isAssigned = d.assigned_supplier_id === user?.id;
  const isOpen = d.status === 'open';
  const isInProgress = d.status === 'in_progress';
  const isPending = d.status === 'pending_completion';
  const isDispute = d.status === 'dispute';
  const isCompleted = d.status === 'completed';
  const canChat = (isAssigned || (isCustomer && d.assigned_supplier_id)) && !isOpen;

  const fetchMessages = async () => {
    try {
      const res = await messageService.getByDemand(d.id);
      setMessages(res.data || []);
    } catch {}
  };

  const fetchDispute = async () => {
    try {
      const res = await disputeService.get(d.id);
      setDisputeData(res.data);
    } catch {}
  };

  const checkLocationSharing = async () => {
    try {
      const me = await authService.getMe();
      if (me.data.location_sharing) {
        setLocationShared(true);
        startLocationSharing();
      }
    } catch {}
  };

  useEffect(() => {
    if (canChat) {
      fetchMessages();
      chatPollRef.current = setInterval(fetchMessages, 5000);
    }
    if (isDispute) fetchDispute();
    if (canChat && !isOpen) checkLocationSharing();
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [d.id]);

  const startLocationSharing = async () => {
    setSharingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setSharingLocation(false); return; }
      const loc = await Location.getCurrentPositionAsync({});
      await userService.updateLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLocationShared(true);
    } catch {} finally { setSharingLocation(false); }
  };

  const toggleLocationSharing = async () => {
    if (locationShared) {
      await userService.updateLocation({ latitude: null, longitude: null });
      setLocationShared(false);
    } else {
      await startLocationSharing();
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    setSendingChat(true);
    try {
      await messageService.send(d.id, chatMessage.trim());
      setChatMessage('');
      fetchMessages();
    } catch { Alert.alert('Chyba', 'Nepodařilo se odeslat zprávu'); }
    finally { setSendingChat(false); }
  };

  const handleAccept = async () => {
    try {
      await demandService.accept(d.id);
      Alert.alert('Hotovo', 'Zakázka přijata');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přijmout'); }
  };

  const handleCancel = async () => {
    Alert.alert('Zrušit zakázku', 'Opravdu chcete zrušit tuto zakázku?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, zrušit', style: 'destructive', onPress: async () => {
        try { await demandService.cancel(d.id); Alert.alert('Hotovo', 'Zakázka zrušena'); navigation.goBack(); }
        catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se zrušit'); }
      }},
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{d.title}</Text>
        <View style={{ width: 42 }} />
      </View>

      {showChat ? (
        <ChatView
          messages={messages} chatMessage={chatMessage} setChatMessage={setChatMessage}
          sendingChat={sendingChat} onSend={handleSendMessage} userId={user?.id}
          onClose={() => setShowChat(false)} scrollRef={scrollRef}
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status + info */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <StatusBadge status={d.status} />
              <Text style={{ fontSize: 12, color: COLORS.gray400 }}>{new Date(d.created_at).toLocaleDateString('cs-CZ')}</Text>
            </View>
            <Text style={styles.title}>{d.title}</Text>
            <Text style={styles.desc}>{d.description}</Text>

            {d.category && (
              <InfoRow icon="pricetag-outline" color={COLORS.primary} text={d.category} />
            )}
            <InfoRow icon="location-outline" color={COLORS.gray500} text={d.address} />
            {d.budget_max > 0 && <InfoRow icon="cash-outline" color={COLORS.green500} text={`Max. ${d.budget_max.toLocaleString('cs-CZ')} Kč`} />}
            {d.deadline && !isNaN(new Date(d.deadline).getTime()) && <InfoRow icon="calendar-outline" color={COLORS.primary} text={`Termín: ${new Date(d.deadline).toLocaleDateString('cs-CZ')}`} />}
            {d.assigned_supplier_name && <InfoRow icon="person-outline" color={COLORS.blue500} text={`Dodavatel: ${d.assigned_supplier_name}`} />}
            {d.customer_name && isSupplier && <InfoRow icon="person-outline" color={COLORS.green500} text={`Zákazník: ${d.customer_name}`} />}

            {d.images?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {d.images.map((img, i) => (
                  <Image key={i} source={{ uri: img.startsWith('http') ? img : `https://craftbolt.cz${img}` }}
                    style={{ width: 100, height: 100, borderRadius: 10, marginRight: 8 }} />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Map */}
          {d.latitude && d.longitude && (
            <View style={styles.card}>
              <Text style={{ fontWeight: '600', color: COLORS.gray900, marginBottom: 10 }}>
                <Ionicons name="map-outline" size={16} color={COLORS.primary} /> Mapa
              </Text>
              <View style={{ borderRadius: RADIUS.md, overflow: 'hidden' }}>
                <MapView
                  style={{ width: '100%', height: 200 }}
                  initialRegion={{
                    latitude: d.latitude,
                    longitude: d.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}>
                  <Marker coordinate={{ latitude: d.latitude, longitude: d.longitude }}
                    title={d.address} pinColor={COLORS.primary} />
                </MapView>
              </View>
            </View>
          )}

          {/* Pending completion — customer confirms */}
          {isPending && isCustomer && d.completion_initiated_by === 'supplier' && (
            <PendingCompletionCustomer demand={d} navigation={navigation} />
          )}
          {isPending && isCustomer && d.completion_initiated_by === 'customer' && (
            <View style={[styles.card, { backgroundColor: COLORS.purple50 }]}>
              <Text style={{ fontWeight: '700', color: COLORS.purple700 }}>Čeká se na potvrzení od dodavatele</Text>
              <Text style={{ fontSize: 13, color: COLORS.purple500, marginTop: 4 }}>Označili jste zakázku jako dokončenou.</Text>
            </View>
          )}
          {isPending && isSupplier && d.completion_initiated_by === 'supplier' && (
            <View style={[styles.card, { backgroundColor: COLORS.purple50 }]}>
              <Text style={{ fontWeight: '700', color: COLORS.purple700 }}>Čeká se na potvrzení od zákazníka</Text>
              <Text style={{ fontSize: 13, color: COLORS.purple500, marginTop: 4 }}>Zákazník musí potvrdit dokončení.</Text>
            </View>
          )}
          {isPending && isSupplier && d.completion_initiated_by === 'customer' && (
            <PendingCompletionSupplier demand={d} navigation={navigation} />
          )}

          {/* Dispute info */}
          {isDispute && disputeData && (
            <View style={[styles.card, { backgroundColor: COLORS.amber50, borderColor: COLORS.amber100 }]}>
              <Text style={{ fontWeight: '700', color: COLORS.amber700, marginBottom: 6 }}>
                {isCustomer ? 'Dodavatel nahlásil problém' : 'Problém nahlášen'}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.amber700 }}>Důvod: {disputeData.reason_text || disputeData.reason_type}</Text>
              {disputeData.description && <Text style={{ fontSize: 13, color: COLORS.gray600, marginTop: 4 }}>{disputeData.description}</Text>}
              {isCustomer && <DisputeActions demandId={d.id} navigation={navigation} />}
            </View>
          )}

          {/* Completed with rating */}
          {isCompleted && d.customer_rating && (
            <View style={styles.card}>
              <Text style={{ fontWeight: '600', color: COLORS.gray900, marginBottom: 8 }}>Hodnocení</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <Ionicons key={s} name={s <= d.customer_rating ? 'star' : 'star-outline'} size={20} color={COLORS.orange500} />
                ))}
              </View>
              {d.customer_review && <Text style={{ fontSize: 13, color: COLORS.gray600, marginTop: 6 }}>{d.customer_review}</Text>}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsCard}>
            {/* Supplier: Accept */}
            {isSupplier && isOpen && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAccept}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.primaryBtnText}>Přijmout zakázku</Text>
              </TouchableOpacity>
            )}

            {/* Location sharing */}
            {canChat && !isOpen && (
              <View style={styles.toggleRow}>
                <Text style={{ fontSize: 14, color: COLORS.gray700 }}>Sdílení polohy</Text>
                <TouchableOpacity
                  style={[styles.toggle, locationShared && styles.toggleActive]}
                  onPress={toggleLocationSharing} disabled={sharingLocation}>
                  <View style={[styles.toggleThumb, locationShared && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
            )}

            {/* Chat button */}
            {canChat && (
              <TouchableOpacity style={styles.chatBtn} onPress={() => setShowChat(true)}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                <Text style={styles.chatBtnText}>Online chat ({messages.length})</Text>
              </TouchableOpacity>
            )}

            {/* Supplier: Complete */}
            {isSupplier && isInProgress && isAssigned && (
              <CompletionForm demandId={d.id} navigation={navigation} />
            )}

            {/* Supplier: Dispute */}
            {isSupplier && isInProgress && isAssigned && (
              <DisputeForm demandId={d.id} navigation={navigation} />
            )}

            {/* Customer: Cancel */}
            {isCustomer && (isOpen || isInProgress) && (
              <TouchableOpacity style={styles.dangerBtn} onPress={handleCancel}>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.red500} />
                <Text style={styles.dangerBtnText}>Zrušit zakázku</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ====== CHAT ======
const ChatView = ({ messages, chatMessage, setChatMessage, sendingChat, onSend, userId, onClose, scrollRef }) => (
  <View style={{ flex: 1 }}>
    <View style={chatStyles.topBar}>
      <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn}>
        <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
      </TouchableOpacity>
      <Ionicons name="chatbubble" size={18} color={COLORS.primary} />
      <Text style={chatStyles.title}>Chat ({messages.length})</Text>
    </View>
    <ScrollView style={chatStyles.messages} ref={scrollRef}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {messages.length === 0 && (
        <Text style={{ textAlign: 'center', color: COLORS.gray400, marginTop: 40 }}>Žádné zprávy</Text>
      )}
      {messages.map((m, i) => {
        const isMine = m.sender_id === userId;
        return (
          <View key={i} style={[chatStyles.bubble, isMine ? chatStyles.bubbleMine : chatStyles.bubbleOther]}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: isMine ? COLORS.orange500 : COLORS.blue500, marginBottom: 2 }}>{m.sender_name}</Text>
            <Text style={{ fontSize: 14, color: COLORS.gray900 }}>{m.content}</Text>
            <Text style={{ fontSize: 10, color: COLORS.gray400, marginTop: 4, alignSelf: 'flex-end' }}>
              {new Date(m.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
    <View style={chatStyles.inputRow}>
      <TextInput style={chatStyles.input} value={chatMessage} onChangeText={setChatMessage}
        placeholder="Napište zprávu..." placeholderTextColor={COLORS.gray300} multiline />
      <TouchableOpacity style={chatStyles.sendBtn} onPress={onSend} disabled={!chatMessage.trim() || sendingChat}>
        {sendingChat ? <ActivityIndicator size="small" color={COLORS.white} /> :
          <Ionicons name="send" size={18} color={COLORS.white} />}
      </TouchableOpacity>
    </View>
  </View>
);

// ====== COMPLETION FORM (Supplier) ======
const CompletionForm = ({ demandId, navigation }) => {
  const [show, setShow] = useState(false);
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      try { const res = await uploadService.upload(result.assets[0].uri); setPhotos(p => [...p, res.data.url]); } catch {}
    }
  };

  const submit = async () => {
    if (!price) { Alert.alert('Chyba', 'Zadejte cenu'); return; }
    setLoading(true);
    try {
      await demandService.complete(demandId, {
        completion_type: 'standard', final_price: parseFloat(price), agreed_price: parseFloat(price),
        completion_photos: photos.map(url => ({ url })),
      });
      Alert.alert('Hotovo', 'Zakázka označena jako dokončená');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
    finally { setLoading(false); }
  };

  if (!show) return (
    <TouchableOpacity style={styles.successBtn} onPress={() => setShow(true)}>
      <Ionicons name="checkmark-done-outline" size={18} color={COLORS.white} />
      <Text style={styles.successBtnText}>Zakázku jsem dokončil</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.card, { backgroundColor: COLORS.green50 }]}>
      <Text style={{ fontWeight: '700', color: COLORS.green700, marginBottom: 10 }}>Dokončení zakázky</Text>
      <Text style={{ fontSize: 13, color: COLORS.gray700, marginBottom: 6 }}>Cena (Kč) *</Text>
      <TextInput style={styles.formInput} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Celková cena" placeholderTextColor={COLORS.gray300} />
      <Text style={{ fontSize: 13, color: COLORS.gray700, marginBottom: 6, marginTop: 10 }}>Fotodokumentace</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {photos.map((url, i) => (
          <Image key={i} source={{ uri: url.startsWith('http') ? url : `https://craftbolt.cz${url}` }}
            style={{ width: 64, height: 64, borderRadius: 8 }} />
        ))}
        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
          <Ionicons name="add" size={24} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.successBtn, { flex: 1 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.successBtnText}>Odeslat</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setShow(false)}>
          <Text style={{ color: COLORS.gray600 }}>Zrušit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ====== DISPUTE FORM (Supplier) ======
const DisputeForm = ({ demandId, navigation }) => {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    { key: 'a', label: 'Nemohl jsem se dostat na místo' },
    { key: 'b', label: 'Zákazník nebyl k zastižení' },
    { key: 'c', label: 'Rozsah práce je jiný než popis' },
    { key: 'd', label: 'Zákazník odmítá zaplatit' },
    { key: 'e', label: 'Jiný důvod' },
  ];

  const submit = async () => {
    if (!reason) { Alert.alert('Chyba', 'Vyberte důvod'); return; }
    setLoading(true);
    try {
      await disputeService.create(demandId, { reason_type: reason, description: desc, photos: [] });
      Alert.alert('Hotovo', 'Problém nahlášen');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
    finally { setLoading(false); }
  };

  if (!show) return (
    <TouchableOpacity style={styles.warningBtn} onPress={() => setShow(true)}>
      <Ionicons name="warning-outline" size={18} color={COLORS.amber700} />
      <Text style={styles.warningBtnText}>Zakázku nelze dodělat</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.card, { backgroundColor: COLORS.amber50 }]}>
      <Text style={{ fontWeight: '700', color: COLORS.amber700, marginBottom: 10 }}>Nahlásit problém</Text>
      {reasons.map(r => (
        <TouchableOpacity key={r.key} style={[styles.reasonItem, reason === r.key && styles.reasonItemActive]}
          onPress={() => setReason(r.key)}>
          <Ionicons name={reason === r.key ? 'radio-button-on' : 'radio-button-off'} size={18}
            color={reason === r.key ? COLORS.amber700 : COLORS.gray400} />
          <Text style={{ fontSize: 14, color: reason === r.key ? COLORS.amber700 : COLORS.gray700 }}>{r.label}</Text>
        </TouchableOpacity>
      ))}
      <TextInput style={[styles.formInput, { height: 70, textAlignVertical: 'top', marginTop: 10 }]}
        value={desc} onChangeText={setDesc} placeholder="Popis problému..." placeholderTextColor={COLORS.gray300} multiline />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={[styles.warningSubmitBtn, { flex: 1 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '600' }}>Odeslat</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelFormBtn} onPress={() => setShow(false)}>
          <Text style={{ color: COLORS.gray600 }}>Zrušit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ====== PENDING COMPLETION - CUSTOMER VIEW ======
const PendingCompletionCustomer = ({ demand, navigation }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await demandService.complete(demand.id, {
        customer_rating: rating || undefined, customer_review: review.trim() || undefined,
        completion_photos: photos.map(url => ({ url })),
      });
      Alert.alert('Hotovo', 'Dokončení potvrzeno');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    Alert.alert('Odmítnout', 'Odmítnout dokončení? Zakázka půjde do sporů.', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, odmítnout', style: 'destructive', onPress: async () => {
        try {
          await disputeService.create(demand.id, { reason_type: 'f', description: 'Zákazník odmítl dokončení.', photos: [] });
          Alert.alert('Hotovo', 'Dokončení odmítnuto');
          navigation.goBack();
        } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
      }},
    ]);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      try { const res = await uploadService.upload(result.assets[0].uri); setPhotos(p => [...p, res.data.url]); } catch {}
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: COLORS.purple50, borderColor: COLORS.purple100 }]}>
      <Text style={{ fontWeight: '700', color: COLORS.purple700, marginBottom: 6 }}>Dodavatel označil zakázku jako dokončenou</Text>
      {demand.final_price > 0 && <Text style={{ fontSize: 13, color: COLORS.purple600 }}>Cena: {Number(demand.final_price).toLocaleString('cs-CZ')} Kč</Text>}

      {demand.completion_photos?.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.purple700, marginBottom: 6 }}>Fotky od dodavatele:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {demand.completion_photos.map((p, i) => {
              const url = (p.url || p);
              return <Image key={i} source={{ uri: url.startsWith('http') ? url : `https://craftbolt.cz${url}` }}
                style={{ width: 80, height: 80, borderRadius: 8, marginRight: 6 }} />;
            })}
          </ScrollView>
        </View>
      )}

      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray700, marginTop: 12, marginBottom: 6 }}>Vaše fotky (volitelné):</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {photos.map((url, i) => <Image key={i} source={{ uri: url.startsWith('http') ? url : `https://craftbolt.cz${url}` }} style={{ width: 60, height: 60, borderRadius: 8 }} />)}
        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}><Ionicons name="add" size={20} color={COLORS.gray400} /></TouchableOpacity>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray700, marginBottom: 6 }}>Hodnocení:</Text>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={28} color={COLORS.orange500} />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && <TextInput style={[styles.formInput, { marginBottom: 10 }]} value={review} onChangeText={setReview} placeholder="Recenze (volitelné)" placeholderTextColor={COLORS.gray300} />}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity style={[styles.successBtn, { flex: 1 }]} onPress={handleConfirm} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> :
            <><Ionicons name="checkmark" size={18} color={COLORS.white} /><Text style={styles.successBtnText}>Potvrdit</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dangerBtn, { flex: 1, justifyContent: 'center' }]} onPress={handleReject} disabled={loading}>
          <Text style={styles.dangerBtnText}>Odmítnout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ====== PENDING COMPLETION - SUPPLIER VIEW ======
const PendingCompletionSupplier = ({ demand, navigation }) => {
  const handleConfirm = async () => {
    try {
      await demandService.complete(demand.id, { completion_type: 'standard', final_price: demand.final_price || 0 });
      Alert.alert('Hotovo', 'Dokončení potvrzeno');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
  };

  return (
    <View style={[styles.card, { backgroundColor: COLORS.purple50 }]}>
      <Text style={{ fontWeight: '700', color: COLORS.purple700, marginBottom: 6 }}>Zákazník označil zakázku jako dokončenou</Text>
      <TouchableOpacity style={styles.successBtn} onPress={handleConfirm}>
        <Ionicons name="checkmark" size={18} color={COLORS.white} />
        <Text style={styles.successBtnText}>Souhlasím s dokončením</Text>
      </TouchableOpacity>
    </View>
  );
};

// ====== DISPUTE ACTIONS (Customer) ======
const DisputeActions = ({ demandId, navigation }) => {
  const [loading, setLoading] = useState(false);

  const respond = async (action) => {
    setLoading(true);
    try {
      await disputeService.respond(demandId, { action });
      Alert.alert('Hotovo', 'Akce provedena');
      navigation.goBack();
    } catch (e) { Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se'); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      <TouchableOpacity style={[styles.dangerBtn, { justifyContent: 'center' }]} onPress={() => respond('cancel')} disabled={loading}>
        <Text style={styles.dangerBtnText}>Nechci pokračovat</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.blue500 }]} onPress={() => respond('reopen')} disabled={loading}>
        <Text style={{ color: COLORS.white, fontWeight: '600' }}>Znovu vystavit poptávku</Text>
      </TouchableOpacity>
    </View>
  );
};

const InfoRow = ({ icon, color, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={{ fontSize: 14, color: COLORS.gray700, flex: 1 }}>{text}</Text>
  </View>
);

const chatStyles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.gray900 },
  messages: { flex: 1, padding: 16, backgroundColor: COLORS.gray50 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.orange50, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.gray100 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.gray900, maxHeight: 100, backgroundColor: COLORS.gray50 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.gray50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900, flex: 1 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginBottom: 8 },
  desc: { fontSize: 15, color: COLORS.gray600, lineHeight: 22, marginBottom: 8 },
  actionsCard: { gap: 10, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 15, ...SHADOWS.glow },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  successBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.green500, borderRadius: RADIUS.md, paddingVertical: 14 },
  successBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  warningBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.amber50, borderWidth: 1, borderColor: COLORS.amber100, borderRadius: RADIUS.md, paddingVertical: 14 },
  warningBtnText: { color: COLORS.amber700, fontSize: 15, fontWeight: '600' },
  warningSubmitBtn: { backgroundColor: COLORS.amber500, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.red100, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 16 },
  dangerBtnText: { color: COLORS.red500, fontSize: 15, fontWeight: '600' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14 },
  chatBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 16, borderWidth: 1, borderColor: COLORS.gray100 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: COLORS.gray300, justifyContent: 'center', paddingHorizontal: 3 },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white },
  toggleThumbActive: { transform: [{ translateX: 20 }] },
  formInput: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray900, backgroundColor: COLORS.white },
  addPhotoBtn: { width: 60, height: 60, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  cancelFormBtn: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  reasonItemActive: { backgroundColor: COLORS.amber50 },
});
