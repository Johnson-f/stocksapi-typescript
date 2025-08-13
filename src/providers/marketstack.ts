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
 * Marketstack API client implementation
 * Documentation: https://marketstack.com/documentation
 */
export class MarketstackClient extends BaseStockApiClient {
  protected readonly baseUrl: string;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    const baseUrl = 'http://api.marketstack.com/v1';
    super(apiKey, baseUrl, requestTimeout);
    this.baseUrl = baseUrl;
  }

  // Helper method to make API requests with error handling
  protected async makeRequest<T>(
    endpoint: string, 
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    try {
      // Create a clean params object with only defined values
      const cleanParams: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          cleanParams[key] = String(value);
        }
      }
      
      // Add API key to all requests
      cleanParams.access_key = this.apiKey;
      
      const url = new URL(endpoint, this.baseUrl);
      Object.entries(cleanParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'stocksapi-typescript/1.0.0',
          },
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json() as T;
        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Request timed out after ${this.requestTimeout}ms`;
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error(`Marketstack API request failed: ${errorMessage}`, { 
        endpoint, 
        params 
      });
      
      throw new Error(`Failed to fetch data from Marketstack: ${errorMessage}`);
    }
  }

  // Stock data methods
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      // Get current quote
      const quoteData = await this.makeRequest<{
        symbol: string;
        name?: string;
        exchange: string;
        mic_code?: string;
        currency: string;
        datetime: string;
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        previous_close?: number;
        change?: number;
        percent_change?: number;
        is_market_open?: boolean;
      }>('/intraday/latest', { 
        symbols: symbol,
        exchange: 'NASDAQ' // Default to NASDAQ, can be made configurable
      });

      const timestamp = new Date(quoteData.datetime);
      
      const quote: StockQuote = {
        symbol: quoteData.symbol,
        price: quoteData.close,
        change: quoteData.change || 0,
        changePercent: quoteData.percent_change || 0,
        timestamp,
        volume: quoteData.volume,
        high: quoteData.high,
        low: quoteData.low,
        open: quoteData.open,
        previousClose: quoteData.previous_close || quoteData.close,
      };

      if (includeHistorical) {
        try {
          // Get historical data for volume metrics and performance
          const oneYearAgo = subYears(new Date(), 1);
          const historicalData = await this.getTimeSeries(
            symbol, 
            'daily', 
            365, 
            oneYearAgo, 
            new Date()
          );
          
          // Calculate volume metrics
          const volumeMetrics = this.calculateVolumeMetrics(historicalData);
          
          // Calculate performance metrics
          const performance = this.calculatePerformanceMetrics(
            historicalData, 
            quote.price, 
            timestamp
          );
          
          quote.volumeMetrics = volumeMetrics;
          quote.performance = performance;
        } catch (error) {
          console.warn(`Could not fetch historical data for ${symbol}:`, error);
        }
      }

      return quote;
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    const results: BatchQuoteResult = {};
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        results[symbol] = {
          success: true,
          data: quote,
          symbol: quote.symbol
        };
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error as Error,
          symbol
        };
      }
    }
    
    return results;
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      // Marketstack doesn't have a dedicated company profile endpoint
      // We'll use the ticker endpoint to get basic information
      const tickerResponse = await this.makeRequest<{
        data: Array<{
          symbol: string;
          name: string;
          exchange: string;
          mic_code?: string;
          currency: string;
          country?: string;
          type?: string;
        }>;
      }>('/tickers', { 
        search: symbol,
        limit: 1
      });

      // Get the first result from the data array
      const tickerData = tickerResponse.data?.[0];
      if (!tickerData) {
        throw new Error(`No ticker data found for symbol: ${symbol}`);
      }

      // For more detailed company information, we'd need to use a different endpoint
      // or combine with other data sources
      const companyProfile: CompanyProfile = {
        symbol: tickerData.symbol,
        name: tickerData.name,
        description: tickerData.name, // Use name as description since detailed description isn't available
        exchange: tickerData.exchange,
        currency: tickerData.currency,
        lastUpdated: new Date(),
      };
      
      return companyProfile;
    } catch (error) {
      console.error(`Failed to fetch company profile for ${symbol}:`, error);
      throw error;
    }
  }

  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const results: BatchCompanyProfileResult = {};
    
    for (const symbol of symbols) {
      try {
        const profile = await this.getCompanyProfile(symbol);
        results[symbol] = {
          success: true,
          data: profile,
          symbol: profile.symbol
        };
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error as Error,
          symbol
        };
      }
    }
    
    return results;
  }

  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval = 'daily',
    period: number = 30,
    startDate?: Date,
    endDate: Date = new Date(),
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<TimeSeriesPoint[]> {
    try {
      // Map our interval to Marketstack's format
      const intervalMap: Record<string, string> = {
        '1min': '1min',
        '5min': '5min',
        '15min': '15min',
        '30min': '30min',
        '60min': '1hour',
        '1d': '1day',
        'daily': '1day',
        'weekly': '1week',
        'monthly': '1month'
      };

      const mappedInterval = intervalMap[interval] || '1day';
      
      // Calculate from and to dates
      let from: string;
      if (startDate) {
        from = startDate.toISOString().split('T')[0];
      } else {
        // Default to period days ago if no start date provided
        const fromDate = subDays(endDate, period);
        from = fromDate.toISOString().split('T')[0];
      }
      
      const to = endDate.toISOString().split('T')[0];

      const data = await this.makeRequest<{
        pagination: {
          limit: number;
          offset: number;
          count: number;
          total: number;
        };
        data: Array<{
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          adj_high: number;
          adj_low: number;
          adj_close: number;
          adj_open: number;
          adj_volume: number;
          split_factor: number;
          dividend: number;
          symbol: string;
          exchange: string;
          date: string;
        }>;
      }>('/eod', {
        symbols: symbol,
        date_from: from,
        date_to: to,
        limit: outputSize === 'full' ? 5000 : 100
      });

      // Transform to TimeSeriesPoint array
      const timeSeries: TimeSeriesPoint[] = [];
      
      if (data.data && data.data.length > 0) {
        for (const value of data.data) {
          timeSeries.push({
            timestamp: new Date(value.date),
            open: value.open,
            high: value.high,
            low: value.low,
            close: value.close,
            volume: value.volume
          });
        }
      }

      return timeSeries;
    } catch (error) {
      console.error(`Failed to fetch time series data for ${symbol}:`, error);
      throw error;
    }
  }

  // Financial data methods
  async getFinancialMetrics(
    symbol: string, 
    asOfDate?: Date,
    period: 'annual' | 'quarterly' | 'ttm' = 'annual',
    includeGrowthMetrics: boolean = true
  ): Promise<FinancialMetrics> {
    try {
      // Marketstack doesn't provide comprehensive financial metrics
      // We'll return basic information that can be calculated from price data
      const quote = await this.getQuote(symbol, false);
      
      // Get historical data for basic calculations
      const oneYearAgo = subYears(new Date(), 1);
      const historicalData = await this.getTimeSeries(
        symbol, 
        'daily', 
        365, 
        oneYearAgo, 
        new Date()
      );

      // Calculate basic metrics
      const prices = historicalData.map(point => point.close);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);

      return {
        symbol: symbol,
        asOfDate: asOfDate || new Date(),
        fiftyTwoWeekHigh: maxPrice,
        fiftyTwoWeekLow: minPrice,
        reportPeriod: period === 'ttm' ? 'annual' : period,
        fiscalYearEnd: '12-31' // Default, can be overridden if needed
      };
    } catch (error) {
      console.error(`Failed to fetch financial metrics for ${symbol}:`, error);
      throw error;
    }
  }

  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    try {
      const from = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const to = endDate ? endDate.toISOString().split('T')[0] : undefined;
      
      const dividends = await this.makeRequest<{
        pagination: {
          limit: number;
          offset: number;
          count: number;
          total: number;
        };
        data: Array<{
          symbol: string;
          date: string;
          dividend: number;
          currency: string;
        }>;
      }>('/eod', {
        symbols: symbol,
        date_from: from,
        date_to: to,
        limit: 1000
      });

      return dividends.data
        .filter(d => d.dividend > 0)
        .map(d => ({
          symbol: d.symbol,
          amount: d.dividend,
          exDate: new Date(d.date),
          paymentDate: new Date(d.date), // Marketstack doesn't provide separate payment date
          recordDate: new Date(d.date), // Marketstack doesn't provide separate record date
          currency: d.currency || 'USD'
        }));
    } catch (error) {
      console.error(`Failed to fetch dividends for ${symbol}:`, error);
      throw error;
    }
  }

  async getEarnings(
    symbol: string, 
    options?: {
      limit?: number;
      includeFutureReports?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EarningsReport[]> {
    // Marketstack doesn't provide earnings data
    // Return empty array as this feature is not supported
    console.warn(`Earnings data is not available for Marketstack provider`);
    return [];
  }

  async getUpcomingEarnings(
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    } = {}
  ): Promise<EarningsReport[]> {
    // Marketstack doesn't provide earnings data
    // Return empty array as this feature is not supported
    console.warn(`Upcoming earnings data is not available for Marketstack provider`);
    return [];
  }

  // Market data methods
  async searchSymbols(query: string): Promise<StockSymbol[]> {
    try {
      const results = await this.makeRequest<{
        data: Array<{
          symbol: string;
          name: string;
          currency: string;
          exchange: string;
          mic_code?: string;
          country?: string;
          type?: string;
        }>;
      }>('/tickers', { 
        search: query,
        limit: 100
      });

      return results.data.map(r => ({
        symbol: r.symbol,
        name: r.name,
        currency: r.currency,
        exchange: r.exchange,
        mic_code: r.mic_code,
        country: r.country,
        type: r.type
      }));
    } catch (error) {
      console.error(`Failed to search symbols for query "${query}":`, error);
      throw error;
    }
  }

  async getMarketNews(symbols: string[] = [], limit: number = 10): Promise<NewsArticle[]> {
    // Marketstack doesn't provide news data
    // Return empty array as this feature is not supported
    console.warn(`News data is not available for Marketstack provider`);
    return [];
  }

  // Helper methods for calculating metrics
  private calculateVolumeMetrics(historicalData: TimeSeriesPoint[]): VolumeMetrics {
    if (!historicalData.length) return { avgDailyVolume: 0, avgDailyVolumeDollar: 0, currentVolume: 0 };
    
    const last30Days = historicalData.slice(-30);
    const last90Days = historicalData.slice(-90);
    const lastYear = historicalData.slice(-365);
    
    const sumVolume = (data: TimeSeriesPoint[]) => 
      data.reduce((sum, point) => sum + (point.volume || 0), 0);
    
    const sumDollarVolume = (data: TimeSeriesPoint[]) =>
      data.reduce((sum, point) => 
        sum + ((point.volume || 0) * ((point.open + point.close) / 2)), 0);
    
    return {
      avgDailyVolume: Math.round(sumVolume(last30Days) / last30Days.length),
      avgDailyVolumeDollar: Math.round(sumDollarVolume(last30Days) / last30Days.length),
      currentVolume: historicalData[historicalData.length - 1]?.volume || 0,
      avgVolume30Day: Math.round(sumVolume(last30Days) / last30Days.length),
      avgVolume90Day: Math.round(sumVolume(last90Days) / last90Days.length),
      avgVolume1Year: Math.round(sumVolume(lastYear) / lastYear.length)
    };
  }

  private calculatePerformanceMetrics(
    historicalData: TimeSeriesPoint[], 
    currentPrice: number,
    asOfDate: Date
  ): PerformanceMetrics {
    if (!historicalData.length) return {};
    
    const sortedData = [...historicalData].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    const findClosestDate = (targetDate: Date) => {
      return sortedData.reduce((closest, point) => {
        const currentDiff = Math.abs(point.timestamp.getTime() - targetDate.getTime());
        const closestDiff = Math.abs(closest.timestamp.getTime() - targetDate.getTime());
        return currentDiff < closestDiff ? point : closest;
      }, sortedData[0]);
    };
    
    const today = asOfDate;
    const oneWeekAgo = subDays(today, 7);
    const oneMonthAgo = subMonths(today, 1);
    const threeMonthsAgo = subMonths(today, 3);
    const oneYearAgo = subYears(today, 1);
    const yearStart = startOfYear(today);
    
    const getPriceOnDate = (date: Date) => {
      const point = findClosestDate(date);
      return point ? (point.open + point.close) / 2 : null;
    };
    
    const price1WeekAgo = getPriceOnDate(oneWeekAgo);
    const price1MonthAgo = getPriceOnDate(oneMonthAgo);
    const price3MonthsAgo = getPriceOnDate(threeMonthsAgo);
    const price1YearAgo = getPriceOnDate(oneYearAgo);
    const priceYtd = getPriceOnDate(yearStart);
    
    const calculateChange = (startPrice: number | null) => 
      startPrice && startPrice > 0 ? (currentPrice - startPrice) / startPrice : undefined;
    
    return {
      oneWeek: price1WeekAgo ? calculateChange(price1WeekAgo) : undefined,
      oneMonth: price1MonthAgo ? calculateChange(price1MonthAgo) : undefined,
      threeMonth: price3MonthsAgo ? calculateChange(price3MonthsAgo) : undefined,
      oneYear: price1YearAgo ? calculateChange(price1YearAgo) : undefined,
      yearToDate: priceYtd ? calculateChange(priceYtd) : undefined
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