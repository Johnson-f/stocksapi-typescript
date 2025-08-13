import { BaseStockApiClient } from '../clients/base-client';
import axios, { AxiosInstance } from 'axios';
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
 * Finnhub API client implementation
 * Documentation: https://finnhub.io/docs/api
 */
export class FinnhubClient extends BaseStockApiClient {
  protected readonly baseUrl: string;
  protected readonly httpClient: AxiosInstance;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    const baseUrl = 'https://finnhub.io/api/v1';
    super(apiKey, baseUrl, requestTimeout);
    this.baseUrl = baseUrl;
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        token: apiKey
      }
    });
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
      
      const response = await this.httpClient.get<T>(endpoint, {
        params: cleanParams
      });
      
      return response.data;
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`Finnhub API request failed: ${errorMessage}`, { 
        endpoint, 
        params 
      });
      
      throw new Error(`Failed to fetch data from Finnhub: ${errorMessage}`);
    }
  }

  // Stock data methods
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      // Get current quote
      const quoteData = await this.makeRequest<{
        c: number;  // current price
        d: number;  // change
        dp: number; // percent change
        h: number;  // high price of the day
        l: number;  // low price of the day
        o: number;  // open price of the day
        pc: number; // previous close price
        t: number;  // timestamp
      }>('/quote', { symbol });

      const timestamp = new Date(quoteData.t * 1000);
      
      const quote: StockQuote = {
        symbol,
        price: quoteData.c,
        change: quoteData.d,
        changePercent: quoteData.dp,
        timestamp,
        volume: 0, // Will be updated from profile if needed
        high: quoteData.h,
        low: quoteData.l,
        open: quoteData.o,
        previousClose: quoteData.pc,
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
            quoteData.c, 
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
      const profile = await this.makeRequest<{
        name: string;
        ticker: string;
        exchange: string;
        ipo: string;
        marketCapitalization: number;
        shareOutstanding: number;
        weburl: string;
        logo: string;
        finnhubIndustry: string;
        country: string;
        currency: string;
      }>('/stock/profile2', { symbol });

      const companyProfile: CompanyProfile = {
        symbol: profile.ticker || symbol,
        name: profile.name,
        description: profile.name, // Using name as a fallback since description isn't provided by Finnhub free tier
        exchange: profile.exchange,
        currency: profile.currency,
        sector: profile.finnhubIndustry, // Finnhub combines sector and industry
        industry: profile.finnhubIndustry, // Finnhub combines sector and industry
        website: profile.weburl,
        logo: profile.logo,
        marketCap: profile.marketCapitalization,
        employees: 0, // Not provided in free tier
        ipoDate: profile.ipo ? new Date(profile.ipo) : undefined,
        lastUpdated: new Date(), // Using current date as last updated
        sharesOutstanding: profile.shareOutstanding,
        floatShares: profile.shareOutstanding // Using same as outstanding since float not provided
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
      // Map our interval to Finnhub's resolution
      const resolutionMap: Record<string, string> = {
        '1min': '1',
        '5min': '5',
        '15min': '15',
        '30min': '30',
        '60min': '60',
        '1d': 'D',
        'daily': 'D',
        'weekly': 'W',
        'monthly': 'M'
      };

      const resolution = resolutionMap[interval] || 'D';
      
      // Calculate from and to timestamps
      let from: number;
      if (startDate) {
        from = Math.floor(startDate.getTime() / 1000);
      } else {
        // Default to period days ago if no start date provided
        const fromDate = subDays(endDate, period);
        from = Math.floor(fromDate.getTime() / 1000);
      }
      
      const to = Math.floor((endDate || new Date()).getTime() / 1000);

      const data = await this.makeRequest<{
        c: number[]; // close prices
        h: number[]; // high prices
        l: number[]; // low prices
        o: number[]; // open prices
        s: string;   // status
        t: number[]; // timestamps
        v: number[]; // volumes
      }>('/stock/candle', {
        symbol,
        resolution,
        from,
        to,
        countback: period,
        adjusted: true
      });

      // Transform to TimeSeriesPoint array
      const timeSeries: TimeSeriesPoint[] = [];
      
      if (data.s === 'ok' && data.t && data.t.length > 0) {
        for (let i = 0; i < data.t.length; i++) {
          timeSeries.push({
            timestamp: new Date(data.t[i] * 1000),
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v ? data.v[i] : 0
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
      const metrics = await this.makeRequest<{
        metric: {
          [key: string]: any;
        };
        series: {
          annual: {
            [key: string]: any;
          };
          quarterly: {
            [key: string]: any;
          };
        };
      }>('/stock/metric', {
        symbol,
        metric: 'all'
      });

      const latestData = metrics.metric;
      
      return {
        symbol,
        asOfDate: asOfDate || new Date(),
        marketCap: latestData.marketCapitalization,
        peRatio: latestData.peNormalizedAnnual,
        pegRatio: latestData.pegRatio,
        priceToBookRatio: latestData.priceBookValueRatioAnnual,
        evToEbitda: latestData.enterpriseValueEbitdaAnnual,
        evToRevenue: latestData.enterpriseValueRevenueAnnual,
        revenue: latestData.revenuePerShareAnnual * latestData.sharesOutstanding,
        ebitda: latestData.ebitdPerShareAnnual * latestData.sharesOutstanding,
        profitMargin: latestData.netProfitMarginAnnual,
        debtToEquity: latestData.debtEquityRatioAnnual,
        dividendYield: latestData.dividendYieldIndicatedAnnual,
        beta: latestData.beta,
        fiftyTwoWeekHigh: latestData['52WeekHigh'],
        fiftyTwoWeekLow: latestData['52WeekLow'],
        sharesOutstanding: latestData.sharesOutstanding,
        reportPeriod: period === 'annual' ? 'annual' : 'quarterly',
        fiscalYearEnd: '12-31' // Default, can be overridden if needed
      };
    } catch (error) {
      console.error(`Failed to fetch financial metrics for ${symbol}:`, error);
      throw error;
    }
  }

  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    try {
      const from = startDate ? Math.floor(startDate.getTime() / 1000) : 0;
      const to = endDate ? Math.floor(endDate.getTime() / 1000) : Math.floor(Date.now() / 1000);
      
      const dividends = await this.makeRequest<Array<{
        symbol: string;
        date: string;
        amount: number;
        declaredDate?: string;
        recordDate?: string;
        paymentDate?: string;
        currency?: string;
      }>>('/stock/dividend', {
        symbol,
        from,
        to
      });

      return dividends
        .filter(d => d.paymentDate) // Only include dividends with a payment date
        .map(d => ({
          symbol: d.symbol,
          amount: d.amount,
          exDate: new Date(d.date),
          paymentDate: new Date(d.paymentDate!), // We've filtered out undefined payment dates
          recordDate: d.recordDate ? new Date(d.recordDate) : new Date(d.date), // Fallback to exDate if no record date
          declarationDate: d.declaredDate ? new Date(d.declaredDate) : undefined,
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
    try {
      const limit = options?.limit || 4;
      const includeFutureReports = options?.includeFutureReports || false;
      
      const earnings = await this.makeRequest<{
        earnings: Array<{
          period: string;
          symbol: string;
          year: number;
          quarter: number;
          surprise: number | null;
          surprisePercent: number | null;
          actual: number | null;
          estimate: number | null;
          date: string;
        }>;
      }>('/stock/earnings', {
        symbol,
        limit
      });

      return earnings.earnings.map(e => {
        const reportDate = new Date(e.date);
        const fiscalDateEnding = new Date(e.year, (e.quarter * 3) - 1, 1);
        
        const earningsReport: EarningsReport = {
          symbol: e.symbol,
          fiscalDateEnding,
          reportedDate: reportDate,
          reportedEPS: e.actual || 0,
          estimatedEPS: e.estimate || undefined,
          surprise: e.surprise || undefined,
          surprisePercentage: e.surprisePercent || undefined,
          period: `Q${e.quarter}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
          year: e.year,
          isFutureReport: reportDate > new Date(),
          currency: 'USD' // Default, can be overridden if needed
        };
        
        return earningsReport;
      });
    } catch (error) {
      console.error(`Failed to fetch earnings for ${symbol}:`, error);
      throw error;
    }
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
      // Set default values for required parameters
      const from = options?.startDate || new Date();
      const to = options?.endDate || new Date();
      to.setMonth(to.getMonth() + 3); // Default to 3 months in the future
      
      // Build params object with only defined values
      const params: Record<string, string | number> = {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      };
      
      // Only add symbols if provided
      if (options.symbols?.length) {
        params.symbol = options.symbols.join(',');
      }
      
      // Add limit if provided
      if (options.limit) {
        params.limit = options.limit;
      }
      
      const earnings = await this.makeRequest<Array<{
        symbol: string;
        date: string;
        hour: string;
        year: number;
        quarter: number;
        epsEstimate?: number;
        revenueEstimateLow?: number;
        revenueEstimateHigh?: number;
        revenueEstimateAvg?: number;
        epsEstimateYearAgo?: number;
        revenueEstimateYearAgo?: number;
      }>>('/calendar/earnings', {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
        symbol: options?.symbols ? options.symbols.join(',') : undefined
      });

      return earnings.map(e => {
        const reportDate = new Date(e.date);
        const fiscalDateEnding = new Date(e.year, (e.quarter * 3) - 1, 1);
        
        const earningsReport: EarningsReport = {
          symbol: e.symbol,
          fiscalDateEnding,
          reportedDate: reportDate,
          reportedEPS: 0, // Not available in upcoming earnings
          estimatedEPS: e.epsEstimate,
          surprise: undefined,
          surprisePercentage: undefined,
          reportedRevenue: undefined,
          estimatedRevenue: e.revenueEstimateAvg,
          revenueSurprise: undefined,
          revenueSurprisePercentage: undefined,
          time: e.hour,
          period: `Q${e.quarter}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
          year: e.year,
          isFutureReport: true,
          currency: 'USD' // Default, can be overridden if needed
        };
        
        return earningsReport;
      });
    } catch (error) {
      console.error('Failed to fetch upcoming earnings:', error);
      throw error;
    }
  }

  // Market data methods
  async searchSymbols(query: string): Promise<StockSymbol[]> {
    try {
      const results = await this.makeRequest<{
        result: Array<{
          symbol: string;
          description: string;
          displaySymbol: string;
          type: string;
          currency?: string;
        }>;
      }>('/search', { q: query });

      return results.result.map(r => ({
        symbol: r.symbol,
        name: r.description,
        displaySymbol: r.displaySymbol,
        currency: r.currency,
        exchange: '', // Finnhub doesn't provide exchange in search results
        type: r.type
      }));
    } catch (error) {
      console.error(`Failed to search symbols for query "${query}":`, error);
      throw error;
    }
  }

  async getMarketNews(symbols: string[] = [], limit: number = 10): Promise<NewsArticle[]> {
    try {
      const news = await this.makeRequest<Array<{
        category: string;
        datetime: number;
        headline: string;
        id: number;
        image: string;
        related: string;
        source: string;
        summary: string;
        url: string;
      }>>('/news', {
        category: 'general',
        token: this.apiKey
      });

      return news
        .filter(article => !symbols.length || 
          symbols.some(symbol => 
            article.headline.toLowerCase().includes(symbol.toLowerCase()) ||
            article.summary.toLowerCase().includes(symbol.toLowerCase()) ||
            (article.related && article.related.toLowerCase().includes(symbol.toLowerCase()))
          )
        )
        .slice(0, limit)
        .map(article => ({
          id: article.id.toString(),
          source: article.source,
          title: article.headline,
          summary: article.summary,
          url: article.url,
          publishedAt: new Date(article.datetime * 1000),
          imageUrl: article.image || undefined,
          relatedSymbols: article.related ? article.related.split(',') : []
        }));
    } catch (error) {
      console.error('Failed to fetch market news:', error);
      throw error;
    }
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
