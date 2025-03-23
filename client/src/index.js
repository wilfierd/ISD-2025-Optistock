// client/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import config from './config';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: config.maxRetries,
      staleTime: config.staleTime,
    },
  },
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      {/* Configure ToastContainer to be top-center */}
      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </BrowserRouter>
    {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);