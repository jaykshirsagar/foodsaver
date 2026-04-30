import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { mockListings } from './src/data/mockListings';
import { createListing, deleteListing, subscribeListings, updateListing } from './src/services/listingService';
import { AccountScreen } from './src/screens/AccountScreen';
import { AddListingScreen } from './src/screens/AddListingScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { UnauthorizedScreen } from './src/screens/UnauthorizedScreen';
import { CreateListingPayload, Listing, UpdateListingPayload } from './src/types/marketplace';

type AppTab = 'market' | 'add' | 'admin' | 'account';

const TAB_ICONS: Record<AppTab, keyof typeof Ionicons.glyphMap> = {
  market: 'storefront-outline',
  add: 'add-circle-outline',
  admin: 'shield-checkmark-outline',
  account: 'person-circle-outline',
};

function AppContent() {
  const { width } = useWindowDimensions();
  const isDesktopLayout = width >= 1024;
  const isCompactDesktop = isDesktopLayout && width < 1150;
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('market');
  const [listings, setListings] = useState<Listing[]>(mockListings);
  const tabScale = useRef<Record<AppTab, Animated.Value>>({
    market: new Animated.Value(1),
    add: new Animated.Value(1),
    admin: new Animated.Value(1),
    account: new Animated.Value(1),
  }).current;
  const isAdmin = profile?.role === 'admin';
  const canAddItems = profile?.role === 'vanzator' || profile?.role === 'admin';

  const tabs = useMemo(
    () =>
      isAdmin && canAddItems
        ? [
            { key: 'market' as const, label: 'Piata' },
            { key: 'add' as const, label: 'Adauga' },
            { key: 'admin' as const, label: 'Admin' },
            { key: 'account' as const, label: 'Cont' },
          ]
        : isAdmin
          ? [
              { key: 'market' as const, label: 'Piata' },
              { key: 'admin' as const, label: 'Admin' },
              { key: 'account' as const, label: 'Cont' },
            ]
          : canAddItems
            ? [
                { key: 'market' as const, label: 'Piata' },
                { key: 'add' as const, label: 'Adauga' },
                { key: 'account' as const, label: 'Cont' },
              ]
        : [
            { key: 'market' as const, label: 'Piata' },
            { key: 'account' as const, label: 'Cont' },
          ],
    [isAdmin, canAddItems],
  );

  const webContentMaxWidth = useMemo(() => {
    if (activeTab === 'market') {
      return 980;
    }

    if (activeTab === 'add') {
      return 860;
    }

    if (activeTab === 'admin') {
      return 920;
    }

    return 760;
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') {
      setActiveTab('market');
    }

    if (!canAddItems && activeTab === 'add') {
      setActiveTab('market');
    }

  }, [activeTab, isAdmin, canAddItems]);

  useEffect(() => {
    if (isDesktopLayout) {
      return;
    }

    (Object.keys(tabScale) as AppTab[]).forEach((key) => {
      Animated.spring(tabScale[key], {
        toValue: activeTab === key ? 1.08 : 1,
        useNativeDriver: true,
        friction: 7,
        tension: 130,
      }).start();
    });
  }, [activeTab, tabScale, isDesktopLayout]);

  useEffect(() => {
    if (!user) {
      setListings(mockListings);
      return;
    }

    const unsubscribe = subscribeListings(
      (nextListings) => {
        setListings(nextListings);
      },
      (error) => {
        console.warn('Listings listener error', error);
      },
    );

    return unsubscribe;
  }, [user]);

  async function handlePublish(payload: CreateListingPayload): Promise<void> {
    if (!user || !profile) {
      return;
    }

    await createListing(payload, user, profile);
  }

  async function handleDeleteListing(listingId: string): Promise<void> {
    if (!isAdmin) {
      throw new Error('Doar adminul poate sterge anunturi din Piata.');
    }

    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      throw new Error('Anuntul nu mai exista.');
    }

    await deleteListing(listingId);
  }

  async function handleDeleteOwnListing(listingId: string): Promise<void> {
    if (!user) {
      throw new Error('Trebuie sa fii autentificat pentru a sterge anuntul.');
    }

    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      throw new Error('Anuntul nu mai exista.');
    }

    if (listing.ownerUid !== user.uid) {
      throw new Error('Poti sterge doar propriile anunturi.');
    }

    await deleteListing(listingId);
  }

  async function handleUpdateOwnListing(listingId: string, payload: UpdateListingPayload): Promise<void> {
    if (!user) {
      return;
    }

    const listing = listings.find((item) => item.id === listingId);
    if (!listing || listing.ownerUid !== user.uid) {
      return;
    }

    await updateListing(listingId, payload);
  }

  function handleTabPress(tab: AppTab) {
    if (isDesktopLayout) {
      setActiveTab(tab);
      return;
    }

    Animated.sequence([
      Animated.timing(tabScale[tab], {
        toValue: 1.17,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(tabScale[tab], {
        toValue: activeTab === tab ? 1.08 : 1.03,
        useNativeDriver: true,
        friction: 5,
        tension: 170,
      }),
    ]).start();

    setActiveTab(tab);
  }

  const activeScreen =
    activeTab === 'market' ? (
      <MarketplaceScreen listings={listings} onDeleteListing={handleDeleteListing} />
    ) : activeTab === 'add' ? (
      canAddItems ? <AddListingScreen onPublish={handlePublish} /> : <UnauthorizedScreen />
    ) : activeTab === 'admin' ? (
      profile?.role === 'admin' ? <AdminScreen listings={listings} /> : <UnauthorizedScreen />
    ) : (
      <AccountScreen
        listings={listings}
        onDeleteOwnListing={handleDeleteOwnListing}
        onUpdateOwnListing={handleUpdateOwnListing}
      />
    );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>Se incarca sesiunea...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.root, isDesktopLayout && styles.webRoot]}>
      <StatusBar style="light" />
      {isDesktopLayout ? (
        <View style={[styles.webLayout, isCompactDesktop && styles.webLayoutCompact]}>
          <View
            style={[
              styles.webHeader,
              isCompactDesktop && styles.webHeaderCompact,
              !isCompactDesktop && { maxWidth: webContentMaxWidth },
            ]}
          >
            <Text style={[styles.webTitle, isCompactDesktop && styles.webTitleCompact]}>FoodSaver</Text>
            <View style={[styles.webTabBar, isCompactDesktop && styles.webTabBarCompact]}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.webTabButton,
                    isCompactDesktop && styles.webTabButtonCompact,
                    activeTab === tab.key && styles.webTabButtonActive,
                  ]}
                  onPress={() => handleTabPress(tab.key)}
                >
                  <Ionicons
                    name={TAB_ICONS[tab.key]}
                    size={isCompactDesktop ? 16 : 18}
                    style={[styles.webTabIcon, activeTab === tab.key && styles.webTabIconActive]}
                  />
                  <Text style={[styles.webTabText, isCompactDesktop && styles.webTabTextCompact, activeTab === tab.key && styles.webTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.webContent,
              !isCompactDesktop && { maxWidth: webContentMaxWidth },
              isCompactDesktop && styles.webContentCompact,
            ]}
          >
            {activeScreen}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.screenContainer}>{activeScreen}</View>

          <View style={styles.bottomTabBar}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab.key)}
              >
                <Animated.View
                  style={[
                    styles.tabBubble,
                    activeTab === tab.key && styles.tabBubbleActive,
                    { transform: [{ scale: tabScale[tab.key] }] },
                  ]}
                >
                  <Ionicons
                    name={TAB_ICONS[tab.key]}
                    size={20}
                    style={[styles.tabIcon, activeTab === tab.key && styles.tabIconActive]}
                  />
                </Animated.View>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c1117',
  },
  webRoot: {
    backgroundColor: '#070d14',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1117',
  },
  loadingText: {
    color: '#d4e2ef',
    fontSize: 16,
  },
  webLayout: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 1180,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  webLayoutCompact: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  webHeader: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#22354a',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0e1a28',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  webHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  webTitle: {
    color: '#f3f8ff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  webTitleCompact: {
    fontSize: 18,
  },
  webTabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  webTabBarCompact: {
    width: '100%',
    justifyContent: 'flex-start',
    gap: 6,
  },
  webTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#325172',
    backgroundColor: '#102133',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  webTabButtonCompact: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  webTabButtonActive: {
    borderColor: '#92c3f9',
    backgroundColor: '#1f5f9f',
  },
  webTabIcon: {
    color: '#9bb4ce',
  },
  webTabIconActive: {
    color: '#f4f9ff',
  },
  webTabText: {
    color: '#b0c4d8',
    fontWeight: '700',
  },
  webTabTextCompact: {
    fontSize: 13,
  },
  webTabTextActive: {
    color: '#f4f9ff',
  },
  webContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#1a2a3b',
    borderRadius: 24,
    overflow: 'hidden',
  },
  webContentCompact: {
    borderRadius: 20,
  },
  bottomTabBar: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#27405f',
    backgroundColor: '#0d1723',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#2f4a6a',
    backgroundColor: '#102031',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBubbleActive: {
    borderColor: '#9fd0ff',
    backgroundColor: '#2a6fb4',
    shadowColor: '#4ea0ff',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  tabIcon: {
    color: '#8ea8c4',
  },
  tabIconActive: {
    color: '#f6fbff',
  },
  tabText: {
    color: '#8aa2bc',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f8fcff',
  },
  screenContainer: {
    flex: 1,
    paddingBottom: 4,
  },
});
