import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="animate-pulse-logo">
         <h1 className="text-4xl font-bold tracking-wider text-brand-teal">
            DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
        </h1>
      </div>
    </div>
  );
};

export default LoadingSpinner;