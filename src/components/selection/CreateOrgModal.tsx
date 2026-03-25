import React, { useState, useEffect } from 'react';
import { X, Loader2, Landmark, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface CreateOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orgId: string) => void;
    initialData?: { id: string; name: string } | null;
    requiresReviewOnCreate?: boolean;
}

export function CreateOrgModal({ isOpen, onClose, onSuccess, initialData, requiresReviewOnCreate = false }: CreateOrgModalProps) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [type, setType] = useState('Cultural Org');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
        } else if (isOpen && !initialData) {
            setName('');
            setType('Cultural Org');
            setEmail(user?.email || '');
        }
    }, [initialData, isOpen, requiresReviewOnCreate, user?.email]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        setError('');

        try {
            if (initialData) {
                // Update existing organization
                const { error: updateError } = await supabase
                    .from('organizations')
                    .update({ name })
                    .eq('id', initialData.id);

                if (updateError) throw updateError;
                onSuccess(initialData.id);
            } else {
                // Atomic: creates org + inserts Owner row in a single DB transaction
                const { data: orgId, error: rpcError } = await (supabase as any)
                    .rpc('create_organization_with_owner', {
                        p_name: name,
                        p_contact_email: email.trim() || null,
                        p_requires_review: requiresReviewOnCreate,
                    });

                if (rpcError) throw rpcError;

                onSuccess(orgId as string);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create organization');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">
                        {initialData ? 'Edit Organization' : 'New Organization'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Org Name</label>
                            <div className="relative">
                                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    placeholder="e.g. Natyasala School"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Org Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                            >
                                <option value="School">School / Academy</option>
                                <option value="Cultural Org">Cultural Organization</option>
                                <option value="Talent Show">Talent Show / Production</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    placeholder="admin@organization.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        {requiresReviewOnCreate && !initialData ? (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-medium text-amber-700">
                                Your workspace opens immediately and enters pilot review in the background. Higher-risk actions stay limited until internal approval is complete.
                            </div>
                        ) : null}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !name}
                        className="w-full py-4 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{initialData ? 'Save Changes' : 'Create Organization'}</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}
