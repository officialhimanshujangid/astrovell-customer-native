import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator, StatusBar, ScrollView, Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { pujaApi } from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').trim();

// ─── Puja Detail Modal-like Screen ────────────────────────────────────────────
const PujaDetailView = ({ puja, onBack, onBook }) => {
  const image = puja.puja_images?.[0] || puja.image || '';
  const imageUri = image ? imgUrl(image.startsWith('http') ? null : image) || image : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {puja.puja_title || puja.title || puja.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.detailImage} resizeMode="cover" />
        ) : (
          <View style={[styles.detailImage, styles.imageFallback]}>
            <MaterialCommunityIcons name="pot-steam-outline" size={56} color={colors.gold} />
          </View>
        )}
        <View style={styles.detailBody}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailTitle}>{puja.puja_title || puja.title || puja.name}</Text>
            <Text style={styles.detailPrice}>₹{puja.puja_price || puja.price || 0}</Text>
          </View>
          {puja.puja_subtitle ? <Text style={styles.detailSubtitle}>{puja.puja_subtitle}</Text> : null}
          {(puja.long_description || puja.description) ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>About This Puja</Text>
              <Text style={styles.descText}>
                {stripHtml(puja.long_description || puja.description || '')}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.bookBtn} onPress={onBook} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#1A1A1A" />
            <Text style={styles.bookBtnText}>Book Now — ₹{puja.puja_price || puja.price || 0}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const PujaListScreen = ({ onBack }) => {
  const { can } = usePermissions();
  const [categories, setCategories] = useState([]);
  const [pujas, setPujas]           = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingPujas, setLoadingPujas] = useState(false);
  const [activePuja, setActivePuja] = useState(null);

  useEffect(() => {
    pujaApi.getCategories()
      .then((res) => {
        const d = res.data?.data || res.data;
        setCategories(Array.isArray(d) ? d : d?.recordList || []);
      })
      .catch(() => {})
      .finally(() => setLoadingCats(false));
  }, []);

  const loadPujas = (catId) => {
    setSelectedCat(catId);
    setLoadingPujas(true);
    pujaApi.getList({ categoryId: catId })
      .then((res) => {
        const d = res.data?.data || res.data;
        setPujas(Array.isArray(d) ? d : d?.recordList || []);
      })
      .catch(() => setPujas([]))
      .finally(() => setLoadingPujas(false));
  };

  if (!can('puja')) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book a Puja</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
        </View>
      </View>
    );
  }

  if (activePuja) {
    return (
      <PujaDetailView
        puja={activePuja}
        onBack={() => setActivePuja(null)}
        onBook={() => Toast.show({ type: 'success', text1: 'Puja Booking', text2: 'Booking request sent! Our team will contact you shortly.' })}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Puja</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingCats ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Sacred Pujas & Rituals</Text>
            <Text style={styles.heroSub}>Performed by expert pandits</Text>
          </View>

          {/* Category Grid */}
          <Text style={styles.sectionTitle}>Puja Categories</Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const catUri = cat.image
                ? cat.image.startsWith('http') ? cat.image : imgUrl(cat.image)
                : null;
              const isSelected = String(selectedCat) === String(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catCard, isSelected && styles.catCardActive]}
                  onPress={() => loadPujas(cat.id)}
                  activeOpacity={0.85}
                >
                  {catUri ? (
                    <Image source={{ uri: catUri }} style={styles.catImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.catImage, styles.catImageFallback]}>
                      <MaterialCommunityIcons name="pot-steam" size={28} color={isSelected ? '#1A1A1A' : colors.gold} />
                    </View>
                  )}
                  <Text style={[styles.catName, isSelected && styles.catNameActive]} numberOfLines={2}>
                    {cat.title || cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Puja List */}
          {selectedCat && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Available Pujas</Text>
              {loadingPujas ? (
                <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
              ) : pujas.length === 0 ? (
                <Text style={styles.emptyText}>No pujas in this category</Text>
              ) : (
                pujas.map((puja) => {
                  const img = puja.puja_images?.[0] || puja.image || '';
                  const uri = img ? (img.startsWith('http') ? img : imgUrl(img)) : null;
                  return (
                    <TouchableOpacity
                      key={puja.id}
                      style={styles.pujaCard}
                      onPress={() => setActivePuja(puja)}
                      activeOpacity={0.88}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.pujaImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.pujaImg, styles.pujaImgFallback]}>
                          <MaterialCommunityIcons name="pot-steam-outline" size={32} color={colors.gold} />
                        </View>
                      )}
                      <View style={styles.pujaInfo}>
                        <Text style={styles.pujaTitle} numberOfLines={2}>
                          {puja.puja_title || puja.title || puja.name}
                        </Text>
                        {puja.puja_subtitle ? (
                          <Text style={styles.pujaSubtitle} numberOfLines={1}>{puja.puja_subtitle}</Text>
                        ) : null}
                        <Text style={styles.pujaDesc} numberOfLines={2}>
                          {stripHtml(puja.long_description || puja.description || '')}
                        </Text>
                        <View style={styles.pujaBottom}>
                          <Text style={styles.pujaPrice}>₹{puja.puja_price || puja.price || 0}</Text>
                          <View style={styles.bookNowBtn}>
                            <Text style={styles.bookNowText}>Book Now</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}
          {!selectedCat && categories.length > 0 && (
            <Text style={styles.emptyText}>☝️ Select a category above to see pujas</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default PujaListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 44, paddingBottom: 12,
    backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  scroll: { paddingBottom: 32 },
  hero: {
    backgroundColor: colors.gold, padding: 24, alignItems: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 13, color: '#1A1A1A', opacity: 0.7, marginTop: 4 },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: colors.text,
    paddingHorizontal: 14, paddingTop: 16, paddingBottom: 10,
  },
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10, gap: 10,
  },
  catCard: {
    width: '30%', backgroundColor: colors.primary,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', paddingBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  catCardActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  catImage: { width: '100%', height: 68 },
  catImageFallback: { backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center', paddingHorizontal: 4, marginTop: 6 },
  catNameActive: { color: colors.goldDark, fontWeight: '700' },
  pujaCard: {
    backgroundColor: colors.primary, borderRadius: 14,
    marginHorizontal: 14, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  pujaImg: { width: 100, height: 120 },
  pujaImgFallback: { backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  pujaInfo: { flex: 1, padding: 12, gap: 3 },
  pujaTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  pujaSubtitle: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  pujaDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  pujaBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  pujaPrice: { fontSize: 15, fontWeight: '800', color: colors.gold },
  bookNowBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  bookNowText: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  // Detail
  detailImage: { width: '100%', height: 220 },
  imageFallback: { backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  detailBody: { padding: 16 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  detailTitle: { fontSize: 18, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  detailPrice: { fontSize: 18, fontWeight: '800', color: colors.gold },
  detailSubtitle: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 12 },
  descBox: { backgroundColor: '#F9F5FF', borderRadius: 12, padding: 14, marginBottom: 16 },
  descLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  descText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 14, marginTop: 8,
  },
  bookBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
});
