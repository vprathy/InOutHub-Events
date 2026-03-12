import type { LineupSlot } from '@/types/domain';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FlowInsight {
    id: string;
    level: RiskLevel;
    category: 'overlap' | 'readiness' | 'transition' | 'bottleneck' | 'conflict';
    title: string;
    description: string;
    affectedSlotIds: string[];
    suggestedAction?: {
        label: string;
        type: 'reorder' | 'buffer' | 'alert';
    };
}

/**
 * AI logic to scan a lineup and identify operational risks.
 * Now supports cross-stage performer conflict detection.
 */
export function scanLineup(slots: LineupSlot[], allEventSlots?: LineupSlot[]): FlowInsight[] {
    const insights: FlowInsight[] = [];

    for (let i = 0; i < slots.length; i++) {
        const current = slots[i];
        const next = slots[i + 1];

        // 1. Check Readiness (Personnel Arrival vs Performance Ready)
        if (current.act.arrivalStatus !== 'Ready' && current.act.arrivalStatus !== 'Arrived') {
            insights.push({
                id: `ready-${current.id}`,
                level: 'high',
                category: 'readiness',
                title: 'Team Not Ready',
                description: `"${current.act.name}" cast/crew have not checked in as Ready.`,
                affectedSlotIds: [current.id],
                suggestedAction: { label: 'Go to Performance', type: 'alert' }
            });
        }

        // 2. Check Transitions (Tight turnarounds on same stage)
        if (next) {
            const currentEnd = new Date(current.scheduledStartTime).getTime() + ((current.act.durationMinutes + (current.act.setupTimeMinutes || 0)) * 60000);
            const nextStart = new Date(next.scheduledStartTime).getTime();

            // If transition is less than 2 minutes and setup is complex
            if (nextStart - currentEnd < 120000 && (next.act.setupTimeMinutes || 0) > 5) {
                insights.push({
                    id: `transition-${current.id}-${next.id}`,
                    level: 'medium',
                    category: 'transition',
                    title: 'Tight Transition',
                    description: `Very short gap between "${current.act.name}" and "${next.act.name}" given the setup complexity.`,
                    affectedSlotIds: [current.id, next.id],
                    suggestedAction: { label: 'Add Buffer', type: 'buffer' }
                });
            }
        }

        // 3. Performer Conflicts (Cross-Stage Overlap)
        // If we have allEventSlots, we can check if any participants from 'current' are performing elsewhere at the same time.
        if (allEventSlots && current.act.participants) {
            const currentStart = new Date(current.scheduledStartTime).getTime();
            const currentEnd = currentStart + ((current.act.durationMinutes + (current.act.setupTimeMinutes || 0)) * 60000);

            for (const other of allEventSlots) {
                if (other.id === current.id) continue; // Don't check against self

                const otherStart = new Date(other.scheduledStartTime).getTime();
                const otherEnd = otherStart + ((other.act.durationMinutes + (other.act.setupTimeMinutes || 0)) * 60000);

                // Check for temporal overlap
                const hasOverlap = Math.max(currentStart, otherStart) < Math.min(currentEnd, otherEnd);

                if (hasOverlap && other.act.participants) {
                    // Check for shared participants
                    const sharedParticipants = current.act.participants.filter(cp =>
                        other.act.participants?.some(op => op.participantId === cp.participantId)
                    );

                    if (sharedParticipants.length > 0) {
                        const names = sharedParticipants.map(p => `${p.firstName} ${p.lastName}`).join(', ');
                        insights.push({
                            id: `conflict-${current.id}-${other.id}`,
                            level: 'critical',
                            category: 'conflict',
                            title: 'Performer Conflict',
                            description: `${names} scheduled on another stage at the same time ("${other.act.name}").`,
                            affectedSlotIds: [current.id, other.id],
                            suggestedAction: { label: 'Resolve Conflict', type: 'reorder' }
                        });
                    }
                }
            }
        }
    }

    return insights;
}
