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
  TextInput,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import { colors } from '../theme/colors';
import {
  fetchHoroscopeSign,
  fetchPujaCategories,
  fetchBanners,
  fetchBlogs,
  imgUrl,
  fetchAstrologers,
} from '../store/slices/homeSlice';
import { setGlobalLang } from '../store/slices/authSlice';
import { fetchPanchang } from '../store/slices/panchangSlice';
import usePermissions from '../hooks/usePermissions';

const { width } = Dimensions.get('window');
const BANNER_H = 160;

// Strip HTML tags
const stripHtml = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// Format date
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Quick Service Circle Item (AstroTalk style) ──────────────────────────────
const QuickServiceItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.quickCircle}>
      {icon}
    </View>
    <Text style={styles.quickLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

// ─── Banner Carousel ─────────────────────────────────────────────────────────
const BannerCarousel = ({ banners }) => {
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const validBanners = banners.filter((b) => b.bannerImage);

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

  if (validBanners.length === 0) {
    // AstroTalk style fallback CTA banner
    return (
      <View style={styles.ctaBanner}>
        <View style={styles.ctaBannerImageSide}>
          <Text style={{ fontSize: 72 }}>🧘‍♂️</Text>
        </View>
        <View style={styles.ctaBannerTextSide}>
          <Text style={styles.ctaBannerTitle}>What will my future be{'\n'}in the next 5 years?</Text>
          <Text style={styles.ctaBannerSub}>Ask Astrologer</Text>
          <TouchableOpacity style={styles.ctaChatNowBtn}>
            <Text style={styles.ctaChatNowText}>Chat Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          </TouchableOpacity>
        ))}
      </ScrollView>
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

// ─── Live Astrologer Card (AstroTalk grid style) ─────────────────────────────
const LiveAstrologerCard = ({ item, onPress, onChatPress }) => {
  const avatarUri = imgUrl(item.profileImage);
  const charge    = parseFloat(item.charge || 0);
  const isCelebrity = !!(item.isCelebrity || item.celebrity);
  return (
    <TouchableOpacity style={styles.liveCard} onPress={() => onPress(item)} activeOpacity={0.88}>
      {/* Diagonal celebrity ribbon */}
      {isCelebrity && (
        <View style={styles.liveRibbonWrap} pointerEvents="none">
          <View style={styles.liveRibbon}>
            <Text style={styles.liveRibbonText}>*celebrity*</Text>
          </View>
        </View>
      )}

      {/* Circular avatar with gold ring */}
      <View style={styles.liveAvatarRing}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.liveAvatar} resizeMode="cover" />
        ) : (
          <View style={[styles.liveAvatar, styles.liveAvatarFallback]}>
            <Ionicons name="person" size={34} color={colors.gold} />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.liveCardName} numberOfLines={1}>{item.name}</Text>

      {/* Price */}
      <Text style={styles.liveCardPrice}>₹ {charge}/min</Text>

      {/* Chat button */}
      <TouchableOpacity style={styles.liveChatBtn} onPress={() => onChatPress(item)} activeOpacity={0.85}>
        <Text style={styles.liveChatBtnText}>Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── My Session Card ─────────────────────────────────────────────────────────
const SessionCard = ({ item, onPress }) => {
  const avatarUri = imgUrl(item.profileImage);
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionAvatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.sessionAvatar} resizeMode="cover" />
        ) : (
          <View style={[styles.sessionAvatar, styles.sessionAvatarFallback]}>
            <Ionicons name="person" size={22} color={colors.gold} />
          </View>
        )}
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionName}>{item.astrologerName || item.name || 'Astrologer'}</Text>
        <Text style={styles.sessionDate}>{fmtDate(item.created_at || item.date)}</Text>
        <View style={styles.sessionStatusRow}>
          <View style={[styles.sessionStatus, { backgroundColor: item.chatStatus === 'Completed' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.sessionStatusText, { color: item.chatStatus === 'Completed' ? colors.success : colors.warning }]}>
              {item.chatStatus || 'Chat'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const HomeScreen = ({
  onChatPress,
  onCallPress,
  onBlogPress,
  onBlogListPress,
  onBlogSeeAll,
  onPujaPress,
  onHoroscopePress,
  onWalletPress,
  onMenuPress,
  onProfilePress,
  onKundaliPress,
  onMatchingPress,
  onAstrologerSearch,
  onAstrologerPress,  // open AstrologerDetailScreen
}) => {
  const dispatch = useDispatch();
  const { user, settings, walletBalance, globalLang } = useSelector((s) => s.auth);
  const {
    horoscopeSigns, signsLoad,
    pujaCategories,
    banners, bannersLoad,
    blogs, blogsLoad,
    astrologers, astrologersLoad,
  } = useSelector((s) => s.home);
  const { can } = usePermissions();

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  useEffect(() => {
    dispatch(fetchHoroscopeSign());
    dispatch(fetchPujaCategories());
    dispatch(fetchBanners());
    dispatch(fetchBlogs());
    dispatch(fetchAstrologers());
  }, []);

  useEffect(() => {
    dispatch(fetchPanchang({ lang: globalLang }));
  }, [globalLang]);

  const liveAstrologers = astrologers.filter((a) => a.chatStatus === 'Online').slice(0, 6);
  const allDisplayAstros = liveAstrologers.length > 0 ? liveAstrologers : astrologers.slice(0, 6);
  const previewBlogs = blogs.slice(0, 4);
  const currencySymbol = settings?.currencySymbol || '₹';
  const firstName = user?.name?.split(' ')[0] || 'User';

  // ── Search filtering ──────────────────────────────────────────────────────
  const searchQuery = search.trim().toLowerCase();
  const searchResults = searchQuery.length > 0
    ? astrologers.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(searchQuery) ||
        (a.primarySkill || '').toLowerCase().includes(searchQuery) ||
        (a.allSkill || '').toLowerCase().includes(searchQuery)
    ).slice(0, 8)
    : [];
  const showSearchResults = searchResults.length > 0 && searchFocused;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* ── AstroTalk-style White Header ── */}
      <View style={styles.header}>
        {/* Left: Avatar + greeting */}
        <TouchableOpacity style={styles.headerLeft} onPress={onMenuPress} activeOpacity={0.8}>
          <View style={styles.headerAvatar}>
            <Ionicons name="person-outline" size={20} color="#555" />
          </View>
          <Text style={styles.headerGreeting}>Hi {firstName}</Text>
        </TouchableOpacity>

        {/* Right: Wallet + Language + Avatar */}
        <View style={styles.headerRight}>
          {/* Wallet Pill */}
          {can('wallet') && (
            <TouchableOpacity
              style={styles.walletPill}
              onPress={onWalletPress}
              activeOpacity={0.85}
            >
              <View style={styles.walletPillInner}>
                <Ionicons name="calendar-outline" size={11} color={colors.headerText} />
                <Text style={styles.walletPillText}>
                  {currencySymbol}{walletBalance?.toLocaleString('en-IN') || '0'}
                </Text>
                <View style={styles.addBtn}>
                  <Ionicons name="add" size={12} color="#1A1A1A" />
                </View>
              </View>
              <View style={styles.cashbackBadge}>
                <Text style={styles.cashbackText}>Recharge</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Language Toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowLangModal(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="translate" size={20} color="#555" />
          </TouchableOpacity>

          {/* User Avatar - opens profile */}
          <TouchableOpacity style={styles.userAvatarCircle} onPress={onProfilePress} activeOpacity={0.8}>
            <Ionicons name="person" size={18} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Results Overlay ── */}
      {showSearchResults && (
        <View style={styles.searchDropdown}>
          {searchResults.map((a) => {
            const avatarUri = imgUrl(a.profileImage);
            const isOnline = a.chatStatus === 'Online';
            return (
              <TouchableOpacity
                key={a.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearch('');
                  setSearchFocused(false);
                  onAstrologerSearch && onAstrologerSearch(a);
                }}
                activeOpacity={0.8}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.searchAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.searchAvatar, styles.searchAvatarFallback]}>
                    <Ionicons name="person" size={16} color={colors.gold} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultName}>{a.name}</Text>
                  <Text style={styles.searchResultSkill} numberOfLines={1}>
                    {a.primarySkill || a.allSkill || 'Astrologer'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.searchOnlineDot,
                    { backgroundColor: isOnline ? colors.success : '#DDD' },
                  ]}
                />
                <Text style={[styles.searchStatusText, { color: isOnline ? colors.success : colors.textMuted }]}>
                  {a.chatStatus || 'Offline'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search Bar ── */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={16} color={searchFocused ? colors.gold : colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search astrologers by name or skill…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setSearchFocused(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick Services Row (Yellow Circles) ── */}
        <View style={styles.quickServicesRow}>
          {can('horoscope') && (
            <QuickServiceItem
              label="Daily Horoscope"
              icon={<MaterialCommunityIcons name="white-balance-sunny" size={26} color="#1A1A1A" />}
              onPress={() => onHoroscopePress && onHoroscopePress(horoscopeSigns[0])}
            />
          )}
          {can('free_kundali') && (
            <QuickServiceItem
              label="Free Kundli"
              icon={<MaterialCommunityIcons name="shape-outline" size={26} color="#1A1A1A" />}
              onPress={() => onKundaliPress && onKundaliPress()}
            />
          )}
          {can('kundali_matching') && (
            <QuickServiceItem
              label="Kundli Matching"
              icon={<MaterialCommunityIcons name="ring" size={26} color="#1A1A1A" />}
              onPress={() => onMatchingPress && onMatchingPress()}
            />
          )}
          {can('blogs') && (
            <QuickServiceItem
              label="Astrology Blog"
              icon={<FontAwesome5 name="book-open" size={22} color="#1A1A1A" />}
              onPress={() => onBlogListPress && onBlogListPress()}
            />
          )}
        </View>

        {/* ── Banner Carousel ── */}
        {can('home_banner_carousel') && (
          bannersLoad ? (
            <View style={[styles.ctaBannerWrap, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : (
            banners.length > 0
              ? <BannerCarousel banners={banners} />
              : (
                // AstroTalk-style white card with astrologer image
                <View style={styles.ctaBannerWrap}>
                  <View style={styles.ctaBanner}>
                    <View style={styles.ctaBannerImageSide}>
                      <Text style={{ fontSize: 72 }}>🧘‍♂️</Text>
                    </View>
                    <View style={styles.ctaBannerTextSide}>
                      <Text style={styles.ctaBannerTitle}>
                        What will my future be{'\n'}in the next 5 years?
                      </Text>
                      <Text style={styles.ctaBannerSub}>Ask Astrologer</Text>
                      <TouchableOpacity style={styles.ctaChatNowBtn} onPress={onChatPress} activeOpacity={0.85}>
                        <Text style={styles.ctaChatNowText}>Chat Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
          )
        )}

        {/* ── Live Astrologers ── */}
        {can('chat') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Astrologers</Text>
              <TouchableOpacity onPress={onChatPress} activeOpacity={0.8}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {astrologersLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.liveScroll}
              >
                {allDisplayAstros.map((a) => (
                  <LiveAstrologerCard
                    key={a.id}
                    item={a}
                    onPress={(astro) => {
                      if (onAstrologerPress) onAstrologerPress(astro);
                      else if (onAstrologerSearch) onAstrologerSearch(astro);
                    }}
                    onChatPress={(astro) => {
                      if (onAstrologerSearch) onAstrologerSearch(astro);
                      else if (onChatPress) onChatPress();
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── My Sessions ── */}
        {/* {can('chat') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Sessions</Text>
              <TouchableOpacity onPress={onChatPress} activeOpacity={0.8}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionsScroll}
            >
              {astrologers.slice(0, 5).map((a, i) => (
                <SessionCard key={a.id || i} item={a} onPress={onChatPress} />
              ))}
            </ScrollView>
          </View>
        )}  */}

        {/* ── Puja Categories ── */}
        {can('puja') && pujaCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Book a Puja</Text>
              <TouchableOpacity onPress={onPujaPress} activeOpacity={0.8}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pujaScroll}
            >
              {pujaCategories.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pujaCard}
                  onPress={onPujaPress}
                  activeOpacity={0.85}
                >
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
          </View>
        )}

        {/* ── Latest Blogs ── */}
        {can('blogs') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest from blog</Text>
              <TouchableOpacity onPress={onBlogSeeAll} activeOpacity={0.8}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {blogsLoad ? (
              <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.blogScroll}
              >
                {previewBlogs.map((blog) => {
                  const imageUri = imgUrl(blog.blogImage || blog.previewImage);
                  return (
                    <TouchableOpacity
                      key={blog.id}
                      style={styles.blogCard}
                      onPress={() => onBlogPress && onBlogPress(blog)}
                      activeOpacity={0.85}
                    >
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.blogImg} resizeMode="cover" />
                      ) : (
                        <View style={[styles.blogImg, styles.blogImgFallback]}>
                          <MaterialCommunityIcons name="newspaper" size={28} color={colors.gold} />
                        </View>
                      )}
                      <View style={styles.blogViewBadge}>
                        <Feather name="eye" size={10} color="#fff" />
                        <Text style={styles.blogViewCount}>{blog.viewer || '1k'}</Text>
                      </View>
                      <View style={styles.blogBody}>
                        <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
                        <Text style={styles.blogAuthor} numberOfLines={1}>
                          {blog.author || 'Astrologer'}{blog.postedOn ? '  ·  ' + fmtDate(blog.postedOn) : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating Bottom CTA Buttons (AstroTalk style) ── */}
      {can('chat') && (
        <View style={styles.floatingCTA}>
          <TouchableOpacity style={styles.ctaChat} onPress={onChatPress} activeOpacity={0.9}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#1A1A1A" style={{ marginRight: 6 }} />
            <Text style={styles.ctaText}>Chat with Astrologer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaCall} onPress={onCallPress} activeOpacity={0.9}>
            <Ionicons name="call" size={16} color="#1A1A1A" style={{ marginRight: 6 }} />
            <Text style={styles.ctaText}>Call with Astrologer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Language Selection Modal ── */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.langSheet}>
            <View style={styles.langHeader}>
              <Text style={styles.langTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.langOptions}>
              <TouchableOpacity
                style={[styles.langOpt, globalLang === 'en' && styles.langOptActive]}
                onPress={() => { dispatch(setGlobalLang('en')); setShowLangModal(false); }}
                activeOpacity={0.85}
              >
                <View style={styles.langOptLeft}>
                  <Text style={styles.langIcon}>A</Text>
                  <Text style={[styles.langText, globalLang === 'en' && { color: '#1A1A1A', fontWeight: '700' }]}>English</Text>
                </View>
                {globalLang === 'en' && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOpt, globalLang === 'hi' && styles.langOptActive]}
                onPress={() => { dispatch(setGlobalLang('hi')); setShowLangModal(false); }}
                activeOpacity={0.85}
              >
                <View style={styles.langOptLeft}>
                  <Text style={styles.langIcon}>आ</Text>
                  <Text style={[styles.langText, globalLang === 'hi' && { color: '#1A1A1A', fontWeight: '700' }]}>Hindi</Text>
                </View>
                {globalLang === 'hi' && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.secondary },

  // ── White Header (AstroTalk style) ───────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 44,
    paddingBottom: 10,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Wallet pill (yellow, AstroTalk style)
  walletPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 2,
  },
  walletPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  walletPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  addBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  cashbackBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  cashbackText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.goldBg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingBottom: 16 },

  // ── Search Bar ───────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBarFocused: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    shadowOpacity: 0.08,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },

  // ── Search Dropdown ──────────────────────────────────────────────────────
  searchDropdown: {
    position: 'absolute',
    top: 120,   // below header + search bar
    left: 14,
    right: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 999,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  searchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  searchAvatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  searchResultSkill: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  searchOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ── Quick Services (Yellow Circles) ──────────────────────────────────────
  quickServicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  quickItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  quickCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  quickLabel: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── CTA Banner ────────────────────────────────────────────────────────────
  carouselWrap: { height: BANNER_H, backgroundColor: colors.primary },
  bannerSlide: { width, height: BANNER_H },
  bannerImg: { width: '100%', height: '100%' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
    backgroundColor: colors.primary,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DDD' },
  dotActive: { width: 18, backgroundColor: colors.gold },

  ctaBannerWrap: {
    marginHorizontal: 14,
    marginVertical: 12,
  },
  ctaBanner: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 130,
  },
  ctaBannerImageSide: {
    backgroundColor: colors.gold,
    width: 110,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  ctaBannerTextSide: {
    flex: 1,
    padding: 16,
  },
  ctaBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  ctaBannerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  ctaChatNowBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  ctaChatNowText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  viewAll: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '600',
  },

  // ── Live Astrologers (AstroTalk grid card style) ─────────────────────────
  liveScroll: { paddingHorizontal: 10, paddingVertical: 4, gap: 10 },
  liveCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },

  // Diagonal celebrity ribbon in top-left
  liveRibbonWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    overflow: 'hidden',
    zIndex: 10,
  },
  liveRibbon: {
    position: 'absolute',
    top: 14,
    left: -26,
    width: 90,
    backgroundColor: '#1A1A1A',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    paddingVertical: 4,
  },
  liveRibbonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  // Circular avatar with thick gold ring
  liveAvatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  liveAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  liveAvatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 3,
  },
  liveCardPrice: {
    fontSize: 12,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 10,
  },
  // Green-bordered Chat button
  liveChatBtn: {
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 7,
    alignItems: 'center',
  },
  liveChatBtnText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Sessions ─────────────────────────────────────────────────────────────
  sessionsScroll: { paddingHorizontal: 14, gap: 12 },
  sessionCard: {
    width: 220,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionAvatarWrap: { position: 'relative' },
  sessionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  sessionAvatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3 },
  sessionDate: { fontSize: 10, color: colors.textMuted, marginBottom: 6 },
  sessionStatusRow: { flexDirection: 'row' },
  sessionStatus: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sessionStatusText: { fontSize: 10, fontWeight: '700' },

  // ── Puja ──────────────────────────────────────────────────────────────────
  pujaScroll: { paddingHorizontal: 14, gap: 12 },
  pujaCard: {
    width: 120,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
  },
  pujaImage: { width: '100%', height: 90 },
  pujaImageFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pujaName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    padding: 8,
    lineHeight: 16,
  },

  // ── Blog (horizontal scroll, large card) ─────────────────────────────────
  blogScroll: { paddingHorizontal: 14, gap: 12 },
  blogCard: {
    width: 180,
    backgroundColor: colors.primary,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  blogImg: { width: '100%', height: 110 },
  blogImgFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blogViewBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  blogViewCount: { color: '#FFF', fontSize: 9, fontWeight: '600' },
  blogBody: { padding: 10 },
  blogTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  blogAuthor: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // ── Floating CTA ─────────────────────────────────────────────────────────
  floatingCTA: {
    position: 'absolute',
    bottom: 70,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 10,
  },
  ctaChat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 28,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: 28,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '800',
  },
  // Language Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  langSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  langHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  langTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  langOptions: { gap: 12 },
  langOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  langOptActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  langOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langIcon: { fontSize: 22, color: colors.goldDark, fontWeight: '600' },
  langText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
});
