import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RedirectToCreateSpecialDay() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  return <Redirect href={{ pathname: '/special_days/create', params: editId ? { editId } : {} }} />;
}
