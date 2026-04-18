import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator, StatusBar,
  ScrollView, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { productApi } from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';
import Toast from 'react-native-toast-message';

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').trim();

// ─── Product Detail View ───────────────────────────────────────────────────────
const ProductDetailView = ({ product, onBack, onBuy }) => {
  const uri = product.image
    ? product.image.startsWith('http') ? product.image : imgUrl(product.image)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {uri ? (
          <Image source={{ uri }} style={styles.detailImage} resizeMode="cover" />
        ) : (
          <View style={[styles.detailImage, styles.imageFallback]}>
            <MaterialCommunityIcons name="shopping-outline" size={56} color={colors.gold} />
          </View>
        )}
        <View style={styles.detailBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailTitle}>{product.name}</Text>
            <Text style={styles.detailPrice}>₹{product.price || product.amount || 0}</Text>
          </View>
          {(product.description) ? (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Product Description</Text>
              <Text style={styles.descText}>{stripHtml(product.description)}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.buyBtn} onPress={onBuy} activeOpacity={0.85}>
            <Ionicons name="cart-outline" size={18} color="#1A1A1A" />
            <Text style={styles.buyBtnText}>Buy Now — ₹{product.price || product.amount || 0}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AstroShopScreen = ({ onBack }) => {
  const { can } = usePermissions();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading]       = useState(true);
  const [activeProduct, setActiveProduct] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      productApi.getProducts({}),
      productApi.getCategories(),
    ]).then(([prodRes, catRes]) => {
      if (prodRes.status === 'fulfilled') {
        const d = prodRes.value.data?.data || prodRes.value.data;
        setProducts(Array.isArray(d) ? d : d?.recordList || []);
      }
      if (catRes.status === 'fulfilled') {
        const d = catRes.value.data?.data || catRes.value.data;
        setCategories(Array.isArray(d) ? d : d?.recordList || []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = selectedCat
    ? products.filter((p) => String(p.categoryId) === String(selectedCat))
    : products;

  const handleBuy = (product) => {
    Alert.alert(
      'Add to Cart',
      `Add "${product.name}" (₹${product.price || product.amount || 0}) to your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy Now', onPress: () => Toast.show({ type: 'success', text1: 'Order Placed', text2: 'Your order has been placed! You will receive a confirmation shortly.' }) },
      ]
    );
  };

  if (activeProduct) {
    return (
      <ProductDetailView
        product={activeProduct}
        onBack={() => setActiveProduct(null)}
        onBuy={() => handleBuy(activeProduct)}
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
        <Text style={styles.headerTitle}>AstroShop</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.subText}>Loading products…</Text>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>🛍️ AstroShop</Text>
            <Text style={styles.heroSub}>Genuine & energised astrological products</Text>
          </View>

          {/* Category Filter */}
          {categories.length > 0 && (
            <View style={styles.filterWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedCat && styles.chipActive]}
                  onPress={() => setSelectedCat('')}
                >
                  <Text style={[styles.chipText, !selectedCat && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, String(selectedCat) === String(cat.id) && styles.chipActive]}
                    onPress={() => setSelectedCat(cat.id)}
                  >
                    <Text style={[styles.chipText, String(selectedCat) === String(cat.id) && styles.chipTextActive]}>
                      {cat.name || cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <FlatList
            data={filtered}
            numColumns={2}
            keyExtractor={(item, i) => String(item.id || i)}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialCommunityIcons name="shopping-outline" size={56} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No products found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const uri = item.image
                ? item.image.startsWith('http') ? item.image : imgUrl(item.image)
                : null;
              return (
                <TouchableOpacity
                  style={styles.productCard}
                  onPress={() => setActiveProduct(item)}
                  activeOpacity={0.88}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.productImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.imageFallback]}>
                      <MaterialCommunityIcons name="shopping-outline" size={32} color={colors.gold} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productDesc} numberOfLines={2}>
                      {stripHtml(item.description || '')}
                    </Text>
                    <View style={styles.productBottom}>
                      <Text style={styles.productPrice}>₹{item.price || item.amount || 0}</Text>
                      <View style={styles.buyChip}>
                        <Text style={styles.buyChipText}>Buy</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </View>
  );
};

export default AstroShopScreen;

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
  hero: {
    backgroundColor: colors.gold, padding: 18, alignItems: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  heroSub: { fontSize: 12, color: '#1A1A1A', opacity: 0.75, marginTop: 4 },
  filterWrap: { backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF',
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#1A1A1A' },
  grid: { padding: 12, paddingBottom: 32 },
  row: { gap: 12 },
  productCard: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  productImage: { width: '100%', height: 130 },
  imageFallback: { backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  productInfo: { padding: 10, gap: 4 },
  productName: { fontSize: 13, fontWeight: '700', color: colors.text },
  productDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { fontSize: 14, fontWeight: '800', color: colors.gold },
  buyChip: { backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  buyChipText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 16 },
  subText: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  // Detail
  detailImage: { width: '100%', height: 230 },
  detailBody: { padding: 16, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  detailPrice: { fontSize: 18, fontWeight: '800', color: colors.gold },
  descBox: { backgroundColor: '#F9F5FF', borderRadius: 12, padding: 14 },
  descLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  descText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 14, marginTop: 8,
  },
  buyBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
});
