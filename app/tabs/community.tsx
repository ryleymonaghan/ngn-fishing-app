import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Platform, Alert, ActivityIndicator, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS, DEFAULT_LOCATION } from '@constants/index';
import { useAuthStore, useCommunityStore } from '@stores/index';
import { isAngler } from '@constants/index';
import { startCheckout } from '@services/stripeService';
import { formatPinExpiry } from '@services/communityService';
import type { ChatMessage, LivePin, PinType } from '@app-types/index';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });

// react-native-maps (not available on web)
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch {}
}

type Tab = 'chat' | 'pins';

export default function CommunityScreen() {
  const { user } = useAuthStore();
  const {
    messages, pins, isLoadingChat, isLoadingPins,
    fetchNearbyChat, fetchNearbyPins, sendMessage,
    dropPin, removePin, subscribeRealtime, unsubscribeRealtime,
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [userLat, setUserLat] = useState<number>(DEFAULT_LOCATION.lat);
  const [userLng, setUserLng] = useState<number>(DEFAULT_LOCATION.lng);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const userTier = user?.subscription?.tier ?? 'free';
  const isAnglerTier = isAngler(userTier);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
    })();
  }, []);

  // Fetch data + subscribe to realtime when location is ready
  useEffect(() => {
    if (!isAnglerTier) return;
    fetchNearbyChat(userLat, userLng);
    fetchNearbyPins(userLat, userLng);
    subscribeRealtime(userLat, userLng);
    return () => unsubscribeRealtime();
  }, [userLat, userLng, isAnglerTier]);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    setSending(true);
    try {
      await sendMessage(chatInput.trim(), userLat, userLng);
      setChatInput('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  }, [chatInput, userLat, userLng, sendMessage]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await startCheckout('angler_monthly', user?.email);
    } catch (err: any) {
      Alert.alert('Checkout Error', err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ── Locked state for non-Pro Angler users ──
  if (!isAnglerTier) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.lockedWrap}>
          <Text style={s.lockedIcon}>🎣</Text>
          <Text style={s.lockedTitle}>ANGLER COMMUNITY</Text>
          <Text style={s.lockedSub}>Pro Angler Exclusive</Text>
          <Text style={s.lockedDesc}>
            Chat with fellow anglers in your 15-mile radius. Drop live pins
            to share bait schools and hot fishing spots in real time.
          </Text>
          <TouchableOpacity
            style={s.upgradeBtn}
            onPress={handleUpgrade}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <ActivityIndicator color={COLORS.navy} />
            ) : (
              <Text style={s.upgradeBtnText}>UNLOCK — $19.99/MO</Text>
            )}
          </TouchableOpacity>
          <Text style={s.lockedNote}>Includes all premium map layers + community</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Tab switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'chat' && s.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[s.tabText, activeTab === 'chat' && s.tabTextActive]}>CHAT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'pins' && s.tabActive]}
          onPress={() => setActiveTab('pins')}
        >
          <Text style={[s.tabText, activeTab === 'pins' && s.tabTextActive]}>
            LIVE PINS{pins.length > 0 ? ` (${pins.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? (
        <ChatView
          messages={messages}
          isLoading={isLoadingChat}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sending={sending}
          onSend={handleSend}
          userId={user?.id}
        />
      ) : (
        <PinsView
          pins={pins}
          isLoading={isLoadingPins}
          userLat={userLat}
          userLng={userLng}
          userId={user?.id}
          onDropPin={() => setPinModalVisible(true)}
          onRemovePin={removePin}
        />
      )}

      {/* Pin Drop Modal */}
      <PinDropModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onDrop={async (pinType, description, speciesTag) => {
          await dropPin({
            user_id: user!.id,
            display_name: user?.fullName ?? user?.email.split('@')[0] ?? 'Angler',
            lat: userLat,
            lng: userLng,
            pin_type: pinType,
            description,
            species_tag: speciesTag,
          });
          setPinModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

// ── Chat Sub-component ───────────────────────
function ChatView({
  messages, isLoading, chatInput, setChatInput, sending, onSend, userId,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  chatInput: string;
  setChatInput: (t: string) => void;
  sending: boolean;
  onSend: () => void;
  userId?: string;
}) {
  const renderMsg = ({ item }: { item: ChatMessage }) => {
    const isMe = item.user_id === userId;
    const time = new Date(item.created_at);
    const timeStr = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.msgBubble, isMe ? s.msgBubbleMe : s.msgBubbleOther]}>
          {!isMe && <Text style={s.msgName}>{item.display_name}</Text>}
          <Text style={s.msgText}>{item.message}</Text>
          <Text style={s.msgTime}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.seafoam} /></View>
      ) : messages.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>💬</Text>
          <Text style={s.emptyText}>No anglers chatting nearby</Text>
          <Text style={s.emptyHint}>Be the first — ask if anyone's found bait today</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMsg}
          inverted
          contentContainerStyle={s.chatList}
        />
      )}

      {/* Input bar */}
      <View style={s.inputBar}>
        <TextInput
          style={s.chatInput}
          placeholder="Ask nearby anglers..."
          placeholderTextColor={COLORS.textMuted}
          value={chatInput}
          onChangeText={setChatInput}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={onSend}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!chatInput.trim() || sending) && s.sendBtnDisabled]}
          onPress={onSend}
          disabled={!chatInput.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={COLORS.navy} size="small" />
          ) : (
            <Text style={s.sendBtnText}>▶</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Pins Sub-component ───────────────────────
function PinsView({
  pins, isLoading, userLat, userLng, userId, onDropPin, onRemovePin,
}: {
  pins: LivePin[];
  isLoading: boolean;
  userLat: number;
  userLng: number;
  userId?: string;
  onDropPin: () => void;
  onRemovePin: (id: string) => void;
}) {
  const mapRef = useRef<any>(null);

  const pinColor = (type: PinType) => type === 'bait' ? '#2ECC71' : '#F39C12';
  const pinLabel = (type: PinType) => type === 'bait' ? '🐟 BAIT' : '🎣 FISHING';

  return (
    <View style={s.flex1}>
      {/* Map with pins */}
      {MapView && Platform.OS !== 'web' ? (
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={{
            latitude: userLat,
            longitude: userLng,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
          mapType="hybrid"
          showsUserLocation
          showsMyLocationButton
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              pinColor={pinColor(pin.pin_type)}
              title={`${pinLabel(pin.pin_type)} — ${pin.display_name}`}
              description={`${pin.description ?? ''}\n${formatPinExpiry(pin.expires_at)}`}
              onCalloutPress={() => {
                if (pin.user_id === userId) {
                  Alert.alert('Remove Pin', 'Delete this pin?', [
                    { text: 'Cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => onRemovePin(pin.id) },
                  ]);
                }
              }}
            />
          ))}
        </MapView>
      ) : (
        <View style={s.center}>
          <Text style={s.emptyText}>Map not available on web</Text>
        </View>
      )}

      {/* Drop pin FAB */}
      <TouchableOpacity style={s.fab} onPress={onDropPin}>
        <Text style={s.fabText}>📌 DROP PIN</Text>
      </TouchableOpacity>

      {/* Pin count badge */}
      {pins.length > 0 && (
        <View style={s.pinCountBadge}>
          <Text style={s.pinCountText}>
            {pins.filter((p) => p.pin_type === 'bait').length} bait · {pins.filter((p) => p.pin_type === 'fishing').length} fishing
          </Text>
        </View>
      )}

      {isLoading && (
        <View style={s.mapLoading}>
          <ActivityIndicator color={COLORS.seafoam} />
        </View>
      )}
    </View>
  );
}

// ── Pin Drop Modal ───────────────────────────
function PinDropModal({
  visible, onClose, onDrop,
}: {
  visible: boolean;
  onClose: () => void;
  onDrop: (type: PinType, desc?: string, species?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pinType, setPinType] = useState<PinType>('bait');
  const [description, setDescription] = useState('');
  const [speciesTag, setSpeciesTag] = useState('');
  const [dropping, setDropping] = useState(false);

  const reset = () => {
    setStep(1);
    setPinType('bait');
    setDescription('');
    setSpeciesTag('');
  };

  const handleDrop = async () => {
    setDropping(true);
    try {
      await onDrop(pinType, description || undefined, speciesTag || undefined);
      reset();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setDropping(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>DROP A PIN</Text>

          {step === 1 ? (
            <>
              <Text style={s.modalLabel}>What are you sharing?</Text>
              <TouchableOpacity
                style={[s.pinTypeBtn, pinType === 'bait' && s.pinTypeBtnBait]}
                onPress={() => { setPinType('bait'); setStep(2); }}
              >
                <Text style={s.pinTypeBtnIcon}>🐟</Text>
                <View>
                  <Text style={s.pinTypeBtnTitle}>BAIT LOCATION</Text>
                  <Text style={s.pinTypeBtnDesc}>Found bait — menhaden, mullet, shrimp, etc.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.pinTypeBtn, pinType === 'fishing' && s.pinTypeBtnFishing]}
                onPress={() => { setPinType('fishing'); setStep(2); }}
              >
                <Text style={s.pinTypeBtnIcon}>🎣</Text>
                <View>
                  <Text style={s.pinTypeBtnTitle}>FISHING SPOT</Text>
                  <Text style={s.pinTypeBtnDesc}>Hot bite, active fish, productive area</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalCancel} onPress={() => { reset(); onClose(); }}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[s.pinTypeBadge, pinType === 'bait' ? s.badgeBait : s.badgeFishing]}>
                <Text style={s.pinTypeBadgeText}>
                  {pinType === 'bait' ? '🐟 BAIT' : '🎣 FISHING'}
                </Text>
              </View>
              <Text style={s.modalLabel}>Quick description (optional)</Text>
              <TextInput
                style={s.modalInput}
                placeholder={pinType === 'bait'
                  ? 'e.g. Huge school of menhaden, east side of jetties'
                  : 'e.g. Reds crushing topwater on the flat'}
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={140}
                multiline
              />
              <Text style={s.charCount}>{description.length}/140</Text>

              <Text style={s.modalLabel}>Species tag (optional)</Text>
              <TextInput
                style={s.modalInput}
                placeholder="e.g. menhaden, redfish, flounder"
                placeholderTextColor={COLORS.textMuted}
                value={speciesTag}
                onChangeText={setSpeciesTag}
                maxLength={50}
              />

              <TouchableOpacity
                style={s.dropBtn}
                onPress={handleDrop}
                disabled={dropping}
              >
                {dropping ? (
                  <ActivityIndicator color={COLORS.navy} />
                ) : (
                  <Text style={s.dropBtnText}>📌 DROP PIN</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.modalCancel} onPress={() => setStep(1)}>
                <Text style={s.modalCancelText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={s.expiryNote}>Pins auto-expire after 4 hours</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Tab switcher
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0D2B4A' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.seafoam },
  tabText: { fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.seafoam },

  // Locked state
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockedIcon: { fontSize: 64, marginBottom: 16 },
  lockedTitle: { fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: COLORS.white, marginBottom: 8 },
  lockedSub: { fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: COLORS.warning, marginBottom: 16 },
  lockedDesc: { fontFamily: MONO, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  upgradeBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 8, marginBottom: 12,
  },
  upgradeBtnText: { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: COLORS.navy, fontWeight: '700' },
  lockedNote: { fontFamily: MONO, fontSize: 10, color: COLORS.textMuted },

  // Chat
  chatList: { padding: 12 },
  msgRow: { marginBottom: 8, alignItems: 'flex-start' },
  msgRowMe: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
  msgBubbleMe: { backgroundColor: COLORS.ocean, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: '#0E3560', borderBottomLeftRadius: 4 },
  msgName: { fontFamily: MONO, fontSize: 10, color: COLORS.seafoam, letterSpacing: 1, marginBottom: 2 },
  msgText: { fontFamily: MONO, fontSize: 13, color: COLORS.white, lineHeight: 18 },
  msgTime: { fontFamily: MONO, fontSize: 9, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },

  // Input bar
  inputBar: {
    flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#0D2B4A',
    backgroundColor: '#060E1A',
  },
  chatInput: {
    flex: 1, fontFamily: MONO, fontSize: 13, color: COLORS.white,
    backgroundColor: COLORS.navyLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.seafoam, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 16, color: COLORS.navy },

  // Empty states
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: MONO, fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  emptyHint: { fontFamily: MONO, fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  // Map
  map: { flex: 1 },
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: COLORS.seafoam, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 28, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: COLORS.navy, fontWeight: '700' },
  pinCountBadge: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: 'rgba(10,37,64,0.85)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.seafoam,
  },
  pinCountText: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: COLORS.seafoam },
  mapLoading: { position: 'absolute', top: '50%', alignSelf: 'center' },

  // Pin Drop Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.navy, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 2, borderColor: COLORS.seafoam,
  },
  modalTitle: { fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: COLORS.white, marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
  modalInput: {
    fontFamily: MONO, fontSize: 13, color: COLORS.white,
    backgroundColor: COLORS.navyLight, borderRadius: 8,
    padding: 12, minHeight: 44,
  },
  charCount: { fontFamily: MONO, fontSize: 9, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },

  // Pin type buttons
  pinTypeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#0D2B4A',
    marginBottom: 10, backgroundColor: COLORS.navyLight,
  },
  pinTypeBtnBait: { borderColor: '#2ECC71' },
  pinTypeBtnFishing: { borderColor: '#F39C12' },
  pinTypeBtnIcon: { fontSize: 28 },
  pinTypeBtnTitle: { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: COLORS.white, fontWeight: '700' },
  pinTypeBtnDesc: { fontFamily: MONO, fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Pin type badge
  pinTypeBadge: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginBottom: 8 },
  badgeBait: { backgroundColor: '#2ECC71' },
  badgeFishing: { backgroundColor: '#F39C12' },
  pinTypeBadgeText: { fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: COLORS.navy, fontWeight: '700' },

  // Drop button
  dropBtn: {
    backgroundColor: COLORS.seafoam, paddingVertical: 14, borderRadius: 8,
    alignItems: 'center', marginTop: 16,
  },
  dropBtnText: { fontFamily: MONO, fontSize: 14, letterSpacing: 2, color: COLORS.navy, fontWeight: '700' },

  // Cancel / back
  modalCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  modalCancelText: { fontFamily: MONO, fontSize: 12, color: COLORS.textMuted },

  expiryNote: { fontFamily: MONO, fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 16 },
});
