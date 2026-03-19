import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { logAuthEvent } from '@/lib/authTelemetry';

type UserProfileRow = {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_number: string | null;
    timezone_pref: string | null;
    metadata: Record<string, unknown> | null;
};

type ProfileDetailsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    required?: boolean;
    onSaved?: () => void;
};

export function ProfileDetailsModal({
    isOpen,
    onClose,
    required = false,
    onSaved,
}: ProfileDetailsModalProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfileRow | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notice, setNotice] = useState('');

    const detectedTimezone = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        []
    );

    useEffect(() => {
        if (!isOpen || !user?.id) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        void (async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('first_name,last_name,email,phone_number,timezone_pref,metadata')
                .eq('id', user.id)
                .maybeSingle();

            if (!isMounted) return;

            if (error || !data) {
                setIsLoading(false);
                return;
            }

            const row = data as UserProfileRow;
            const metadata = (row.metadata ?? {}) as Record<string, unknown>;
            const needsConfirmation =
                !metadata.profile_confirmed_at ||
                !row.first_name?.trim() ||
                !row.last_name?.trim() ||
                !row.phone_number?.trim();

            setProfile(row);
            setFirstName(row.first_name ?? '');
            setLastName(row.last_name ?? '');
            setPhoneNumber(row.phone_number ?? '');
            setIsLoading(false);

            if (required && needsConfirmation) {
                await logAuthEvent('profile_check_shown', {
                    metadata: {
                        has_name: Boolean(row.first_name?.trim() && row.last_name?.trim()),
                        has_phone: Boolean(row.phone_number?.trim()),
                        detected_timezone: detectedTimezone,
                        stored_timezone: row.timezone_pref,
                    },
                });
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [detectedTimezone, isOpen, required, user?.id]);

    const handleSave = async () => {
        if (!user?.id || !firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
            setNotice('Add your name and mobile number to continue.');
            return;
        }

        setIsSaving(true);
        setNotice('');

        const nextMetadata = {
            ...((profile?.metadata ?? {}) as Record<string, unknown>),
            profile_confirmed_at: new Date().toISOString(),
            profile_confirmed_timezone: detectedTimezone,
        };

        const { error } = await supabase
            .from('user_profiles')
            .update({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone_number: phoneNumber.trim(),
                timezone_pref: profile?.timezone_pref || detectedTimezone,
                metadata: nextMetadata,
            })
            .eq('id', user.id);

        setIsSaving(false);

        if (error) {
            setNotice(error.message || 'Could not save your details.');
            return;
        }

        await logAuthEvent('profile_check_completed', {
            metadata: {
                timezone: profile?.timezone_pref || detectedTimezone,
                has_phone: true,
                source: required ? 'gate' : 'manual',
            },
        });

        onSaved?.();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={required ? () => {} : onClose}
            title={required ? 'Confirm your details' : 'Update profile'}
            hideCloseButton={required}
            closeOnBackdrop={!required}
        >
            <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                    {required
                        ? 'Confirm the minimum operator details we should use for support and troubleshooting.'
                        : 'Update the account details we use for support, alerts, and troubleshooting.'}
                </p>

                {isLoading ? (
                    <div className="flex min-h-[140px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">First Name</label>
                                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 rounded-2xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Last Name</label>
                                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 rounded-2xl" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Mobile Number</label>
                            <Input
                                type="tel"
                                autoComplete="tel"
                                inputMode="tel"
                                value={phoneNumber}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                className="h-11 rounded-2xl"
                            />
                        </div>

                        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm">
                            <p className="font-semibold text-foreground">{profile?.email || user?.email}</p>
                            <p className="mt-1 text-muted-foreground">Timezone: {profile?.timezone_pref || detectedTimezone}</p>
                            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                Cast and crew records are managed by organization and event admins. This only updates your signed-in account profile.
                            </p>
                        </div>

                        {notice ? <p className="text-sm text-rose-600">{notice}</p> : null}

                        <div className="flex gap-3">
                            {required ? null : (
                                <Button
                                    variant="outline"
                                    className="h-11 flex-1 rounded-2xl"
                                    onClick={onClose}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button className="h-11 flex-1 rounded-2xl" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {required ? 'Looks Good' : 'Save Changes'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export function ProfileConfirmationGate() {
    const { user, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            setIsOpen(false);
            return;
        }

        let isMounted = true;

        void (async () => {
            const { data } = await supabase
                .from('user_profiles')
                .select('first_name,last_name,phone_number,metadata')
                .eq('id', user.id)
                .maybeSingle();

            if (!isMounted || !data) return;

            const metadata = ((data.metadata ?? {}) as Record<string, unknown>) || {};
            const needsConfirmation =
                !metadata.profile_confirmed_at ||
                !data.first_name?.trim() ||
                !data.last_name?.trim() ||
                !data.phone_number?.trim();

            setIsOpen(needsConfirmation);
        })();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, user?.id]);

    return <ProfileDetailsModal isOpen={isOpen} onClose={() => {}} required onSaved={() => setIsOpen(false)} />;
}
