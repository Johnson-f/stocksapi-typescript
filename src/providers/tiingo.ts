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
import { subDays, subMonths, subYears, isBefore, isSameDay, startOfYear } from 'date-fns';

/**
 * Tiingo API client implementation
 * Documentation: https://api.tiingo.com/
 */
export class TiingoClient extends BaseStockApiClient {
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    super(apiKey, 'https://api.tiingo.com', requestTimeout);
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`
    };
  }

    /**
   * Override makeRequest to handle Tiingo's token-based authentication
   */
    protected async makeRequest<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
      const url = new URL(endpoint, this.baseUrl);
      
      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      try {
        const response = await fetch(url.toString(), {
          method: 'GET', // Explicitly set GET method
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'stocksapi-typescript/1.0.0',
            'Authorization': `Token ${this.apiKey}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return await response.json() as T;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${this.requestTimeout}ms`);
          }
          throw new Error(`API request failed: ${error.message}`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  

  /**
   * Get a stock quote
   */
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      // Get current quote from Tiingo daily prices endpoint
      const quoteData = await this.makeRequest<any[]>(
        `/tiingo/daily/${symbol}/prices`,
        { sort: '-date' }
      );

      if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
        throw new Error(`No quote data found for symbol: ${symbol}`);
      }

      const latestQuote = quoteData[0];
      const mappedQuote = this.mapQuote(latestQuote, symbol);

      if (includeHistorical) {
        try {
          // Get historical data for performance metrics
          const endDate = new Date();
          const startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 1);

          const historicalData = await this.getTimeSeries(
            symbol,
            'daily',
            undefined,
            startDate,
            endDate
          );

          const volumeMetrics = this.calculateVolumeMetrics(historicalData);
          const performance = this.calculatePerformanceMetrics(
            historicalData,
            mappedQuote.price,
            endDate
          );

          return {
            ...mappedQuote,
            volumeMetrics,
            performance
          };
        } catch (error) {
          console.warn(`Could not fetch historical data for ${symbol}:`, error);
          return mappedQuote;
        }
      }

      return mappedQuote;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple stock quotes in a single request
   */
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    const result: BatchQuoteResult = {};
    
    // Process in parallel with a reasonable concurrency limit
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async symbol => {
        try {
          const quote = await this.getQuote(symbol);
          return { success: true as const, data: quote, symbol };
        } catch (error) {
          return { success: false as const, error: error as Error, symbol };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(resultItem => {
        result[resultItem.symbol] = resultItem;
      });
    }
    
    return result;
  }

  /**
   * Get company profile information
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      // Use the meta endpoint for company information
      const data = await this.makeRequest<any>(
        `/tiingo/daily/${symbol}`
      );

      return this.mapCompanyProfile(data, symbol);
    } catch (error) {
      console.error(`Failed to fetch company profile for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple company profiles
   */
  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const result: BatchCompanyProfileResult = {};
    
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async symbol => {
        try {
          const profile = await this.getCompanyProfile(symbol);
          return { success: true as const, data: profile, symbol };
        } catch (error) {
          return { success: false as const, error: error as Error, symbol };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(resultItem => {
        result[resultItem.symbol] = resultItem;
      });
    }
    
    return result;
  }

