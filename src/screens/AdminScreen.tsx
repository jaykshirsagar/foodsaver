import { SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Listing } from '../types/marketplace';

type AdminScreenProps = {
  listings: Listing[];
};

export function AdminScreen({ listings }: AdminScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const tablet = width >= 768;
  const donations = listings.filter((item) => item.mode === 'Donate').length;
  const priced = listings.filter((item) => item.mode === 'Price').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          compact && styles.pageCompact,
          tablet && styles.pageTablet,
        ]}
      >
        <View style={styles.contentColumn}>
          <View style={[styles.card, compact && styles.cardCompact]}>
            <Text style={[styles.title, compact && styles.titleCompact]}>Panou administrator</Text>
            <Text style={[styles.metric, compact && styles.metricCompact]}>Total anunturi: {listings.length}</Text>
            <Text style={[styles.metric, compact && styles.metricCompact]}>Donatii: {donations}</Text>
            <Text style={[styles.metric, compact && styles.metricCompact]}>Anunturi cu pret: {priced}</Text>
            <Text style={styles.note}>
              Acest ecran este protejat pe rol. In productie, aplica restrictiile prin reguli Firestore
              si custom claims.
            </Text>
          </View>
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
  pageCompact: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  pageTablet: {
    paddingHorizontal: 24,
  },
  contentColumn: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#1f2d3f',
    borderRadius: 26,
    padding: 18,
    gap: 8,
  },
  cardCompact: {
    padding: 14,
    borderRadius: 22,
  },
  title: {
    color: '#f6fbff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 21,
  },
  metric: {
    color: '#d4e2ef',
    fontSize: 16,
  },
  metricCompact: {
    fontSize: 15,
  },
  note: {
    marginTop: 8,
    color: '#9cb2c9',
    lineHeight: 20,
  },
});
