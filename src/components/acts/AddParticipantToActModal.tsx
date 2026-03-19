import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useParticipantsQuery, useCreateParticipant } from '@/hooks/useParticipants';
import { useAddParticipantToAct } from '@/hooks/useActs';
import { isOperationalParticipantStatus } from '@/lib/participantStatus';
import { Search, UserPlus, Loader2, Upload, Download, Plus } from 'lucide-react';

interface AddParticipantToActModalProps {
    isOpen: boolean;
    onClose: () => void;
    actId: string;
    actName: string;
    eventId: string;
    role?: string;
    roleOptions?: string[];
    title?: string;
}

const VALID_ROLES = ['Performer', 'Manager', 'Choreographer', 'Support', 'Crew'] as const;

function normalizeName(value: string) {
    return value.toLowerCase().replace(/[^a-z]/g, '');
}

function normalizePhone(value?: string | null) {
    return (value || '').replace(/\D/g, '');
}

function normalizeRole(value: string | undefined, fallback: string) {
    const candidate = (value || '').trim().toLowerCase();
    const direct = VALID_ROLES.find((role) => role.toLowerCase() === candidate);
    if (direct) return direct;
    if (candidate.includes('choreo')) return 'Choreographer';
    if (candidate.includes('support')) return 'Support';
    if (candidate.includes('crew')) return 'Crew';
    if (candidate.includes('manager') || candidate.includes('lead')) return 'Manager';
    if (candidate.includes('perform')) return 'Performer';
    return fallback;
}

function getCell(row: Record<string, unknown>, aliases: string[]) {
    const entries = Object.entries(row);
    for (const alias of aliases) {
        const match = entries.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === alias);
        if (match) return String(match[1] ?? '').trim();
    }
    return '';
}

function parseImportRows(rows: Record<string, unknown>[]) {
    return rows
        .map((row) => {
            const firstName = getCell(row, ['first name', 'firstname', 'member first name']);
            const lastName = getCell(row, ['last name', 'lastname', 'member last name']);
            const fullName = getCell(row, ['full name', 'name', 'member name']);
            const phone = getCell(row, ['phone', 'phone number', 'contact phone', 'guardian phone']);
            const email = getCell(row, ['email', 'email address']);
            const notes = getCell(row, ['notes', 'comment', 'comments']);
            const role = getCell(row, ['role', 'performance role', 'crew role', 'team role']);
            const minor = getCell(row, ['is minor', 'minor', 'under 18']);
            const guardianName = getCell(row, ['guardian name', 'parent name', 'guardian']);
            const guardianPhone = getCell(row, ['guardian phone', 'parent phone', 'contact phone']);
            const guardianRelationship = getCell(row, ['guardian relationship', 'relationship']);

            let derivedFirst = firstName;
            let derivedLast = lastName;
            if ((!derivedFirst || !derivedLast) && fullName) {
                const parts = fullName.split(/\s+/).filter(Boolean);
                derivedFirst = derivedFirst || parts.slice(0, -1).join(' ') || parts[0] || '';
                derivedLast = derivedLast || parts.slice(-1)[0] || '';
            }

            return {
                firstName: derivedFirst.trim(),
                lastName: derivedLast.trim(),
                phone: phone.trim(),
                email: email.trim(),
                notes: notes.trim(),
                role: role.trim(),
                isMinor: ['yes', 'true', '1', 'minor', 'y'].includes(minor.trim().toLowerCase()),
                guardianName: guardianName.trim(),
                guardianPhone: guardianPhone.trim(),
                guardianRelationship: guardianRelationship.trim(),
            };
        })
        .filter((row) => row.firstName || row.lastName);
}

