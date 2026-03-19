'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  FileText,
  FileJson,
  Calendar,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Check,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - 2020 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

type DownloadState = 'idle' | 'loading' | 'done' | 'error';

interface DownloadStatus {
  csv: DownloadState;
  json: DownloadState;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    csv: 'idle',
    json: 'idle',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Block child logins — reports are parent-only
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isChild) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const handleDownload = async (format: 'csv' | 'json') => {
    setError(null);
    setDownloadStatus((prev) => ({ ...prev, [format]: 'loading' }));

    try {
      const res = await fetch(`/api/export/${selectedYear}?format=${format}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Export failed (${res.status})`);
      }

      if (format === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `growbucks_family_${selectedYear}_tax_report.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `growbucks_family_${selectedYear}_tax_report.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setDownloadStatus((prev) => ({ ...prev, [format]: 'done' }));
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [format]: 'idle' }));
      }, 2500);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Download failed. Please try again.');
      setDownloadStatus((prev) => ({ ...prev, [format]: 'error' }));
      setTimeout(() => {
        setDownloadStatus((prev) => ({ ...prev, [format]: 'idle' }));
      }, 3000);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatIcon = (state: DownloadState, Icon: React.ElementType, colorClass: string) => {
    if (state === 'loading') {
      return <div className={`w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin ${colorClass}`} />;
    }
    if (state === 'done') {
      return <Check className={`w-5 h-5 ${colorClass}`} />;
    }
    return <Icon className={`w-5 h-5 ${colorClass}`} />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFE]">
      {/* Header */}
      <header className="bg-white border-b border-[#ECF0F1] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg text-[#2C3E50]">Tax Reports</h1>
              <p className="text-xs text-[#7F8C8D]">Annual interest & earnings summary</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-[#3498DB]/10 to-[#2ECC71]/10 border-[#3498DB]/20">
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-[#3498DB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-[#3498DB]" />
                </div>
                <div>
                  <p className="font-semibold text-[#2C3E50] mb-1">Annual Tax Report</p>
                  <p className="text-sm text-[#7F8C8D]">
                    Download a summary of all children&apos;s interest income, deposits,
                    withdrawals, and chore earnings for a given tax year. Useful for
                    UTMA/UGMA custodial account tracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Year selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7F8C8D]" />
                Select Tax Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_YEARS.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setError(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedYear === year
                        ? 'bg-[#2ECC71] text-white shadow-sm shadow-[#2ECC71]/40'
                        : 'bg-[#ECF0F1] text-[#7F8C8D] hover:bg-[#E0E6E9] hover:text-[#2C3E50]'
                    }`}
                  >
                    {year}
                    {year === CURRENT_YEAR && (
                      <span className="ml-1 text-xs opacity-75">(current)</span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-[#E74C3C] bg-[#E74C3C]/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-[#E74C3C]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Download options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4 text-[#7F8C8D]" />
                Download {selectedYear} Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* CSV */}
              <button
                onClick={() => handleDownload('csv')}
                disabled={downloadStatus.csv === 'loading'}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[#ECF0F1] hover:border-[#27AE60] hover:bg-[#27AE60]/5 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-[#27AE60]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {formatIcon(downloadStatus.csv, FileText, 'text-[#27AE60]')}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#2C3E50]">Export as CSV</p>
                  <p className="text-sm text-[#7F8C8D]">
                    Opens in Excel or Google Sheets — one sheet per child
                  </p>
                </div>
                {downloadStatus.csv === 'done' && (
                  <span className="text-xs font-medium text-[#27AE60] shrink-0">Downloaded!</span>
                )}
              </button>

              {/* JSON */}
              <button
                onClick={() => handleDownload('json')}
                disabled={downloadStatus.json === 'loading'}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[#ECF0F1] hover:border-[#3498DB] hover:bg-[#3498DB]/5 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-[#3498DB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {formatIcon(downloadStatus.json, FileJson, 'text-[#3498DB]')}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#2C3E50]">Export as JSON</p>
                  <p className="text-sm text-[#7F8C8D]">
                    Structured data for developers or advanced analysis
                  </p>
                </div>
                {downloadStatus.json === 'done' && (
                  <span className="text-xs font-medium text-[#3498DB] shrink-0">Downloaded!</span>
                )}
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visual Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#7F8C8D]" />
                Visual Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/dashboard/reports/statement/${selectedYear}`}>
                <button className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[#ECF0F1] hover:border-[#9B59B6] hover:bg-[#9B59B6]/5 transition-all text-left">
                  <div className="w-12 h-12 bg-[#9B59B6]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-[#9B59B6]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2C3E50]">View {selectedYear} Statement</p>
                    <p className="text-sm text-[#7F8C8D]">
                      Printable per-child breakdown with monthly table — great for tax records
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#9B59B6] shrink-0">Open →</span>
                </button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* What's included */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F39C12]" />
                What&apos;s Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-[#7F8C8D]">
                {[
                  '📈 Total interest earned (the 1099-INT equivalent figure)',
                  '💰 Starting and ending balance for the year',
                  '📆 Month-by-month breakdown (interest, deposits, withdrawals)',
                  '🏆 Peak balance achieved during the year',
                  '🧹 Chore and job earnings breakdown',
                  '🏦 Savings auto-deposits (split savings)',
                  '👨‍👩‍👧 All children in one combined family report',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5">{item.split(' ')[0]}</span>
                    <span>{item.slice(item.indexOf(' ') + 1)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-center text-[#BDC3C7] px-4">
            ⚠️ This report is for informational purposes only. Consult a qualified tax
            professional for filing guidance specific to your situation.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
