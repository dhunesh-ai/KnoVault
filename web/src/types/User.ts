export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_verified: boolean;
  firebase_uid?: string | null;
  created_at?: string;
  avatar_url?: string | null;
}
