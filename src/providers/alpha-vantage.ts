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
 * Alpha Vantage API client implementation
 * Documentation: https://www.alphavantage.co/documentation/
 */
export class AlphaVantageClient extends BaseStockApiClient {
  private readonly baseQuoteUrl: string;
  private readonly baseFundamentalUrl: string;
  private readonly baseForexUrl: string;
  private readonly baseCryptoUrl: string;
  private readonly baseTechnicalUrl: string;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    super(apiKey, 'https://www.alphavantage.co/query', requestTimeout);
    this.baseQuoteUrl = 'https://www.alphavantage.co/query';
    this.baseFundamentalUrl = 'https://www.alphavantage.co/query';
    this.baseForexUrl = 'https://www.alphavantage.co/query';
    this.baseCryptoUrl = 'https://www.alphavantage.co/query';
    this.baseTechnicalUrl = 'https://www.alphavantage.co/query';
  }

  /**
   * Get a stock quote
   */
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    // Get the current quote first
    const data = await this.makeRequest<Record<string, any>>(this.baseQuoteUrl, {
      function: 'GLOBAL_QUOTE',
      symbol,
      apikey: this.apiKey
    });

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('Invalid response format from Alpha Vantage');
    }

    const mappedQuote = this.mapQuote(quote, symbol);
    
    if (includeHistorical) {
      // Get historical data for performance metrics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 1); // Get 1 year of historical data
      
      try {
        const historicalData = await this.getTimeSeries(
          symbol, 
          'daily',
          undefined, // period
          startDate, 
          endDate
        );
        
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
   * Get multiple stock quotes in a single request
   */
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    // Alpha Vantage doesn't support batch quotes in free tier, so we'll make individual requests
    const results: BatchQuoteResult = {};
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        results[symbol] = {
          success: true,
          data: quote,
          symbol: quote.symbol // Ensure symbol is included in the result
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

  /**
   * Get company profile information with optional date range filtering
   * @param symbol Stock symbol
   * @param asOfDate Optional date to get the profile as of a specific date
   * @param includeHistorical Whether to include historical data points (if available)
   */
  async getCompanyProfile(
    symbol: string, 
    asOfDate?: Date,
    includeHistorical: boolean = false
  ): Promise<CompanyProfile> {
    // First, get the latest company overview
    const overviewData = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
      function: 'OVERVIEW',
      symbol,
      apikey: this.apiKey
    });

    // If a specific date is requested, we'll need to fetch historical data
    if (asOfDate) {
      // Get the latest quarterly report before or on the asOfDate
      const incomeData = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'INCOME_STATEMENT',
        symbol,
        apikey: this.apiKey
      });

      // Find the most recent quarter before or on the asOfDate
      if (incomeData?.quarterlyReports?.length > 0) {
        const relevantQuarter = incomeData.quarterlyReports
          .filter((report: any) => new Date(report.fiscalDateEnding) <= asOfDate)
          .sort((a: any, b: any) => 
            new Date(b.fiscalDateEnding).getTime() - new Date(a.fiscalDateEnding).getTime()
          )[0];

        if (relevantQuarter) {
          // Update the overview data with the historical values
          overviewData.LatestQuarter = relevantQuarter.fiscalDateEnding;
          overviewData.EPS = relevantQuarter.eps;
          // Add more fields as needed from the quarterly report
        }
      }
    }

    // If historical data is requested, fetch additional metrics
    if (includeHistorical) {
      // Get additional metrics that might be useful for historical analysis
      const metrics = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.apiKey
      });

      // Merge the metrics into our overview data
      if (metrics?.['Global Quote']) {
        const quote = metrics['Global Quote'];
        overviewData.Price = quote['05. price'];
        overviewData.Change = quote['09. change'];
        overviewData.ChangePercent = quote['10. change percent'];
      }
    }

    return this.mapCompanyProfile(overviewData);
  }

  /**
   * Get multiple company profiles with optional date range filtering
   * @param symbols Array of stock symbols
   * @param asOfDate Optional date to get the profiles as of a specific date
   * @param includeHistorical Whether to include historical data points (if available)
   * @param batchSize Maximum number of concurrent requests (default: 3 to respect API rate limits)
   */
  async getCompanyProfiles(
    symbols: string[],
    asOfDate?: Date,
    includeHistorical: boolean = false,
    batchSize: number = 3
  ): Promise<BatchCompanyProfileResult> {
    const results: BatchCompanyProfileResult = {};
    
    // Process symbols in batches to avoid hitting rate limits
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => 
        this.getCompanyProfile(symbol, asOfDate, includeHistorical)
          .then(profile => ({
            success: true as const,
            data: profile,
            symbol: profile.symbol
          }))
          .catch(error => ({
            success: false as const,
            error: error as Error,
            symbol
          }))
      );
      
      // Wait for all requests in the current batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to the output
      batchResults.forEach(result => {
        results[result.symbol] = result;
      });
      
      // Add a small delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
      }
    }
    
    return results;
  }

  /**
   * Get time series data for a symbol
   */
  /**
   * Get time series data for a symbol
   * @param symbol Stock symbol
   * @param interval Time interval for data points
   * @param period Number of data points to return (overrides startDate/endDate if provided)
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @param outputSize 'compact' (last 100 data points) or 'full' (up to 20 years)
   */
  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval = 'daily',
    period?: number,
    startDate?: Date,
    endDate?: Date,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<TimeSeriesPoint[]> {
    const functionMap: Record<string, string> = {
      '1min': 'TIME_SERIES_INTRADAY',
      '5min': 'TIME_SERIES_INTRADAY',
      '15min': 'TIME_SERIES_INTRADAY',
      '30min': 'TIME_SERIES_INTRADAY',
      '60min': 'TIME_SERIES_INTRADAY',
      'daily': 'TIME_SERIES_DAILY',
      'weekly': 'TIME_SERIES_WEEKLY',
      'monthly': 'TIME_SERIES_MONTHLY'
    };

    const params: Record<string, string> = {
      function: functionMap[interval] || 'TIME_SERIES_DAILY',
      symbol,
      apikey: this.apiKey,
      outputsize: outputSize
    };

    // Add interval parameter for intraday data
    if (interval.includes('min') || interval.includes('hour')) {
      params.interval = interval;
    }

    const data = await this.makeRequest<Record<string, any>>(this.baseQuoteUrl, params);
    
    // The response key varies based on the function used
    let timeSeriesKey = '';
    if (data['Time Series (Daily)']) timeSeriesKey = 'Time Series (Daily)';
    else if (data['Weekly Time Series']) timeSeriesKey = 'Weekly Time Series';
    else if (data['Monthly Time Series']) timeSeriesKey = 'Monthly Time Series';
    else if (data['Time Series (1min)']) timeSeriesKey = 'Time Series (1min)';
    else if (data['Time Series (5min)']) timeSeriesKey = 'Time Series (5min)';
    else if (data['Time Series (15min)']) timeSeriesKey = 'Time Series (15min)';
    else if (data['Time Series (30min)']) timeSeriesKey = 'Time Series (30min)';
    else if (data['Time Series (60min)']) timeSeriesKey = 'Time Series (60min)';
    
    if (!timeSeriesKey || !data[timeSeriesKey]) {
      throw new Error('Could not find time series data in response');
    }

    const timeSeries = data[timeSeriesKey];
    const result: TimeSeriesPoint[] = [];

    for (const [dateStr, values] of Object.entries(timeSeries) as [string, any][]) {
      const timestamp = new Date(dateStr);
      
      // Skip if outside the requested date range
      if (startDate && timestamp < startDate) continue;
      if (endDate && timestamp > endDate) continue;
      
      result.push({
        timestamp,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      });
    }

    // Sort by date ascending
    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get financial metrics for a company with optional date range and growth metrics
   * @param symbol Stock symbol
   * @param asOfDate Optional date to get metrics as of a specific date
   * @param period Period type: 'annual', 'quarterly', or 'ttm' (trailing twelve months)
   * @param includeGrowthMetrics Whether to include YOY and QOQ growth metrics
   */
  async getFinancialMetrics(
    symbol: string,
    asOfDate: Date = new Date(),
    period: 'annual' | 'quarterly' | 'ttm' = 'ttm',
    includeGrowthMetrics: boolean = true
  ): Promise<FinancialMetrics> {
    // Fetch all required data in parallel
    const [overview, income, cashFlow, balanceSheet, earnings] = await Promise.all([
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'OVERVIEW',
        symbol,
        apikey: this.apiKey
      }),
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'INCOME_STATEMENT',
        symbol,
        apikey: this.apiKey
      }),
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'CASH_FLOW',
        symbol,
        apikey: this.apiKey
      }),
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'BALANCE_SHEET',
        symbol,
        apikey: this.apiKey
      }),
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'EARNINGS',
        symbol,
        apikey: this.apiKey
      })
    ]);

    // Map the base metrics
    const metrics = this.mapFinancialMetrics(overview, income, cashFlow, balanceSheet, earnings);
    
    // If growth metrics are requested, calculate them
    if (includeGrowthMetrics) {
      await this.calculateGrowthMetrics(metrics, income, earnings, asOfDate);
    }
    
    // Filter metrics based on the requested period
    return this.filterMetricsByPeriod(metrics, period, asOfDate);
  }
  
  /**
   * Calculate growth metrics (YOY, QOQ) for financial metrics
   */
  private async calculateGrowthMetrics(
    metrics: FinancialMetrics,
    income: Record<string, any>,
    earnings: Record<string, any>,
    asOfDate: Date
  ): Promise<void> {
    try {
      // Get quarterly reports sorted by date (newest first)
      const quarterlyReports = [...(income.quarterlyReports || [])]
        .sort((a, b) => new Date(b.fiscalDateEnding).getTime() - new Date(a.fiscalDateEnding).getTime());
      
      // Get annual reports sorted by date (newest first)
      const annualReports = [...(income.annualReports || [])]
        .sort((a, b) => new Date(b.fiscalDateEnding).getTime() - new Date(a.fiscalDateEnding).getTime());
      
      // Calculate YOY growth if we have at least 2 years of data
      if (annualReports.length >= 2) {
        const currentYear = parseFloat(annualReports[0].totalRevenue) || 0;
        const previousYear = parseFloat(annualReports[1].totalRevenue) || 0;
        metrics.revenueGrowthYOY = previousYear !== 0 ? ((currentYear - previousYear) / Math.abs(previousYear)) * 100 : undefined;
        
        const currentEPS = parseFloat(earnings.quarterlyEarnings?.[0]?.reportedEPS) || 0;
        const previousEPS = parseFloat(earnings.quarterlyEarnings?.[4]?.reportedEPS) || 0;
        metrics.epsGrowthYOY = previousEPS !== 0 ? ((currentEPS - previousEPS) / Math.abs(previousEPS)) * 100 : undefined;
      }
      
      // Calculate QOQ growth if we have at least 2 quarters of data
      if (quarterlyReports.length >= 2) {
        const currentQuarter = parseFloat(quarterlyReports[0].totalRevenue) || 0;
        const previousQuarter = parseFloat(quarterlyReports[1].totalRevenue) || 0;
        metrics.revenueGrowthQOQ = previousQuarter !== 0 ? ((currentQuarter - previousQuarter) / Math.abs(previousQuarter)) * 100 : undefined;
        
        const currentEPS = parseFloat(earnings.quarterlyEarnings?.[0]?.reportedEPS) || 0;
        const previousEPS = parseFloat(earnings.quarterlyEarnings?.[1]?.reportedEPS) || 0;
        metrics.epsGrowthQOQ = previousEPS !== 0 ? ((currentEPS - previousEPS) / Math.abs(previousEPS)) * 100 : undefined;
      }
    } catch (error) {
      console.warn('Error calculating growth metrics:', error);
      // Don't fail the whole request if growth metrics calculation fails
    }
  }
  
  /**
   * Filter metrics based on the requested period and asOfDate
   */
  private filterMetricsByPeriod(
    metrics: FinancialMetrics,
    period: 'annual' | 'quarterly' | 'ttm',
    asOfDate: Date
  ): FinancialMetrics {
    // For TTM (default), we don't need to filter as we already have the most recent data
    if (period === 'ttm') {
      return metrics;
    }
    
    // For annual/quarterly, we would filter the reports based on the period
    // and asOfDate. In a real implementation, you would filter the reports
    // from the API response to match the requested period.
    // This is simplified for demonstration.
    
    return {
      ...metrics,
      reportPeriod: period
    };
  }

  /**
   * Get dividend history for a stock
   */
  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    const data = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
      function: 'TIME_SERIES_MONTHLY_ADJUSTED',
      symbol,
      apikey: this.apiKey
    });

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
    // Handle both number (for backward compatibility) and options object
    const {
      limit = 4,
      includeFutureReports = false,
      startDate,
      endDate
    } = typeof options === 'number' ? { limit: options } : (options || {});

    // Fetch both historical and future earnings if requested
    const [historicalData, futureData] = await Promise.all([
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'EARNINGS',
        symbol,
        apikey: this.apiKey
      }),
      includeFutureReports 
        ? this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
            function: 'EARNINGS_CALENDAR',
            symbol,
            apikey: this.apiKey,
            horizon: '3month' // Get next 3 months of earnings
          }).catch(() => null) // Gracefully handle if not available
        : Promise.resolve(null)
    ]);

    // Map historical earnings
    let earnings = this.mapEarnings(historicalData, symbol);
    
    // Add future earnings if available and requested
    if (includeFutureReports && futureData) {
      const futureEarnings = this.mapFutureEarnings(futureData, symbol);
      earnings = [...futureEarnings, ...earnings];
    }

    // Apply date filters if provided
    if (startDate || endDate) {
      earnings = earnings.filter(earning => {
        const reportDate = earning.reportedDate || earning.fiscalDateEnding;
        return (!startDate || reportDate >= startDate) && 
               (!endDate || reportDate <= endDate);
      });
    }

    // Sort by date (newest first) and apply limit
    return earnings
      .sort((a, b) => 
        (b.reportedDate || b.fiscalDateEnding).getTime() - 
        (a.reportedDate || a.fiscalDateEnding).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get upcoming earnings reports for multiple stocks
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
      endDate = new Date(new Date().setMonth(new Date().getMonth() + 3)),
      symbols
    } = options;

    // Fetch the earnings calendar
    const data = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
      function: 'EARNINGS_CALENDAR',
      apikey: this.apiKey,
      horizon: '3month' // Next 3 months by default
    });

    // Parse the CSV response
    const earnings = this.parseEarningsCalendar(data, symbols);

    // Filter by date range and limit
    return earnings
      .filter(earning => {
        const reportDate = earning.reportedDate || earning.fiscalDateEnding;
        return reportDate >= startDate && reportDate <= endDate;
      })
      .sort((a, b) => 
        (a.reportedDate || a.fiscalDateEnding).getTime() - 
        (b.reportedDate || b.fiscalDateEnding).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Search for stock symbols
   */
  async searchSymbols(query: string): Promise<StockSymbol[]> {
    const data = await this.makeRequest<Record<string, any>>(this.baseUrl, {
      function: 'SYMBOL_SEARCH',
      keywords: query,
      apikey: this.apiKey
    });

    return this.mapSymbolSearch(data);
  }

  /**
   * Get market news
   * Note: Alpha Vantage doesn't have a direct news endpoint in the free tier
   */
  async getMarketNews(symbols?: string[], limit: number = 10): Promise<NewsArticle[]> {
    // Alpha Vantage premium feature only
    throw new Error('Market news requires a premium Alpha Vantage subscription');
  }

  // Helper methods to map Alpha Vantage responses to our types
  
  private calculateVolumeMetrics(historicalData: TimeSeriesPoint[]): VolumeMetrics {
    if (!historicalData || historicalData.length === 0) {
      return { avgDailyVolume: 0, avgDailyVolumeDollar: 0, currentVolume: 0 };
    }

    // Calculate average daily volume (shares)
    const totalVolume = historicalData.reduce((sum, point) => sum + point.volume, 0);
    const avgDailyVolume = Math.round(totalVolume / historicalData.length);
    
    // Calculate average daily volume in dollars
    const totalDollarVolume = historicalData.reduce(
      (sum, point) => sum + (point.volume * point.close), 0
    );
    const avgDailyVolumeDollar = totalDollarVolume / historicalData.length;
    
    // Get most recent volume
    const currentVolume = historicalData[0]?.volume || 0;
    
    return {
      avgDailyVolume,
      avgDailyVolumeDollar,
      currentVolume
    };
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
    
    // Helper to find price on or after a specific date
    const findPriceOnDate = (targetDate: Date): number | null => {
      // Find the first date that's on or after the target date
      for (const dataPoint of sortedData) {
        if (dataPoint.timestamp >= targetDate) {
          return dataPoint.close;
        }
      }
      return null;
    };
    
    // Calculate performance for different time periods
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
  
  private mapQuote(data: Record<string, string>, symbol: string): StockQuote {
    return {
      symbol: symbol,
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      timestamp: new Date(),
      volume: parseInt(data['06. volume']),
      open: parseFloat(data['02. open']),
      high: parseFloat(data['03. high']),
      low: parseFloat(data['04. low']),
      previousClose: parseFloat(data['08. previous close'])
    };
  };

  private mapCompanyProfile(data: Record<string, any>): CompanyProfile {
    // Update version - Parse numeric values with proper type conversion 
    const parseNumber = (value: any, multiplier: number = 1): number | undefined => {
      if (value === 'None' || value === null || value === undefined) return undefined;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? undefined : num * multiplier;
    };
    // Parse numeric values with proper type conversion
    {/*const parseNumber = (value: any, multiplier: number = 1): number | undefined => {
      if (value === 'None' || value === null || value === undefined) return undefined;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? undefined : num * multiplier;
    };*/}

    // Parse date values
    const parseDate = (value: string | Date | undefined): Date | undefined => {
      if (!value) return undefined;
      return value instanceof Date ? value : new Date(value);
    };

    // Get the last updated timestamp (use current time if not provided)
    const lastUpdated = parseDate(data['LatestQuarter'] || new Date()) || new Date();
    
    // Parse shares outstanding (in millions)
    const sharesOutstanding = parseNumber(data['SharesOutstanding'], 1000000);
    
    // Parse float shares (in millions)
    const floatShares = parseNumber(data['FloatShares'], 1000000);
    
    // Parse other financial metrics
    const peRatio = parseNumber(data['PERatio']);
    const eps = parseNumber(data['EPS']);
    const beta = parseNumber(data['Beta']);
    const dividendPerShare = parseNumber(data['DividendPerShare']);
    const dividendYield = parseNumber(data['DividendYield']);
    
    // Parse market cap (in millions)
    const marketCap = parseNumber(data['MarketCapitalization']);
    
    // Parse IPO date if available
    const ipoDate = data['IPOdate'] ? new Date(data['IPOdate']) : undefined;
    
    // Build the result object with all fields
    const result: CompanyProfile = {
      symbol: data['Symbol'] || '',
      name: data['Name'] || '',
      description: data['Description'] || '',
      exchange: data['Exchange'] || '',
      currency: data['Currency'] || 'USD',
      sector: data['Sector'] || undefined,
      industry: data['Industry'] || undefined,
      website: data['Website'] || undefined,
      logo: undefined, // Alpha Vantage doesn't provide logo URLs
      employees: parseNumber(data['FullTimeEmployees']),
      marketCap,
      ipoDate,
      
      // New fields
      sharesOutstanding,
      floatShares,
      lastUpdated,
      
      // Additional financial metrics
      beta,
      dividendPerShare,
      dividendYield,
      peRatio,
      eps
    };
    
    return result;
  }

  private mapTimeSeries(data: Record<string, any>, interval: TimeInterval): TimeSeriesPoint[] {
    let timeSeriesKey = '';
    
    // Determine the correct time series key based on the interval
    if (interval === '1min' || interval === '5min' || interval === '15min' || interval === '30min' || interval === '60min') {
      timeSeriesKey = `Time Series (${interval})`;
    } else if (interval === 'daily') {
      timeSeriesKey = 'Time Series (Daily)';
    } else if (interval === 'weekly') {
      timeSeriesKey = 'Weekly Time Series';
    } else if (interval === 'monthly') {
      timeSeriesKey = 'Monthly Time Series';
    }

    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) {
      throw new Error('Invalid time series data format');
    }

    return Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
      timestamp: new Date(timestamp),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10)
    }));
  }

  private mapFinancialMetrics(
    overview: Record<string, any>,
    income: Record<string, any>,
    cashFlow: Record<string, any>,
    balanceSheet: Record<string, any>,
    earnings: Record<string, any>
  ): FinancialMetrics {
    // Helper function to safely parse numbers
    const parse = (value: any, multiplier: number = 1): number | undefined => {
      if (value === undefined || value === null || value === 'None') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num * multiplier;
    };

    // Get the most recent reports
    const latestQuarterlyIncome = income.quarterlyReports?.[0] || {};
    const latestAnnualIncome = income.annualReports?.[0] || {};
    const latestQuarterlyCashFlow = cashFlow.quarterlyReports?.[0] || {};
    const latestAnnualCashFlow = cashFlow.annualReports?.[0] || {};
    const latestQuarterlyBalanceSheet = balanceSheet.quarterlyReports?.[0] || {};
    const latestAnnualBalanceSheet = balanceSheet.annualReports?.[0] || {};

    // Calculate derived metrics
    const marketCap = parse(overview['MarketCapitalization'], 1000000); // Convert from millions
    const sharesOutstanding = parse(overview['SharesOutstanding'], 1000000);
    const floatShares = parse(overview['FloatShares'], 1000000);
    const totalDebt = parse(latestQuarterlyBalanceSheet['totalDebt'] || latestAnnualBalanceSheet['totalDebt']);
    const totalEquity = parse(latestQuarterlyBalanceSheet['totalShareholderEquity'] || latestAnnualBalanceSheet['totalShareholderEquity']);
    const ebitda = parse(overview['EBITDA']);
    const enterpriseValue = marketCap && totalDebt !== undefined && parse(overview['CashAndCashEquivalents'])
      ? marketCap + totalDebt - parse(overview['CashAndCashEquivalents'])!
      : undefined;

    // Get the most recent revenue and EPS for growth calculations
    const currentRevenue = parse(latestQuarterlyIncome['totalRevenue']);
    const currentEPS = parse(earnings.quarterlyEarnings?.[0]?.reportedEPS);

    return {
      // Basic Info
      symbol: overview['Symbol'] || '',
      asOfDate: new Date(),
      reportPeriod: latestQuarterlyIncome.fiscalDateEnding ? 'quarterly' : 'annual',
      fiscalYearEnd: overview['FiscalYearEnd'],
      
      // Valuation Metrics
      marketCap,
      enterpriseValue,
      peRatio: parse(overview['PERatio']),
      forwardPERatio: parse(overview['ForwardPE']),
      priceToBookRatio: parse(overview['PriceToBookRatio']),
      evToEbitda: enterpriseValue && ebitda ? enterpriseValue / ebitda : undefined,
      evToRevenue: enterpriseValue && currentRevenue ? enterpriseValue / currentRevenue : undefined,
      pegRatio: parse(overview['PEGRatio']),
      
      // Profitability
      revenue: currentRevenue,
      grossProfit: parse(latestQuarterlyIncome['grossProfit'] || latestAnnualIncome['grossProfit']),
      operatingIncome: parse(latestQuarterlyIncome['operatingIncome'] || latestAnnualIncome['operatingIncome']),
      netIncome: parse(latestQuarterlyIncome['netIncome'] || latestAnnualIncome['netIncome']),
      ebitda: ebitda,
      
      // Margins
      grossMargin: parse(overview['GrossProfitTTM']) && currentRevenue 
        ? (parse(overview['GrossProfitTTM'])! / currentRevenue) * 100 
        : undefined,
      operatingMargin: parse(overview['OperatingMarginTTM']),
      profitMargin: parse(overview['ProfitMargin']),
      ebitdaMargin: ebitda && currentRevenue ? (ebitda / currentRevenue) * 100 : undefined,
      
      // Balance Sheet
      totalDebt,
      totalEquity,
      currentRatio: parse(overview['CurrentRatio']),
      quickRatio: parse(overview['QuickRatio']),
      debtToEquity: totalDebt !== undefined && totalEquity ? (totalDebt / totalEquity) : undefined,
      
      // Cash Flow
      operatingCashFlow: parse(latestQuarterlyCashFlow['operatingCashflow'] || latestAnnualCashFlow['operatingCashflow']),
      freeCashFlow: parse(latestQuarterlyCashFlow['operatingCashflow'] || latestAnnualCashFlow['operatingCashflow']) && 
                   parse(latestQuarterlyCashFlow['capitalExpenditures'] || latestAnnualCashFlow['capitalExpenditures'])
                   ? parse(latestQuarterlyCashFlow['operatingCashflow'] || latestAnnualCashFlow['operatingCashflow'])! - 
                     parse(latestQuarterlyCashFlow['capitalExpenditures'] || latestAnnualCashFlow['capitalExpenditures'])!
                   : undefined,
      freeCashFlowPerShare: parse(overview['FreeCashFlowPerShare']),
      
      // Efficiency & Returns
      returnOnEquity: parse(overview['ReturnOnEquityTTM']),
      returnOnAssets: parse(overview['ReturnOnAssetsTTM']),
      returnOnCapitalEmployed: parse(overview['ReturnOnCapitalEmployed']),
      
      // Growth Metrics (will be calculated separately)
      
      // Dividends
      dividendYield: parse(overview['DividendYield']),
      dividendPerShare: parse(overview['DividendPerShare']),
      dividendPayoutRatio: parse(overview['PayoutRatio']),
      
      // Shares
      sharesOutstanding,
      floatShares,
      
      // Additional fields from the previous implementation
      beta: parse(overview['Beta']),
      fiftyTwoWeekHigh: parse(overview['52WeekHigh']),
      fiftyTwoWeekLow: parse(overview['52WeekLow']),
      eps: currentEPS
    };
  }

  private mapDividends(
    data: Record<string, any>,
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Dividend[] {
    const timeSeries = data['Monthly Adjusted Time Series'];
    if (!timeSeries) {
      return [];
    }

    const dividends: Dividend[] = [];
    
    for (const [date, values] of Object.entries(timeSeries)) {
      const timestamp = new Date(date);
      const amount = parseFloat((values as any)['7. dividend amount']);
      
      // Skip if no dividend or outside date range
      if (amount === 0 || 
          (startDate && timestamp < startDate) || 
          (endDate && timestamp > endDate)) {
        continue;
      }

      // Create a proper Dividend object with required fields
      const dividend: Dividend = {
        symbol,
        amount,
        exDate: timestamp,
        paymentDate: timestamp,
        recordDate: timestamp,
        declarationDate: undefined // Alpha Vantage doesn't provide this
      };
      
      dividends.push(dividend);
    }

    return dividends;
  }

  private mapEarnings(data: Record<string, any>, symbol: string): EarningsReport[] {
    const quarterlyEarnings = data.quarterlyEarnings || [];
    
    return quarterlyEarnings.map((earning: any) => {
      const fiscalDate = new Date(earning.fiscalDateEnding);
      const reportedDate = new Date(earning.reportedDate);
      const isFutureReport = reportedDate > new Date();
      
      return {
        symbol,
        fiscalDateEnding: fiscalDate,
        reportedDate: reportedDate,
        
        // EPS Data
        reportedEPS: parseFloat(earning.reportedEPS),
        estimatedEPS: parseFloat(earning.estimatedEPS) || undefined,
        surprise: parseFloat(earning.surprise) || undefined,
        surprisePercentage: parseFloat(earning.surprisePercentage) || undefined,
        
        // Revenue Data (if available)
        reportedRevenue: earning.reportedRevenue ? parseFloat(earning.reportedRevenue) : undefined,
        estimatedRevenue: earning.estimatedRevenue ? parseFloat(earning.estimatedRevenue) : undefined,
        revenueSurprise: earning.revenueSurprise ? parseFloat(earning.revenueSurprise) : undefined,
        revenueSurprisePercentage: earning.revenueSurprisePercentage 
          ? parseFloat(earning.revenueSurprisePercentage) 
          : undefined,
        
        // Period Information
        period: this.getFiscalQuarter(fiscalDate),
        year: fiscalDate.getFullYear(),
        
        // Metadata
        isFutureReport,
        time: earning.time, // Not available in standard response
        currency: 'USD' // Default, can be overridden if needed
      };
    });
  }
  
  /**
   * Map future earnings data from the earnings calendar
   */
  private mapFutureEarnings(data: any, symbol: string): EarningsReport[] {
    // For CSV response (EARNINGS_CALENDAR endpoint)
    if (typeof data === 'string') {
      return this.parseEarningsCalendar({ data }, [symbol]);
    }
    
    // For JSON response (if available in the future)
    const earnings = data.earningsCalendar || [];
    return earnings.map((earning: any) => {
      const fiscalDate = new Date(earning.fiscalDateEnding);
      const reportDate = new Date(earning.reportDate || earning.fiscalDateEnding);
      
      return {
        symbol: symbol,
        fiscalDateEnding: fiscalDate,
        reportedDate: reportDate,
        
        // EPS Data (not available for future reports)
        reportedEPS: undefined,
        estimatedEPS: earning.estimate ? parseFloat(earning.estimate) : undefined,
        
        // Revenue Data (if available)
        estimatedRevenue: earning.estimatedRevenue ? parseFloat(earning.estimatedRevenue) : undefined,
        
        // Period Information
        period: this.getFiscalQuarter(fiscalDate),
        year: fiscalDate.getFullYear(),
        
        // Metadata
        isFutureReport: true,
        time: earning.time, // e.g., 'amc', 'bmo'
        currency: earning.currency || 'USD'
      };
    });
  }
  
  /**
   * Parse the earnings calendar CSV response
   */
  private parseEarningsCalendar(data: any, symbols?: string[]): EarningsReport[] {
    // Handle CSV response from EARNINGS_CALENDAR endpoint
    if (typeof data === 'string') {
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
      
      const reports: EarningsReport[] = [];
      
      for (const line of lines.slice(1)) {
        try {
          const values = line.split(',').map(v => v.trim());
          const entry: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            entry[header] = values[index] || '';
          });
          
          const fiscalDate = new Date(entry['fiscal date ending']);
          const reportTime = entry['report time']?.toLowerCase() || '';
          const symbol = entry['symbol'];
          
          // Skip if we have symbols filter and this symbol isn't in it
          if (symbols && symbols.length > 0 && !symbols.includes(symbol)) {
            continue;
          }
          
          // Create a complete EarningsReport object with all required fields
          const report: EarningsReport = {
            symbol,
            fiscalDateEnding: fiscalDate,
            reportedDate: new Date(entry['report date'] || entry['fiscal date ending']),
            reportedEPS: 0, // Required field, default to 0 for future reports
            
            // EPS Data
            estimatedEPS: entry['estimate'] ? parseFloat(entry['estimate']) : undefined,
            
            // Revenue Data
            estimatedRevenue: entry['estimated revenue'] 
              ? parseFloat(entry['estimated revenue']) 
              : undefined,
            
            // Period Information
            period: this.getFiscalQuarter(fiscalDate),
            year: fiscalDate.getFullYear(),
            
            // Metadata
            isFutureReport: true,
            time: reportTime.includes('after') ? 'amc' : reportTime.includes('before') ? 'bmo' : '',
            currency: 'USD' // Default, can be overridden if needed
          };
          
          reports.push(report);
        } catch (error) {
          console.warn('Error parsing earnings report line:', line, error);
        }
      }
      
      return reports;
    }
    
    return [];
  }
  
  /**
   * Helper to get fiscal quarter from a date
   */
  private getFiscalQuarter(date: Date): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  }

  private mapSymbolSearch(data: Record<string, any>): StockSymbol[] {
    const bestMatches = data.bestMatches || [];
    return bestMatches.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: parseFloat(match['9. matchScore'])
    }));
  }

  /**
   * Alpha Vantage doesn't support economic events - return empty array
   */
  async getEconomicEvents(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic events are not supported by Alpha Vantage');
    return [];
  }

  /**
   * Alpha Vantage doesn't support economic calendar - return empty array
   */
  async getEconomicCalendar(): Promise<import('../types').EconomicCalendarEntry[]> {
    console.warn('Economic calendar is not supported by Alpha Vantage');
    return [];
  }

  /**
   * Alpha Vantage doesn't support economic indicators - return empty array
   */
  async getEconomicIndicator(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic indicators are not supported by Alpha Vantage');
    return [];
  }
}
