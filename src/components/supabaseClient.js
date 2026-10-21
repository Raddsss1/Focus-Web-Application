import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Sign-up: role + full_name go into metadata; the SQL trigger builds the profile.
export const signUp = (email, password, full_name, role) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name, role } } });
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export async function getRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role ?? null;   // route: 'teacher' -> <TeacherDashboard/>, 'student' -> <StudentRecords/>
}
