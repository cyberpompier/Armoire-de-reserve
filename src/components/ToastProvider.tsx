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
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #d1fae5',
            padding: '12px',
            color: '#065f46',
            backgroundColor: '#ecfdf5',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            border: '1px solid #fee2e2',
            padding: '12px',
            color: '#991b1b',
            backgroundColor: '#fef2f2',
          },
        },
        loading: {
          style: {
            padding: '12px',
            color: '#1e293b',
            backgroundColor: '#f1f5f9',
          },
        }
      }}
    />
  );
};