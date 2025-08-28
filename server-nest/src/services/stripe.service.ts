import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import moment from 'moment-timezone';
import { TransactionData, AccountInfo } from '../interfaces/stripe.interface';

@Injectable()
export class StripeService {
  async getMultipleAccounts(secretKey: string): Promise<AccountInfo[]> {
    try {
      const stripe = new Stripe(secretKey);
      const accounts = await stripe.accounts.list({ limit: 100 });

      return accounts.data.map((account) => ({
        id: account.id,
        business_type: account.business_type || 'individual',
        country: account.country || 'US',
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        email: account.email || '',
        type: account.type || 'express',
      }));
    } catch (error) {
      console.error('Error fetching multiple accounts:', error);
      throw error;
    }
  }

  async getMultiAccountTransactions(
    secretKey: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
    timezone: string = 'UTC',
  ): Promise<{ transactions: TransactionData[]; accounts: AccountInfo[] }> {
    try {
      const stripe = new Stripe(secretKey);
      const allTransactions: TransactionData[] = [];
      const accountInfos: AccountInfo[] = [];

      for (const accountId of accountIds) {
        try {
          const account = await stripe.accounts.retrieve(accountId);
          accountInfos.push({
            id: account.id,
            business_type: account.business_type || 'individual',
            country: account.country || 'US',
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            email: account.email || '',
            type: account.type || 'express',
          });

          const accountTransactions = await this.getTransactions(
            secretKey,
            accountId,
            startDate,
            endDate,
            timezone,
          );

          const transactionsWithAccountId = accountTransactions.map((tx) => ({
            ...tx,
            account_id: accountId,
          }));

          allTransactions.push(...transactionsWithAccountId);
        } catch (error) {
          console.error(`Error processing account ${accountId}:`, error);
        }
      }

      allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return {
        transactions: allTransactions,
        accounts: accountInfos,
      };
    } catch (error) {
      console.error('Error in getMultiAccountTransactions:', error);
      throw error;
    }
  }

  async getTransactions(
    apiKey: string,
    connectedAccountId: string,
    startDate: string,
    endDate: string,
    timezone: string = 'UTC',
  ): Promise<TransactionData[]> {
    try {
      const stripe = new Stripe(apiKey);
      const startMoment = moment.tz(startDate, timezone).startOf('day');
      const endMoment = moment.tz(endDate, timezone).endOf('day');

      const dailyData: { [key: string]: TransactionData } = {};
      let currentDate = startMoment.clone();

      while (currentDate.isSameOrBefore(endMoment, 'day')) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        dailyData[dateStr] = {
          date: dateStr,
          charges_count: 0,
          charges_amount: 0,
          refunds_count: 0,
          refunds_amount: 0,
          chargebacks_count: 0,
          chargebacks_amount: 0,
          declines_count: 0,
          aprvl_pct: 100,
          totals_count: 0,
          totals_amount: 0,
          account_id: connectedAccountId,
        };
        currentDate.add(1, 'day');
      }

      const charges = await stripe.charges.list(
        {
          created: {
            gte: startMoment.unix(),
            lte: endMoment.unix(),
          },
          limit: 100,
        },
        {
          stripeAccount: connectedAccountId,
        },
      );

      const refunds = await stripe.refunds.list(
        {
          created: {
            gte: startMoment.unix(),
            lte: endMoment.unix(),
          },
          limit: 100,
        },
        {
          stripeAccount: connectedAccountId,
        },
      );

      const chargebacks = await stripe.disputes.list(
        {
          created: {
            gte: startMoment.unix(),
            lte: endMoment.unix(),
          },
          limit: 100,
        },
        {
          stripeAccount: connectedAccountId,
        },
      );

      const declines = await stripe.charges.list(
        {
          created: {
            gte: startMoment.unix(),
            lte: endMoment.unix(),
          },
          limit: 100,
        },
        {
          stripeAccount: connectedAccountId,
        },
      );

      const failedCharges = declines.data.filter(
        (charge) => charge.status === 'failed',
      );

      charges.data.forEach((charge) => {
        const dateStr = moment
          .unix(charge.created)
          .tz(timezone)
          .format('YYYY-MM-DD');
        if (dailyData[dateStr]) {
          dailyData[dateStr].charges_count++;
          dailyData[dateStr].charges_amount += charge.amount / 100;
          dailyData[dateStr].totals_count++;
          dailyData[dateStr].totals_amount += charge.amount / 100;
        }
      });

      refunds.data.forEach((refund) => {
        const dateStr = moment
          .unix(refund.created)
          .tz(timezone)
          .format('YYYY-MM-DD');
        if (dailyData[dateStr]) {
          dailyData[dateStr].refunds_count++;
          dailyData[dateStr].refunds_amount += refund.amount / 100;
          dailyData[dateStr].totals_count++;
          dailyData[dateStr].totals_amount -= refund.amount / 100;
        }
      });

      chargebacks.data.forEach((chargeback) => {
        const dateStr = moment
          .unix(chargeback.created)
          .tz(timezone)
          .format('YYYY-MM-DD');
        if (dailyData[dateStr]) {
          dailyData[dateStr].chargebacks_count++;
          dailyData[dateStr].chargebacks_amount += chargeback.amount / 100;
          dailyData[dateStr].totals_count++;
          dailyData[dateStr].totals_amount -= chargeback.amount / 100;
        }
      });

      failedCharges.forEach((decline) => {
        const dateStr = moment
          .unix(decline.created)
          .tz(timezone)
          .format('YYYY-MM-DD');
        if (dailyData[dateStr]) {
          dailyData[dateStr].declines_count++;
          dailyData[dateStr].totals_count++;
        }
      });

      Object.values(dailyData).forEach((day) => {
        day.charges_amount = Math.round(day.charges_amount * 100) / 100;
        day.refunds_amount = Math.round(day.refunds_amount * 100) / 100;
        day.chargebacks_amount = Math.round(day.chargebacks_amount * 100) / 100;
        day.totals_amount = Math.round(day.totals_amount * 100) / 100;

        const totalAttempts = day.charges_count + day.declines_count;
        day.aprvl_pct =
          totalAttempts > 0
            ? Math.round((day.charges_count / totalAttempts) * 100 * 100) / 100
            : 100;
      });

      return Object.values(dailyData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }
}
