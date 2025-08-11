import { BaseStockApiClient } from '../clients/base-client';
import { 
  StockSymbol, 
  TimeSeriesPoint, 
  CompanyProfile, 
  FinancialMetrics, 
  StockQuote, 
  Dividend, 
  EarningsReport, 
  NewsArticle,
  TimeInterval,
  BatchQuoteResult,
  BatchCompanyProfileResult
} from '../types';
import { subDays, subMonths, subYears, isBefore, isSameDay, startOfYear } from 'date-fns';

/**
 * Polygon.io API client implementation
 * Documentation: https://polygon.io/docs/stocks
 */
export class PolygonIoClient extends BaseStockApiClient {
  protected readonly baseUrl: string;
  protected readonly restApiKey: string;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    super(apiKey, 'https://api.polygon.io', requestTimeout);
    this.restApiKey = apiKey;
    this.baseUrl = 'https://api.polygon.io';
  }

  /**
   * Get a stock quote
   */
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    // Get the current quote first
    const data = await this.makeRequest<{
      results?: {
        T?: string;
        v?: number;
        vw?: number;
        o?: number;
        c?: number;
        h?: number;
        l?: number;
        t?: number;
        n?: number;
      }[];
    }>(`${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`, {
      adjusted: 'true',
      apiKey: this.restApiKey
    });

    if (!data?.results?.length) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    const result = data.results[0];
    const now = new Date();
    
    const mappedQuote: StockQuote = {
      symbol,
      price: result.c || 0,
      change: result.c && result.o ? result.c - result.o : 0,
      changePercent: result.c && result.o ? ((result.c - result.o) / result.o) * 100 : 0,
      timestamp: now,
      volume: result.v || 0,
      open: result.o || 0,
      high: result.h || 0,
      low: result.l || 0,
      previousClose: 0, // Will be updated with historical data if available
      companyName: symbol // Will be populated by the caller if needed
    };
    
    if (includeHistorical) {
      // Get historical data for performance metrics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1); // Get 1 year of historical data
      
      try {
        const historicalData = await this.getTimeSeries(
          symbol, 
          'daily',
          365 // Get 1 year of data
        );
        
        // Calculate previous close from historical data
        if (historicalData.length > 0) {
          // Sort by date descending and get the most recent trading day
          const sortedData = [...historicalData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          mappedQuote.previousClose = sortedData[0]?.close || 0;
        }
        
        // Calculate volume metrics
        const volumeMetrics = this.calculateVolumeMetrics(historicalData);
        
        // Calculate performance metrics
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
        // Return basic quote if historical data fetch fails
        return mappedQuote;
      }
    }
    
    return mappedQuote;
  }
  
  /**
   * Calculate volume metrics from historical data
   */
  private calculateVolumeMetrics(historicalData: TimeSeriesPoint[]): any {
    if (!historicalData.length) return {};
    
    // Sort by date descending
    const sortedData = [...historicalData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Calculate average volume (30-day)
    const thirtyDaysData = sortedData.slice(0, 30);
    const avgVolume30Day = thirtyDaysData.reduce((sum, point) => sum + (point.volume || 0), 0) / thirtyDaysData.length;
    
    // Calculate average volume (90-day)
    const ninetyDaysData = sortedData.slice(0, 90);
    const avgVolume90Day = ninetyDaysData.reduce((sum, point) => sum + (point.volume || 0), 0) / ninetyDaysData.length;
    
    // Calculate average volume (1-year)
    const oneYearData = sortedData.slice(0, 252); // Approx 252 trading days in a year
    const avgVolume1Year = oneYearData.reduce((sum, point) => sum + (point.volume || 0), 0) / oneYearData.length;
    
    return {
      avgVolume30Day,
      avgVolume90Day,
      avgVolume1Year,
      currentVolume: sortedData[0]?.volume || 0
    };
  }
  
  /**
   * Calculate performance metrics from historical data
   */
  private calculatePerformanceMetrics(
    historicalData: TimeSeriesPoint[],
    currentPrice: number,
    asOfDate: Date
  ): any {
    if (!historicalData.length) return {};
    
    // Sort by date descending
    const sortedData = [...historicalData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Helper function to find price on a specific date
    const findPriceOnDate = (targetDate: Date): number | null => {
      const targetTime = targetDate.getTime();
      const point = sortedData.find(p => {
        const pointTime = p.timestamp.getTime();
        return pointTime <= targetTime;
      });
      return point?.close || null;
    };
    
    // Calculate performance metrics
    const currentDate = asOfDate;
    const oneDayAgo = subDays(currentDate, 1);
    const oneWeekAgo = subDays(currentDate, 7);
    const oneMonthAgo = subMonths(currentDate, 1);
    const threeMonthsAgo = subMonths(currentDate, 3);
    const sixMonthsAgo = subMonths(currentDate, 6);
    const oneYearAgo = subYears(currentDate, 1);
    const ytdDate = startOfYear(currentDate);
    
    const oneDayAgoPrice = findPriceOnDate(oneDayAgo) || 0;
    const oneWeekAgoPrice = findPriceOnDate(oneWeekAgo) || 0;
    const oneMonthAgoPrice = findPriceOnDate(oneMonthAgo) || 0;
    const threeMonthsAgoPrice = findPriceOnDate(threeMonthsAgo) || 0;
    const sixMonthsAgoPrice = findPriceOnDate(sixMonthsAgo) || 0;
    const oneYearAgoPrice = findPriceOnDate(oneYearAgo) || 0;
    const ytdPrice = findPriceOnDate(ytdDate) || 0;
    
    // Calculate percentage changes
    const calculateChange = (previousPrice: number): number => {
      return previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
    };
    
    return {
      oneDay: calculateChange(oneDayAgoPrice),
      fiveDay: calculateChange(oneWeekAgoPrice),
      oneMonth: calculateChange(oneMonthAgoPrice),
      threeMonth: calculateChange(threeMonthsAgoPrice),
      sixMonth: calculateChange(sixMonthsAgoPrice),
      ytd: calculateChange(ytdPrice),
      oneYear: calculateChange(oneYearAgoPrice)
    };
  }

  // Implement other required methods with stubs
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    const results: BatchQuoteResult = {};

    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        results[symbol] = { 
          success: true, 
          data: quote,
          symbol 
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
      const response = await this.makeRequest<{
        results?: {
          name: string;
          description?: string;
          ticker: string;
          exchange: string;
          currency_name: string;
          primary_exchange: string;
          sic_description?: string;
          total_employees?: number;
          market_cap?: number;
          share_class_shares_outstanding?: number;
          weighted_shares_outstanding?: number;
          round_lot?: number;
          homepage_url?: string;
          logo_url?: string;
          list_date?: string;
          sic_code?: string;
          industry_category?: string;
          industry_group?: string;
        };
      }>(`/v3/reference/tickers/${symbol}`);

      if (!response.results) {
        throw new Error('No company profile data found');
      }

      const result = response.results;
      const now = new Date();

      return {
        symbol: result.ticker,
        name: result.name,
        description: result.description || '',
        exchange: result.primary_exchange || result.exchange,
        currency: result.currency_name || 'USD',
        sector: result.industry_group,
        industry: result.industry_category,
        website: result.homepage_url,
        logo: result.logo_url,
        marketCap: result.market_cap,
        employees: result.total_employees,
        ipoDate: result.list_date ? new Date(result.list_date) : undefined,
        sharesOutstanding: result.weighted_shares_outstanding || result.share_class_shares_outstanding,
        lastUpdated: now,
        // Additional fields that might be useful
        beta: undefined, // Not available in this endpoint
        dividendPerShare: undefined, // Not available in this endpoint
        dividendYield: undefined, // Not available in this endpoint
        peRatio: undefined, // Not available in this endpoint
        eps: undefined // Not available in this endpoint
      };
    } catch (error) {
      throw new Error(`Failed to fetch company profile for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const results: BatchCompanyProfileResult = {};
    
    // Process in batches to avoid hitting rate limits
    const BATCH_SIZE = 5; // Adjust based on API rate limits
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(symbol => 
        this.getCompanyProfile(symbol)
          .then(profile => ({
            success: true,
            data: profile,
            symbol
          }))
          .catch(error => ({
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            symbol
          }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add batch results to the final results
      for (const result of batchResults) {
        results[result.symbol] = result;
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval = 'daily',
    period: number = 30 // Default to 30 days
  ): Promise<TimeSeriesPoint[]> {
    try {
      // Map our standard intervals to Polygon.io's format
      const intervalMap: Record<TimeInterval, { multiplier: number; timespan: string }> = {
        '1min': { multiplier: 1, timespan: 'minute' },
        '5min': { multiplier: 5, timespan: 'minute' },
        '15min': { multiplier: 15, timespan: 'minute' },
        '30min': { multiplier: 30, timespan: 'minute' },
        '60min': { multiplier: 60, timespan: 'minute' },
        '1d': { multiplier: 1, timespan: 'day' },
        'daily': { multiplier: 1, timespan: 'day' },
        'weekly': { multiplier: 1, timespan: 'week' },
        'monthly': { multiplier: 1, timespan: 'month' }
      };

      // Get the interval configuration
      const intervalConfig = intervalMap[interval];
      if (!intervalConfig) {
        throw new Error(`Unsupported interval: ${interval}`);
      }

      // Calculate the date range based on the period and interval
      const endDate = new Date();
      const startDate = new Date();
      
      // Adjust start date based on period and interval
      const { timespan: intervalTimespan, multiplier: intervalMultiplier } = intervalConfig;
      const totalMinutes = period * intervalMultiplier;
      
      switch (intervalTimespan) {
        case 'minute':
          startDate.setMinutes(endDate.getMinutes() - totalMinutes);
          break;
        case 'hour':
          startDate.setHours(endDate.getHours() - totalMinutes / 60);
          break;
        case 'day':
          startDate.setDate(endDate.getDate() - period);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - (period * 7));
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - period);
          break;
      }

      // Format dates for the API (Polygon uses milliseconds since epoch)
      const to = Math.floor(endDate.getTime());
      const from = Math.floor(startDate.getTime());
      
      // Make the API request to Polygon's Aggregates API
      const response = await this.makeRequest<{
        ticker?: string;
        queryCount?: number;
        resultsCount?: number;
        adjusted: boolean;
        results?: Array<{
          v: number; // volume
          vw: number; // volume weighted average price
          o: number; // open
          c: number; // close
          h: number; // high
          l: number; // low
          t: number; // timestamp in milliseconds since epoch
          n?: number; // number of trades
        }>;
        status?: string;
        request_id?: string;
        count?: number;
      }>(
        `/v2/aggs/ticker/${symbol.toUpperCase()}/range/${intervalMultiplier}/${intervalTimespan}/${from}/${to}`, 
        { 
          adjusted: 'true',
          sort: 'asc',
          limit: '50000' // Maximum allowed by the API
        }
      );

      if (!response.results || response.results.length === 0) {
        return [];
      }

      // Map the API response to our TimeSeriesPoint interface
      return response.results.map(bar => ({
        timestamp: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        vwap: bar.vw,
        tradeCount: bar.n
      }));
    } catch (error) {
      throw new Error(`Failed to fetch time series for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics> {
    // Implementation for getFinancialMetrics
    throw new Error('Method not implemented.');
  }

  async getDividends(
    symbol: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Dividend[]> {
    // Implementation for getDividends
    throw new Error('Method not implemented.');
  }

  async getEarnings(
    symbol: string, 
    options?: number | {
      limit?: number;
      includeFutureReports?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EarningsReport[]> {
    try {
      // Parse options
      const limit = typeof options === 'number' ? options : options?.limit;
      const includeFutureReports = typeof options === 'object' && options?.includeFutureReports;
      const startDate = typeof options === 'object' ? options?.startDate : undefined;
      const endDate = typeof options === 'object' ? options?.endDate : undefined;

      // Build query parameters
      const params: Record<string, string> = {
        ticker: symbol,
        limit: (limit || 4).toString(),
        'date.gte': startDate ? startDate.toISOString().split('T')[0] : '',
        'date.lte': endDate ? endDate.toISOString().split('T')[0] : '',
      };

      // Make the API request
      const response = await this.makeRequest<{
        results?: Array<{
          ticker: string;
          fiscal_period: string;
          fiscal_year: string;
          report_date: string;
          date: string;
          eps: {
            actual: number | null;
            estimate: number | null;
            surprise: number | null;
            surprise_percent: number | null;
          };
          revenue?: {
            actual: number | null;
            estimate: number | null;
            surprise: number | null;
            surprise_percent: number | null;
          };
          is_confirmed: boolean;
          updated: string;
        }>;
      }>('/vX/reference/earnings', params);

      if (!response.results || response.results.length === 0) {
        return [];
      }

      // Map the API response to our EarningsReport interface
      return response.results
        .filter(result => {
          const reportDate = new Date(result.date);
          const now = new Date();
          const isFuture = reportDate > now;
          
          // Filter out future reports if not requested
          if (isFuture && !includeFutureReports) {
            return false;
          }

          return true;
        })
        .map(result => {
          const reportDate = new Date(result.date);
          const fiscalYear = parseInt(result.fiscal_year, 10);
          const fiscalPeriod = result.fiscal_period.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4' | 'fy';
          const isFutureReport = reportDate > new Date();

          return {
            symbol: result.ticker,
            fiscalDateEnding: new Date(`${fiscalYear}-${this.getMonthForFiscalPeriod(fiscalPeriod)}-01`),
            reportedDate: new Date(result.report_date || result.date),
            reportedEPS: result.eps.actual ?? 0,
            estimatedEPS: result.eps.estimate ?? undefined,
            surprise: result.eps.surprise ?? undefined,
            surprisePercentage: result.eps.surprise_percent ?? undefined,
            reportedRevenue: result.revenue?.actual ?? undefined,
            estimatedRevenue: result.revenue?.estimate ?? undefined,
            revenueSurprise: result.revenue?.surprise ?? undefined,
            revenueSurprisePercentage: result.revenue?.surprise_percent ?? undefined,
            period: fiscalPeriod.toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY',
            year: fiscalYear,
            isFutureReport,
            time: this.getTimeOfDay(reportDate),
            currency: 'USD', // Default to USD, adjust if needed
          };
        });
    } catch (error) {
      throw new Error(`Failed to fetch earnings for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method to get the month for a fiscal period
   */
  private getMonthForFiscalPeriod(period: string): string {
    switch (period.toLowerCase()) {
      case 'q1': return '03';
      case 'q2': return '06';
      case 'q3': return '09';
      case 'q4': return '12';
      case 'fy': return '12';
      default: return '12';
    }
  }

  /**
   * Helper method to get the time of day (amc/bmo) from a date
   */
  private getTimeOfDay(date: Date): string | undefined {
    if (!date) return undefined;
    const hours = date.getHours();
    return hours < 12 ? 'bmo' : 'amc';
  }

  async getUpcomingEarnings(
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    } = {}
  ): Promise<EarningsReport[]> {
    try {
      const {
        limit = 50,
        startDate = new Date(),
        endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // Default to 90 days from now
        symbols
      } = options;

      // Build query parameters
      const params: Record<string, string> = {
        limit: limit.toString(),
        'date.gte': startDate.toISOString().split('T')[0],
        'date.lte': endDate.toISOString().split('T')[0],
        order: 'asc', // Get the earliest upcoming earnings first
      };

      // Add ticker filter if symbols are provided
      if (symbols && symbols.length > 0) {
        params.ticker = symbols.join(',');
      }

      // Make the API request
      const response = await this.makeRequest<{
        results?: Array<{
          ticker: string;
          fiscal_period: string;
          fiscal_year: string;
          report_date: string;
          date: string;
          eps: {
            estimate: number | null;
          };
          revenue?: {
            estimate: number | null;
          };
          is_confirmed: boolean;
          updated: string;
        }>;
      }>('/vX/reference/earnings/upcoming', params);

      if (!response.results || response.results.length === 0) {
        return [];
      }

      // Map the API response to our EarningsReport interface
      return response.results.map(result => {
        const reportDate = new Date(result.date);
        const fiscalYear = parseInt(result.fiscal_year, 10);
        const fiscalPeriod = result.fiscal_period.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4' | 'fy';
        const isFutureReport = true; // Always true for upcoming earnings

        return {
          symbol: result.ticker,
          fiscalDateEnding: new Date(`${fiscalYear}-${this.getMonthForFiscalPeriod(fiscalPeriod)}-01`),
          reportedDate: new Date(result.report_date || result.date),
          reportedEPS: 0, // Not available for upcoming earnings
          estimatedEPS: result.eps.estimate ?? undefined,
          reportedRevenue: undefined, // Not available for upcoming earnings
          estimatedRevenue: result.revenue?.estimate ?? undefined, // Convert null to undefined
          period: fiscalPeriod.toUpperCase() as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY',
          year: fiscalYear,
          isFutureReport,
          time: this.getTimeOfDay(reportDate),
          currency: 'USD', // Default to USD, adjust if needed
        };
      });
    } catch (error) {
      throw new Error(`Failed to fetch upcoming earnings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchSymbols(query: string): Promise<StockSymbol[]> {
    // Implementation for searchSymbols
    throw new Error('Method not implemented.');
  }

  async getMarketNews(
    symbols: string[] = [], 
    limit: number = 10
  ): Promise<NewsArticle[]> {
    // Implementation for getMarketNews
    throw new Error('Method not implemented.');
  }
}
