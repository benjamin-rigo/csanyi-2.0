-- Meghívások: bármelyik pedagógus meghívhat kollégát (döntésnapló). Naplózzuk, ki kit hívott meg,
-- és ebből számoljuk a napi keretet. Írni csak a teacher-account függvény (service_role) tud.

create table invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create index on invitations (inviter_id, created_at);

alter table invitations enable row level security;

create policy "meghívás: saját olvasás" on invitations for select to authenticated using (inviter_id = auth.uid());
