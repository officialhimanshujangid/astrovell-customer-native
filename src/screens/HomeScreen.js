import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../theme/colors';
import {
  fetchHoroscopeSign,
  fetchPujaCategories,
  fetchBanners,
  fetchBlogs,
  imgUrl,
} from '../store/slices/homeSlice';
import { setGlobalLang } from '../store/slices/authSlice';
import { fetchPanchang } from '../store/slices/panchangSlice';
import { fetchDailyHoroscope } from '../store/slices/horoscopeSlice';
import usePermissions from '../hooks/usePermissions';

const { width } = Dimensions.get('window');
const BANNER_H = 180;

const SIGN_EMOJI = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_NAMES_HI = {
  aries: 'मेष', taurus: 'वृषभ', gemini: 'मिथुन', cancer: 'कर्क',
  leo: 'सिंह', virgo: 'कन्या', libra: 'तुला', scorpio: 'वृश्चिक',
  sagittarius: 'धनु', capricorn: 'मकर', aquarius: 'कुंभ', pisces: 'मीन',
};

// Strip HTML tags from blog description
const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// Format date
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Banner Carousel ─────────────────────────────────────────────────────────

const BannerCarousel = ({ banners }) => {
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const validBanners = banners.filter(b => b.bannerImage);

  useEffect(() => {
    if (validBanners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % validBanners.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [validBanners.length]);

  if (validBanners.length === 0) return null;

  return (
    <View style={styles.carouselWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCurrent((p) => {
              const next = (p + 1) % validBanners.length;
              scrollRef.current?.scrollTo({ x: next * width, animated: true });
              return next;
            });
          }, 3500);
        }}
      >
        {validBanners.map((b) => (
          <TouchableOpacity key={b.id} activeOpacity={0.95} style={styles.bannerSlide}>
            <Image
              source={{ uri: imgUrl(b.bannerImage) }}
              style={styles.bannerImg}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerTypeBadge}>
                <Text style={styles.bannerTypeText}>{b.bannerType}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      {validBanners.length > 1 && (
        <View style={styles.dots}>
          {validBanners.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Panchang Widget ─────────────────────────────────────────────────────────

const fmtTime = (str) => {
  if (!str) return '—';
  const m = str.match(/\d+:\d+:\d+\s+[AP]M/i);
  return m ? m[0] : str;
};

const PanchangWidget = ({ data, loading, onPress }) => {
  if (loading && !data) {
    return (
      <View style={styles.panchangWidget}>
        <View style={styles.panchangWidgetHeader}>
          <Text style={styles.panchangWidgetEmoji}>📅</Text>
          <Text style={styles.panchangWidgetTitle}>आज का पंचांग</Text>
        </View>
        <ActivityIndicator color={colors.gold} style={{ marginVertical: 12 }} />
      </View>
    );
  }
  if (!data) return null;

  const ad = data.advanced_details || {};
  const masa = ad.masa || {};
  const abhijit = ad.abhijit_muhurta || {};

  return (
    <TouchableOpacity style={styles.panchangWidget} onPress={onPress} activeOpacity={0.88}>
      {/* Header */}
      <View style={styles.panchangWidgetHeader}>
        <Text style={styles.panchangWidgetEmoji}>📅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.panchangWidgetTitle}>आज का पंचांग</Text>
          <Text style={styles.panchangWidgetDate}>{data.date || ''}</Text>
        </View>
        <View style={styles.panchangPakshaBadge}>
          <Text style={styles.panchangPakshaText}>{masa.paksha || ''}</Text>
        </View>
      </View>

      {/* 2×2 grid info */}
      <View style={styles.panchangGrid}>
        <View style={styles.panchangCell}>
          <Text style={styles.panchangCellLabel}>🌕 तिथि</Text>
          <Text style={styles.panchangCellValue} numberOfLines={1}>{data.tithi?.name || '—'}</Text>
          <Text style={styles.panchangCellSub}>{data.tithi?.type || ''}</Text>
        </View>
        <View style={[styles.panchangCell, styles.panchangCellRight]}>
          <Text style={styles.panchangCellLabel}>⭐ नक्षत्र</Text>
          <Text style={styles.panchangCellValue} numberOfLines={1}>{data.nakshatra?.name || '—'}</Text>
          <Text style={styles.panchangCellSub}>पद {data.nakshatra?.pada || ''}</Text>
        </View>
        <View style={[styles.panchangCell, styles.panchangCellBottom]}>
          <Text style={styles.panchangCellLabel}>☀️ सूर्योदय</Text>
          <Text style={styles.panchangCellValue}>{ad.sun_rise || '—'}</Text>
        </View>
        <View style={[styles.panchangCell, styles.panchangCellRight, styles.panchangCellBottom]}>
          <Text style={styles.panchangCellLabel}>🔴 राहु काल</Text>
          <Text style={[styles.panchangCellValue, { color: colors.error, fontSize: 11 }]} numberOfLines={1}>{data.rahukaal || '—'}</Text>
        </View>
      </View>

      {/* Footer CTA */}
      <View style={styles.panchangFooter}>
        <Text style={styles.panchangFooterText}>योग: {data.yoga?.name}  ·  करण: {data.karana?.name}</Text>
        <Text style={styles.panchangFooterCta}>पूरा पंचांग देखें →</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

const HomeScreen = ({ onChatPress, onBlogPress, onBlogSeeAll, onPujaPress, onPanchangPress, onHoroscopePress, onWalletPress }) => {
  const dispatch = useDispatch();
  const { user, settings, walletBalance, globalLang } = useSelector((s) => s.auth);
  const {
    horoscopeSigns, signsLoad,
    pujaCategories,
    banners, bannersLoad,
    blogs, blogsLoad,
  } = useSelector((s) => s.home);
  const { data: panchangData, loading: panchangLoading } = useSelector((s) => s.panchang);

  const {
    daily,
    dailyLoad,
  } = useSelector((s) => s.horoscope);
  const { can } = usePermissions();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedSign = horoscopeSigns[selectedIdx];

  // Fetch initial base data
  useEffect(() => {
    dispatch(fetchHoroscopeSign());
    dispatch(fetchPujaCategories());
    dispatch(fetchBanners());
    dispatch(fetchBlogs());
  }, []);

  // Fetch language dependent data
  useEffect(() => {
    dispatch(fetchPanchang({ lang: globalLang }));
    if (selectedSign) {
      dispatch(fetchDailyHoroscope({
        horoscopeSignId: selectedSign.id,
        langcode: globalLang
      }));
    }
  }, [selectedSign, globalLang]);

  const previewBlogs = blogs.slice(0, 3); // show first 3 on home

  // Safe extract daily data
  const todayHoro = daily?.todayHoroscope?.[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.orbHeader} />
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Namaste 🙏 Welcome to Astrovell</Text>
          <Text style={styles.userName}>
            {user?.name || `+91 ${user?.contactNo || '––'}`}
          </Text>
        </View>
        {can('home_wallet_button') && can('wallet') && (
          <TouchableOpacity style={styles.walletHeaderBtn} activeOpacity={0.8} onPress={onWalletPress}>
            <Text style={styles.walletHeaderEmoji}>💰</Text>
            <Text style={styles.walletHeaderBalance}>
              {settings?.currencySymbol || '₹'}{walletBalance.toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.headerLangBtn}
          onPress={() => dispatch(setGlobalLang(globalLang === 'en' ? 'hi' : 'en'))}
          activeOpacity={0.8}
        >
          <Text style={styles.headerLangIcon}>🌐</Text>
          <Text style={styles.headerLangText}>{globalLang === 'en' ? 'EN' : 'HI'}</Text>
        </TouchableOpacity>

      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Banner Carousel ── */}
        {can('home_banner_carousel') && (
          bannersLoad ? (
            <View style={[styles.carouselWrap, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : (
            <BannerCarousel banners={banners} />
          )
        )}

        {/* ── Panchang Widget ── */}
        {can('home_panchang_widget') && can('panchang') && (
          <>
            <Text style={styles.sectionTitle}>आज का पंचांग</Text>
            <PanchangWidget
              data={panchangData}
              loading={panchangLoading}
              onPress={onPanchangPress}
            />
          </>
        )}

        {/* ── Zodiac Picker ── */}
        {can('home_horoscope_section') && can('horoscope') && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Your Zodiac</Text>
            </View>

            {signsLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginBottom: 20 }} />
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.zodiacScroll}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                >
                  {horoscopeSigns.map((z, i) => {
                    const slugGroup = z.slug?.toLowerCase();
                    const emoji = SIGN_EMOJI[slugGroup] || '⭐';
                    const displayName = (globalLang === 'hi' && SIGN_NAMES_HI[slugGroup]) ? SIGN_NAMES_HI[slugGroup] : z.name;
                    return (
                      <TouchableOpacity
                        key={z.id}
                        onPress={() => setSelectedIdx(i)}
                        style={[styles.zodiacChip, selectedIdx === i && styles.zodiacChipActive]}
                      >
                        <Text style={styles.zodiacChipSign}>{emoji}</Text>
                        <Text style={[styles.zodiacChipName, selectedIdx === i && styles.zodiacChipNameActive]}>
                          {displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedSign && (
                  <View style={styles.zodiacCard}>
                    <View style={styles.zodiacCardHeader}>
                      <Text style={styles.zodiacBigSign}>
                        {SIGN_EMOJI[selectedSign.slug?.toLowerCase()] || '⭐'}
                      </Text>
                      <View>
                        <Text style={styles.zodiacCardName}>
                          {(globalLang === 'hi' && SIGN_NAMES_HI[selectedSign.slug?.toLowerCase()]) ? SIGN_NAMES_HI[selectedSign.slug?.toLowerCase()] : selectedSign.name}
                        </Text>
                        <Text style={styles.zodiacCardSlug}>/{selectedSign.slug}</Text>
                      </View>
                    </View>

                    {dailyLoad ? (
                      <ActivityIndicator color={colors.gold} style={{ padding: 20 }} />
                    ) : (
                      <Text style={[styles.zodiacPrediction, !todayHoro?.bot_response && { color: colors.textMuted }]} numberOfLines={4}>
                        {todayHoro?.bot_response || `Horoscope data currently unavailable for ${selectedSign.name}.`}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.readMoreBtn}
                      onPress={() => onHoroscopePress && onHoroscopePress(selectedSign, todayHoro)}
                    >
                      <Text style={styles.readMoreText}>Read Full Horoscope  →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── Puja Categories ── */}
        {can('puja') && pujaCategories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Book a Puja</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
              style={{ marginBottom: 24 }}
            >
              {pujaCategories.map((p) => (
                <TouchableOpacity key={p.id} style={styles.pujaCard} onPress={onPujaPress} activeOpacity={0.85}>
                  {p.image ? (
                    <Image source={{ uri: imgUrl(p.image) }} style={styles.pujaImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.pujaImage, styles.pujaImageFallback]}>
                      <Text style={{ fontSize: 28 }}>🪔</Text>
                    </View>
                  )}
                  <Text style={styles.pujaName} numberOfLines={2}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Latest Blogs ── */}
        {can('home_blogs_section') && can('blogs') && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Latest Blogs</Text>
              <TouchableOpacity onPress={onBlogSeeAll}><Text style={styles.seeAll}>See All →</Text></TouchableOpacity>
            </View>

            {blogsLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginBottom: 20 }} />
            ) : (
              <View style={styles.blogList}>
                {previewBlogs.map((blog) => {
                  const imageUri = imgUrl(blog.blogImage || blog.previewImage);
                  return (
                    <TouchableOpacity key={blog.id} style={styles.blogCard} onPress={() => onBlogPress && onBlogPress(blog)} activeOpacity={0.85}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.blogImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.blogImg, styles.blogImgFallback]}>
                          <Text style={{ fontSize: 28 }}>📖</Text>
                        </View>
                      )}
                      <View style={styles.blogBody}>
                        <Text style={styles.blogDate}>{fmtDate(blog.postedOn)}</Text>
                        <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                        <Text style={styles.blogDesc} numberOfLines={2}>
                          {stripHtml(blog.description)}
                        </Text>
                        <View style={styles.blogMeta}>
                          <Text style={styles.blogAuthor}>✍️ {blog.author || 'Astrovell'}</Text>
                          {blog.viewer ? <Text style={styles.blogViewer}>👁 {blog.viewer}</Text> : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── CTA ── */}
        {can('home_chat_cta') && can('chat') && (
          <TouchableOpacity style={styles.ctaCard} onPress={onChatPress} activeOpacity={0.9}>
            <View style={styles.ctaLeft}>
              <Text style={styles.ctaTitle}>Talk to an Expert Astrologer</Text>
              <Text style={styles.ctaSubtitle}>First consultation FREE for new users</Text>
              <View style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>Book Now ✨</Text>
              </View>
            </View>
            <Text style={styles.ctaEmoji}>🧙‍♂️</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  orbHeader: { position: 'absolute', right: -60, top: -60, width: 150, height: 150, borderRadius: 75, backgroundColor: colors.gold, opacity: 0.08 },
  headerLeft: { flex: 1 },
  greeting: { color: colors.textSecondary, fontSize: 13 },
  userName: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.goldGlow, borderWidth: 1.5, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20 },

  walletHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  walletHeaderEmoji: { fontSize: 13, marginRight: 4 },
  walletHeaderBalance: { color: colors.gold, fontSize: 13, fontWeight: '800' },

  headerLangBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  headerLangIcon: { fontSize: 13, marginRight: 4 },
  headerLangText: { color: colors.gold, fontSize: 12, fontWeight: '800' },

  scroll: { paddingTop: 0 },

  // ── Banner Carousel ────────────────────────────────────────────────────────
  carouselWrap: { height: BANNER_H, marginBottom: 20, backgroundColor: colors.secondary },
  bannerSlide: { width, height: BANNER_H },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', top: 12, left: 14 },
  bannerTypeBadge: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  bannerTypeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, gap: 6, backgroundColor: colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.gold },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14, marginHorizontal: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 14 },
  seeAll: { color: colors.purpleLight, fontSize: 13, fontWeight: '600' },

  // ── Zodiac ────────────────────────────────────────────────────────────────
  zodiacScroll: { marginBottom: 16 },
  zodiacChip: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, minWidth: 70 },
  zodiacChipActive: { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  zodiacChipSign: { fontSize: 20, marginBottom: 4 },
  zodiacChipName: { color: colors.textMuted, fontSize: 11 },
  zodiacChipNameActive: { color: colors.gold, fontWeight: '700' },
  zodiacCard: { marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
  zodiacCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  zodiacBigSign: { fontSize: 44 },
  zodiacCardName: { color: colors.gold, fontSize: 20, fontWeight: '800' },
  zodiacCardSlug: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  zodiacPrediction: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 16 },
  readMoreBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(245,200,66,0.1)', borderRadius: 8 },
  readMoreText: { color: colors.gold, fontSize: 12, fontWeight: '700' },

  langSelectorRow: { flexDirection: 'row', gap: 6 },
  miniLangBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  miniLangBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  miniLangText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  miniLangTextActive: { color: colors.primary, fontSize: 10, fontWeight: '800' },

  pujaCard: { width: 160, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 4 },
  pujaImage: { width: '100%', height: 100 },
  pujaImageFallback: { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  pujaName: { color: colors.text, fontSize: 12, fontWeight: '600', padding: 10, lineHeight: 17 },
  blogList: { gap: 14, paddingHorizontal: 20, marginBottom: 24 },
  blogCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', flexDirection: 'row' },
  blogImg: { width: 100, height: 110 },
  blogImgFallback: { backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  blogBody: { flex: 1, padding: 12 },
  blogDate: { color: colors.textMuted, fontSize: 10, marginBottom: 4 },
  blogTitle: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 4 },
  blogDesc: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginBottom: 6 },
  blogMeta: { flexDirection: 'row', gap: 12 },
  blogAuthor: { color: colors.textMuted, fontSize: 10 },
  blogViewer: { color: colors.textMuted, fontSize: 10 },

  // ── CTA ──────────────────────────────────────────────────────────────────
  ctaCard: { marginHorizontal: 20, backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: colors.borderGold, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaLeft: { flex: 1 },
  ctaTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4, lineHeight: 22 },
  ctaSubtitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 14 },
  ctaButton: { alignSelf: 'flex-start', backgroundColor: colors.gold, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  ctaButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  ctaEmoji: { fontSize: 52, marginLeft: 10 },

  // ── Panchang Widget ────────────────────────────────────────────────────────
  panchangWidget: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
    overflow: 'hidden',
    marginBottom: 24,
  },
  panchangWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(245,200,66,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
  },
  panchangWidgetEmoji: { fontSize: 22 },
  panchangWidgetTitle: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  panchangWidgetDate: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  panchangPakshaBadge: { backgroundColor: 'rgba(124,58,237,0.3)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  panchangPakshaText: { color: colors.purpleLight, fontSize: 10, fontWeight: '700' },

  panchangGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  panchangCell: {
    width: '50%',
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panchangCellRight: { borderRightWidth: 0 },
  panchangCellBottom: { borderBottomWidth: 0 },
  panchangCellLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  panchangCellValue: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  panchangCellSub: { color: colors.purpleLight, fontSize: 10, fontWeight: '600' },

  panchangFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'rgba(245,200,66,0.06)',
  },
  panchangFooterText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  panchangFooterCta: { color: colors.gold, fontSize: 12, fontWeight: '700' },
});
