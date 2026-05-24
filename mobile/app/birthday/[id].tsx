import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RedirectToSpecialDay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/special_day/${id}`} />;
}
