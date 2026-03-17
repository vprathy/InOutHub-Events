ALTER TABLE public.act_assets
    DROP CONSTRAINT IF EXISTS act_assets_asset_type_check;

ALTER TABLE public.act_assets
    ADD CONSTRAINT act_assets_asset_type_check
    CHECK (asset_type IN ('Audio', 'Prop', 'Instrument', 'Other'));
