import { Redirect } from 'expo-router';

/** Deep-link target for notification taps: emotionary://today → Today tab. */
export default function TodayRedirect() {
  return <Redirect href="/" />;
}
