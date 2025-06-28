import '@/styles/globals.css';
import '../../public/tailwind-output.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Import the Inter font
const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <main className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors`}>
          <Component {...pageProps} />
        </main>
      </NotificationProvider>
    </ThemeProvider>
  );
}
