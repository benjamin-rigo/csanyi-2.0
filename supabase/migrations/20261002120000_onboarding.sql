-- Első lépések (9a, 9b): a pedagógus a minta után a saját gyakorló projektjében tanul (döntésnapló).
-- profiles.onboarding_step: 6 = kész (addig az Új projekt nem aktív).

alter table projects add column is_practice boolean not null default false;
alter table profiles add column practice_project_id uuid references projects on delete set null;
