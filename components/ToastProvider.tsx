import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        className: 'text-sm font-medium shadow-lg rounded-xl',
        success: {
          iconTheme: {
            primary: '#10b981', // Emerald 500
            secondary: '#fff',
          },
          style: {
            border: '1px solid #d1fae5', // Emerald 100
            padding: '12px',
            color: '#065f46', // Emerald 900
            backgroundColor: '#ecfdf5', // Emerald 50
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444', // Fire 500
            secondary: '#fff',
          },
          style: {
            border: '1px solid #fee2e2', // Red 100
            padding: '12px',
            color: '#991b1b', // Fire 900
            backgroundColor: '#fef2f2', // Red 50
          },
        },
        loading: {
          style: {
            padding: '12px',
            color: '#1e293b', // Slate 800
            backgroundColor: '#f1f5f9', // Slate 100
          },
        }
      }}
    />
  );
};