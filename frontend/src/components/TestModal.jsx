import { useState } from "react";

const TestModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Test Modal</h2>
        <p className="mb-4">This is a basic modal without any UI library dependencies.</p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
          <button 
            onClick={() => {
              alert("Test button works!");
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestModal;
