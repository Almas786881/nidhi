import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  const iconMap = {
    danger: <AlertCircle className="w-6 h-6 text-rose-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
  };

  const btnMap = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 disabled:opacity-50',
              btnMap[variant]
            )}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        <div className="p-3 bg-slate-100 rounded-full flex-shrink-0">{iconMap[variant]}</div>
        <div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
