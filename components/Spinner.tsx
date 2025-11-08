import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div
        className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-pink-500"
        role="status"
        aria-label="Loading"
      ></div>
      <span className="ml-3 text-pink-700 font-semibold">Loading...</span>
    </div>
  );
};

export default Spinner;
