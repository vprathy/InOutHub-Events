import React, { useState } from 'react';
import { X, Loader2, UserPlus, Trash2, Calendar, ShieldCheck } from 'lucide-react';
import { useEventMembers, useAssignEventRole, useRemoveEventMember } from '@/hooks/useAccess';
import { useSelection } from '@/context/SelectionContext';

interface ManageEventAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManageEventAccessModal({ isOpen, onClose }: ManageEventAccessModalProps) {
    const { eventId } = useSelection();
    const { data: members, isLoading } = useEventMembers(eventId);
    const { mutate: assignRole, isPending: isAssigning } = useAssignEventRole(eventId);
    const { mutate: removeMember, isPending: isRemoving } = useRemoveEventMember(eventId);

    const [email, setEmail] = useState('');
    const [role, setRole] = useState('SupportStaff');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        assignRole({ email, role }, {
            onSuccess: () => {
                setEmail('');
                setRole('SupportStaff');
            },
            onError: (err: any) => {
                setError(err.message || 'Failed to assign role');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-foreground">Manage Event Access</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="bg-primary/5 border-b border-primary/10 px-6 py-3 flex items-start sm:items-center space-x-2 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
                    <span className="text-[11px] font-medium text-primary leading-tight">
                        Org Owners and Admins have implicit Event Admin access automatically.
                    </span>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Explicit Event Members</h3>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : members?.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No explicit event members yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {members?.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 rounded-full bg-background border border-border">
                                                <Calendar className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{member.user_profiles?.email}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{member.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeMember(member.id)}
                                            disabled={isRemoving}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
                    <form onSubmit={handleAssign} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Add to Event</h3>
                        <div className="space-y-2">
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="EventAdmin">Event Admin</option>
                                <option value="StageManager">Stage Manager</option>
                                <option value="ActAdmin">Act Admin</option>
                                <option value="SupportStaff">Support Staff</option>
                            </select>
                        </div>
                        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
                        <button
                            type="submit"
                            disabled={!email || isAssigning}
                            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            <span>Grant Access</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
