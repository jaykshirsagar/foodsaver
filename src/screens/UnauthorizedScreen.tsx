import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export function UnauthorizedScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>Acces interzis</Text>
        <Text style={styles.text}>Rolul tau nu are acces in aceasta sectiune.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c1117',
    justifyContent: 'center',
    padding: 16,
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
  title: {
    color: '#f6fbff',
    fontSize: 24,
    fontWeight: '800',
  },
  text: {
    color: '#d4e2ef',
    fontSize: 16,
  },
});
