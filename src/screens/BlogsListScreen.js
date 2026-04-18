import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { fetchBlogs, imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const stripHtml = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// ─── Blog Row Item ─────────────────────────────────────────────────────────────
const BlogItem = ({ blog, onPress }) => {
  const imageUri = imgUrl(blog.blogImage || blog.previewImage);
  return (
    <TouchableOpacity style={styles.blogCard} onPress={() => onPress(blog)} activeOpacity={0.85}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.blogImg} resizeMode="cover" />
      ) : (
        <View style={[styles.blogImg, styles.blogImgFallback]}>
          <MaterialCommunityIcons name="newspaper" size={32} color={colors.gold} />
        </View>
      )}
      <View style={styles.blogInfo}>
        <Text style={styles.blogTitle} numberOfLines={2}>{blog.title}</Text>
        <Text style={styles.blogExcerpt} numberOfLines={2}>
          {stripHtml(blog.description || blog.content || '')}
        </Text>
        <View style={styles.blogMeta}>
          <Text style={styles.blogAuthor}>{blog.author || 'Astrologer'}</Text>
          {blog.postedOn ? <Text style={styles.blogDate}>· {fmtDate(blog.postedOn)}</Text> : null}
          {blog.viewer ? (
            <View style={styles.viewBadge}>
              <Feather name="eye" size={11} color={colors.textMuted} />
              <Text style={styles.viewCount}>{blog.viewer}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const BlogsListScreen = ({ onBack, onBlogPress }) => {
  const dispatch = useDispatch();
  const { blogs, blogsLoad } = useSelector((s) => s.home);
  const { can } = usePermissions();

  useEffect(() => {
    dispatch(fetchBlogs());
  }, []);

  if (!can('blogs')) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Astrology Blogs</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyText}>Access Restricted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Astrology Blogs</Text>
        <View style={{ width: 40 }} />
      </View>

      {blogsLoad ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading blogs...</Text>
        </View>
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BlogItem blog={item} onPress={onBlogPress} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="newspaper-variant-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>No blogs available</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default BlogsListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },

  list: { padding: 14, gap: 12 },

  blogCard: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blogImg: { width: 100, height: 110 },
  blogImgFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blogInfo: { flex: 1, padding: 12, gap: 4 },
  blogTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  blogExcerpt: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  blogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  blogAuthor: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  blogDate: { fontSize: 11, color: colors.textMuted },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  viewCount: { fontSize: 11, color: colors.textMuted },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  emptyText: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
});
