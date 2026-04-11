import { Redirect } from 'expo-router';
import { useAuthStore } from '@stores/index';

export default function Index() {
  const user = useAuthStore((s) => s.user);

  // If logged in, go to tabs; otherwise go to login
  if (user) {
    return <Redirect href="/tabs" />;
  }

  return <Redirect href="/login" />;
}
