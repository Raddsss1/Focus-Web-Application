-- ClassMeet schema. Paste into Supabase > SQL Editor > Run.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text default '',
  role text not null default 'student' check (role in ('teacher','student')),
  created_at timestamptz default now()
);
create table classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  code text unique not null,
  live_meet_url text,
  created_at timestamptz default now()
);
create table enrollments (
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (class_id, student_id)
);
create table sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  meet_code text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  last_seen timestamptz default now(),
  total_seconds int default 0, away_seconds int default 0,
  mic_seconds int default 0,   cam_seconds int default 0,
  hand_raises int default 0,   reactions int default 0,
  mic_on boolean default false, cam_on boolean default false,
  hand_up boolean default false, tab_active boolean default true
);
create table events (
  id bigint generated always as identity primary key,
  session_id uuid references sessions(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  type text not null,  -- joined, left, tab_left, tab_returned, mic_on, mic_off, cam_on, cam_off, hand_raised, hand_lowered, reaction
  detail text,
  created_at timestamptz default now()
);
create index on sessions(class_id, started_at desc);
create index on events(session_id, created_at);

-- Auto-create a profile when someone signs up (role/full_name come from signup metadata)
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Helpers (security definer = avoids RLS recursion)
create function is_teacher_of(cid uuid) returns boolean language sql security definer stable set search_path = public as
$$ select exists(select 1 from classes where id = cid and teacher_id = auth.uid()) $$;
create function is_enrolled(cid uuid) returns boolean language sql security definer stable set search_path = public as
$$ select exists(select 1 from enrollments where class_id = cid and student_id = auth.uid()) $$;

-- Teacher gets a unique class code
create function create_class(p_name text) returns classes language plpgsql security definer set search_path = public as $$
declare c classes; v_code text;
begin
  if not exists(select 1 from profiles where id = auth.uid() and role = 'teacher') then raise exception 'Only teachers can create classes'; end if;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists(select 1 from classes where code = v_code);
  end loop;
  insert into classes(teacher_id, name, code) values (auth.uid(), p_name, v_code) returning * into c;
  return c;
end $$;

-- Student joins with the code
create function join_class(p_code text) returns classes language plpgsql security definer set search_path = public as $$
declare c classes;
begin
  if not exists(select 1 from profiles where id = auth.uid() and role = 'student') then raise exception 'Only students can join classes'; end if;
  select * into c from classes where code = upper(trim(p_code));
  if c.id is null then raise exception 'Invalid class code'; end if;
  insert into enrollments(class_id, student_id) values (c.id, auth.uid()) on conflict do nothing;
  return c;
end $$;

-- Row Level Security: the anon key is safe to ship because of these rules
alter table profiles enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table sessions enable row level security;
alter table events enable row level security;

create policy "own profile or my students" on profiles for select using (
  id = auth.uid() or exists (select 1 from enrollments e join classes c on c.id = e.class_id
                             where e.student_id = profiles.id and c.teacher_id = auth.uid()));
create policy "teacher or enrolled read class" on classes for select using (teacher_id = auth.uid() or is_enrolled(id));
create policy "teacher edits class" on classes for update using (teacher_id = auth.uid());
create policy "teacher deletes class" on classes for delete using (teacher_id = auth.uid());
create policy "read enrollments" on enrollments for select using (student_id = auth.uid() or is_teacher_of(class_id));
create policy "leave class" on enrollments for delete using (student_id = auth.uid());
create policy "read sessions" on sessions for select using (student_id = auth.uid() or is_teacher_of(class_id));
create policy "student starts session" on sessions for insert with check (student_id = auth.uid() and is_enrolled(class_id));
create policy "student updates session" on sessions for update using (student_id = auth.uid());
create policy "read events" on events for select using (student_id = auth.uid() or is_teacher_of(class_id));
create policy "student logs events" on events for insert with check (student_id = auth.uid());

-- Live updates for the teacher dashboard
alter publication supabase_realtime add table sessions, events;
