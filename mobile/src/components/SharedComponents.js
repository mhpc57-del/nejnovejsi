import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STATUS_COLORS, RADIUS, SHADOWS } from '../utils/theme';

export const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.text} />
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
};

export const DemandCard = ({ demand, onPress, showNew }) => {
  const st = STATUS_COLORS[demand.status] || STATUS_COLORS.open;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{demand.title}</Text>
        <StatusBadge status={demand.status} />
      </View>
      {demand.category && (
        <View style={styles.catRow}>
          <Ionicons name="pricetag-outline" size={13} color={COLORS.primary} />
          <Text style={styles.catText}>{demand.category}</Text>
        </View>
      )}
      <Text style={styles.cardDesc} numberOfLines={2}>{demand.description}</Text>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.gray400} />
          <Text style={styles.metaText} numberOfLines={1}>{demand.address}</Text>
        </View>
        <Text style={styles.metaDate}>{new Date(demand.created_at).toLocaleDateString('cs-CZ')}</Text>
      </View>
      {demand.deadline && (
        <View style={styles.deadlineRow}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
          <Text style={styles.deadlineText}>Termín: {new Date(demand.deadline).toLocaleDateString('cs-CZ')}</Text>
        </View>
      )}
      {demand.verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={13} color={COLORS.green500} />
          <Text style={styles.verifiedText}>Ověřená poptávka</Text>
        </View>
      )}
      {!demand.verified && demand.status === 'open' && (
        <View style={[styles.verifiedBadge, { backgroundColor: COLORS.orange50 }]}>
          <Ionicons name="alert-circle-outline" size={13} color={COLORS.orange500} />
          <Text style={[styles.verifiedText, { color: COLORS.orange500 }]}>Neověřená</Text>
        </View>
      )}
      {showNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>Nová</Text>
        </View>
      )}
      {demand.assigned_supplier_name && (
        <View style={styles.assignedRow}>
          <Ionicons name="person-outline" size={13} color={COLORS.blue500} />
          <Text style={styles.assignedText}>{demand.assigned_supplier_name}</Text>
        </View>
      )}
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
      </View>
    </TouchableOpacity>
  );
};

export const TabBar = ({ tabs, activeTab, onTabChange, counts }) => (
  <View style={styles.tabsScroll}>
    {tabs.map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, activeTab === tab.key && { borderColor: tab.color, backgroundColor: tab.color + '15' }]}
        onPress={() => onTabChange(tab.key)}
        activeOpacity={0.7}
      >
        <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? tab.color : COLORS.gray400} />
        <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.color, fontWeight: '600' }]}>{tab.label}</Text>
        <View style={[styles.tabCountBadge, { backgroundColor: activeTab === tab.key ? tab.color : COLORS.gray200 }]}>
          <Text style={[styles.tabCount, { color: activeTab === tab.key ? COLORS.white : COLORS.gray600 }]}>{counts[tab.key] || 0}</Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

export const EmptyState = ({ icon, title, subtitle }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name={icon || 'folder-open-outline'} size={40} color={COLORS.gray300} />
    </View>
    <Text style={styles.emptyTitle}>{title || 'Žádné zakázky'}</Text>
    {subtitle && <Text style={styles.emptyText}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray100, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray900, flex: 1, marginRight: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  catText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  cardDesc: { fontSize: 14, color: COLORS.gray600, marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: COLORS.gray500, flex: 1 },
  metaDate: { fontSize: 12, color: COLORS.gray400 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  deadlineText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.green50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8, alignSelf: 'flex-start' },
  verifiedText: { fontSize: 12, color: COLORS.green700, fontWeight: '600' },
  newBadge: { position: 'absolute', top: 8, right: 40, backgroundColor: COLORS.green500, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  newText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  assignedText: { fontSize: 12, color: COLORS.blue500, fontWeight: '500' },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },
  tabsScroll: { flexDirection: 'row', flexWrap: 'nowrap', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  tab: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  tabLabel: { fontSize: 12, color: COLORS.gray600 },
  tabCountBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabCount: { fontSize: 11, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.gray900 },
  emptyText: { fontSize: 14, color: COLORS.gray500, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});
