import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/index';
import {
  SHOP_CATEGORIES, SHOP_PRODUCTS, AFFILIATE_PARTNERS, NGN_MERCH,
  buildAffiliateUrl, getFeaturedProducts, getProductsByCategory,
  type ShopProduct, type MerchItem, type MerchSeason,
} from '@constants/shop';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' });
const PANEL_BG = '#081E36';
const GRID_LINE = '#0D2B4A';

// ── Merch type icons ──────────────────────────
const MERCH_ICON: Record<string, string> = {
  trucker_hat: '🧢', wide_brim: '👒', bamboo_ls: '🎽', bamboo_ss: '👕',
  bamboo_hoodie: '🧥', bamboo_gaiter: '🏴‍☠️', decal: '🔖', koozie: '🍺',
};

// ── Season labels + colors ────────────────────
const SEASON_LABEL: Record<MerchSeason, string> = {
  spring: 'SPRING DROP', summer: 'SUMMER DROP', fall: 'FALL DROP',
  winter: 'WINTER DROP', year_round: 'YEAR ROUND',
};
const SEASON_COLOR: Record<MerchSeason, string> = {
  spring: '#2ECC71', summer: '#F39C12', fall: '#E67E22',
  winter: '#3498DB', year_round: COLORS.textMuted,
};

