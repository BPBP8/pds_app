import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  getAuthErrorMessage,
  MAX_DISPLAY_NAME_LENGTH,
  useAuth,
} from '@/src/auth-context';

type Mode = 'sign-in' | 'register';

const RETURN_ROUTES = new Set(['/modal', '/ask-question', '/(tabs)/profile', '/(tabs)/shoot']);

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string; deviceName?: string }>();
  const { user, loading, signIn, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const returnTo = useMemo(() => {
    const requested = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    const isSafeDetail = requested
      && (requested.startsWith('/shot/') || requested.startsWith('/post/') || requested.startsWith('/question/'))
      && !requested.includes('..');
    return requested && (RETURN_ROUTES.has(requested) || isSafeDetail)
      ? requested
      : '/(tabs)/profile';
  }, [params.returnTo]);

  const requestedDeviceName = useMemo(() => {
    const value = Array.isArray(params.deviceName) ? params.deviceName[0] : params.deviceName;
    return value?.trim().slice(0, 80) || '';
  }, [params.deviceName]);

  useEffect(() => {
    if (loading || !user) return;
    if (returnTo === '/modal' && requestedDeviceName) {
      router.replace({
        pathname: '/modal' as never,
        params: { deviceName: requestedDeviceName },
      });
      return;
    }
    router.replace(returnTo as never);
  }, [loading, requestedDeviceName, returnTo, router, user]);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('请填写邮箱和密码。');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要 6 位。');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      setError('请填写一个昵称。');
      return;
    }
    if (mode === 'register' && displayName.trim().length > MAX_DISPLAY_NAME_LENGTH) {
      setError(`昵称不能超过 ${MAX_DISPLAY_NAME_LENGTH} 个字符。`);
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(displayName, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError('先填写邮箱，再点击找回密码。');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(email);
      Alert.alert('邮件已发送', '请前往邮箱按提示重置密码。');
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#D85331" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      >
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={19} color="#353133" />
        </Pressable>

        <View style={styles.brandMark}>
          <IconSymbol name="camera.fill" size={29} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>{mode === 'sign-in' ? '登录拍点啥' : '创建账号'}</Text>
        <Text style={styles.subtitle}>登录后可以点赞、收藏灵感并发布自己的单图作品。</Text>

        <View style={styles.modeSwitch}>
          {(['sign-in', 'register'] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.modeButton, mode === item && styles.modeButtonActive]}
              onPress={() => {
                setMode(item);
                setError('');
              }}
            >
              <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                {item === 'sign-in' ? '登录' : '注册'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'register' ? (
          <Field
            label="昵称"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="例如：北京拍照练习生"
            maxLength={MAX_DISPLAY_NAME_LENGTH}
          />
        ) : null}
        <Field
          label="邮箱"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="密码"
          value={password}
          onChangeText={setPassword}
          placeholder="至少 6 位"
          secureTextEntry
        />
        {mode === 'register' ? (
          <Field
            label="确认密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="再次输入密码"
            secureTextEntry
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>{mode === 'sign-in' ? '登录' : '注册并登录'}</Text>
          )}
        </TouchableOpacity>

        {mode === 'sign-in' ? (
          <TouchableOpacity style={styles.resetButton} onPress={sendReset} disabled={submitting}>
            <Text style={styles.resetText}>忘记密码？发送重置邮件</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.legal}>账号用于同步你的作品、点赞与想拍清单。</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor="#AAA3A6"
        selectionColor="#D85331"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDFC' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 36 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDFC' },
  closeButton: {
    alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2ECE8',
  },
  brandMark: {
    marginTop: 18, width: 58, height: 58, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#D85331',
  },
  title: { marginTop: 18, color: '#242123', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 8, color: '#7F777A', fontSize: 14, lineHeight: 21 },
  modeSwitch: {
    marginTop: 28, marginBottom: 20, flexDirection: 'row', padding: 4,
    borderRadius: 14, backgroundColor: '#F2ECE8',
  },
  modeButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#FFFFFF' },
  modeText: { color: '#91898C', fontSize: 14, fontWeight: '700' },
  modeTextActive: { color: '#D85331' },
  field: { marginBottom: 15 },
  label: { marginBottom: 7, color: '#4D484A', fontSize: 12, fontWeight: '800' },
  input: {
    minHeight: 52, borderWidth: 1, borderColor: '#E6DEDA', borderRadius: 14,
    paddingHorizontal: 15, color: '#282426', backgroundColor: '#FFFFFF', fontSize: 15,
  },
  error: { marginTop: 2, marginBottom: 12, color: '#B63E29', fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D85331', marginTop: 5,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  resetButton: { alignItems: 'center', paddingVertical: 18 },
  resetText: { color: '#7F777A', fontSize: 13, fontWeight: '700' },
  legal: { marginTop: 'auto', paddingTop: 28, textAlign: 'center', color: '#AAA3A6', fontSize: 11 },
});
