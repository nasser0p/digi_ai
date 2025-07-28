import React from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