export default function ShopScreen() {
  const [activeSection, setActiveSection] = useState<'merch' | 'gear'>('merch');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const featured = getFeaturedProducts();
  const displayProducts = selectedCategory
    ? getProductsByCategory(selectedCategory)
    : featured;

  const handleBuy = useCallback((product: ShopProduct) => {
    const link = product.affiliateLinks[0];
    if (!link) return;
    const url = buildAffiliateUrl(link.partnerId, link.url);
    Linking.openURL(url).catch(() => {});
  }, []);

  const handleMerchTap = useCallback((item: MerchItem) => {
    Linking.openURL(item.url).catch(() => {});
  }, []);

  const getPartnerName = (partnerId: string): string => {
    return AFFILIATE_PARTNERS.find(p => p.id === partnerId)?.name ?? partnerId;
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* ── Header ──────────────────────── */}
        <Text style={s.screenTitle}>GEAR SHOP</Text>
        <Text style={s.screenSub}>NGN merch + AI-recommended tackle</Text>

        {/* ── Section Toggle ──────────────── */}
        <View style={s.sectionToggle}>
          <TouchableOpacity
            style={[s.sectionTab, activeSection === 'merch' && s.sectionTabActive]}
            onPress={() => setActiveSection('merch')}
            activeOpacity={0.75}
          >
            <Text style={[s.sectionTabText, activeSection === 'merch' && s.sectionTabTextActive]}>
              NGN GEAR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sectionTab, activeSection === 'gear' && s.sectionTabActive]}
            onPress={() => setActiveSection('gear')}
            activeOpacity={0.75}
          >
            <Text style={[s.sectionTabText, activeSection === 'gear' && s.sectionTabTextActive]}>
              RECOMMENDED TACKLE
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════
            SECTION 1 — NGN MERCH
            ═══════════════════════════════════ */}
        {activeSection === 'merch' && (
          <View>
            {/* Hero banner */}
            <View style={s.merchHero}>
              <Text style={s.merchHeroTitle}>NO GUIDE NEEDED</Text>
              <Text style={s.merchHeroSub}>Premium bamboo performance gear</Text>
              <Text style={s.merchHeroDetail}>
                Lightweight bamboo viscose fabric — UPF 50+, antimicrobial, buttery soft. Tonal coastal patterns inspired by the water. Seasonal drops, shipped direct.
              </Text>
            </View>

            {/* Merch grid */}
            {NGN_MERCH.map(item => (
              <TouchableOpacity
                key={item.id}
                style={s.merchCard}
                onPress={() => handleMerchTap(item)}
                activeOpacity={0.85}
              >
                <View style={s.merchCardHeader}>
                  <Text style={s.merchIcon}>{MERCH_ICON[item.type] ?? '🏷️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.merchName}>{item.name}</Text>
                    {item.material && (
                      <Text style={s.merchMaterial}>{item.material}</Text>
                    )}
                    <Text style={s.merchDesc}>{item.description}</Text>
                    {/* Season + fit badges */}
                    <View style={s.merchBadgeRow}>
                      <View style={[s.merchBadge, { borderColor: SEASON_COLOR[item.season] }]}>
                        <Text style={[s.merchBadgeText, { color: SEASON_COLOR[item.season] }]}>
                          {SEASON_LABEL[item.season]}
                        </Text>
                      </View>
                      {item.genderFit && item.genderFit !== 'unisex' && (
                        <View style={[s.merchBadge, { borderColor: COLORS.textMuted }]}>
                          <Text style={[s.merchBadgeText, { color: COLORS.textMuted }]}>
                            {item.genderFit === 'mens' ? "MEN'S FIT" : "WOMEN'S FIT"}
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.colors && (
                      <Text style={s.merchColors}>
                        {item.colors.join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Text style={s.merchPrice}>{item.priceDisplay}</Text>
                </View>
                <View style={s.merchBuyRow}>
                  <Text style={s.merchBuyText}>SHOP NOW →</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Merch CTA */}
            <View style={s.merchCta}>
              <Text style={s.merchCtaText}>
                Seasonal drops keep the line fresh. Want to see NGN in your local tackle shop? Let us know — we're expanding.
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════
            SECTION 2 — AFFILIATE TACKLE
            ═══════════════════════════════════ */}
        {activeSection === 'gear' && (
          <View>
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
                <View style={s.productHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{product.name}</Text>
                    <Text style={s.productBrand}>{product.brand}</Text>
                  </View>
                  <Text style={s.productPrice}>{product.priceRange}</Text>
                </View>

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
                <Text style={s.emptySub}>More gear added weekly based on AI report recommendations.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Affiliate Disclosure (always visible) ── */}
        <View style={s.disclosureBox}>
          <Text style={s.disclosureText}>
            {activeSection === 'gear'
              ? 'NGN Fishing earns a small commission on purchases made through these links at no extra cost to you. This helps fund the app and keep reports free.'
              : 'All NGN merch is printed on demand and shipped directly to you. 100% of proceeds support NGN Fishing development.'}
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
    marginBottom: 14,
  },

  // ── Section toggle ────────────────
  sectionToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GRID_LINE,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: PANEL_BG,
  },
  sectionTabActive: {
    backgroundColor: `${COLORS.seafoam}18`,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.seafoam,
  },
  sectionTabText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  sectionTabTextActive: {
    color: COLORS.seafoam,
  },

  // ── Merch hero ────────────────────
  merchHero: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: COLORS.seafoam,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  merchHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 4,
    marginBottom: 4,
  },
  merchHeroSub: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  merchHeroDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },

  // ── Merch cards ───────────────────
  merchCard: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: GRID_LINE,
    padding: 14,
    marginBottom: 10,
  },
  merchCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  merchIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  merchName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: MONO,
  },
  merchDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 3,
  },
  merchMaterial: {
    fontSize: 9,
    color: COLORS.seafoam,
    fontFamily: MONO,
    letterSpacing: 0.5,
    marginTop: 2,
    fontWeight: '600',
  },
  merchBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  merchBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  merchBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  merchColors: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontFamily: MONO,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  merchPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.seafoam,
    fontFamily: MONO,
    marginLeft: 8,
  },
  merchBuyRow: {
    backgroundColor: COLORS.seafoam,
    paddingVertical: 9,
    alignItems: 'center',
  },
  merchBuyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#060E1A',
    fontFamily: MONO,
    letterSpacing: 2,
  },

  // ── Merch CTA ─────────────────────
  merchCta: {
    padding: 14,
    backgroundColor: `${PANEL_BG}88`,
    borderWidth: 1,
    borderColor: GRID_LINE,
    marginTop: 6,
    marginBottom: 4,
  },
  merchCtaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ── Category pills ────────────────
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

  // ── Product cards ─────────────────
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

  // ── Tags ──────────────────────────
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

  // ── Buy buttons ───────────────────
  buyRow: { flexDirection: 'row', gap: 8 },
  buyBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  buyBtnPrimary: { backgroundColor: COLORS.seafoam },
  buyBtnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.seafoam },
  buyBtnText: { fontSize: 10, fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
  buyBtnTextPrimary: { color: '#060E1A' },
  buyBtnTextSecondary: { color: COLORS.seafoam },

  // ── Empty state ───────────────────
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: MONO, marginBottom: 6 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  // ── Disclosure ────────────────────
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
