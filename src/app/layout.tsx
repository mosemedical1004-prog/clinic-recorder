import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RecordingProvider } from '@/contexts/RecordingContext';
import RecordingBanner from '@/components/RecordingBanner';

export const metadata: Metadata = {
  title: '진료 녹음기 | Medical Clinic Recorder',
  description: '의료 진료실 음성 녹음 및 AI 분석 시스템',
  keywords: ['의료', '진료', '녹음', '음성인식', 'AI', '분석'],
  authors: [{ name: 'Clinic Recorder' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var darkMode = localStorage.getItem('darkMode');
                  if (darkMode === 'false') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-dark-bg text-white min-h-screen">
        <RecordingProvider>
          <RecordingBanner />
          {children}
        </RecordingProvider>
      </body>
    </html>
  );
}
