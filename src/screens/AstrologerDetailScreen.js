import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Alert, TextInput,
  Modal, FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '../components/DateTimePicker';
import {
  astrologerApi, chatApi, callApi, walletApi, giftApi, reportApi, blockAstrologerApi,
} from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';

const DURATION_OPTIONS = [
  { label: '5 min',   value: 5  },
  { label: '10 min',  value: 10 },
  { label: '15 min',  value: 15 },
  { label: '20 min',  value: 20 },
  { label: '25 min',  value: 25 },
  { label: '30 min',  value: 30 },
  { label: '1 hour',  value: 60 },
];

const REPORT_TYPES = ['Kundali', 'Career', 'Marriage', 'Health', 'Finance'];

// ─── Star Widget ──────────────────────────────────────────────────────────────
const StarRating = ({ rating, onRate, editable = false }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => editable && onRate && onRate(n)} disabled={!editable}>
        <Ionicons name="star" size={20} color={n <= rating ? colors.gold : '#DDD'} />
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Intake Modal (chat / call / video) ──────────────────────────────────────
const IntakeModal = ({ visible, astro, intakeType, onClose, onSuccess }) => {
  const { user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: '', phoneNumber: '', gender: '', birthDate: null,
    birthTime: '', birthPlace: '', maritalStatus: '', occupation: '', topicOfConcern: '',
  });
  const [duration, setDuration] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const charge = parseFloat(astro?.charge || 0);

  useEffect(() => {
    if (visible && user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name || '',
        phoneNumber: f.phoneNumber || user.contactNo || '',
      }));
    }
  }, [visible, user]);

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.birthDate || !form.gender || !form.topicOfConcern) {
      Alert.alert('Required', 'Please fill name, gender, date of birth, and topic of concern');
      return;
    }
    setSubmitting(true);
    try {
      const totalCost = charge * duration;
      const balRes = await walletApi.getBalance();
      const wallet = balRes.data?.recordList || balRes.data?.data;
      const balance = parseFloat(wallet?.amount || 0);
      if (balance < totalCost) {
        Alert.alert(
          'Insufficient Balance',
          `You need ₹${totalCost} but have ₹${balance.toFixed(2)}. Please recharge your wallet.`,
        );
        setSubmitting(false);
        return;
      }

      // Save intake form
      await chatApi.addIntakeForm({
        astrologerId: astro.id,
        ...form,
        birthDate: fmtDate(form.birthDate),
        chat_duration: duration * 60,
      });

      // Send chat or call request
      let res;
      if (intakeType === 'chat') {
        res = await chatApi.addRequest({
          astrologerId: astro.id,
          chatRate: charge,
          chat_duration: duration * 60,
        });
      } else {
        res = await callApi.addRequest({
          astrologerId: astro.id,
          callRate: intakeType === 'video' ? (astro.videoCallRate || charge) : charge,
          call_duration: duration * 60,
          call_type: intakeType === 'video' ? 11 : 10,
        });
      }

      if (res.data?.status === 200) {
        const label = intakeType === 'chat' ? 'Chat' : intakeType === 'video' ? 'Video Call' : 'Call';
        Alert.alert('Request Sent!', `${label} request sent successfully. The astrologer will connect with you shortly.`);
        onSuccess && onSuccess(res.data?.recordList?.id || res.data?.callId, intakeType);
        onClose();
      } else {
        Alert.alert('Error', res.data?.message || 'Request failed');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Something went wrong');
    }
    setSubmitting(false);
  };

  const typeLabel = intakeType === 'chat' ? 'Chat' : intakeType === 'video' ? 'Video Call' : 'Call';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.sheetHeader}>
            <Text style={modal.sheetTitle}>{typeLabel} with {astro?.name}</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={modal.sectionLabel}>Your Details</Text>
            <TextInput style={modal.input} placeholder="Full Name *" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
            <TextInput style={modal.input} placeholder="Phone Number" placeholderTextColor={colors.textMuted} value={form.phoneNumber} onChangeText={(t) => setForm({ ...form, phoneNumber: t })} keyboardType="phone-pad" />

            <View style={modal.row}>
              {/* Gender */}
              <View style={[modal.pickerBox, { flex: 1 }]}>
                <Text style={modal.pickerLabel}>Gender *</Text>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity key={g} style={[modal.optChip, form.gender === g && modal.optChipActive]} onPress={() => setForm({ ...form, gender: g })}>
                    <Text style={[modal.optChipText, form.gender === g && { color: '#1A1A1A' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Marital Status */}
              <View style={[modal.pickerBox, { flex: 1 }]}>
                <Text style={modal.pickerLabel}>Marital Status</Text>
                {['Single', 'Married', 'Divorced', 'Widowed'].map((m) => (
                  <TouchableOpacity key={m} style={[modal.optChip, form.maritalStatus === m && modal.optChipActive]} onPress={() => setForm({ ...form, maritalStatus: m })}>
                    <Text style={[modal.optChipText, form.maritalStatus === m && { color: '#1A1A1A' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={modal.pickerLabel}>Date of Birth *</Text>
            <DateTimePicker value={form.birthDate} onChange={(d) => setForm({ ...form, birthDate: d })} mode="date" label="Select date of birth" />
            <TextInput style={modal.input} placeholder="Birth Time (HH:MM)" placeholderTextColor={colors.textMuted} value={form.birthTime} onChangeText={(t) => setForm({ ...form, birthTime: t })} />
            <TextInput style={modal.input} placeholder="Birth Place (City, State)" placeholderTextColor={colors.textMuted} value={form.birthPlace} onChangeText={(t) => setForm({ ...form, birthPlace: t })} />
            <TextInput style={modal.input} placeholder="Occupation" placeholderTextColor={colors.textMuted} value={form.occupation} onChangeText={(t) => setForm({ ...form, occupation: t })} />
            <TextInput
              style={[modal.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Topic of Concern *"
              placeholderTextColor={colors.textMuted}
              value={form.topicOfConcern}
              onChangeText={(t) => setForm({ ...form, topicOfConcern: t })}
              multiline
            />

            <Text style={modal.sectionLabel}>Select Duration</Text>
            <View style={modal.durationGrid}>
              {DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[modal.durBtn, duration === opt.value && modal.durBtnActive]}
                  onPress={() => setDuration(opt.value)}
                >
                  <Text style={[modal.durLabel, duration === opt.value && { color: '#1A1A1A' }]}>{opt.label}</Text>
                  <Text style={[modal.durPrice, duration === opt.value && { color: '#1A1A1A' }]}>
                    ₹{(charge * opt.value).toFixed(0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={modal.totalRow}>
              <Text style={modal.totalText}>Total: <Text style={{ fontWeight: '800', color: colors.gold }}>₹{(charge * duration).toFixed(0)}</Text></Text>
              <Text style={modal.totalSub}>({duration} min × ₹{charge}/min)</Text>
            </View>

            <TouchableOpacity style={[modal.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#1A1A1A" />
                : <Text style={modal.submitText}>Start {typeLabel}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Report Modal ────────────────────────────────────────────────────────────
const ReportModal = ({ visible, astro, onClose }) => {
  const { user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: '', birthDate: null,
    birthTime: '', birthPlace: '', maritalStatus: '', occupation: '',
    comments: '', reportType: 'Kundali',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setForm((f) => ({ ...f, firstName: f.firstName || user.name || '' }));
    }
  }, [visible, user]);

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.gender || !form.birthDate) {
      Alert.alert('Required', 'Please fill first name, gender, and date of birth');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reportApi.addReport({
        ...form,
        birthDate: fmtDate(form.birthDate),
        astrologerId: astro.id,
        reportRate: astro.reportRate || 0,
      });
      if (res.data?.status === 200) {
        Alert.alert('Success', 'Report requested successfully!');
        onClose();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to request report');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed');
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.sheetHeader}>
            <Text style={modal.sheetTitle}>Request Report from {astro?.name}</Text>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[modal.pickerLabel, { marginHorizontal: 16, marginTop: 8 }]}>
            ₹{astro?.reportRate || 0}/report
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput style={modal.input} placeholder="First Name *" placeholderTextColor={colors.textMuted} value={form.firstName} onChangeText={(t) => setForm({ ...form, firstName: t })} />
            <TextInput style={modal.input} placeholder="Last Name" placeholderTextColor={colors.textMuted} value={form.lastName} onChangeText={(t) => setForm({ ...form, lastName: t })} />

            {/* Gender */}
            <Text style={modal.pickerLabel}>Gender *</Text>
            <View style={[modal.row, { flexWrap: 'wrap' }]}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity key={g} style={[modal.optChip, form.gender === g && modal.optChipActive]} onPress={() => setForm({ ...form, gender: g })}>
                  <Text style={[modal.optChipText, form.gender === g && { color: '#1A1A1A' }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Report Type */}
            <Text style={modal.pickerLabel}>Report Type *</Text>
            <View style={[modal.row, { flexWrap: 'wrap' }]}>
              {REPORT_TYPES.map((rt) => (
                <TouchableOpacity key={rt} style={[modal.optChip, form.reportType === rt && modal.optChipActive]} onPress={() => setForm({ ...form, reportType: rt })}>
                  <Text style={[modal.optChipText, form.reportType === rt && { color: '#1A1A1A' }]}>{rt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modal.pickerLabel}>Date of Birth *</Text>
            <DateTimePicker value={form.birthDate} onChange={(d) => setForm({ ...form, birthDate: d })} mode="date" label="Select date of birth" />
            <TextInput style={modal.input} placeholder="Birth Time (HH:MM)" placeholderTextColor={colors.textMuted} value={form.birthTime} onChangeText={(t) => setForm({ ...form, birthTime: t })} />
            <TextInput style={modal.input} placeholder="Birth Place (City, State)" placeholderTextColor={colors.textMuted} value={form.birthPlace} onChangeText={(t) => setForm({ ...form, birthPlace: t })} />

            {/* Marital Status */}
            <Text style={modal.pickerLabel}>Marital Status</Text>
            <View style={[modal.row, { flexWrap: 'wrap' }]}>
              {['Single', 'Married', 'Divorced', 'Widowed'].map((m) => (
                <TouchableOpacity key={m} style={[modal.optChip, form.maritalStatus === m && modal.optChipActive]} onPress={() => setForm({ ...form, maritalStatus: m })}>
                  <Text style={[modal.optChipText, form.maritalStatus === m && { color: '#1A1A1A' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[modal.input, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Comments / Specific questions..."
              placeholderTextColor={colors.textMuted}
              value={form.comments}
              onChangeText={(t) => setForm({ ...form, comments: t })}
              multiline
            />

            <TouchableOpacity style={[modal.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color="#1A1A1A" />
                : <Text style={modal.submitText}>Request Report — ₹{astro?.reportRate || 0}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AstrologerDetailScreen = ({ astrologer, astrologerId, onBack, onStartChat, onStartCall }) => {
  const { user } = useSelector((s) => s.auth);
  const [astro, setAstro]                 = useState(astrologer || null);
  const [reviews, setReviews]             = useState([]);
  const [gifts, setGifts]                 = useState([]);
  const [loading, setLoading]             = useState(!astrologer);
  const [isFollowing, setIsFollowing]     = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked]         = useState(false);
  const [blockLoading, setBlockLoading]   = useState(false);
  const [intakeType, setIntakeType]       = useState('chat'); // 'chat' | 'call' | 'video'
  const [showIntake, setShowIntake]       = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [showGifts, setShowGifts]         = useState(false);
  const [sendingGift, setSendingGift]     = useState(null);
  const [reviewText, setReviewText]       = useState('');
  const [rating, setRating]               = useState(5);

  const id = astrologerId || astrologer?.id || astrologer?.astrologerId;

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [aRes, revRes, followRes, blockRes] = await Promise.allSettled([
          astrologerApi.getById({ astrologerId: id }),
          astrologerApi.getReviews({ astrologerId: id }),
          user ? astrologerApi.getFollowing({ userId: user.id }) : Promise.resolve(null),
          user ? blockAstrologerApi.check({ astrologerId: id }) : Promise.resolve(null),
        ]);
        if (aRes.status === 'fulfilled') {
          const d = aRes.value.data?.data || aRes.value.data;
          const rec = d?.recordList || d;
          setAstro(Array.isArray(rec) ? rec[0] : rec);
        }
        if (revRes.status === 'fulfilled') {
          const d = revRes.value.data?.data || revRes.value.data;
          setReviews(Array.isArray(d) ? d : d?.recordList || []);
        }
        if (followRes.status === 'fulfilled' && followRes.value) {
          const d = followRes.value.data?.data || followRes.value.data;
          const list = Array.isArray(d) ? d : d?.recordList || [];
          setIsFollowing(list.some((f) => String(f.astrologerId || f.id) === String(id)));
        }
        if (blockRes.status === 'fulfilled' && blockRes.value) {
          setIsBlocked(!!blockRes.value.data?.isBlocked);
        }
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFollow = async () => {
    if (!user) { Alert.alert('Sign In', 'Please sign in to follow astrologers'); return; }
    setFollowLoading(true);
    try {
      await astrologerApi.follow({ astrologerId: id });
      setIsFollowing(!isFollowing);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Action failed');
    }
    setFollowLoading(false);
  };

  const handleBlock = async () => {
    if (!user) { Alert.alert('Sign In', 'Please sign in first'); return; }
    const action = isBlocked ? 'unblock' : 'block';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Astrologer`,
      `Are you sure you want to ${action} ${astro?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            setBlockLoading(true);
            try {
              const res = isBlocked
                ? await blockAstrologerApi.remove({ astrologerId: id })
                : await blockAstrologerApi.add({ astrologerId: id });
              if (res.data?.status === 200) {
                setIsBlocked(!isBlocked);
                Alert.alert('Done', isBlocked ? 'Astrologer unblocked' : 'Astrologer blocked');
              } else {
                Alert.alert('Error', res.data?.message || 'Failed');
              }
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed');
            }
            setBlockLoading(false);
          },
        },
      ],
    );
  };

  const openIntake = (type) => {
    if (!user) { Alert.alert('Sign In', 'Please sign in to continue'); return; }
    const statusField = type === 'chat' ? astro?.chatStatus : astro?.callStatus;
    if (statusField === 'Offline') { Alert.alert('Offline', 'Astrologer is currently offline'); return; }
    if (statusField === 'Busy') { Alert.alert('Busy', 'Astrologer is currently busy. Try later.'); return; }
    setIntakeType(type);
    setShowIntake(true);
  };

  const handleIntakeSuccess = (sessionId, type) => {
    if (type === 'chat' && sessionId && onStartChat) {
      onStartChat(sessionId);
    } else if ((type === 'call' || type === 'video') && sessionId && onStartCall) {
      onStartCall(sessionId, type);
    }
  };

  const handleReview = async () => {
    if (!user) { Alert.alert('Sign In', 'Please sign in to leave a review'); return; }
    if (!reviewText.trim()) { Alert.alert('Required', 'Please write a review'); return; }
    try {
      await astrologerApi.addReview({ astrologerId: id, rating, review: reviewText });
      Alert.alert('Thank you!', 'Your review has been submitted');
      setReviewText(''); setRating(5);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleSendGift = async (gift) => {
    setSendingGift(gift.id);
    try {
      const res = await giftApi.send({ astrologerId: id, giftId: gift.id, amount: gift.amount });
      if (res.data?.status === 200) {
        Alert.alert('Gift Sent! 🎁', 'Your gift has been sent successfully');
        setShowGifts(false);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send gift');
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed');
    }
    setSendingGift(null);
  };

  const openGifts = async () => {
    if (!user) { Alert.alert('Sign In', 'Please sign in to send gifts'); return; }
    try {
      const res = await giftApi.getAll();
      setGifts(res.data?.recordList || []);
    } catch {}
    setShowGifts(true);
  };

  // ── Loading / Not-found states ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Astrologer</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </View>
    );
  }

  if (!astro) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Astrologer</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="account-off-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Astrologer not found</Text>
        </View>
      </View>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const avatarUri = imgUrl(astro.profileImage);
  const charge    = parseFloat(astro.charge || 0);
  const isOnline  = astro.chatStatus === 'Online' || astro.callStatus === 'Online';
  const skills    = (() => {
    const s   = astro.allSkill || astro.primarySkill || astro.skill || '';
    const arr = Array.isArray(s) ? s : String(s).split(',');
    return arr.map((x) => (typeof x === 'object' ? x.name : String(x).trim())).filter(Boolean);
  })();
  const langs = (() => {
    const l   = astro.languageKnown || astro.language || '';
    const arr = Array.isArray(l) ? l : String(l).split(',');
    return arr.map((x) => (typeof x === 'object' ? x.languageName || x.name : String(x).trim())).filter(Boolean);
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{astro.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={40} color={colors.gold} />
                </View>
              )}
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.success : '#CCC' }]} />
            </View>

            {/* Info */}
            <View style={styles.heroInfo}>
              <Text style={styles.astroName}>{astro.name}</Text>
              {skills.length > 0 && (
                <Text style={styles.astroSkill} numberOfLines={1}>{skills.join(', ')}</Text>
              )}
              {langs.length > 0 && (
                <Text style={styles.astroLang} numberOfLines={1}>{langs.join(', ')}</Text>
              )}
              {astro.experience ? (
                <Text style={styles.astroExp}>{astro.experience} yrs experience</Text>
              ) : null}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.ratingText}>{astro.rating || '4.5'}</Text>
                <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₹{charge}/min</Text>
                <View style={[styles.statusChip, { backgroundColor: isOnline ? colors.successBg : '#F5F5F5' }]}>
                  <Text style={[styles.statusChipText, { color: isOnline ? colors.success : colors.textMuted }]}>
                    {astro.chatStatus || 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Primary Action Row: Chat / Call / Video ─────────────────────── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.chatBtn, astro.chatStatus === 'Offline' && styles.disabledBtn]}
              onPress={() => openIntake('chat')}
              disabled={astro.chatStatus === 'Offline'}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#1A1A1A" />
              <Text style={styles.actionBtnText}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.callBtn, astro.callStatus === 'Offline' && styles.disabledBtn]}
              onPress={() => openIntake('call')}
              disabled={astro.callStatus === 'Offline'}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={15} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.videoBtn, astro.callStatus === 'Offline' && styles.disabledBtn]}
              onPress={() => openIntake('video')}
              disabled={astro.callStatus === 'Offline'}
              activeOpacity={0.85}
            >
              <Ionicons name="videocam-outline" size={15} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Video</Text>
            </TouchableOpacity>
          </View>

          {/* ── Secondary Action Row: Follow / Gift / Report / Block ────────── */}
          <View style={[styles.actionRow, { marginTop: 0 }]}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
              activeOpacity={0.85}
            >
              <Ionicons name={isFollowing ? 'checkmark' : 'add'} size={15} color={isFollowing ? '#FFF' : '#1A1A1A'} />
              <Text style={[styles.actionBtnText, isFollowing && { color: '#FFF' }]}>
                {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.giftBtn]} onPress={openGifts} activeOpacity={0.85}>
              <Ionicons name="gift-outline" size={15} color="#1A1A1A" />
              <Text style={styles.actionBtnText}>Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.reportBtn]}
              onPress={() => {
                if (!user) { Alert.alert('Sign In', 'Please sign in to request a report'); return; }
                setShowReport(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={15} color="#1A1A1A" />
              <Text style={styles.actionBtnText}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isBlocked ? styles.unblockedBtn : styles.blockBtn]}
              onPress={handleBlock}
              disabled={blockLoading}
              activeOpacity={0.85}
            >
              {blockLoading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name={isBlocked ? 'lock-open-outline' : 'ban-outline'} size={15} color="#FFF" />
              }
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About ────────────────────────────────────────────────────────── */}
        {astro.aboutMe ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{astro.aboutMe}</Text>
          </View>
        ) : null}

        {/* ── Expertise Tags ───────────────────────────────────────────────── */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expertise</Text>
            <View style={styles.tagRow}>
              {skills.map((s, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* ── Reviews ──────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>

          {user && (
            <View style={styles.reviewForm}>
              <StarRating rating={rating} onRate={setRating} editable />
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience…"
                placeholderTextColor={colors.textMuted}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity style={styles.reviewSubmit} onPress={handleReview} activeOpacity={0.85}>
                <Text style={styles.reviewSubmitText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          )}

          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{rev.userName || rev.name || 'User'}</Text>
                  <StarRating rating={rev.rating || 0} />
                </View>
                <Text style={styles.reviewText}>{rev.review}</Text>
                {rev.reply && (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>Reply:</Text>
                    <Text style={styles.replyText}>{rev.reply}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Intake Modal (Chat / Call / Video) ────────────────────────────── */}
      <IntakeModal
        visible={showIntake}
        astro={astro}
        intakeType={intakeType}
        onClose={() => setShowIntake(false)}
        onSuccess={handleIntakeSuccess}
      />

      {/* ── Report Modal ──────────────────────────────────────────────────── */}
      <ReportModal
        visible={showReport}
        astro={astro}
        onClose={() => setShowReport(false)}
      />

      {/* ── Gift Modal ────────────────────────────────────────────────────── */}
      <Modal visible={showGifts} animationType="slide" transparent onRequestClose={() => setShowGifts(false)}>
        <View style={modal.overlay}>
          <View style={[modal.sheet, { maxHeight: '60%' }]}>
            <View style={modal.sheetHeader}>
              <Text style={modal.sheetTitle}>Send Gift to {astro.name}</Text>
              <TouchableOpacity onPress={() => setShowGifts(false)} style={modal.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {gifts.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textMuted, padding: 24 }}>No gifts available</Text>
            ) : (
              <FlatList
                data={gifts}
                numColumns={3}
                keyExtractor={(g) => String(g.id)}
                contentContainerStyle={{ padding: 12 }}
                columnWrapperStyle={{ gap: 10 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item: g }) => {
                  const gUri   = g.image ? (g.image.startsWith('http') ? g.image : imgUrl(g.image)) : null;
                  const sending = sendingGift === g.id;
                  return (
                    <TouchableOpacity
                      style={giftStyles.card}
                      onPress={() => handleSendGift(g)}
                      disabled={!!sendingGift}
                      activeOpacity={0.85}
                    >
                      {gUri ? (
                        <Image source={{ uri: gUri }} style={giftStyles.img} resizeMode="contain" />
                      ) : (
                        <Text style={{ fontSize: 36 }}>🎁</Text>
                      )}
                      <Text style={giftStyles.name}>{g.name}</Text>
                      <Text style={giftStyles.price}>₹{g.amount}</Text>
                      {sending && <ActivityIndicator size="small" color={colors.gold} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AstrologerDetailScreen;

// ─── Styles ────────────────────────────────────────────────────────────────────
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, textAlign: 'center' },

  heroCard: {
    backgroundColor: colors.primary, margin: 14, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4, gap: 14,
  },
  heroRow:        { flexDirection: 'row', gap: 14 },
  avatarWrap:     { position: 'relative' },
  avatar:         { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.gold },
  avatarFallback: { backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    width: 14, height: 14, borderRadius: 7,
    position: 'absolute', bottom: 2, right: 2,
    borderWidth: 2, borderColor: '#FFF',
  },
  heroInfo:     { flex: 1, gap: 3 },
  astroName:    { fontSize: 18, fontWeight: '800', color: colors.text },
  astroSkill:   { fontSize: 13, color: colors.textSecondary },
  astroLang:    { fontSize: 12, color: colors.textMuted },
  astroExp:     { fontSize: 12, color: colors.textMuted },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText:   { fontSize: 13, fontWeight: '700', color: colors.text },
  reviewCount:  { fontSize: 12, color: colors.textMuted },
  priceRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  price:        { fontSize: 15, fontWeight: '800', color: colors.gold },
  statusChip:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  // Action rows
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 10, paddingVertical: 9, minWidth: 70,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  chatBtn:      { backgroundColor: colors.gold },
  callBtn:      { backgroundColor: '#10B981' },
  videoBtn:     { backgroundColor: '#3B82F6' },
  followBtn:    { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  followingBtn: { backgroundColor: colors.success, borderColor: colors.success },
  giftBtn:      { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  reportBtn:    { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#6EE7B7' },
  blockBtn:     { backgroundColor: '#DC2626' },
  unblockedBtn: { backgroundColor: '#6B7280' },
  disabledBtn:  { opacity: 0.4 },

  section: {
    backgroundColor: colors.primary, marginHorizontal: 14, marginBottom: 14,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  bodyText:     { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:          { backgroundColor: colors.goldBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:      { fontSize: 12, fontWeight: '600', color: colors.goldDark },

  reviewForm:       { backgroundColor: '#F9F5FF', borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  reviewInput: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0D4F5',
    borderRadius: 10, padding: 10, fontSize: 13, color: colors.text,
    minHeight: 60, textAlignVertical: 'top',
  },
  reviewSubmit:     { backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  reviewSubmitText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  noReviews:        { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  reviewCard:       { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, marginTop: 4, gap: 4 },
  reviewHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName:       { fontSize: 13, fontWeight: '700', color: colors.text },
  reviewText:       { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  replyBox:         { backgroundColor: colors.secondary, borderRadius: 8, padding: 10, gap: 2 },
  replyLabel:       { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  replyText:        { fontSize: 12, color: colors.textSecondary },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', paddingBottom: 0,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: colors.text,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  input: {
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text,
  },
  row:         { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  pickerBox:   { gap: 6 },
  pickerLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    marginLeft: 16, marginBottom: 4, marginTop: 4,
  },
  optChip: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 4,
  },
  optChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  optChipText:   { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  durationGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
  },
  durBtn: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 90,
  },
  durBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  durLabel:     { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  durPrice:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  totalRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  totalText:    { fontSize: 14, color: colors.text },
  totalSub:     { fontSize: 12, color: colors.textMuted },
  submitBtn: {
    backgroundColor: colors.gold, borderRadius: 14,
    marginHorizontal: 16, paddingVertical: 15, alignItems: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  submitText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
});

const giftStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', padding: 10,
    borderWidth: 1.5, borderColor: '#E0D4F5', borderRadius: 12,
    backgroundColor: '#F9F5FF', gap: 4,
  },
  img:   { width: 50, height: 50 },
  name:  { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
  price: { fontSize: 12, fontWeight: '800', color: colors.gold },
});
