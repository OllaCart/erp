import type { FinancialTransaction, TransactionType } from "@/types/erp"
import { v4 as uuidv4 } from "uuid"

// In-memory storage for demo purposes
const transactions: FinancialTransaction[] = []

export const FinancialService = {
  // Add a new transaction
  addTransaction: async (transaction: Omit<FinancialTransaction, "id">): Promise<FinancialTransaction> => {
    const newTransaction: FinancialTransaction = {
      id: uuidv4(),
      ...transaction,
      date: new Date(transaction.date),
    }

    transactions.push(newTransaction)
    return newTransaction
  },

  // Get all transactions for a user
  getUserTransactions: async (userId: string): Promise<FinancialTransaction[]> => {
    return transactions.filter((t) => t.userId === userId)
  },

  // Get transactions by category
  getTransactionsByCategory: async (userId: string, category: string): Promise<FinancialTransaction[]> => {
    return transactions.filter((t) => t.userId === userId && t.category === category)
  },

  // Get transactions by type (income/expense)
  getTransactionsByType: async (userId: string, type: TransactionType): Promise<FinancialTransaction[]> => {
    return transactions.filter((t) => t.userId === userId && t.type === type)
  },

  // Get transactions by date range
  getTransactionsByDateRange: async (
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialTransaction[]> => {
    return transactions.filter((t) => t.userId === userId && t.date >= startDate && t.date <= endDate)
  },

  // Calculate balance
  calculateBalance: async (userId: string): Promise<number> => {
    const userTransactions = await FinancialService.getUserTransactions(userId)

    return userTransactions.reduce((balance, transaction) => {
      if (transaction.type === "income") {
        return balance + transaction.amount
      } else {
        return balance - transaction.amount
      }
    }, 0)
  },

  // Get spending by category
  getSpendingByCategory: async (userId: string): Promise<Record<string, number>> => {
    const expenses = await FinancialService.getTransactionsByType(userId, "expense")

    return expenses.reduce(
      (categories, transaction) => {
        const { category, amount } = transaction

        if (!categories[category]) {
          categories[category] = 0
        }

        categories[category] += amount
        return categories
      },
      {} as Record<string, number>,
    )
  },
}
