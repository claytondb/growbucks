'use client';

/**
 * Year-End Interest Statement Page
 *
 * A printable, visual annual interest statement per child.
 * Shows interest earned, deposits, withdrawals, chore earnings,
 * donations, and a monthly breakdown — suitable for tax records.
 *
 * Route: /dashboard/reports/statement/[year]
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Printer,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Briefcase,
  Heart,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnnualReportSummary, ChildAnnualReport } from '@/lib/annual-report';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StatementData extends AnnualReportSummary {
  /* The API also returns donations per child — we type-extend here */
  children: (ChildAnnualReport & { totalDonationCents?: number })[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = abs / 100;
  const s = dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `-$${s}` : `$${s}`;
}

const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Child Statement Card ─────────────────────────────────────────────────────

function ChildStatement({ report }: { report: ChildAnnualReport & { totalDonationCents?: number } }) {
  const [expanded, setExpanded] = useState(false);

  const hasActivity = report.completedTransactionCount > 0;
  const totalDonationCents = report.totalDonationCents ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="print:break-inside-avoid"
    >
      <Card className="overflow-hidden border-[#ECF0F1]">
        {/* Child header */}
        <div className="bg-gradient-to-r from-[#3498DB]/10 to-[#2ECC71]/10 border-b border-[#ECF0F1] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#2C3E50]">{report.childName}</h2>
              <p className="text-xs text-[#7F8C8D] mt-0.5">Tax Year {report.year}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#7F8C8D]">Total Interest</p>
              <p className="text-2xl font-bold text-[#27AE60]">{fmt(report.totalInterestCents)}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {!hasActivity ? (
            <div className="px-6 py-8 text-center text-[#7F8C8D]">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity recorded for {report.year}.</p>
            </div>
          ) : (
            <>
              {/* Summary stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#ECF0F1]">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#27AE60]" />
                    <span className="text-xs text-[#7F8C8D]">Interest</span>
                  </div>
                  <p className="text-lg font-bold text-[#2C3E50]">{fmt(report.totalInterestCents)}</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-[#3498DB]" />
                    <span className="text-xs text-[#7F8C8D]">Deposits</span>
                  </div>
                  <p className="text-lg font-bold text-[#2C3E50]">{fmt(report.totalDepositCents)}</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#9B59B6]" />
                    <span className="text-xs text-[#7F8C8D]">Earned (Chores)</span>
                  </div>
                  <p className="text-lg font-bold text-[#2C3E50]">{fmt(report.totalEarnedCents)}</p>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PiggyBank className="w-3.5 h-3.5 text-[#E67E22]" />
                    <span className="text-xs text-[#7F8C8D]">Withdrawals</span>
                  </div>
                  <p className="text-lg font-bold text-[#2C3E50]">{fmt(report.totalWithdrawalCents)}</p>
                </div>
              </div>

              {/* Balance summary row */}
              <div className="border-t border-[#ECF0F1] px-6 py-4 grid grid-cols-3 gap-4 bg-[#F8FAFE]">
                <div>
                  <p className="text-xs text-[#7F8C8D] mb-0.5">Starting Balance</p>
                  <p className="font-semibold text-[#2C3E50]">{fmt(report.startingBalanceCents)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#7F8C8D] mb-0.5">Peak Balance</p>
                  <p className="font-semibold text-[#27AE60]">{fmt(report.peakBalanceCents)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7F8C8D] mb-0.5">Ending Balance</p>
                  <p className="font-semibold text-[#2C3E50]">{fmt(report.endingBalanceCents)}</p>
                </div>
              </div>

              {/* Donations row (if any) */}
              {totalDonationCents > 0 && (
                <div className="border-t border-[#ECF0F1] px-6 py-3 flex items-center gap-2 bg-[#FDF2FF]">
                  <Heart className="w-4 h-4 text-[#9B59B6]" />
                  <span className="text-sm text-[#7F8C8D]">Charitable giving:</span>
                  <span className="text-sm font-semibold text-[#9B59B6]">{fmt(totalDonationCents)}</span>
                </div>
              )}

              {/* Monthly breakdown toggle */}
              <div className="border-t border-[#ECF0F1]">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-[#7F8C8D] hover:text-[#2C3E50] hover:bg-[#F8FAFE] transition-colors print:hidden"
                >
                  <span>Monthly Breakdown</span>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Always show when printing */}
                <div className={expanded ? '' : 'hidden print:block'}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F8FAFE] text-[#7F8C8D] text-xs">
                          <th className="px-4 py-2 text-left font-medium">Month</th>
                          <th className="px-4 py-2 text-right font-medium text-[#27AE60]">Interest</th>
                          <th className="px-4 py-2 text-right font-medium">Deposits</th>
                          <th className="px-4 py-2 text-right font-medium">Auto-Save</th>
                          <th className="px-4 py-2 text-right font-medium text-[#9B59B6]">Earned</th>
                          <th className="px-4 py-2 text-right font-medium text-[#E74C3C]">Withdrawn</th>
                          <th className="px-4 py-2 text-right font-medium text-[#7F8C8D]">Txns</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.monthly.map((m, idx) => {
                          const hasMonthActivity = m.transactionCount > 0;
                          return (
                            <tr
                              key={m.month}
                              className={`border-t border-[#ECF0F1] ${idx % 2 === 1 ? 'bg-[#FAFBFD]' : ''} ${!hasMonthActivity ? 'opacity-40' : ''}`}
                            >
                              <td className="px-4 py-2 font-medium text-[#2C3E50]">
                                {MONTH_ABBREV[m.month - 1]}
                              </td>
                              <td className="px-4 py-2 text-right text-[#27AE60] font-medium">
                                {m.interestCents > 0 ? fmt(m.interestCents) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-[#2C3E50]">
                                {m.depositCents > 0 ? fmt(m.depositCents) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-[#E67E22]">
                                {m.savingsDepositCents > 0 ? fmt(m.savingsDepositCents) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-[#9B59B6]">
                                {m.earnedCents > 0 ? fmt(m.earnedCents) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-[#E74C3C]">
                                {m.withdrawalCents > 0 ? fmt(m.withdrawalCents) : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-[#7F8C8D] text-xs">
                                {m.transactionCount > 0 ? m.transactionCount : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#2C3E50]/20 font-semibold text-[#2C3E50] bg-[#F0F4FF]">
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-right text-[#27AE60]">{fmt(report.totalInterestCents)}</td>
                          <td className="px-4 py-2 text-right">{fmt(report.totalDepositCents)}</td>
                          <td className="px-4 py-2 text-right text-[#E67E22]">
                            {fmt(report.monthly.reduce((s, m) => s + m.savingsDepositCents, 0))}
                          </td>
                          <td className="px-4 py-2 text-right text-[#9B59B6]">{fmt(report.totalEarnedCents)}</td>
                          <td className="px-4 py-2 text-right text-[#E74C3C]">{fmt(report.totalWithdrawalCents)}</td>
                          <td className="px-4 py-2 text-right text-[#7F8C8D] text-xs">
                            {report.completedTransactionCount}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const year = parseInt(params.year as string, 10);

  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isChild) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const fetchStatement = useCallback(async () => {
    if (isNaN(year)) {
      setError('Invalid year.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/export/${year}?format=json`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load statement (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statement.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    if (status === 'authenticated') fetchStatement();
  }, [status, fetchStatement]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalFamilyInterest = data?.totalFamilyInterestCents ?? 0;
  const generatedDate = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-[#F8FAFE] print:bg-white">
      {/* Header — hidden when printing */}
      <header className="bg-white border-b border-[#ECF0F1] sticky top-0 z-40 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/reports">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-lg text-[#2C3E50]">
                  {year} Interest Statement
                </h1>
                <p className="text-xs text-[#7F8C8D]">Annual summary for tax records</p>
              </div>
            </div>
            <Button
              onClick={() => window.print()}
              variant="secondary"
              className="flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 print:px-0 print:py-4">
        {/* Print header — only visible when printing */}
        <div className="hidden print:block mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            GrowBucks — {year} Annual Interest Statement
          </h1>
          <p className="text-sm text-gray-500 mt-1">Generated {generatedDate}</p>
          <p className="text-xs text-gray-400 mt-1">
            For informational purposes only. Consult a tax professional for filing guidance.
          </p>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-[#E74C3C] bg-[#E74C3C]/5">
            <CardContent className="pt-4 flex items-center gap-2 text-[#E74C3C]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Family summary banner */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-br from-[#27AE60]/10 to-[#2ECC71]/5 border-[#27AE60]/20 print:border print:border-gray-200 print:bg-white">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2C3E50]">
                        {year} Family Statement
                      </p>
                      <p className="text-xs text-[#7F8C8D] mt-0.5">
                        {data.children.length} child{data.children.length !== 1 ? 'ren' : ''} •
                        Generated {generatedDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#7F8C8D]">Total Family Interest</p>
                      <p className="text-2xl font-bold text-[#27AE60]">{fmt(totalFamilyInterest)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Per-child statements */}
            {data.children.map((child, i) => (
              <motion.div
                key={child.childId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <ChildStatement report={child} />
              </motion.div>
            ))}

            {/* Tax disclaimer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="print:mt-6"
            >
              <Card className="border-[#F39C12]/20 bg-[#FEFCE8] print:border print:border-gray-200 print:bg-white">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-[#F39C12] flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-[#7F8C8D] space-y-1">
                      <p className="font-semibold text-[#2C3E50]">Tax Information</p>
                      <p>
                        Interest income earned in custodial accounts (UTMA/UGMA) may be subject
                        to the &quot;kiddie tax&quot; rules. In 2024, the first $1,300 of a
                        child&apos;s unearned income is tax-free, the next $1,300 is taxed at the
                        child&apos;s rate, and amounts above $2,600 are taxed at the parent&apos;s
                        rate.
                      </p>
                      <p>
                        This statement is for informational purposes only and does not constitute
                        tax advice. Please consult a qualified tax professional for guidance
                        specific to your situation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
