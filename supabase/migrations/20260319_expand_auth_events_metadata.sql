ALTER TABLE public.auth_events
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.auth_events
    DROP CONSTRAINT IF EXISTS auth_events_event_type_check;

ALTER TABLE public.auth_events
    ADD CONSTRAINT auth_events_event_type_check
    CHECK (
        event_type IN (
            'magic_link_requested',
            'email_code_requested',
            'email_code_verified',
            'google_login_started',
            'google_login_completed',
            'install_help_opened',
            'profile_check_shown',
            'profile_check_completed',
            'login_completed',
            'logout',
            'session_timeout'
        )
    );
