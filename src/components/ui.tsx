import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stable-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${maxW} bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-scale-in max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-stable-100">
          <div>
            <h2 className="text-lg font-display font-bold text-stable-900">{title}</h2>
            {subtitle && <p className="text-sm text-stable-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-stable-400 hover:bg-stable-100 hover:text-stable-700 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="p-5 border-t border-stable-100 bg-stable-50/50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <button className="btn-outline" onClick={onClose}>Annuler</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      }
    >
      <p className="text-sm text-stable-600">{message}</p>
    </Modal>
  );
}

interface ProgressGaugeProps {
  percent: number;
  level: 'green' | 'orange' | 'red';
  label?: string;
  pulse?: boolean;
}

export function ProgressGauge({ percent, level, label, pulse }: ProgressGaugeProps) {
  const color = level === 'red' ? 'bg-red-500' : level === 'orange' ? 'bg-gold-400' : 'bg-emerald-500';
  const ring = level === 'red' ? 'animate-pulse-ring' : '';
  return (
    <div className="w-full">
      <div className={`relative h-2.5 rounded-full bg-stable-100 overflow-hidden ${pulse ? ring : ''}`}>
        <div className={`absolute left-0 top-0 h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
      {label && <p className="text-[11px] text-stable-500 mt-1">{label}</p>}
    </div>
  );
}

interface BadgeProps {
  level: 'green' | 'orange' | 'red' | 'neutral' | 'blue'| 'purple';
  children: ReactNode;
}

export function Badge({ level, children }: BadgeProps) {
  const styles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-gold-100 text-gold-700',
    red: 'bg-red-100 text-red-700',
    neutral: 'bg-stable-100 text-stable-600',
    blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`pill ${styles[level]}`}>{children}</span>;
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-stable-100 flex items-center justify-center text-stable-400 mb-4">{icon}</div>
      <h3 className="font-display font-bold text-stable-800 text-lg">{title}</h3>
      <p className="text-sm text-stable-500 mt-1 max-w-xs">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
