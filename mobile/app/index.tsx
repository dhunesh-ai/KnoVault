import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to tabs; _layout.tsx will intercept and send to login if not authenticated
  return <Redirect href="/(tabs)" />;
}
