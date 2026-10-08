-- Minimal, nullable impact metadata.
-- Existing rows and current frontend behavior remain valid.

-- Minimal, nullable impact metadata.
-- Existing rows and all current profile counters remain unchanged.

alter table public.challenges
  add column if not exists impact_type text
    constraint challenges_impact_type_check check (impact_type in ('actions', 'trees', 'waste')),
  add column if not exists target_value numeric,
  add column if not exists target_unit text
    constraint challenges_target_unit_check check (target_unit in ('actions', 'trees', 'kg'));

alter table public.submissions
  add column if not exists reported_waste_kg numeric,
  add column if not exists verified_waste_kg numeric,
  add column if not exists verified_trees numeric,
  add column if not exists before_photo_url text,
  add column if not exists after_photo_url text;

-- Do not assign a default impact type. Existing challenge rows remain valid
-- and can be presented as generic actions until an admin sets a target.
