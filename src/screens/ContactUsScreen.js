import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { pageApi } from '../api/services';
import { colors } from '../theme/colors';
import Toast from 'react-native-toast-message';

const ContactUsScreen = ({ onBack }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill all required fields.' });
      return;
    }
    
    // Simple email regex
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(form.email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      const res = await pageApi.submitContact(form);
      if (res.data?.status === 200 || res.status === 200) {
        Toast.show({ type: 'success', text1: 'Sent! 📩', text2: 'Your message has been sent successfully.' });
        setForm({ name: '', email: '', phone: '', message: '' });
        // Optionally go back after success
        // setTimeout(onBack, 2000);
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: res.data?.message || 'Failed to send message.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Something went wrong.' });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Get in Touch 👋</Text>
            <Text style={styles.heroSub}>We'd love to hear from you. Our team is here to help.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              placeholder="Your mobile number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.message}
              onChangeText={(t) => setForm({ ...form, message: t })}
              placeholder="How can we help you?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <>
                  <Text style={styles.submitText}>Send Message</Text>
                  <Ionicons name="send" size={18} color="#1A1A1A" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Other Ways to Connect</Text>
            
            <View style={styles.infoItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={20} color={colors.goldDark} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Email Support</Text>
                <Text style={styles.infoVal}>support@astroguru.com</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="call-outline" size={20} color={colors.goldDark} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Call Us</Text>
                <Text style={styles.infoVal}>+91-XXXXXXXXXX</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={20} color={colors.goldDark} />
              </View>
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoVal}>India</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ContactUsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 48, paddingBottom: 12,
    backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  
  scroll: { padding: 20 },
  hero: { marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
  heroSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  card: { backgroundColor: colors.primary, borderRadius: 20, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#F8F8F8', borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: colors.text },
  textArea: { height: 120, paddingTop: 12 },
  
  submitBtn: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#1A1A1A', fontSize: 16, fontWeight: '800' },

  infoSection: { marginTop: 32, paddingBottom: 40 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 20 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 2 },
  infoVal: { fontSize: 15, color: colors.text, fontWeight: '700' },
});
