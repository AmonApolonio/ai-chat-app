import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
  autoDismissTime?: number;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onClose, autoDismissTime = 8000 }) => {
  useEffect(() => {
    if (autoDismissTime > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissTime);
      
      return () => clearTimeout(timer);
    }
  }, [message, onClose, autoDismissTime]);

  return (
    <div className="flex items-center justify-between bg-red-100 text-red-800 px-4 py-2 rounded-t-lg shadow-md transition-all duration-300 ease-in-out animate-fadeIn">
      <div className="py-1">{message}</div>
      <button 
        onClick={onClose} 
        className="ml-3 bg-red-200 hover:bg-red-300 text-red-800 rounded-full p-1 w-8 h-8 flex items-center justify-center transition-colors"
        aria-label="Close error message"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
};

export default ErrorMessage;
