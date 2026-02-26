import { useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div
      className={`${getStyles()} rounded-xl shadow-2xl p-3 flex items-center gap-3 animate-slideInRight`}
      style={{ pointerEvents: 'auto', width: '100%' }}
    >
      {getIcon()}
      <p className="flex-1 font-medium text-sm">{message}</p>
      <button
        onClick={onClose}
        className="hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default Toast;