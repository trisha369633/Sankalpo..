alter table public.challenges
  add column if not exists instructions text,
  add column if not exists proof_requirements text,
  add column if not exists important_notes text;
