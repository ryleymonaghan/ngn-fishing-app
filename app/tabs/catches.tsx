import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Share,
  StyleSheet, Platform, Alert, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, APP_NAME } from '@constants/index';

// Conditional imports for native-only modules
let ImagePicker: any = null;
let Sharing: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { Sharing = require('expo-sharing'); } catch {}

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_W - 36) / 2; // 2-column grid with gaps
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });
const CATCHES_STORAGE_KEY = 'ngn_catches_photos';

interface CatchPhoto {
  id: string;
  uri: string;
  caption: string;
  date: string;
  species?: string;
}

// ── Persist catches to AsyncStorage ──────────
async function saveCatches(photos: CatchPhoto[]) {
  try {
    await AsyncStorage.setItem(CATCHES_STORAGE_KEY, JSON.stringify(photos));
  } catch {}
}
async function loadCatches(): Promise<CatchPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(CATCHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function CatchesScreen() {
  const [photos, setPhotos] = useState<CatchPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CatchPhoto | null>(null);
  const [editingSpecies, setEditingSpecies] = useState(false);

  // Load saved catches on mount
  useEffect(() => {
    loadCatches().then(setPhotos);
  }, []);

  // Save whenever photos change (after initial load)
  const updatePhotos = useCallback((updater: (prev: CatchPhoto[]) => CatchPhoto[]) => {
    setPhotos(prev => {
      const next = updater(prev);
      saveCatches(next);
      return next;
    });
  }, []);

  const pickImage = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Photo picker is only available on mobile devices.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'NGN Fishing needs camera roll access to share your catches.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newPhoto: CatchPhoto = {
        id: Date.now().toString(),
        uri: asset.uri,
        caption: '',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
      };
      updatePhotos(prev => [newPhoto, ...prev]);
    }
  }, [updatePhotos]);

  const takePhoto = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Camera is only available on mobile devices.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'NGN Fishing needs camera access to photograph your catches.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const newPhoto: CatchPhoto = {
        id: Date.now().toString(),
        uri: asset.uri,
        caption: '',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
      };
      updatePhotos(prev => [newPhoto, ...prev]);
    }
  }, [updatePhotos]);

  const deletePhoto = useCallback((photoId: string) => {
    Alert.alert('Delete Photo', 'Remove this catch?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          updatePhotos(prev => prev.filter(p => p.id !== photoId));
          setSelectedPhoto(null);
        },
      },
    ]);
  }, [updatePhotos]);

  const updateSpecies = useCallback((photoId: string, species: string) => {
    updatePhotos(prev => prev.map(p => p.id === photoId ? { ...p, species } : p));
    setSelectedPhoto(prev => prev && prev.id === photoId ? { ...prev, species } : prev);
    setEditingSpecies(false);
  }, [updatePhotos]);

  const shareToSocial = useCallback(async (photo: CatchPhoto) => {
    try {
      const message = [
        `🎣 Caught on ${photo.date}`,
        photo.species ? `Species: ${photo.species}` : '',
        '',
        `Powered by ${APP_NAME} — No Guide Needed™`,
        'Your AI fishing guide. No tip required.',
        '🔗 ngnfishing.com',
      ].filter(Boolean).join('\n');

      if (Platform.OS === 'web') {
        // Web: use navigator.share if available, otherwise copy text
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ text: message, url: 'https://ngnfishing.com' });
        } else {
          await Share.share({ message });
        }
      } else {
        // Native: use Share API for social media integration
        await Share.share({
          message,
          url: photo.uri,
          title: `My Catch — ${APP_NAME}`,
        });
      }
    } catch {
      // User cancelled share — no action needed
    }
  }, []);

  const shareImageFile = useCallback(async (photo: CatchPhoto) => {
    if (!Sharing || !(await Sharing.isAvailableAsync())) {
      // Fallback to text share
      shareToSocial(photo);
      return;
    }
    try {
      await Sharing.shareAsync(photo.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Share your catch — ${APP_NAME}`,
      });
    } catch {
      shareToSocial(photo);
    }
  }, [shareToSocial]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Add photo buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={takePhoto} activeOpacity={0.8}>
            <Text style={s.actionIcon}>📷</Text>
            <Text style={s.actionLabel}>TAKE PHOTO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={pickImage} activeOpacity={0.8}>
            <Text style={s.actionIcon}>🖼</Text>
            <Text style={s.actionLabel}>FROM GALLERY</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {photos.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>NO CATCHES YET</Text>
            <Text style={s.emptySub}>
              Snap a photo of your catch and share it with the NGN community.
              Every share includes your NGN Fishing branding — show the world
              you don't need a guide.
            </Text>
          </View>
        )}

        {/* Photo grid */}
        <View style={s.grid}>
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={s.photoCard}
              onPress={() => setSelectedPhoto(photo)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: photo.uri }} style={s.photoImage} />
              <View style={s.photoOverlay}>
                <Text style={s.photoDate}>{photo.date}</Text>
              </View>
              {/* NGN watermark */}
              <View style={s.watermark}>
                <Text style={s.watermarkText}>NGN</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Full-screen photo viewer with share buttons ── */}
      {selectedPhoto && (
        <View style={s.viewer}>
          <TouchableOpacity style={s.viewerClose} onPress={() => setSelectedPhoto(null)}>
            <Text style={s.viewerCloseText}>✕</Text>
          </TouchableOpacity>

          <Image source={{ uri: selectedPhoto.uri }} style={s.viewerImage} resizeMode="contain" />

          {/* NGN branding bar */}
          <View style={s.brandBar}>
            <View>
              <Text style={s.brandBarLogo}>NGN FISHING</Text>
              <Text style={s.brandBarTag}>No Guide Needed™ · ngnfishing.com</Text>
            </View>
            <Text style={s.brandBarDate}>{selectedPhoto.date}</Text>
          </View>

          {/* Species tag */}
          <TouchableOpacity
            style={s.speciesTag}
            onPress={() => setEditingSpecies(true)}
            activeOpacity={0.8}
          >
            <Text style={s.speciesTagLabel}>
              {selectedPhoto.species ? `Species: ${selectedPhoto.species}` : 'Tap to tag species'}
            </Text>
          </TouchableOpacity>
          {editingSpecies && (
            <TextInput
              style={s.speciesInput}
              placeholder="e.g. Redfish, Flounder..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={(e) => updateSpecies(selectedPhoto.id, e.nativeEvent.text)}
              onBlur={() => setEditingSpecies(false)}
            />
          )}

          {/* Share buttons */}
          <View style={s.shareRow}>
            <TouchableOpacity
              style={s.shareBtn}
              onPress={() => shareToSocial(selectedPhoto)}
              activeOpacity={0.8}
            >
              <Text style={s.shareBtnText}>SHARE TO SOCIAL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.shareBtn, s.shareBtnAlt]}
              onPress={() => shareImageFile(selectedPhoto)}
              activeOpacity={0.8}
            >
              <Text style={[s.shareBtnText, s.shareBtnTextAlt]}>SHARE IMAGE</Text>
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => deletePhoto(selectedPhoto.id)}
            activeOpacity={0.8}
          >
            <Text style={s.deleteBtnText}>DELETE PHOTO</Text>
          </TouchableOpacity>

          <Text style={s.shareHint}>
            Every share includes NGN Fishing branding — spread the word!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060E1A' },
  content: { padding: 12, paddingBottom: 24 },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 10,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Photo grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6,14,26,0.75)',
    padding: 6,
  },
  photoDate: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  watermark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(6,14,26,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  watermarkText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
  },

  // Full-screen viewer
  viewer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060E1A',
    zIndex: 50,
    justifyContent: 'center',
    padding: 16,
  },
  viewerClose: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 55,
    padding: 8,
  },
  viewerCloseText: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  viewerImage: {
    width: '100%',
    height: '55%',
    borderWidth: 1,
    borderColor: GRID_LINE,
  },

  // Brand bar below image
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: GRID_LINE,
    padding: 10,
  },
  brandBarLogo: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 2,
  },
  brandBarTag: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 1,
  },
  brandBarDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
  },

  // Share buttons
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  shareBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.seafoam,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareBtnAlt: {
    borderColor: COLORS.textMuted,
  },
  shareBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  shareBtnTextAlt: {
    color: COLORS.textMuted,
  },

  speciesTag: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  speciesTagLabel: {
    fontSize: 12,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  speciesInput: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 12,
    color: COLORS.white,
    fontSize: 14,
    marginTop: 8,
    fontFamily: MONO,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  shareHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.6,
  },
});