export function AddParticipantToActModal({
    isOpen,
    onClose,
    actId,
    actName,
    eventId,
    role = 'Performer',
    roleOptions,
    title,
}: AddParticipantToActModalProps) {
    const { data: participants, isLoading } = useParticipantsQuery(eventId);
    const addParticipant = useAddParticipantToAct(actId, eventId);
    const createParticipant = useCreateParticipant(eventId);
    const [searchQuery, setSearchQuery] = useState('');
    const selectableRoles = roleOptions && roleOptions.length > 0 ? roleOptions : [role];
    const [selectedRole, setSelectedRole] = useState(selectableRoles[0] || role);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [quickFirstName, setQuickFirstName] = useState('');
    const [quickLastName, setQuickLastName] = useState('');
    const [quickIsMinor, setQuickIsMinor] = useState(false);
    const [quickGuardianName, setQuickGuardianName] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [quickGuardianRelationship, setQuickGuardianRelationship] = useState('');
    const [quickEmail, setQuickEmail] = useState('');
    const [quickNotes, setQuickNotes] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importNotice, setImportNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setSearchQuery('');
        setSelectedRole(selectableRoles[0] || role);
        setShowQuickAdd(false);
        setShowBulkImport(false);
        setQuickFirstName('');
        setQuickLastName('');
        setQuickIsMinor(false);
        setQuickGuardianName('');
        setQuickPhone('');
        setQuickGuardianRelationship('');
        setQuickEmail('');
        setQuickNotes('');
        setImportFile(null);
        setImportNotice(null);
    }, [isOpen, role, selectableRoles]);

    const filteredParticipants = participants?.filter(p =>
        isOperationalParticipantStatus(p.status) &&
        (p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAdd = async (participantId: string) => {
        try {
            await addParticipant.mutateAsync({ participantId, role: selectedRole });
        } catch (error) {
            console.error('Failed to add participant:', error);
        }
    };

    const handleQuickCreate = async () => {
        if (!quickFirstName.trim() || !quickLastName.trim()) return;
        try {
            const created = await createParticipant.mutateAsync({
                firstName: quickFirstName,
                lastName: quickLastName,
                isMinor: quickIsMinor,
                guardianName: quickGuardianName || null,
                guardianPhone: quickPhone || null,
                guardianRelationship: quickGuardianRelationship || null,
                email: quickEmail || null,
                notes: quickNotes || null,
            });
            await addParticipant.mutateAsync({ participantId: created.id, role: selectedRole });
            setQuickFirstName('');
            setQuickLastName('');
            setQuickIsMinor(false);
            setQuickGuardianName('');
            setQuickPhone('');
            setQuickGuardianRelationship('');
            setQuickEmail('');
            setQuickNotes('');
            setImportNotice({
                tone: 'success',
                message: `${created.first_name} ${created.last_name} was created and added to ${actName}.`,
            });
        } catch (error: any) {
            setImportNotice({
                tone: 'error',
                message: error?.message || 'Failed to create and assign the person.',
            });
        }
    };

    const downloadTemplate = () => {
        const csv = [
            ['First Name', 'Last Name', 'Role', 'Is Minor', 'Guardian Name', 'Guardian Phone', 'Guardian Relationship', 'Phone', 'Email', 'Notes'].join(','),
            ['Maya', 'Patel', selectedRole, 'No', '', '', '', '555-0101', 'maya@example.com', 'Stage left support'],
            ['Arun', 'Rao', selectedRole, 'Yes', 'Latha Rao', '555-0110', 'Parent', '555-0110', 'arun@example.com', 'Crew check-in contact'],
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${actName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-team-template.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleBulkImport = async () => {
        if (!importFile) return;

        try {
            const data = await importFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
            const importRows = parseImportRows(rows);

            if (importRows.length === 0) {
                setImportNotice({ tone: 'error', message: 'No valid rows were found in the uploaded team template.' });
                return;
            }

            const knownParticipants = [...(participants || [])];
            let createdCount = 0;
            let matchedCount = 0;

            for (const row of importRows) {
                const targetRole = normalizeRole(row.role, selectedRole);
                const normalizedName = `${normalizeName(row.firstName)}:${normalizeName(row.lastName)}`;
                const normalizedRowPhone = normalizePhone(row.phone);

                let match = knownParticipants.find((participant) => {
                    const participantName = `${normalizeName(participant.firstName)}:${normalizeName(participant.lastName)}`;
                    const participantPhone = normalizePhone(participant.guardianPhone);
                    if (normalizedRowPhone) {
                        return participantName === normalizedName && participantPhone === normalizedRowPhone;
                    }
                    return participantName === normalizedName;
                });

                if (!match) {
                    const created = await createParticipant.mutateAsync({
                        firstName: row.firstName,
                        lastName: row.lastName,
                        isMinor: row.isMinor,
                        guardianName: row.guardianName || null,
                        guardianPhone: row.guardianPhone || row.phone || null,
                        guardianRelationship: row.guardianRelationship || null,
                        email: row.email || null,
                        notes: row.notes || null,
                    });
                    match = {
                        id: created.id,
                        eventId,
                        firstName: created.first_name,
                        lastName: created.last_name,
                        guardianPhone: created.guardian_phone,
                        status: created.status || 'active',
                    } as any;
                    knownParticipants.push(match as any);
                    createdCount += 1;
                } else {
                    matchedCount += 1;
                }

                if (!match) continue;

                await addParticipant.mutateAsync({
                    participantId: match.id,
                    role: targetRole,
                });
            }

            setImportFile(null);
            setImportNotice({
                tone: 'success',
                message: `${importRows.length} team rows processed. ${createdCount} created, ${matchedCount} matched, all assigned to ${actName}.`,
            });
        } catch (error: any) {
            setImportNotice({
                tone: 'error',
                message: error?.message || 'Failed to import the team template.',
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || `Add to: ${actName}`}>
            <div className="space-y-4 pt-4">
                {selectableRoles.length > 1 ? (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Performance Role</p>
                        <div className="grid grid-cols-2 gap-2 rounded-[1rem] bg-muted/35 p-1.5 sm:grid-cols-4">
                            {selectableRoles.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setSelectedRole(option)}
                                    className={`min-h-[44px] rounded-xl px-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
                                        selectedRole === option ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {importNotice ? (
                    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        importNotice.tone === 'success'
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                            : 'border-destructive/20 bg-destructive/5 text-destructive'
                    }`}>
                        {importNotice.message}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Existing Event People</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search people already in this event..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted/30 border-border/50"
                        />
                    </div>

                    <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredParticipants?.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm rounded-2xl border border-dashed border-border/60 bg-muted/10">
                                No matching people found for this event.
                            </div>
                        ) : (
                            filteredParticipants?.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/40 transition-colors group"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {p.firstName[0]}{p.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{p.firstName} {p.lastName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                {selectedRole}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAdd(p.id)}
                                        disabled={addParticipant.isPending}
                                        className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground border-border/50"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-3 rounded-[1.2rem] border border-border/50 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Quick Create</p>
                            <p className="mt-1 text-xs text-muted-foreground">Create one new person and attach them to this performance immediately.</p>
                        </div>
                        <Button
                            type="button"
                            variant={showQuickAdd ? 'ghost' : 'outline'}
                            className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={() => setShowQuickAdd((current) => !current)}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {showQuickAdd ? 'Hide' : 'Quick Add'}
                        </Button>
                    </div>

                    {showQuickAdd ? (
                        <div className="space-y-3 rounded-xl border border-border/50 bg-background/80 p-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Input value={quickFirstName} onChange={(e) => setQuickFirstName(e.target.value)} placeholder="First name" />
                                <Input value={quickLastName} onChange={(e) => setQuickLastName(e.target.value)} placeholder="Last name" />
                            </div>
                            <div className="flex min-h-[44px] items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Minor Crew / Team Member</p>
                                    <p className="text-xs text-muted-foreground">Use when this person needs guardian context on file.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setQuickIsMinor((current) => !current)}
                                    className={`min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em] ${quickIsMinor ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border/60'}`}
                                >
                                    {quickIsMinor ? 'Minor' : 'Adult'}
                                </button>
                            </div>
                            {quickIsMinor ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Input value={quickGuardianName} onChange={(e) => setQuickGuardianName(e.target.value)} placeholder="Guardian name" />
                                    <Input value={quickGuardianRelationship} onChange={(e) => setQuickGuardianRelationship(e.target.value)} placeholder="Relationship" />
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} placeholder={quickIsMinor ? 'Guardian phone' : 'Phone'} />
                                <Input value={quickEmail} onChange={(e) => setQuickEmail(e.target.value)} placeholder="Email" />
                            </div>
                            <textarea
                                value={quickNotes}
                                onChange={(e) => setQuickNotes(e.target.value)}
                                placeholder="Optional notes"
                                className="min-h-[88px] w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                            />
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={handleQuickCreate}
                                    disabled={createParticipant.isPending || addParticipant.isPending || !quickFirstName.trim() || !quickLastName.trim()}
                                    className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                >
                                    {(createParticipant.isPending || addParticipant.isPending) ? 'Adding...' : `Create ${selectedRole}`}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3 rounded-[1.2rem] border border-border/50 bg-muted/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Bulk Team Upload</p>
                            <p className="mt-1 text-xs text-muted-foreground">Import a crew or team sheet, match existing people, create missing ones, and assign them here.</p>
                        </div>
                        <Button
                            type="button"
                            variant={showBulkImport ? 'ghost' : 'outline'}
                            className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                            onClick={() => setShowBulkImport((current) => !current)}
                        >
                            <Upload className="mr-1.5 h-4 w-4" />
                            {showBulkImport ? 'Hide' : 'Bulk Import'}
                        </Button>
                    </div>

                    {showBulkImport ? (
                        <div className="space-y-3 rounded-xl border border-border/50 bg-background/80 p-3">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={downloadTemplate}
                                    className="min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    Download Template
                                </Button>
                                <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-border/60 bg-background px-3 text-[10px] font-black uppercase tracking-[0.16em] text-foreground">
                                    <Upload className="mr-1.5 h-4 w-4" />
                                    {importFile ? importFile.name : 'Choose File'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Supported columns: First Name, Last Name, Role, Is Minor, Guardian Name, Guardian Phone, Guardian Relationship, Phone, Email, Notes. If no role is provided, rows use the currently selected role.
                            </p>
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={handleBulkImport}
                                    disabled={!importFile || createParticipant.isPending || addParticipant.isPending}
                                    className="min-h-11 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em]"
                                >
                                    {(createParticipant.isPending || addParticipant.isPending) ? 'Importing...' : 'Import Team'}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex justify-end pt-2 border-t border-border/10">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        Done
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