  /**
   * Get time series data
   */
  async getTimeSeries(
    symbol: string,
    interval: TimeInterval = 'daily',
    period?: number,
    startDate?: Date,
    endDate?: Date,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<TimeSeriesPoint[]> {
    try {
      const params: Record<string, any> = {};
      
      if (startDate) {
        params.startDate = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.endDate = endDate.toISOString().split('T')[0];
      }
      if (period) {
        // Calculate dates based on period
        const end = endDate || new Date();
        const start = new Date();
        start.setDate(start.getDate() - period);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = end.toISOString().split('T')[0];
      }

      // Use the correct Tiingo historical prices endpoint
      const data = await this.makeRequest<any[]>(
        `/tiingo/daily/${symbol}/prices`,
        params
      );

      return data.map(point => this.mapTimeSeriesPoint(point));
    } catch (error) {
      console.error(`Failed to fetch time series data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get financial metrics - Note: Tiingo has limited fundamental data
   */
  async getFinancialMetrics(
    symbol: string,
    asOfDate?: Date,
    period: 'annual' | 'quarterly' | 'ttm' = 'annual',
    includeGrowthMetrics: boolean = false
  ): Promise<FinancialMetrics> {
    try {
      // Get meta data which includes some fundamental metrics
      const data = await this.makeRequest<any>(
        `/tiingo/daily/${symbol}`
      );

      return this.mapFinancialMetrics(data, symbol, asOfDate || new Date());
    } catch (error) {
      console.error(`Failed to fetch financial metrics for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get dividends - Tiingo doesn't provide dividend data in daily prices
   */
  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    console.warn(`Dividends data is not available for Tiingo provider`);
    return [];
  }

  /**
   * Get earnings reports - Limited support in Tiingo
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
    console.warn(`Earnings data is not available for Tiingo provider`);
    return [];
  }

  /**
   * Get upcoming earnings reports
   */
  async getUpcomingEarnings(
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    }
  ): Promise<EarningsReport[]> {
    console.warn(`Upcoming earnings data is not available for Tiingo provider`);
    return [];
  }

 /**
   * Search for symbols
   */
 async searchSymbols(query: string): Promise<StockSymbol[]> {
  try {
    // Use the makeRequest method with proper endpoint
    const data = await this.makeRequest<any[]>(
      `/tiingo/utilities/search`,
      { query }
    );

    return data.map(item => this.mapStockSymbol(item));
  } catch (error) {
    console.error(`Failed to search symbols for query "${query}":`, error);
    throw error;
  }
}
  /**
   * Get market news
   */
  async getMarketNews(symbols?: string[], limit: number = 50): Promise<NewsArticle[]> {
    try {
      const params: Record<string, any> = {};
      
      if (symbols && symbols.length > 0) {
        params.tickers = symbols.join(',');
      }
      
      if (limit) {
        params.limit = limit;
      }

      const data = await this.makeRequest<any[]>(
        `/tiingo/news`,
        params
      );

      return data.map(item => this.mapNewsArticle(item));
    } catch (error) {
      console.error(`Failed to fetch market news:`, error);
      throw error;
    }
  }

  // Helper methods for mapping data

  private mapQuote(data: any, symbol: string): StockQuote {
    const change = (data.close || 0) - (data.prevClose || data.open || 0);
    const changePercent = data.changePercent || (data.prevClose ? (change / data.prevClose) * 100 : 0);

    return {
      symbol,
      price: data.close || data.adjClose || 0,
      change,
      changePercent,
      timestamp: new Date(data.date || Date.now()),
      volume: data.volume || 0,
      open: data.open,
      high: data.high,
      low: data.low,
      previousClose: data.prevClose
    };
  }

  private mapCompanyProfile(data: any, symbol: string): CompanyProfile {
    return {
      symbol,
      name: data.name || symbol,
      description: data.description || '',
      exchange: data.exchange || data.exchangeCode || '',
      currency: 'USD', // Tiingo primarily deals with USD
      sector: data.sector,
      industry: data.industry,
      website: data.website,
      logo: data.logo,
      marketCap: data.marketCap,
      employees: data.employees,
      ipoDate: data.startDate ? new Date(data.startDate) : undefined,
      sharesOutstanding: data.sharesOutstanding,
      floatShares: data.floatShares,
      lastUpdated: new Date(),
      beta: data.beta,
      dividendPerShare: data.dividendPerShare,
      dividendYield: data.dividendYield,
      peRatio: data.peRatio,
      eps: data.eps
    };
  }

  private mapTimeSeriesPoint(data: any): TimeSeriesPoint {
    return {
      timestamp: new Date(data.date || Date.now()),
      open: data.open || 0,
      high: data.high || 0,
      low: data.low || 0,
      close: data.close || 0,
      volume: data.volume || 0
    };
  }

  private mapFinancialMetrics(data: any, symbol: string, asOfDate: Date): FinancialMetrics {
    return {
      symbol,
      asOfDate,
      marketCap: data.marketCap,
      enterpriseValue: data.enterpriseValue,
      peRatio: data.peRatio,
      forwardPERatio: data.forwardPERatio,
      pegRatio: data.pegRatio,
      eps: data.eps,
      priceToBookRatio: data.priceToBookRatio,
      evToEbitda: data.evToEbitda,
      evToRevenue: data.evToRevenue,
      roe: data.roe,
      revenue: data.revenue,
      grossProfit: data.grossProfit,
      operatingIncome: data.operatingIncome,
      netIncome: data.netIncome,
      ebitda: data.ebitda,
      grossMargin: data.grossMargin,
      operatingMargin: data.operatingMargin,
      profitMargin: data.profitMargin,
      ebitdaMargin: data.ebitdaMargin,
      totalDebt: data.totalDebt,
      totalEquity: data.totalEquity,
      currentRatio: data.currentRatio,
      quickRatio: data.quickRatio,
      debtToEquity: data.debtToEquity,
      operatingCashFlow: data.operatingCashFlow,
      freeCashFlow: data.freeCashFlow,
      freeCashFlowPerShare: data.freeCashFlowPerShare,
      returnOnEquity: data.returnOnEquity,
      returnOnAssets: data.returnOnAssets,
      returnOnCapitalEmployed: data.returnOnCapitalEmployed,
      revenueGrowthYOY: data.revenueGrowthYOY,
      revenueGrowthQOQ: data.revenueGrowthQOQ,
      epsGrowthYOY: data.epsGrowthYOY,
      epsGrowthQOQ: data.epsGrowthQOQ,
      dividendYield: data.dividendYield,
      dividendPerShare: data.dividendPerShare,
      dividendPayoutRatio: data.dividendPayoutRatio,
      beta: data.beta,
      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow,
      sharesOutstanding: data.sharesOutstanding,
      floatShares: data.floatShares,
      reportPeriod: data.reportPeriod || 'annual',
      fiscalYearEnd: data.fiscalYearEnd
    };
  }

  private mapDividend(data: any, symbol: string): Dividend {
    return {
      symbol,
      amount: data.dividend || 0,
      exDate: new Date(data.exDate || data.date || Date.now()),
      paymentDate: new Date(data.paymentDate || data.date || Date.now()),
      recordDate: new Date(data.recordDate || data.date || Date.now()),
      declarationDate: data.declarationDate ? new Date(data.declarationDate) : undefined,
      currency: data.currency || 'USD'
    };
  }

  private mapEarningsReport(data: any, symbol: string): EarningsReport {
    return {
      symbol,
      fiscalDateEnding: new Date(data.fiscalDateEnding || data.date || Date.now()),
      reportedDate: new Date(data.reportedDate || data.date || Date.now()),
      reportedEPS: data.reportedEPS || 0,
      estimatedEPS: data.estimatedEPS,
      surprise: data.surprise,
      surprisePercentage: data.surprisePercentage,
      reportedRevenue: data.reportedRevenue,
      estimatedRevenue: data.estimatedRevenue,
      revenueSurprise: data.revenueSurprise,
      revenueSurprisePercentage: data.revenueSurprisePercentage,
      period: data.period || 'Q1',
      year: data.year || new Date().getFullYear(),
      isFutureReport: data.isFutureReport || false,
      time: data.time,
      currency: data.currency || 'USD'
    };
  }

  private mapStockSymbol(data: any): StockSymbol {
    return {
      symbol: data.ticker || data.symbol || '',
      name: data.name || '',
      currency: data.currency,
      exchange: data.exchange,
      mic_code: data.micCode,
      country: data.country,
      type: data.type
    };
  }

  private mapNewsArticle(data: any): NewsArticle {
    return {
      id: data.id || data.url || '',
      source: data.source || data.publisher || '',
      title: data.title || '',
      summary: data.description || data.summary || '',
      url: data.url || '',
      publishedAt: new Date(data.publishedDate || data.date || Date.now()),
      imageUrl: data.imageUrl || data.image,
      relatedSymbols: data.tickers || data.symbols || []
    };
  }

  private calculateVolumeMetrics(historicalData: TimeSeriesPoint[]): VolumeMetrics {
    if (historicalData.length === 0) {
      return {
        avgDailyVolume: 0,
        avgDailyVolumeDollar: 0,
        currentVolume: 0
      };
    }

    const volumes = historicalData.map(point => point.volume);
    const avgDailyVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const avgDailyVolumeDollar = historicalData.reduce((sum, point) => sum + (point.volume * point.close), 0) / historicalData.length;
    const currentVolume = historicalData[0]?.volume || 0;

    return {
      avgDailyVolume,
      avgDailyVolumeDollar,
      currentVolume,
      avgVolume30Day: historicalData.slice(0, 30).reduce((sum, point) => sum + point.volume, 0) / Math.min(30, historicalData.length),
      avgVolume90Day: historicalData.slice(0, 90).reduce((sum, point) => sum + point.volume, 0) / Math.min(90, historicalData.length),
      avgVolume1Year: avgDailyVolume
    };
  }

  private calculatePerformanceMetrics(
    historicalData: TimeSeriesPoint[],
    currentPrice: number,
    endDate: Date
  ): PerformanceMetrics {
    if (historicalData.length === 0) {
      return {};
    }

    const currentDate = endDate;
    const oneWeekAgo = subDays(currentDate, 7);
    const oneMonthAgo = subMonths(currentDate, 1);
    const threeMonthsAgo = subMonths(currentDate, 3);
    const oneYearAgo = subYears(currentDate, 1);
    const yearStart = startOfYear(currentDate);

    const findClosestPrice = (targetDate: Date): number => {
      const closest = historicalData.find(point => 
        isSameDay(point.timestamp, targetDate) || isBefore(point.timestamp, targetDate)
      );
      return closest?.close || currentPrice;
    };

    const oneWeekPrice = findClosestPrice(oneWeekAgo);
    const oneMonthPrice = findClosestPrice(oneMonthAgo);
    const threeMonthsPrice = findClosestPrice(threeMonthsAgo);
    const oneYearPrice = findClosestPrice(oneYearAgo);
    const yearStartPrice = findClosestPrice(yearStart);

    return {
      oneWeek: oneWeekPrice > 0 ? ((currentPrice - oneWeekPrice) / oneWeekPrice) * 100 : undefined,
      oneMonth: oneMonthPrice > 0 ? ((currentPrice - oneMonthPrice) / oneMonthPrice) * 100 : undefined,
      threeMonth: threeMonthsPrice > 0 ? ((currentPrice - threeMonthsPrice) / threeMonthsPrice) * 100 : undefined,
      oneYear: oneYearPrice > 0 ? ((currentPrice - oneYearPrice) / oneYearPrice) * 100 : undefined,
      yearToDate: yearStartPrice > 0 ? ((currentPrice - yearStartPrice) / yearStartPrice) * 100 : undefined
    };
  }

  /**
   * This provider doesn't support economic events - return empty array
   */
  async getEconomicEvents(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic events are not supported by this provider');
    return [];
  }

  /**
   * This provider doesn't support economic calendar - return empty array
   */
  async getEconomicCalendar(): Promise<import('../types').EconomicCalendarEntry[]> {
    console.warn('Economic calendar is not supported by this provider');
    return [];
  }

  /**
   * This provider doesn't support economic indicators - return empty array
   */
  async getEconomicIndicator(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic indicators are not supported by this provider');
    return [];
  }
}