import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const fmtDate  = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const BlogDetailScreen = ({ blog, onBack }) => {
  if (!blog) return null;

  const imageUri = imgUrl(blog.blogImage || blog.previewImage);
  const body     = stripHtml(blog.description);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTag}>📖 Blog</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero image */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImg} resizeMode="cover" />
        ) : (
          <View style={styles.heroFallback}>
            <Text style={{ fontSize: 52 }}>📖</Text>
          </View>
        )}

        {/* Meta */}
        <View style={styles.meta}>
          <Text style={styles.metaDate}>{fmtDate(blog.postedOn)}</Text>
          {blog.viewer ? <Text style={styles.metaView}>👁 {blog.viewer} views</Text> : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{blog.title}</Text>

        {/* Author */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={{ fontSize: 16 }}>✍️</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{blog.author || 'Astrovell'}</Text>
            <Text style={styles.authorLabel}>Author</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        <Text style={styles.body}>{body || 'Content coming soon…'}</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default BlogDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

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
  },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.purpleLight, fontSize: 15, fontWeight: '600' },
  headerTag:{ color: colors.textMuted, fontSize: 13 },

  scroll: { paddingBottom: 24 },

  heroImg:      { width, height: 220 },
  heroFallback: { width, height: 200, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
  metaDate: { color: colors.textMuted, fontSize: 12 },
  metaView: { color: colors.textMuted, fontSize: 12 },

  title: { color: colors.text, fontSize: 20, fontWeight: '800', lineHeight: 28, paddingHorizontal: 20, marginBottom: 16 },

  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  authorAvatar:{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  authorName:  { color: colors.gold, fontSize: 13, fontWeight: '700' },
  authorLabel: { color: colors.textMuted, fontSize: 11 },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 20 },

  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 26, paddingHorizontal: 20 },
});
