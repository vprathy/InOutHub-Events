import { supabase } from '@/lib/supabase';
import type { IntroComposition } from '@/types/domain';

export class IntroCapabilityError extends Error {
  code: string;
  details?: Record<string, unknown> | null;

  constructor(message: string, code = 'INTRO_CAPABILITY_ERROR', details?: Record<string, unknown> | null) {
    super(message);
    this.name = 'IntroCapabilityError';
    this.code = code;
    this.details = details ?? null;
  }
}

export interface IntroPlayableParticipant {
  firstName: string;
  lastName: string;
  assets: Array<{
    id: string;
    fileUrl: string | null;
  }>;
}

interface IntroCapabilityResponse {
  composition: IntroComposition;
  compositionId: string | null;
  isPending?: boolean;
  message?: string;
}

interface PlayableIntroResponse {
  composition: IntroComposition;
  actName: string;
  participants: IntroPlayableParticipant[];
}

const playableIntroCache = new Map<string, PlayableIntroResponse>();
const playableIntroInflight = new Map<string, Promise<PlayableIntroResponse>>();

async function invokeIntroCapability<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/intro-capabilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (data?.error && typeof data.error === 'object') {
      throw new IntroCapabilityError(
        data.error.message || 'Intro capability failed',
        data.error.code || 'INTRO_CAPABILITY_ERROR',
        data.error.details || null,
      );
    }

    throw new IntroCapabilityError(`Intro capability failed (${response.status})`);
  }

  if (data?.error) {
    if (typeof data.error === 'string') {
      throw new IntroCapabilityError(data.error);
    }

    throw new IntroCapabilityError(
      data.error.message || 'Intro capability failed',
      data.error.code || 'INTRO_CAPABILITY_ERROR',
      data.error.details || null,
    );
  }

  return data as T;
}

export async function getIntroComposition(actId: string) {
  return invokeIntroCapability<IntroCapabilityResponse>('getIntroComposition', { actId });
}

export async function curateIntroPhotos(actId: string, assetIds: string[]) {
  return invokeIntroCapability<IntroCapabilityResponse>('curateIntroPhotos', { actId, assetIds });
}

export async function prepareIntroAutopilot(actId: string) {
  return invokeIntroCapability<IntroCapabilityResponse>('prepareIntroAutopilot', { actId });
}

export async function generateIntroBackground(actId: string, stylePreset = 'theatrical-safe') {
  return invokeIntroCapability<IntroCapabilityResponse>('generateIntroBackground', { actId, stylePreset });
}

export async function generateIntroAudio(actId: string) {
  return invokeIntroCapability<IntroCapabilityResponse>('generateIntroAudio', { actId });
}

export async function buildIntroComposition(
  actId: string,
  selectedAssetIds: string[],
  overrides?: Partial<Pick<IntroComposition, 'curation' | 'background' | 'audio'>>,
) {
  return invokeIntroCapability<IntroCapabilityResponse>('buildIntroComposition', {
    actId,
    selectedAssetIds,
    overrides,
  });
}

export async function approveIntroComposition(actId: string) {
  return invokeIntroCapability<IntroCapabilityResponse>('approveIntroComposition', { actId });
}

export async function getPlayableIntro(actId: string) {
  const cached = playableIntroCache.get(actId);
  if (cached) {
    return cached;
  }

  const inflight = playableIntroInflight.get(actId);
  if (inflight) {
    return inflight;
  }

  const request = invokeIntroCapability<PlayableIntroResponse>('getPlayableIntro', { actId })
    .then((response) => {
      playableIntroCache.set(actId, response);
      playableIntroInflight.delete(actId);
      return response;
    })
    .catch((error) => {
      playableIntroInflight.delete(actId);
      throw error;
    });

  playableIntroInflight.set(actId, request);
  return request;
}

export function prefetchPlayableIntro(actId: string) {
  if (!actId || playableIntroCache.has(actId) || playableIntroInflight.has(actId)) {
    return;
  }

  const request: Promise<PlayableIntroResponse> = invokeIntroCapability<PlayableIntroResponse>('getPlayableIntro', { actId })
    .then((response) => {
      playableIntroCache.set(actId, response);
      playableIntroInflight.delete(actId);
      return response;
    })
    .catch(() => {
      playableIntroInflight.delete(actId);
      throw new Error('prefetch_failed');
    });

  playableIntroInflight.set(actId, request);
  void request.catch(() => undefined);
}

export function clearPlayableIntroCache(actId?: string) {
  if (actId) {
    playableIntroCache.delete(actId);
    playableIntroInflight.delete(actId);
    return;
  }

  playableIntroCache.clear();
  playableIntroInflight.clear();
}
