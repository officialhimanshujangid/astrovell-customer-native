import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDailyHoroscope, fetchLanguages, setLang, setSign } from '../store/slices/horoscopeSlice';
import { fetchHoroscopeSign } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';

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

const StatBar = ({ label, value, color }) => {
  const percent = value ? `${value}%` : '0%';
  return (
    <View style={styles.statLine}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValueText, { color }]}>{percent}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: percent, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const HoroscopeScreen = ({ initialSign, onBack }) => {
  const dispatch = useDispatch();

  const { horoscopeSigns, signsLoad } = useSelector((s) => s.home);
  const { languages, daily, dailyLoad, selectedLang, selectedSignId } = useSelector((s) => s.horoscope);

  // Use initialSign ID if passed, otherwise fallback to existing selection or signs[0]
  const currentSignId = selectedSignId || initialSign?.id || horoscopeSigns[0]?.id;
  const activeSign = horoscopeSigns.find(s => s.id === currentSignId);

  useEffect(() => {
    if (!horoscopeSigns.length) {
      dispatch(fetchHoroscopeSign());
    }
    if (!languages.length) {
      dispatch(fetchLanguages());
    }
  }, []);

  useEffect(() => {
    if (currentSignId && selectedLang) {
      dispatch(fetchDailyHoroscope({ horoscopeSignId: currentSignId, langcode: selectedLang }));
    }
  }, [currentSignId, selectedLang]);

  const onSelectSign = (id) => {
    dispatch(setSign(id));
  };

  const todayData = daily?.todayHoroscope?.[0] || {};
  const { 
    bot_response, total_score, lucky_color, lucky_number, date,
    career, family, finances, friends, health, physique, relationship, status, travel
  } = todayData;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Horoscope</Text>
        
        {/* Language Picker */}
        {languages.length > 0 && (
          <View style={styles.langSelectorRow}>
            {languages.map(l => (
              <TouchableOpacity 
                 key={l.id} 
                 onPress={() => dispatch(setLang(l.code))}
                 style={[styles.langBtn, selectedLang === l.code && styles.langBtnActive]}
                 activeOpacity={0.8}
              >
                <Text style={[styles.langText, selectedLang === l.code && styles.langTextActive]}>
                  {l.code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Signs Horizontal Scroll */}
      <View>
        {signsLoad ? (
           <ActivityIndicator color={colors.gold} style={{ paddingVertical: 20 }} />
        ) : (
           <ScrollView
             horizontal
             showsHorizontalScrollIndicator={false}
             style={styles.zodiacScroll}
             contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 16 }}
           >
             {horoscopeSigns.map((z) => {
               const slugGroup = z.slug?.toLowerCase();
               const emoji = SIGN_EMOJI[slugGroup] || '⭐';
               const displayName = (selectedLang === 'hi' && SIGN_NAMES_HI[slugGroup]) ? SIGN_NAMES_HI[slugGroup] : z.name;
               const isActive = z.id === currentSignId;
               return (
                 <TouchableOpacity
                   key={z.id}
                   onPress={() => onSelectSign(z.id)}
                   style={[styles.zodiacChip, isActive && styles.zodiacChipActive]}
                 >
                   <Text style={[styles.zodiacChipSign, isActive && { color: colors.primary }]}>{emoji}</Text>
                   <Text style={[styles.zodiacChipName, isActive && styles.zodiacChipNameActive]}>
                     {displayName}
                   </Text>
                 </TouchableOpacity>
               );
             })}
           </ScrollView>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Active Sign Header */}
        {activeSign && (
           <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
             <View style={styles.bigSignCircle}>
               <Text style={styles.bigSignEmoji}>{SIGN_EMOJI[activeSign.slug?.toLowerCase()] || '⭐'}</Text>
             </View>
             <Text style={styles.signTitleName}>
               {(selectedLang === 'hi' && SIGN_NAMES_HI[activeSign.slug?.toLowerCase()]) ? SIGN_NAMES_HI[activeSign.slug?.toLowerCase()] : activeSign.name}
             </Text>
             <Text style={styles.signTitleDate}>{date || new Date().toLocaleDateString()}</Text>
           </View>
        )}

        {/* Content Loading / Error */}
        {dailyLoad ? (
           <View style={styles.centerLoading}>
             <ActivityIndicator color={colors.gold} size="large" />
             <Text style={styles.loadingText}>Unveiling cosmic secrets...</Text>
           </View>
        ) : (
           <>
             {/* Readout */}
             <View style={styles.summaryCard}>
               <Text style={styles.summaryEmoji}>🔮</Text>
               <Text style={styles.summaryTitle}>Today's Insight</Text>
               <Text style={styles.summaryText}>
                 {bot_response || 'Horoscope data is currently unavailable for this sign in this language.'}
               </Text>
             </View>

             {/* Attributes Grid */}
             {total_score != null && (
               <>
                 <Text style={styles.sectionHeader}>Lucky Traits</Text>
                 <View style={styles.traitsGrid}>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>💯</Text>
                     <Text style={styles.traitVal}>{total_score}%</Text>
                     <Text style={styles.traitLbl}>Score</Text>
                   </View>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>🎨</Text>
                     <Text style={styles.traitVal}>{lucky_color || 'N/A'}</Text>
                     <Text style={styles.traitLbl}>Color</Text>
                   </View>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>🎲</Text>
                     <Text style={styles.traitVal}>{lucky_number || 'N/A'}</Text>
                     <Text style={styles.traitLbl}>Number</Text>
                   </View>
                 </View>

                 <Text style={styles.sectionHeader}>Life Areas</Text>
                 <View style={styles.statsCard}>
                   <StatBar label="Career" value={career} color="#38bdf8" />
                   <StatBar label="Health" value={health} color="#34d399" />
                   <StatBar label="Finances" value={finances} color={colors.gold} />
                   <StatBar label="Relationship" value={relationship} color="#f43f5e" />
                   <StatBar label="Family" value={family} color="#a78bfa" />
                   <StatBar label="Friends" value={friends} color="#fb923c" />
                   <StatBar label="Travel" value={travel} color="#818cf8" />
                   <StatBar label="Physique" value={physique} color="#14b8a6" />
                   <StatBar label="Status" value={status} color="#e879f9" />
                 </View>
               </>
             )}
           </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

    </View>
  );
};

export default HoroscopeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  
  // Header
  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
    backgroundColor: colors.secondary,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    overflow: 'hidden', gap: 12
  },
  headerOrb:  { position: 'absolute', right: -50, top: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.gold, opacity: 0.05 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backArrow:  { color: colors.text, fontSize: 18, fontWeight: '700' },
  headerTitle:{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },

  langSelectorRow: { flexDirection: 'row', gap: 6 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  langBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  langText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  langTextActive: { color: colors.primary, fontSize: 11, fontWeight: '800' },

  zodiacScroll: { paddingTop: 16, backgroundColor: colors.primary },
  zodiacChip: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    width: 68, height: 72,
  },
  zodiacChipActive: { borderColor: colors.gold, backgroundColor: colors.gold, transform: [{ scale: 1.05 }] },
  zodiacChipSign: { fontSize: 22, marginBottom: 4 },
  zodiacChipName: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  zodiacChipNameActive: { color: colors.primary, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 20 },

  bigSignCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,200,66,0.1)', borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bigSignEmoji:  { fontSize: 40 },
  signTitleName: { color: colors.gold, fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  signTitleDate: { color: colors.textMuted, fontSize: 14, marginTop: 4, fontWeight: '600' },

  centerLoading: { alignItems: 'center', marginTop: 60 },
  loadingText: { color: colors.textMuted, fontSize: 14, marginTop: 16 },

  summaryCard: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
    padding: 20, marginBottom: 24
  },
  summaryEmoji: { fontSize: 24, marginBottom: 8 },
  summaryTitle: { color: colors.purpleLight, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  summaryText:  { color: colors.textSecondary, fontSize: 15, lineHeight: 24 },

  sectionHeader: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },

  traitsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  traitBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8
  },
  traitEmoji: { fontSize: 24, marginBottom: 8 },
  traitVal: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
  traitLbl: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },

  statsCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16 },
  statLine: { width: '100%' },
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  statValueText: { fontSize: 13, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
