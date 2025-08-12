import { BaseStockApiClient } from '../clients/base-client';
import { 
  StockSymbol, 
  TimeSeriesPoint, 
  CompanyProfile, 
  FinancialMetrics, 
  StockQuote, 
  VolumeMetrics,
  PerformanceMetrics,
  Dividend, 
  EarningsReport, 
  NewsArticle,
  TimeInterval,
  BatchQuoteResult,
  BatchCompanyProfileResult
} from '../types';
import { subDays, subMonths, subYears, startOfYear } from 'date-fns';

/**
 * Financial Modeling Prep API client implementation
 * Documentation: https://site.financialmodelingprep.com/
 */
export class FinancialModelingPrepClient extends BaseStockApiClient {
  constructor(apiKey: string, requestTimeout: number = 30000) {
    super(apiKey, 'https://financialmodelingprep.com/api/v3', requestTimeout);
  }

  /**
   * Get a stock quote
   */
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/quote/${symbol}`);

    if (!data || data.length === 0) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    const quote = data[0];
    const mappedQuote = this.mapQuote(quote, symbol);
    
    if (includeHistorical) {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        
        const historicalData = await this.getTimeSeries(symbol, 'daily', undefined, startDate, endDate);
        const volumeMetrics = this.calculateVolumeMetrics(historicalData);
        const performance = this.calculatePerformanceMetrics(historicalData, mappedQuote.price, endDate);
        
        return { ...mappedQuote, volumeMetrics, performance };
      } catch (error) {
        console.warn(`Could not fetch historical data for ${symbol}:`, error);
        return mappedQuote;
      }
    }
    
    return mappedQuote;
  }

  /**
   * Get multiple stock quotes in a single request
   */
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    const symbolList = symbols.join(',');
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/quote/${symbolList}`);
    
    const results: BatchQuoteResult = {};
    
    if (data && Array.isArray(data)) {
      for (const quote of data) {
        try {
          const mappedQuote = this.mapQuote(quote, quote.symbol);
          results[quote.symbol] = { success: true, data: mappedQuote, symbol: quote.symbol };
        } catch (error) {
          results[quote.symbol] = { success: false, error: error as Error, symbol: quote.symbol };
        }
      }
    }

    for (const symbol of symbols) {
      if (!results[symbol]) {
        results[symbol] = { success: false, error: new Error('Symbol not found'), symbol };
      }
    }

    return results;
  }

  /**
   * Get company profile information
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/profile/${symbol}`);

    if (!data || data.length === 0) {
      throw new Error(`No profile data found for symbol: ${symbol}`);
    }

    return this.mapCompanyProfile(data[0]);
  }

  /**
   * Get multiple company profiles
   */
  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const symbolList = symbols.join(',');
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/profile/${symbolList}`);
    
    const results: BatchCompanyProfileResult = {};
    
    if (data && Array.isArray(data)) {
      for (const profile of data) {
        try {
          const mappedProfile = this.mapCompanyProfile(profile);
          results[profile.symbol] = { success: true, data: mappedProfile, symbol: profile.symbol };
        } catch (error) {
          results[profile.symbol] = { success: false, error: error as Error, symbol: profile.symbol };
        }
      }
    }

    for (const symbol of symbols) {
      if (!results[symbol]) {
        results[symbol] = { success: false, error: new Error('Symbol not found'), symbol };
      }
    }

    return results;
  }

  /**
   * Get time series data for a symbol
   */
  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval = 'daily',
    period?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeSeriesPoint[]> {
    const intervalMap: Record<string, string> = {
      '1min': '1min', '5min': '5min', '15min': '15min', '30min': '30min',
      '60min': '1hour', 'daily': 'daily', 'weekly': 'weekly', 'monthly': 'monthly'
    };

    const fmpInterval = intervalMap[interval] || 'daily';
    const url = `${this.baseUrl}/historical-chart/${fmpInterval}/${symbol}`;
    
    const data = await this.makeRequest<any[]>(url);
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid time series data format');
    }

    const result: TimeSeriesPoint[] = [];

    for (const point of data) {
      const timestamp = new Date(point.date);
      
      if (startDate && timestamp < startDate) continue;
      if (endDate && timestamp > endDate) continue;
      
      result.push({
        timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
      });
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get financial metrics for a company
   */
  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics> {
    const [keyMetrics, incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.makeRequest<any[]>(`${this.baseUrl}/key-metrics/${symbol}?limit=1`),
      this.makeRequest<any[]>(`${this.baseUrl}/income-statement/${symbol}?limit=1`),
      this.makeRequest<any[]>(`${this.baseUrl}/balance-sheet-statement/${symbol}?limit=1`),
      this.makeRequest<any[]>(`${this.baseUrl}/cash-flow-statement/${symbol}?limit=1`)
    ]);

    return this.mapFinancialMetrics(
      keyMetrics?.[0] || {},
      incomeStatement?.[0] || {},
      balanceSheet?.[0] || {},
      cashFlow?.[0] || {}
    );
  }

  /**
   * Get dividend history for a stock
   */
  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/historical-price-full/stock_dividend/${symbol}`);

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return this.mapDividends(data, symbol, startDate, endDate);
  }

  /**
   * Get earnings reports for a company
   */
  async getEarnings(
    symbol: string, 
    options?: number | {
      limit?: number;
      includeFutureReports?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EarningsReport[]> {
    const {
      limit = 4,
      includeFutureReports = false,
      startDate,
      endDate
    } = typeof options === 'number' ? { limit: options } : (options || {});

    const historicalData = await this.makeRequest<any[]>(`${this.baseUrl}/earnings/${symbol}?limit=${limit * 2}`);
    let earnings = this.mapEarnings(historicalData || [], symbol);

    if (includeFutureReports) {
      try {
        const futureData = await this.makeRequest<any[]>(`${this.baseUrl}/earnings-calendar/${symbol}`);
        const futureEarnings = this.mapFutureEarnings(futureData || [], symbol);
        earnings = [...futureEarnings, ...earnings];
      } catch (error) {
        console.warn('Could not fetch future earnings:', error);
      }
    }

    if (startDate || endDate) {
      earnings = earnings.filter(earning => {
        const reportDate = earning.reportedDate || earning.fiscalDateEnding;
        return (!startDate || reportDate >= startDate) && (!endDate || reportDate <= endDate);
      });
    }

    return earnings
      .sort((a, b) => (b.reportedDate || b.fiscalDateEnding).getTime() - (a.reportedDate || a.fiscalDateEnding).getTime())
      .slice(0, limit);
  }

  /**
   * Get upcoming earnings reports
   */
  async getUpcomingEarnings(
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    } = {}
  ): Promise<EarningsReport[]> {
    const {
      limit = 50,
      startDate = new Date(),
      endDate = new Date(new Date().setMonth(new Date().getMonth() + 3))
    } = options;

    const data = await this.makeRequest<any[]>(`${this.baseUrl}/earnings-calendar`);

    if (!data || !Array.isArray(data)) {
      return [];
    }

    const earnings = this.mapFutureEarnings(data, undefined);

    return earnings
      .filter(earning => {
        const reportDate = earning.reportedDate || earning.fiscalDateEnding;
        return reportDate >= startDate && reportDate <= endDate;
      })
      .sort((a, b) => (a.reportedDate || a.fiscalDateEnding).getTime() - (b.reportedDate || b.fiscalDateEnding).getTime())
      .slice(0, limit);
  }

  /**
   * Search for stock symbols
   */
  async searchSymbols(query: string): Promise<StockSymbol[]> {
    const data = await this.makeRequest<any[]>(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`);

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(item => ({
      symbol: item.symbol,
      name: item.name,
      currency: item.currency,
      exchange: item.exchange,
      country: item.country,
      type: item.type
    }));
  }

  /**
   * Get market news
   */
  async getMarketNews(symbols?: string[], limit: number = 10): Promise<NewsArticle[]> {
    let url = `${this.baseUrl}/stock_news`;
    
    if (symbols && symbols.length > 0) {
      const symbolList = symbols.join(',');
      url += `?tickers=${symbolList}`;
    }

    const data = await this.makeRequest<any[]>(url);

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.slice(0, limit).map(item => ({
      id: item.id || item.title,
      source: item.site,
      title: item.title,
      summary: item.text,
      url: item.url,
      publishedAt: new Date(item.publishedDate),
      imageUrl: item.image,
      relatedSymbols: item.symbols || []
    }));
  }

  // Helper methods
  
  private calculateVolumeMetrics(historicalData: TimeSeriesPoint[]): VolumeMetrics {
    if (!historicalData || historicalData.length === 0) {
      return { avgDailyVolume: 0, avgDailyVolumeDollar: 0, currentVolume: 0 };
    }
  
    const totalVolume = historicalData.reduce((sum, point) => sum + point.volume, 0);
    const avgDailyVolume = Math.round(totalVolume / historicalData.length);
    
    const totalDollarVolume = historicalData.reduce((sum, point) => sum + (point.volume * point.close), 0);
    const avgDailyVolumeDollar = Math.round(totalDollarVolume / historicalData.length); // Add rounding
    
    // Get the most recent volume (sort by timestamp descending first)
    const sortedData = [...historicalData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const currentVolume = sortedData[0]?.volume || 0;
    
    return { avgDailyVolume, avgDailyVolumeDollar, currentVolume };
  }
  
  private calculatePerformanceMetrics(
    historicalData: TimeSeriesPoint[], 
    currentPrice: number,
    asOfDate: Date = new Date()
  ): PerformanceMetrics {
    const result: PerformanceMetrics = {};
    
    if (!historicalData || historicalData.length === 0) {
      return result;
    }
    
    const sortedData = [...historicalData].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const findPriceOnDate = (targetDate: Date): number | null => {
      for (const dataPoint of sortedData) {
        if (dataPoint.timestamp >= targetDate) {
          return dataPoint.close;
        }
      }
      return null;
    };
    
    const now = asOfDate.getTime();
    const periods = [
      { key: 'oneWeek', targetDate: new Date(subDays(now, 7)) },
      { key: 'oneMonth', targetDate: new Date(subMonths(now, 1)) },
      { key: 'threeMonth', targetDate: new Date(subMonths(now, 3)) },
      { key: 'oneYear', targetDate: new Date(subYears(now, 1)) },
      { key: 'yearToDate', targetDate: new Date(startOfYear(now)) }
    ];
    
    for (const { key, targetDate } of periods) {
      const startPrice = findPriceOnDate(targetDate);
      
      if (startPrice && startPrice > 0) {
        result[key] = ((currentPrice - startPrice) / startPrice) * 100;
      }
    }
    
    return result;
  }
  
  private mapQuote(data: any, symbol: string): StockQuote {
    return {
      symbol: symbol,
      price: data.price,
      change: data.changes,
      changePercent: data.changesPercentage,
      timestamp: new Date(),
      volume: data.volume,
      open: data.open,
      high: data.dayHigh,
      low: data.dayLow,
      previousClose: data.previousClose
    };
  }

  private mapCompanyProfile(data: any): CompanyProfile {
    return {
      symbol: data.symbol,
      name: data.companyName,
      description: data.description,
      exchange: data.exchange,
      currency: data.currency,
      sector: data.sector,
      industry: data.industry,
      website: data.website,
      logo: data.image,
      marketCap: data.mktCap,
      employees: data.fullTimeEmployees,
      ipoDate: data.ipoDate ? new Date(data.ipoDate) : undefined,
      sharesOutstanding: data.sharesOutstanding,
      floatShares: data.floatShares,
      lastUpdated: new Date(),
      beta: data.beta,
      dividendPerShare: data.dividend,
      dividendYield: data.dividendYield,
      peRatio: data.pe,
      eps: data.eps
    };
  }

  private mapFinancialMetrics(
    keyMetrics: any,
    incomeStatement: any,
    balanceSheet: any,
    cashFlow: any
  ): FinancialMetrics {
    return {
      symbol: keyMetrics.symbol || '',
      asOfDate: new Date(),
      reportPeriod: 'quarterly',
      
      // Valuation Metrics
      marketCap: keyMetrics.marketCap,
      enterpriseValue: keyMetrics.enterpriseValue,
      peRatio: keyMetrics.peRatio,
      forwardPERatio: keyMetrics.forwardPE,
      priceToBookRatio: keyMetrics.pbRatio,
      evToEbitda: keyMetrics.evToEbitda,
      evToRevenue: keyMetrics.evToRevenue,
      pegRatio: keyMetrics.pegRatio,
      
      // Profitability
      revenue: incomeStatement.revenue,
      grossProfit: incomeStatement.grossProfit,
      operatingIncome: incomeStatement.operatingIncome,
      netIncome: incomeStatement.netIncome,
      ebitda: keyMetrics.ebitda,
      
      // Margins
      grossMargin: keyMetrics.grossProfitMargin,
      operatingMargin: keyMetrics.operatingIncomeMargin,
      profitMargin: keyMetrics.netIncomeMargin,
      ebitdaMargin: keyMetrics.ebitdaMargin,
      
      // Balance Sheet
      totalDebt: balanceSheet.totalDebt,
      totalEquity: balanceSheet.totalStockholdersEquity,
      currentRatio: keyMetrics.currentRatio,
      quickRatio: keyMetrics.quickRatio,
      debtToEquity: keyMetrics.debtToEquity,
      
      // Cash Flow
      operatingCashFlow: cashFlow.operatingCashFlow,
      freeCashFlow: cashFlow.freeCashFlow,
      freeCashFlowPerShare: keyMetrics.freeCashFlowPerShare,
      
      // Efficiency & Returns
      returnOnEquity: keyMetrics.roe,
      roe: keyMetrics.roe,
      returnOnAssets: keyMetrics.roa,
      returnOnCapitalEmployed: keyMetrics.roce,
      
      // Dividends
      dividendYield: keyMetrics.dividendYield,
      dividendPerShare: keyMetrics.dividendPerShare,
      dividendPayoutRatio: keyMetrics.dividendPayoutRatio,
      
      // Shares
      sharesOutstanding: keyMetrics.sharesOutstanding,
      floatShares: keyMetrics.floatShares,
      
      // Additional fields
      beta: keyMetrics.beta,
      fiftyTwoWeekHigh: keyMetrics.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: keyMetrics.fiftyTwoWeekLow,
      eps: keyMetrics.eps
    };
  }

  private mapDividends(
    data: any[],
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Dividend[] {
    const dividends: Dividend[] = [];
    
    for (const item of data) {
      const timestamp = new Date(item.date);
      const amount = item.dividend;
      
      if (amount === 0 || 
          (startDate && timestamp < startDate) || 
          (endDate && timestamp > endDate)) {
        continue;
      }

      dividends.push({
        symbol,
        amount,
        exDate: timestamp,
        paymentDate: timestamp,
        recordDate: timestamp,
        declarationDate: undefined
      });
    }

    return dividends;
  }

  private mapEarnings(data: any[], symbol: string): EarningsReport[] {
    return data.map(earning => {
      const fiscalDate = new Date(earning.date);
      const reportedDate = new Date(earning.date);
      
      return {
        symbol,
        fiscalDateEnding: fiscalDate,
        reportedDate: reportedDate,
        reportedEPS: earning.eps,
        estimatedEPS: earning.epsEstimated,
        surprise: earning.epsSurprise,
        surprisePercentage: earning.epsSurprisePercentage,
        reportedRevenue: earning.revenue,
        estimatedRevenue: earning.revenueEstimated,
        revenueSurprise: earning.revenueSurprise,
        revenueSurprisePercentage: earning.revenueSurprisePercentage,
        period: this.getFiscalQuarter(fiscalDate),
        year: fiscalDate.getFullYear(),
        isFutureReport: false,
        currency: 'USD'
      };
    });
  }
  
  private mapFutureEarnings(data: any[], symbol?: string): EarningsReport[] {
    return data.map(earning => {
      const fiscalDate = new Date(earning.date);
      const reportDate = new Date(earning.date);
      
      return {
        symbol: symbol || earning.symbol,
        fiscalDateEnding: fiscalDate,
        reportedDate: reportDate,
        reportedEPS: 0,
        estimatedEPS: earning.epsEstimated,
        estimatedRevenue: earning.revenueEstimated,
        period: this.getFiscalQuarter(fiscalDate),
        year: fiscalDate.getFullYear(),
        isFutureReport: true,
        time: earning.time,
        currency: 'USD'
      };
    });
  }
  
  private getFiscalQuarter(date: Date): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
    const month = date.getMonth() + 1;
    
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  }
}
