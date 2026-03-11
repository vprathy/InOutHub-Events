import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Participant } from '../types/domain';
import Papa from 'papaparse';

export function useParticipantsQuery(eventId: string) {
    return useQuery({
        queryKey: ['participants', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('participants')
                .select('*')
                .eq('event_id', eventId)
                .order('last_name', { ascending: true });

            if (error) throw error;

            return (data as any[]).map((row): Participant => ({
                id: row.id,
                eventId: row.event_id,
                firstName: row.first_name,
                lastName: row.last_name,
                guardianName: row.guardian_name,
                guardianPhone: row.guardian_phone,
                notes: row.notes,
            }));
        },
        enabled: !!eventId,
    });
}

export function useImportRoster(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (source: string | File) => {
            let csvContent = '';

            if (typeof source === 'string') {
                // Handle Google Sheets URL transformation
                let url = source;
                if (url.includes('docs.google.com/spreadsheets')) {
                    const idMatch = url.match(/\/d\/([^/]+)/);
                    if (idMatch) {
                        url = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
                    }
                }

                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to fetch roster from URL');
                csvContent = await response.text();
            } else {
                csvContent = await source.text();
            }

            return new Promise<void>((resolve, reject) => {
                Papa.parse(csvContent, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        try {
                            const rows = results.data as any[];

                            const participants = rows.map(row => {
                                // First Name Mapping (Handles Student Full Name - First Name)
                                const firstName = row['Student Full Name - First Name'] || row['First Name'] || row['firstName'] || row['first_name'] || '';

                                // Last Name Mapping (Handles Student Full Name - Last Name)
                                const lastName = row['Student Full Name - Last Name'] || row['Last Name'] || row['lastName'] || row['last_name'] || '';

                                // Guardian Name Mapping (Handles Parent Name - First Name + Last Name)
                                const pFirst = row['Parent Name - First Name'] || '';
                                const pLast = row['Parent Name - Last Name'] || '';
                                const guardianName = pFirst && pLast ? `${pFirst} ${pLast}` : (row['Guardian Name'] || row['guardianName'] || null);

                                // Guardian Phone & Email
                                const phone = row['Phone Number'] || row['Guardian Phone'] || row['guardianPhone'] || null;
                                const email = row['Email'] || null;

                                // Constructing detailed notes to avoid data loss from extra columns
                                const studentId = row['Student ID'];
                                const age = row['Age'];
                                const specialNotes = row['Special Request/Notes'] || row['Notes'] || '';
                                const products = row['My Products: Products'] || '';

                                const notesParts = [];
                                if (studentId) notesParts.push(`[ID: ${studentId}]`);
                                if (age) notesParts.push(`[Age: ${age}]`);
                                if (email) notesParts.push(`[Email: ${email}]`);
                                if (specialNotes) notesParts.push(specialNotes);
                                if (products) notesParts.push(`[Products: ${products}]`);

                                return {
                                    event_id: eventId,
                                    first_name: firstName,
                                    last_name: lastName,
                                    guardian_name: guardianName,
                                    guardian_phone: phone,
                                    notes: notesParts.join(' ') || null,
                                };
                            }).filter(p => p.first_name && p.last_name);

                            if (participants.length === 0) {
                                throw new Error('No valid participants found in the provided source');
                            }

                            const { error } = await supabase
                                .from('participants')
                                .insert(participants);

                            if (error) throw error;
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    },
                    error: (err: any) => reject(err),
                });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['participants', eventId] });
        },
    });
}
