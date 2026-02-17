/**
 * Export utilities for GrowBucks transactions
 */

import { Transaction } from '@/types/database';

export interface ExportData {
  childName: string;
  generatedAt: string;
  transactions: Transaction[];
}

/**
 * Format cents to dollars string
 */
function formatMoney(cents: number): string {
  const amount = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${amount.toFixed(2)}`;
}

/**
 * Format date for export
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert transactions to CSV format
 */
export function transactionsToCSV(data: ExportData): string {
  const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After', 'Status'];
  
  const rows = data.transactions.map((tx) => [
    formatDate(tx.created_at),
    tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    `"${(tx.description || '').replace(/"/g, '""')}"`, // Escape quotes
    formatMoney(tx.amount_cents),
    formatMoney(tx.balance_after_cents),
    tx.status,
  ]);

  const csvContent = [
    `# GrowBucks Transaction Export`,
    `# Child: ${data.childName}`,
    `# Generated: ${data.generatedAt}`,
    `# Total Transactions: ${data.transactions.length}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Convert transactions to JSON format
 */
export function transactionsToJSON(data: ExportData): string {
  const exportObject = {
    metadata: {
      childName: data.childName,
      generatedAt: data.generatedAt,
      totalTransactions: data.transactions.length,
      exportedBy: 'GrowBucks',
    },
    transactions: data.transactions.map((tx) => ({
      id: tx.id,
      date: tx.created_at,
      type: tx.type,
      description: tx.description,
      amountCents: tx.amount_cents,
      amountFormatted: formatMoney(tx.amount_cents),
      balanceAfterCents: tx.balance_after_cents,
      balanceAfterFormatted: formatMoney(tx.balance_after_cents),
      status: tx.status,
    })),
  };

  return JSON.stringify(exportObject, null, 2);
}

/**
 * Trigger download of a file
 */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export transactions as CSV and trigger download
 */
export function exportTransactionsCSV(childName: string, transactions: Transaction[]): void {
  const data: ExportData = {
    childName,
    generatedAt: new Date().toISOString(),
    transactions,
  };

  const csv = transactionsToCSV(data);
  const safeName = childName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `growbucks_${safeName}_${date}.csv`, 'text/csv');
}

/**
 * Export transactions as JSON and trigger download
 */
export function exportTransactionsJSON(childName: string, transactions: Transaction[]): void {
  const data: ExportData = {
    childName,
    generatedAt: new Date().toISOString(),
    transactions,
  };

  const json = transactionsToJSON(data);
  const safeName = childName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  downloadFile(json, `growbucks_${safeName}_${date}.json`, 'application/json');
}

/**
 * Generate a summary report
 */
export function generateSummary(transactions: Transaction[]): {
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  netChange: number;
  transactionCount: number;
} {
  const summary = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalInterest: 0,
    netChange: 0,
    transactionCount: transactions.length,
  };

  for (const tx of transactions) {
    switch (tx.type) {
      case 'deposit':
        summary.totalDeposits += tx.amount_cents;
        summary.netChange += tx.amount_cents;
        break;
      case 'withdrawal':
        summary.totalWithdrawals += Math.abs(tx.amount_cents);
        summary.netChange += tx.amount_cents; // Already negative
        break;
      case 'interest':
        summary.totalInterest += tx.amount_cents;
        summary.netChange += tx.amount_cents;
        break;
    }
  }

  return summary;
}
