/**
 * Unit tests for export utilities
 * Tests CSV/JSON generation and transaction summaries
 */

import { describe, test, expect } from 'vitest';
import { transactionsToCSV, transactionsToJSON, generateSummary, ExportData } from './export';
import { Transaction } from '@/types/database';

// =============================================================================
// Test Data Helpers
// =============================================================================

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    child_id: 'child-1',
    type: 'deposit',
    amount_cents: 1000, // $10.00
    balance_after_cents: 1000,
    description: 'Test deposit',
    status: 'completed',
    requested_at: null,
    processed_at: null,
    processed_by: null,
    created_at: '2026-03-01T10:00:00Z',
    ...overrides,
  };
}

function createExportData(transactions: Transaction[] = []): ExportData {
  return {
    childName: 'Test Child',
    generatedAt: '2026-03-05T12:00:00Z',
    transactions,
  };
}

// =============================================================================
// generateSummary Tests
// =============================================================================

describe('generateSummary', () => {
  test('should return zeros for empty transactions', () => {
    const result = generateSummary([]);
    
    expect(result).toEqual({
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalInterest: 0,
      netChange: 0,
      transactionCount: 0,
    });
  });

  test('should sum deposits correctly', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'deposit', amount_cents: 1000 }),
      createTransaction({ type: 'deposit', amount_cents: 2500 }),
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.totalDeposits).toBe(3500);
    expect(result.netChange).toBe(3500);
    expect(result.transactionCount).toBe(2);
  });

  test('should sum withdrawals correctly (absolute value)', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'withdrawal', amount_cents: -500 }),
      createTransaction({ type: 'withdrawal', amount_cents: -1000 }),
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.totalWithdrawals).toBe(1500);
    expect(result.netChange).toBe(-1500);
  });

  test('should sum interest correctly', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'interest', amount_cents: 50 }),
      createTransaction({ type: 'interest', amount_cents: 75 }),
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.totalInterest).toBe(125);
    expect(result.netChange).toBe(125);
  });

  test('should calculate net change for mixed transactions', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'deposit', amount_cents: 5000 }),
      createTransaction({ type: 'withdrawal', amount_cents: -2000 }),
      createTransaction({ type: 'interest', amount_cents: 100 }),
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.totalDeposits).toBe(5000);
    expect(result.totalWithdrawals).toBe(2000);
    expect(result.totalInterest).toBe(100);
    expect(result.netChange).toBe(3100); // 5000 - 2000 + 100
    expect(result.transactionCount).toBe(3);
  });

  test('should handle large amounts', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'deposit', amount_cents: 100000000 }), // $1M
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.totalDeposits).toBe(100000000);
  });

  test('should count all transaction types', () => {
    const transactions: Transaction[] = [
      createTransaction({ type: 'deposit' }),
      createTransaction({ type: 'withdrawal', amount_cents: -100 }),
      createTransaction({ type: 'interest', amount_cents: 10 }),
      createTransaction({ type: 'deposit' }),
      createTransaction({ type: 'interest', amount_cents: 20 }),
    ];
    
    const result = generateSummary(transactions);
    
    expect(result.transactionCount).toBe(5);
  });
});

// =============================================================================
// transactionsToCSV Tests
// =============================================================================

