import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { formatAuthError } from '../services/authService';
import { SignUpRole } from '../types/auth';

const ROLES: SignUpRole[] = ['vanzator', 'utilizator'];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<SignUpRole>('utilizator');
  const [error, setError] = useState('');

  async function onSubmit() {
    try {
      setError('');
      if (isRegister) {
        if (!displayName.trim()) {
          setError('Numele afisat este obligatoriu.');
          return;
        }

        if (password !== confirmPassword) {
          setError('Parolele nu coincid.');
          return;
        }

        await signUp({ email, password, displayName, role });
        return;
      }

      await signIn(email, password);
    } catch (error: unknown) {
      setError(formatAuthError(error));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>Autentificare FoodSaver</Text>
        <Text style={styles.subtitle}>Login Firebase cu control acces pe roluri</Text>

        {isRegister && (
          <TextInput
            placeholder="Nume afisat"
            placeholderTextColor="#8fa2b8"
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#8fa2b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Parola"
          placeholderTextColor="#8fa2b8"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {isRegister && (
          <TextInput
            placeholder="Confirma parola"
            placeholderTextColor="#8fa2b8"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        {isRegister && (
          <>
            <Text style={styles.label}>Rol</Text>
            <View style={styles.pillsWrap}>
              {ROLES.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.pill, role === item && styles.pillActive]}
                  onPress={() => setRole(item)}
                >
                  <Text style={[styles.pillText, role === item && styles.pillTextActive]}>
                    {item === 'vanzator' ? 'Vanzator' : 'Utilizator'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={onSubmit}>
          <Text style={styles.primaryButtonText}>{isRegister ? 'Creeaza cont' : 'Autentificare'}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsRegister((prev) => !prev);
            setError('');
            setConfirmPassword('');
          }}
        >
          <Text style={styles.linkText}>
            {isRegister ? 'Ai deja cont? Autentifica-te' : 'Nu ai cont? Inregistreaza-te'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c1117',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#1f2d3f',
    borderRadius: 26,
    padding: 18,
    gap: 10,
  },
  title: {
    color: '#f6fbff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a6bacf',
    marginBottom: 6,
  },
  label: {
    color: '#a7b8c8',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f141c',
    borderColor: '#253447',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#e5f0ff',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderColor: '#345172',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: '#22558f',
    borderColor: '#84b9f2',
  },
  pillText: {
    color: '#9cb2c9',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#f8fcff',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#f0b429',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#2f2200',
    fontWeight: '800',
    fontSize: 15,
  },
  linkText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#88bff6',
    fontWeight: '600',
  },
  error: {
    color: '#fca5a5',
  },
});
