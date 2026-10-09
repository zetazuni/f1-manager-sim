using System;
using System.Collections.Generic;
using F1Manager.Data;

namespace F1Manager.Sim
{
    public class FinancialManager
    {
        public float CurrentBudget { get; private set; }

        public FinancialManager(float initialBudget)
        {
            CurrentBudget = initialBudget;
        }

        public void ProcessSponsorship(float amount)
        {
            CurrentBudget += amount;
            Console.WriteLine($"Sponsorship received: ${amount:N0}. New Budget: ${CurrentBudget:N0}");
        }

        public bool PaySalaries(List<Driver> drivers)
        {
            float totalSalary = 0;
            foreach (var driver in drivers) totalSalary += driver.salary;

            if (CurrentBudget >= totalSalary)
            {
                CurrentBudget -= totalSalary;
                Console.WriteLine($"Salaries paid: ${totalSalary:N0}. Remaining Budget: ${CurrentBudget:N0}");
                return true;
            }

            Console.WriteLine("Insufficient budget to pay salaries!");
            return false;
        }
    }
}
