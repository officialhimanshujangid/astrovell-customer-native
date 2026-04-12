import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAstromallProducts,
  fetchPujaCategories,
  fetchBlogs,
  imgUrl,
} from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const { width } = Dimensions.get('window');
const CARD_W = (width - 40 - 12) / 2 - 6;

const ALL_MENU_ROWS = [
  { icon: '🔮', label: 'Talk to Astrologer', sub: 'Live chat & call', tab: 'Chat', permKey: 'menu_talk_to_astrologer', featureKey: 'chat' },
  { icon: '📜', label: 'Kundali Matching', sub: 'Compatibility report', action: 'KundaliMatching', permKey: 'menu_kundali_matching', featureKey: 'kundali_matching' },
  { icon: '📅', label: "Today's Panchang", sub: 'Muhurat & tithi', tab: 'Panchang', permKey: 'menu_panchang', featureKey: 'panchang' },
  { icon: '♋', label: 'Daily Horoscope', sub: 'Read your zodiac', action: 'Horoscope', permKey: 'menu_horoscope', featureKey: 'horoscope' },
  { icon: '💎', label: 'Gemstone Advisor', sub: 'Find your lucky stone', permKey: 'menu_gemstone_advisor', featureKey: 'gemstone_advisor' },
  { icon: '🧿', label: 'Vastu Tips', sub: 'Harmony at home', permKey: 'menu_vastu_tips', featureKey: 'vastu_tips' },
  { icon: '🌐', label: 'Free Kundali', sub: 'Generate birth chart', action: 'FreeKundali', permKey: 'menu_free_kundali', featureKey: 'free_kundali' },
  { icon: '🎁', label: 'Refer & Earn', sub: 'Invite friends', permKey: 'menu_refer_and_earn', featureKey: 'refer_and_earn' },
  { icon: '🛎️', label: 'Help & Support', sub: 'FAQs & contact us', permKey: 'menu_help_support', featureKey: 'help_support' },
];

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MenuScreen = ({ onBlogPress, onTabPress, onHoroscopePress, onKundaliPress, onMatchingPress, onWalletPress }) => {
  const dispatch = useDispatch();
  const {
    astromallProducts, astromallLoad,
    pujaCategories, pujaLoad,
    blogs, blogsLoad,
  } = useSelector((s) => s.home);
  const { walletBalance, settings } = useSelector((s) => s.auth);
  const { can } = usePermissions();

  useEffect(() => {
    dispatch(fetchAstromallProducts());
    dispatch(fetchPujaCategories());
    dispatch(fetchBlogs());
  }, []);

  const MENU_ROWS = ALL_MENU_ROWS.filter(item => can(item.permKey) && (!item.featureKey || can(item.featureKey)));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSub}>All services at your fingertips</Text>
        </View>
        {can('menu_wallet_button') && can('wallet') && (
          <TouchableOpacity style={styles.walletBtn} activeOpacity={0.8} onPress={onWalletPress}>
            <Text style={styles.walletEmoji}>💰</Text>
            <Text style={styles.walletBalance}>
              {settings?.currencySymbol || '₹'}{walletBalance.toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Promo Banner */}
        {can('menu_promo_banner') && (
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <Text style={styles.bannerTag}>✨ NEW USER OFFER</Text>
              <Text style={styles.bannerTitle}>First Chat FREE</Text>
              <Text style={styles.bannerSub}>Talk at ₹0 for 5 minutes</Text>
              <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.85}>
                <Text style={styles.bannerBtnText}>Claim Now →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bannerEmoji}>🌟</Text>
          </View>
        )}

        {/* Services Grid */}
        <Text style={styles.sectionTitle}>Our Services</Text>
        <View style={styles.grid}>
          {MENU_ROWS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuCard}
              activeOpacity={0.8}
              onPress={() => {
                if (item.tab && onTabPress) onTabPress(item.tab);
                else if (item.action === 'Horoscope' && onHoroscopePress) onHoroscopePress();
                else if (item.action === 'FreeKundali' && onKundaliPress) onKundaliPress();
                else if (item.action === 'KundaliMatching' && onMatchingPress) onMatchingPress();
              }}
            >
              <View style={styles.menuIconBg}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Puja Categories */}
        {can('puja') && (
          <>
            <Text style={styles.sectionTitle}>Book a Puja</Text>
            {pujaLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginBottom: 16 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                style={{ marginBottom: 24 }}
              >
                {pujaCategories.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.pujaCard} activeOpacity={0.85}>
                    {p.image ? (
                      <Image source={{ uri: imgUrl(p.image) }} style={styles.pujaImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.pujaImg, styles.pujaFallback]}>
                        <Text style={{ fontSize: 30 }}>🪔</Text>
                      </View>
                    )}
                    <Text style={styles.pujaName} numberOfLines={2}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Astromall */}
        {can('menu_astromall') && can('astromall') && (
          <>
            <Text style={styles.sectionTitle}>Astromall</Text>
            {astromallLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginBottom: 16 }} />
            ) : (
              <View style={styles.productGrid}>
                {astromallProducts.map((prod) => (
                  <TouchableOpacity key={prod.id} style={styles.productCard} activeOpacity={0.85}>
                    {prod.productImage ? (
                      <Image source={{ uri: imgUrl(prod.productImage) }} style={styles.productImg} resizeMode="cover" />
                    ) : (
                      <View style={[styles.productImg, styles.productFallback]}>
                        <Text style={{ fontSize: 32 }}>💎</Text>
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{prod.name}</Text>
                      <Text style={styles.productFeature} numberOfLines={2}>{prod.features}</Text>
                      <View style={styles.productFooter}>
                        <Text style={styles.productPrice}>₹{prod.amount}</Text>
                        <TouchableOpacity style={styles.addCartBtn}>
                          <Text style={styles.addCartText}>+ Cart</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Blogs */}
        {can('menu_blogs') && can('blogs') && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Astrology Blog</Text>
            {blogsLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginBottom: 16 }} />
            ) : (
              <View style={styles.blogList}>
                {blogs.map((blog) => {
                  const imageUri = imgUrl(blog.blogImage || blog.previewImage);
                  return (
                    <TouchableOpacity key={blog.id} style={styles.blogCard} onPress={() => onBlogPress && onBlogPress(blog)} activeOpacity={0.85}>
                      {/* Image */}
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.blogImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.blogImg, styles.blogFallback]}>
                          <Text style={{ fontSize: 28 }}>📖</Text>
                        </View>
                      )}
                      {/* Info */}
                      <View style={styles.blogBody}>
                        <Text style={styles.blogDate}>{fmtDate(blog.postedOn)}</Text>
                        <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                        <Text style={styles.blogDesc} numberOfLines={2}>
                          {stripHtml(blog.description)}
                        </Text>
                        <View style={styles.blogMeta}>
                          <Text style={styles.blogAuthor}>✍️ {blog.author || 'Astrovell'}</Text>
                          {blog.viewer ? (
                            <Text style={styles.blogViewer}>👁 {blog.viewer}</Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  walletEmoji: { fontSize: 13, marginRight: 6 },
  walletBalance: { color: colors.gold, fontSize: 14, fontWeight: '800' },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  // Promo banner
  banner: { backgroundColor: 'rgba(124,58,237,0.22)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  bannerLeft: { flex: 1 },
  bannerTag: { color: colors.purpleLight, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  bannerTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  bannerSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  bannerBtn: { alignSelf: 'flex-start', backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  bannerBtnText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  bannerEmoji: { fontSize: 56 },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },

  // Services grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  menuCard: { width: CARD_W, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  menuIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  menuIcon: { fontSize: 22 },
  menuLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  menuSub: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },

  // Puja
  pujaCard: { width: 150, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pujaImg: { width: '100%', height: 90 },
  pujaFallback: { backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  pujaName: { color: colors.text, fontSize: 12, fontWeight: '600', padding: 10, lineHeight: 16 },

  // Products
  productGrid: { gap: 12, marginBottom: 8 },
  productCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  productImg: { width: 100, height: 100 },
  productFallback: { backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, padding: 12 },
  productName: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  productFeature: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  addCartBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addCartText: { color: colors.primary, fontSize: 12, fontWeight: '800' },

  // Blogs
  blogList: { gap: 14, marginBottom: 8 },
  blogCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', flexDirection: 'row' },
  blogImg: { width: 100, height: 110 },
  blogFallback: { backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  blogBody: { flex: 1, padding: 12 },
  blogDate: { color: colors.textMuted, fontSize: 10, marginBottom: 4 },
  blogTitle: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  blogDesc: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginBottom: 6 },
  blogMeta: { flexDirection: 'row', gap: 12 },
  blogAuthor: { color: colors.textMuted, fontSize: 10 },
  blogViewer: { color: colors.textMuted, fontSize: 10 },
});
