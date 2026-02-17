'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileJson, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportTransactionsCSV, exportTransactionsJSON, generateSummary } from '@/lib/export';
import { formatMoney } from '@/lib/utils';
import { Transaction } from '@/types/database';

interface ExportMenuProps {
  childName: string;
  transactions: Transaction[];
  className?: string;
}

export default function ExportMenu({ childName, transactions, className }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exported, setExported] = useState<'csv' | 'json' | null>(null);

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      exportTransactionsCSV(childName, transactions);
    } else {
      exportTransactionsJSON(childName, transactions);
    }
    setExported(format);
    setTimeout(() => {
      setExported(null);
      setIsOpen(false);
    }, 1500);
  };

  const summary = generateSummary(transactions);

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#ECF0F1] z-50 overflow-hidden"
            >
              {/* Summary */}
              <div className="p-4 bg-[#F8FAFE] border-b border-[#ECF0F1]">
                <h3 className="font-medium text-[#2C3E50] mb-2">Export Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[#7F8C8D]">Transactions:</span>
                    <span className="ml-1 font-medium text-[#2C3E50]">{summary.transactionCount}</span>
                  </div>
                  <div>
                    <span className="text-[#7F8C8D]">Deposits:</span>
                    <span className="ml-1 font-medium text-[#2ECC71]">{formatMoney(summary.totalDeposits)}</span>
                  </div>
                  <div>
                    <span className="text-[#7F8C8D]">Withdrawals:</span>
                    <span className="ml-1 font-medium text-[#E74C3C]">{formatMoney(summary.totalWithdrawals)}</span>
                  </div>
                  <div>
                    <span className="text-[#7F8C8D]">Interest:</span>
                    <span className="ml-1 font-medium text-[#F39C12]">{formatMoney(summary.totalInterest)}</span>
                  </div>
                </div>
              </div>

              {/* Export options */}
              <div className="p-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFE] transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-[#27AE60]/10 rounded-lg flex items-center justify-center">
                    {exported === 'csv' ? (
                      <Check className="w-5 h-5 text-[#27AE60]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#27AE60]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#2C3E50]">Export as CSV</p>
                    <p className="text-xs text-[#7F8C8D]">Opens in Excel, Google Sheets</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFE] transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-[#3498DB]/10 rounded-lg flex items-center justify-center">
                    {exported === 'json' ? (
                      <Check className="w-5 h-5 text-[#3498DB]" />
                    ) : (
                      <FileJson className="w-5 h-5 text-[#3498DB]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#2C3E50]">Export as JSON</p>
                    <p className="text-xs text-[#7F8C8D]">For developers & data analysis</p>
                  </div>
                </button>
              </div>

              {/* Tip */}
              <div className="px-4 pb-4">
                <p className="text-xs text-[#7F8C8D] text-center">
                  💡 Exports all {summary.transactionCount} transactions
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
