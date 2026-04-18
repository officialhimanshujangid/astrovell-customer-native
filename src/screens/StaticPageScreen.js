import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, useWindowDimensions
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pageApi } from '../api/services';
import { colors } from '../theme/colors';
import { WebView } from 'react-native-webview';

const FALLBACK_CONTENT = {
  'about-us': `
    <h1>About AstroGuru</h1>
    <p>AstroGuru is India's leading astrology destination, providing accurate and insightful astrological consultations. Founded on the principles of authenticity and customer satisfaction, we bring the wisdom of ancient Vedic astrology to the modern digital age.</p>
    <h2>Our Mission</h2>
    <p>To provide professional, reliable, and accessible astrological guidance to help people navigate through life's challenges with clarity and confidence.</p>
  `,
  'terms-condition': `
    <h1>Terms & Conditions</h1>
    <p>Welcome to AstroGuru. By using our services, you agree to the following terms and conditions:</p>
    <h2>1. General Use</h2>
    <p>Users must provide accurate information. Predictions and reports are based on astronomical calculations and should be used for guidance only.</p>
    <h2>2. Payments</h2>
    <p>Payments for consultations and products are non-refundable except in specific circumstances outlined in our refund policy.</p>
  `,
  'privacy-policy': `
    <h1>Privacy Policy</h1>
    <p>Your privacy is paramount to us. This policy describes how we collect, use, and protect your personal information.</p>
    <h2>Data Collection</h2>
    <p>We collect birth details and contact information necessary to provide accurate astrological services.</p>
    <h2>Data Protection</h2>
    <p>We use industry-standard encryption to protect your data and do not share your personal information with third parties without your consent.</p>
  `,
  'help-support': `
    <h1>Help & Support</h1>
    <p>Need assistance? We're here for you 24/7. Check out our common topics below or contact us directly.</p>
    <h2>FAQs</h2>
    <p><strong>How do I recharge my wallet?</strong><br/>Go to the Wallet section, enter the amount, and choose your preferred payment method.</p>
    <p><strong>How to talk to an astrologer?</strong><br/>Select an astrologer from the Chat or Call tab and click on the 'Start Session' button.</p>
  `
};

const StaticPageScreen = ({ slug, title, onBack }) => {
  const { width } = useWindowDimensions();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pageApi.getPage(slug);
      const data = res.data?.data || res.data?.recordList || res.data;
      const remoteContent = Array.isArray(data) ? data[0]?.content : data?.content;
      
      if (remoteContent) {
        setContent(remoteContent);
      } else {
        setContent(FALLBACK_CONTENT[slug] || '<h1>Information</h1><p>Content is being updated. Please check back later.</p>');
      }
    } catch (err) {
      // If API fails, use fallback if available
      if (FALLBACK_CONTENT[slug]) {
        setContent(FALLBACK_CONTENT[slug]);
      } else {
        setError('Failed to load content and no fallback available.');
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'Information'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading cosmics...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>🔮 {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPage}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ 
            html: `
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                  <style>
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap');
                    body {
                      font-family: 'Outfit', sans-serif;
                      padding: 20px;
                      line-height: 1.6;
                      color: #4A4A4A;
                      background-color: transparent;
                    }
                    h1 { color: #1A1A1A; font-size: 24px; font-weight: 800; margin-bottom: 20px; }
                    h2 { color: #1A1A1A; font-size: 20px; font-weight: 800; margin-top: 30px; margin-bottom: 12px; }
                    h3 { color: #1A1A1A; font-size: 18px; font-weight: 700; margin-top: 24px; margin-bottom: 10px; }
                    p { font-size: 15px; margin-bottom: 18px; }
                    li { font-size: 15px; margin-bottom: 10px; }
                    ul { padding-left: 20px; }
                    strong { color: #1A1A1A; }
                  </style>
                </head>
                <body>
                  ${content}
                  <div style="height: 40px;"></div>
                </body>
              </html>
            ` 
          }}
          style={styles.webview}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default StaticPageScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 48, paddingBottom: 12,
    backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  
  scroll: { padding: 20 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 16, color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.error, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#1A1A1A', fontWeight: '700' },
  
  htmlBase: {
    color: colors.textSecondary,
    fontSize: 15,
  }
});
