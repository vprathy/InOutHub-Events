import { FileText, ExternalLink, Image as ImageIcon, Music4, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function detectAssetKind(url: string) {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(clean)) return 'image';
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(clean)) return 'audio';
  if (/\.(mp4|mov|webm|m4v|ogv)$/.test(clean)) return 'video';
  if (/\.pdf$/.test(clean)) return 'pdf';
  return 'other';
}

export function AssetPreviewModal({
  isOpen,
  onClose,
  url,
  title = 'Asset Preview',
}: {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
}) {
  if (!isOpen || !url) return null;

  const kind = detectAssetKind(url);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2">
              {kind === 'image' ? <ImageIcon className="h-4 w-4" /> : kind === 'audio' ? <Music4 className="h-4 w-4" /> : kind === 'video' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-white/70">{title}</p>
              <p className="text-xs text-white/50">{kind === 'other' ? 'Open externally if inline preview is limited.' : 'Previewing file directly in the app.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </a>
            </Button>
            <button onClick={onClose} className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[320px] flex-1 items-center justify-center bg-black/30 p-4">
          {kind === 'image' ? (
            <img src={url} alt={title} className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-2xl" />
          ) : kind === 'audio' ? (
            <div className="w-full max-w-xl rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-400">
                  <Music4 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">Audio Preview</p>
                  <p className="text-sm text-white/60">Play the uploaded file without leaving the app.</p>
                </div>
              </div>
              <audio controls className="w-full" src={url} />
            </div>
          ) : kind === 'video' ? (
            <video controls className="max-h-[78vh] max-w-full rounded-xl bg-black" src={url} />
          ) : kind === 'pdf' ? (
            <iframe title={title} src={url} className="h-[78vh] w-full rounded-xl border border-white/10 bg-white" />
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white/10 p-4 text-white/70">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-bold">Inline preview is limited for this file type.</p>
                <p className="mt-1 text-sm text-white/60">Use the open action to view it in a new tab.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
