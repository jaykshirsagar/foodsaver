import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListingForm } from '../features/marketplace/ListingForm';
import { useAuth } from '../context/AuthContext';
import { CreateListingPayload } from '../types/marketplace';

type AddListingScreenProps = {
  onPublish: (payload: CreateListingPayload) => Promise<void>;
};

export function AddListingScreen({ onPublish }: AddListingScreenProps) {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.contentColumn}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Zona vanzator</Text>
            <Text style={styles.heading}>Adauga un item nou</Text>
            <Text style={styles.subHeading}>
              Creeaza un anunt cu poze optionale si publica-l pe piata.
            </Text>
          </View>

          <ListingForm canCreate={profile?.role === 'vanzator' || profile?.role === 'admin'} onCreate={onPublish} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c1117',
  },
  page: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  contentColumn: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#132033',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#29405f',
  },
  eyebrow: {
    color: '#93c5fd',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heading: {
    color: '#f6fbff',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 6,
  },
  subHeading: {
    color: '#c4d5e5',
    marginTop: 8,
    lineHeight: 20,
  },
});