describe('transactionsToCSV', () => {
  test('should include metadata header', () => {
    const data = createExportData([]);
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('# GrowBucks Transaction Export');
    expect(csv).toContain('# Child: Test Child');
    expect(csv).toContain('# Generated:');
    expect(csv).toContain('# Total Transactions: 0');
  });

  test('should include column headers', () => {
    const data = createExportData([]);
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('Date,Type,Description,Amount,Balance After,Status');
  });

  test('should format deposit transaction correctly', () => {
    const data = createExportData([
      createTransaction({
        type: 'deposit',
        amount_cents: 1234,
        balance_after_cents: 5678,
        description: 'Birthday money',
        status: 'completed',
      }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('Deposit');
    expect(csv).toContain('"Birthday money"');
    expect(csv).toContain('$12.34');
    expect(csv).toContain('$56.78');
    expect(csv).toContain('completed');
  });

  test('should format withdrawal as negative', () => {
    const data = createExportData([
      createTransaction({
        type: 'withdrawal',
        amount_cents: -500,
        balance_after_cents: 9500,
      }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('-$5.00');
    expect(csv).toContain('$95.00');
  });

  test('should capitalize transaction type', () => {
    const data = createExportData([
      createTransaction({ type: 'interest' }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('Interest');
  });

  test('should escape quotes in description', () => {
    const data = createExportData([
      createTransaction({ description: 'Gift from "Grandma"' }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('""Grandma""');
  });

  test('should handle empty description', () => {
    const data = createExportData([
      createTransaction({ description: '' }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    // Should not throw and should contain empty quoted field
    expect(csv).toContain('""');
  });

  test('should handle null description', () => {
    const data = createExportData([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createTransaction({ description: null as any }),
    ]);
    
    const csv = transactionsToCSV(data);
    
    // Should not throw
    expect(csv).toBeDefined();
  });

  test('should format multiple transactions', () => {
    const data = createExportData([
      createTransaction({ id: '1', type: 'deposit', amount_cents: 1000 }),
      createTransaction({ id: '2', type: 'interest', amount_cents: 50 }),
      createTransaction({ id: '3', type: 'withdrawal', amount_cents: -200 }),
    ]);
    
    const csv = transactionsToCSV(data);
    const lines = csv.split('\n').filter(l => l && !l.startsWith('#'));
    
    // Header + 3 data rows
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });

  test('should show correct transaction count in metadata', () => {
    const data = createExportData([
      createTransaction(),
      createTransaction(),
      createTransaction(),
    ]);
    
    const csv = transactionsToCSV(data);
    
    expect(csv).toContain('# Total Transactions: 3');
  });
});

// =============================================================================
// transactionsToJSON Tests
// =============================================================================

describe('transactionsToJSON', () => {
  test('should return valid JSON', () => {
    const data = createExportData([createTransaction()]);
    const json = transactionsToJSON(data);
    
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('should include metadata section', () => {
    const data = createExportData([]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.childName).toBe('Test Child');
    expect(parsed.metadata.exportedBy).toBe('GrowBucks');
  });

  test('should include transaction count in metadata', () => {
    const data = createExportData([
      createTransaction(),
      createTransaction(),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.metadata.totalTransactions).toBe(2);
  });

  test('should format amounts in cents and dollars', () => {
    const data = createExportData([
      createTransaction({ amount_cents: 1234, balance_after_cents: 5678 }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    const tx = parsed.transactions[0];
    expect(tx.amountCents).toBe(1234);
    expect(tx.amountFormatted).toBe('$12.34');
    expect(tx.balanceAfterCents).toBe(5678);
    expect(tx.balanceAfterFormatted).toBe('$56.78');
  });

  test('should include all transaction fields', () => {
    const data = createExportData([
      createTransaction({
        id: 'tx-abc',
        type: 'deposit',
        description: 'Weekly allowance',
        status: 'completed',
      }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    const tx = parsed.transactions[0];
    expect(tx.id).toBe('tx-abc');
    expect(tx.type).toBe('deposit');
    expect(tx.description).toBe('Weekly allowance');
    expect(tx.status).toBe('completed');
    expect(tx.date).toBeDefined();
  });

  test('should handle negative amounts for withdrawals', () => {
    const data = createExportData([
      createTransaction({ type: 'withdrawal', amount_cents: -500 }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    const tx = parsed.transactions[0];
    expect(tx.amountCents).toBe(-500);
    expect(tx.amountFormatted).toBe('-$5.00');
  });

  test('should pretty-print JSON with indentation', () => {
    const data = createExportData([createTransaction()]);
    const json = transactionsToJSON(data);
    
    // Should have newlines and indentation
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  test('should handle empty transactions array', () => {
    const data = createExportData([]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.transactions).toEqual([]);
    expect(parsed.metadata.totalTransactions).toBe(0);
  });

  test('should preserve transaction order', () => {
    const data = createExportData([
      createTransaction({ id: 'first', amount_cents: 100 }),
      createTransaction({ id: 'second', amount_cents: 200 }),
      createTransaction({ id: 'third', amount_cents: 300 }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.transactions[0].id).toBe('first');
    expect(parsed.transactions[1].id).toBe('second');
    expect(parsed.transactions[2].id).toBe('third');
  });
});

// =============================================================================
// Money Formatting Tests (internal function behavior)
// =============================================================================

describe('Money formatting in exports', () => {
  test('should format zero correctly', () => {
    const data = createExportData([
      createTransaction({ amount_cents: 0 }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.transactions[0].amountFormatted).toBe('$0.00');
  });

  test('should format single cent correctly', () => {
    const data = createExportData([
      createTransaction({ amount_cents: 1 }),
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.transactions[0].amountFormatted).toBe('$0.01');
  });

  test('should format large amounts correctly', () => {
    const data = createExportData([
      createTransaction({ amount_cents: 9999999 }), // $99,999.99
    ]);
    const json = transactionsToJSON(data);
    const parsed = JSON.parse(json);
    
    expect(parsed.transactions[0].amountFormatted).toBe('$99999.99');
  });
});
