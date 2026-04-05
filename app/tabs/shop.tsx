import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';
import {
  SHOP_CATEGORIES, SHOP_PRODUCTS, AFFILIATE_PARTNERS,
  buildAffiliateUrl, getFeaturedProducts, getProductsByCategory,
  type ShopProduct, type ShopCategory,
} from '@constants/shop';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

export default function ShopScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const featured = getFeaturedProducts();
  const displayProducts = selectedCategory
    ? getProductsByCategory(selectedCategory)
    : featured;

  const handleBuy = useCallback((product: ShopProduct) => {
    // Use first available affiliate link
    const link = product.affiliateLinks[0];
    if (!link) return;
    const url = buildAffiliateUrl(link.partnerId, link.url);
    Linking.openURL(url).catch(() => {});
  }, []);

  const getPartnerName = (partnerId: string): string => {
    return AFFILIATE_PARTNERS.find(p => p.id === partnerId)?.name ?? partnerId;
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.screenTitle}>GEAR SHOP</Text>
        <Text style={s.screenSub}>
          AI-recommended tackle — tap to buy from our partners
        </Text>

        {/* Category filter — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
          <TouchableOpacity
            style={[s.catPill, !selectedCategory && s.catPillActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.75}
          >
            <Text style={[s.catPillText, !selectedCategory && s.catPillTextActive]}>
              FEATURED
            </Text>
          </TouchableOpacity>
          {SHOP_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catPill, selectedCategory === cat.id && s.catPillActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              activeOpacity={0.75}
            >
              <Text style={[s.catPillText, selectedCategory === cat.id && s.catPillTextActive]}>
                {cat.icon} {cat.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section label */}
        <Text style={s.sectionLabel}>
          {selectedCategory
            ? SHOP_CATEGORIES.find(c => c.id === selectedCategory)?.label.toUpperCase() ?? 'PRODUCTS'
            : 'FEATURED GEAR'}
        </Text>

        {/* Product cards */}
        {displayProducts.map(product => (
          <View key={product.id} style={s.productCard}>
            {/* Header */}
            <View style={s.productHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.productName}>{product.name}</Text>
                <Text style={s.productBrand}>{product.brand}</Text>
              </View>
              <Text style={s.productPrice}>{product.priceRange}</Text>
            </View>

            {/* Description */}
            <Text style={s.productDesc}>{product.description}</Text>

            {/* Tags row */}
            <View style={s.tagRow}>
              {product.accessTypes.slice(0, 4).map(at => (
                <View key={at} style={s.accessTag}>
                  <Text style={s.accessTagText}>{at.toUpperCase()}</Text>
                </View>
              ))}
              {product.rigId && (
                <View style={s.rigTag}>
                  <Text style={s.rigTagText}>RIG GUIDE</Text>
                </View>
              )}
            </View>

            {/* Buy buttons — one per affiliate partner */}
            <View style={s.buyRow}>
              {product.affiliateLinks.map((link, i) => (
                <TouchableOpacity
                  key={link.partnerId}
                  style={[s.buyBtn, i === 0 ? s.buyBtnPrimary : s.buyBtnSecondary]}
                  onPress={() => {
                    const url = buildAffiliateUrl(link.partnerId, link.url);
                    Linking.openURL(url).catch(() => {});
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.buyBtnText, i === 0 ? s.buyBtnTextPrimary : s.buyBtnTextSecondary]}>
                    {i === 0 ? 'SHOP' : ''} {getPartnerName(link.partnerId).toUpperCase()} →
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {displayProducts.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No products in this category yet.</Text>
            <Text style={s.emptySub}>More gear coming soon — we're adding new products every week.</Text>
          </View>
        )}

        {/* Affiliate disclosure */}
        <View style={s.disclosureBox}>
          <Text style={s.disclosureText}>
            NGN Fishing earns a small commission on purchases made through these links at no extra cost to you.
            This helps us keep the app running and the reports free.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060E1A' },
  content: { padding: 20, paddingBottom: 48 },

  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: MONO,
    letterSpacing: 3,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },

  // ── Category pills ─────────────────
  catScroll: { marginBottom: 16 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    marginRight: 8,
  },
  catPillActive: { borderColor: COLORS.seafoam, backgroundColor: `${COLORS.seafoam}15` },
  catPillText: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, fontFamily: MONO, letterSpacing: 0.5 },
  catPillTextActive: { color: COLORS.seafoam },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 2,
    marginBottom: 12,
  },

  // ── Product cards ──────────────────
  productCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
    flex: 1,
    marginRight: 10,
  },
  productBrand: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: MONO,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
  },
  productDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },

  // ── Tags ───────────────────────────
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  accessTag: {
    backgroundColor: `${COLORS.ocean}33`,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  accessTagText: { fontSize: 8, fontWeight: '700', color: COLORS.ocean, fontFamily: MONO },
  rigTag: {
    backgroundColor: `${COLORS.warning}22`,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rigTagText: { fontSize: 8, fontWeight: '700', color: COLORS.warning, fontFamily: MONO },

  // ── Buy buttons ────────────────────
  buyRow: { flexDirection: 'row', gap: 8 },
  buyBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  buyBtnPrimary: { backgroundColor: COLORS.seafoam },
  buyBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.seafoam },
  buyBtnText: { fontSize: 10, fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
  buyBtnTextPrimary: { color: '#060E1A' },
  buyBtnTextSecondary: { color: COLORS.seafoam },

  // ── Empty state ────────────────────
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: MONO, marginBottom: 6 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  // ── Disclosure ─────────────────────
  disclosureBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: `${PANEL_BG}88`,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  disclosureText: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
