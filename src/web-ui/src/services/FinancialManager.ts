import { Driver } from '../types';

export class FinancialManager {
  private currentBudget: number;

  constructor(initialBudget: number) {
    this.currentBudget = initialBudget;
  }

  getBudget(): number {
    return this.currentBudget;
  }

  processSponsorship(amount: number): void {
    this.currentBudget += amount;
  }

  paySalaries(drivers: Driver[]): boolean {
    const totalSalary = drivers.reduce((sum, d) => sum + d.salary, 0);

    if (this.currentBudget >= totalSalary) {
      this.currentBudget -= totalSalary;
      return true;
    }
    return false;
  }
}