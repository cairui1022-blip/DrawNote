import { Check, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'success' | 'info';
}

interface ToastBannerProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-toast-in fixed bottom-[72px] left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-[4px] border border-[#2d2d2a] bg-[#171716] px-4 py-2.5 text-xs font-medium text-[#fbf9f4] shadow-xl md:bottom-auto md:top-[74px]"
    >
      {toast.tone === 'info' ? (
        <Info className="h-3.5 w-3.5 shrink-0 text-[#e8d5c8]" aria-hidden="true" />
      ) : (
        <Check className="h-3.5 w-3.5 shrink-0 text-[#e87a6a]" aria-hidden="true" />
      )}
      <span className="truncate">{toast.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="关闭提示"
        className="ml-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
