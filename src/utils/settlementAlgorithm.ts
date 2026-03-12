export interface Balance {
  userId: string;
  amount: number; // positive means they are owed money, negative means they owe money
}

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

/**
 * Calculates simplified debts using a greedy algorithm.
 * @param balances Array of user balances
 * @returns Array of optimal transactions to settle all debts
 */
export function simplifyDebts(balances: Balance[]): SettlementTransaction[] {
  // Separate into debtors (those who owe) and creditors (those who are owed)
  const debtors = balances.filter(b => b.amount < -0.01).map(b => ({ ...b, amount: Math.abs(b.amount) }));
  const creditors = balances.filter(b => b.amount > 0.01);

  // Sort both by amount descending to match largest debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: SettlementTransaction[] = [];
  
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(settleAmount * 100) / 100 // Round to 2 decimal places
    });

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}
