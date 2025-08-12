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
 * Twelve Data API client implementation
 * Documentation: https://twelvedata.com/docs
 */
export class TwelveDataClient extends BaseStockApiClient {
  protected readonly baseUrl: string;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    const baseUrl = 'https://api.twelvedata.com';
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
      cleanParams.apikey = this.apiKey;
      
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
      
      console.error(`Twelve Data API request failed: ${errorMessage}`, { 
        endpoint, 
        params 
      });
      
      throw new Error(`Failed to fetch data from Twelve Data: ${errorMessage}`);
    }
  }

  // Stock data methods
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      // Get current quote
      const quoteData = await this.makeRequest<{
        symbol: string;
        name: string;
        exchange: string;
        mic_code: string;
        currency: string;
        datetime: string;
        timestamp: number;
        last_quote_at: number;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
        previous_close: string;
        change: string;
        percent_change: string;
        average_volume: string;
        is_market_open: boolean;
        fifty_two_week: {
          low: string;
          high: string;
          low_change: string;
          high_change: string;
          low_change_percent: string;
          high_change_percent: string;
          range: string;
        };
      }>('/quote', { symbol });

      const timestamp = new Date(quoteData.timestamp * 1000);
      
      const quote: StockQuote = {
        symbol: quoteData.symbol,
        price: parseFloat(quoteData.close),
        change: parseFloat(quoteData.change),
        changePercent: parseFloat(quoteData.percent_change),
        timestamp,
        volume: parseInt(quoteData.volume),
        high: parseFloat(quoteData.high),
        low: parseFloat(quoteData.low),
        open: parseFloat(quoteData.open),
        previousClose: parseFloat(quoteData.previous_close),
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
      const profile = await this.makeRequest<{
        symbol: string;
        name: string;
        exchange: string;
        mic_code: string;
        currency: string;
        country: string;
        type: string;
        description?: string;
        sector?: string;
        industry?: string;
        employees?: number;
        website?: string;
        logo?: string;
        market_cap?: number;
        shares_outstanding?: number;
        float_shares?: number;
        ipo_date?: string;
      }>('/profile', { symbol });

      const companyProfile: CompanyProfile = {
        symbol: profile.symbol,
        name: profile.name,
        description: profile.description || profile.name,
        exchange: profile.exchange,
        currency: profile.currency,
        sector: profile.sector,
        industry: profile.industry,
        website: profile.website,
        logo: profile.logo,
        marketCap: profile.market_cap,
        employees: profile.employees,
        ipoDate: profile.ipo_date ? new Date(profile.ipo_date) : undefined,
        lastUpdated: new Date(),
        sharesOutstanding: profile.shares_outstanding,
        floatShares: profile.float_shares
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
      // Map our interval to Twelve Data's format
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
        meta: {
          symbol: string;
          interval: string;
          currency_base: string;
          currency_quote: string;
          type: string;
        };
        status: string;
        values: Array<{
          datetime: string;
          open: string;
          high: string;
          low: string;
          close: string;
          volume: string;
        }>;
      }>('/time_series', {
        symbol,
        interval: mappedInterval,
        start_date: from,
        end_date: to,
        outputsize: outputSize === 'full' ? 5000 : 100
      });

      // Transform to TimeSeriesPoint array
      const timeSeries: TimeSeriesPoint[] = [];
      
      if (data.status === 'ok' && data.values && data.values.length > 0) {
        for (const value of data.values) {
          timeSeries.push({
            timestamp: new Date(value.datetime),
            open: parseFloat(value.open),
            high: parseFloat(value.high),
            low: parseFloat(value.low),
            close: parseFloat(value.close),
            volume: parseInt(value.volume)
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
        symbol: string;
        name: string;
        exchange: string;
        currency: string;
        market_cap: number;
        pe_ratio: number;
        peg_ratio: number;
        price_to_book: number;
        ev_to_ebitda: number;
        ev_to_revenue: number;
        revenue: number;
        ebitda: number;
        net_income: number;
        profit_margin: number;
        debt_to_equity: number;
        dividend_yield: number;
        beta: number;
        fifty_two_week_high: number;
        fifty_two_week_low: number;
        shares_outstanding: number;
      }>('/fundamentals', {
        symbol,
        period: period === 'annual' ? 'annual' : 'quarterly'
      });

      return {
        symbol: metrics.symbol,
        asOfDate: asOfDate || new Date(),
        marketCap: metrics.market_cap,
        peRatio: metrics.pe_ratio,
        pegRatio: metrics.peg_ratio,
        priceToBookRatio: metrics.price_to_book,
        evToEbitda: metrics.ev_to_ebitda,
        evToRevenue: metrics.ev_to_revenue,
        revenue: metrics.revenue,
        ebitda: metrics.ebitda,
        profitMargin: metrics.profit_margin,
        debtToEquity: metrics.debt_to_equity,
        dividendYield: metrics.dividend_yield,
        beta: metrics.beta,
        fiftyTwoWeekHigh: metrics.fifty_two_week_high,
        fiftyTwoWeekLow: metrics.fifty_two_week_low,
        sharesOutstanding: metrics.shares_outstanding,
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
      const from = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const to = endDate ? endDate.toISOString().split('T')[0] : undefined;
      
      const dividends = await this.makeRequest<Array<{
        symbol: string;
        date: string;
        amount: number;
        currency: string;
        ex_date?: string;
        payment_date?: string;
        record_date?: string;
        declaration_date?: string;
      }>>('/dividends', {
        symbol,
        start_date: from,
        end_date: to
      });

      return dividends.map(d => ({
        symbol: d.symbol,
        amount: d.amount,
        exDate: new Date(d.ex_date || d.date),
        paymentDate: new Date(d.payment_date || d.date),
        recordDate: d.record_date ? new Date(d.record_date) : new Date(d.ex_date || d.date),
        declarationDate: d.declaration_date ? new Date(d.declaration_date) : undefined,
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
      const from = options?.startDate ? options.startDate.toISOString().split('T')[0] : undefined;
      const to = options?.endDate ? options.endDate.toISOString().split('T')[0] : undefined;
      
      const earnings = await this.makeRequest<{
        symbol: string;
        name: string;
        earnings: Array<{
          period: string;
          year: number;
          quarter: number;
          actual: number | null;
          estimate: number | null;
          surprise: number | null;
          surprise_percent: number | null;
          date: string;
          time?: string;
          currency: string;
        }>;
      }>('/earnings', {
        symbol,
        limit,
        start_date: from,
        end_date: to
      });

      return earnings.earnings.map(e => {
        const reportDate = new Date(e.date);
        const fiscalDateEnding = new Date(e.year, (e.quarter * 3) - 1, 1);
        
        const earningsReport: EarningsReport = {
          symbol: earnings.symbol,
          fiscalDateEnding,
          reportedDate: reportDate,
          reportedEPS: e.actual || 0,
          estimatedEPS: e.estimate || undefined,
          surprise: e.surprise || undefined,
          surprisePercentage: e.surprise_percent || undefined,
          period: `Q${e.quarter}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
          year: e.year,
          isFutureReport: reportDate > new Date(),
          currency: e.currency || 'USD',
          time: e.time
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
      const from = options?.startDate || new Date();
      const to = options?.endDate || new Date();
      to.setMonth(to.getMonth() + 3); // Default to 3 months in the future
      
      const params: Record<string, string | number> = {
        start_date: from.toISOString().split('T')[0],
        end_date: to.toISOString().split('T')[0]
      };
      
      if (options.symbols?.length) {
        params.symbol = options.symbols.join(',');
      }
      
      if (options.limit) {
        params.limit = options.limit;
      }
      
      const earnings = await this.makeRequest<Array<{
        symbol: string;
        name: string;
        date: string;
        time?: string;
        year: number;
        quarter: number;
        eps_estimate?: number;
        revenue_estimate_low?: number;
        revenue_estimate_high?: number;
        revenue_estimate_avg?: number;
        eps_estimate_year_ago?: number;
        revenue_estimate_year_ago?: number;
        currency: string;
      }>>('/earnings_calendar', params);

      return earnings.map(e => {
        const reportDate = new Date(e.date);
        const fiscalDateEnding = new Date(e.year, (e.quarter * 3) - 1, 1);
        
        const earningsReport: EarningsReport = {
          symbol: e.symbol,
          fiscalDateEnding,
          reportedDate: reportDate,
          reportedEPS: 0, // Not available in upcoming earnings
          estimatedEPS: e.eps_estimate,
          surprise: undefined,
          surprisePercentage: undefined,
          reportedRevenue: undefined,
          estimatedRevenue: e.revenue_estimate_avg,
          revenueSurprise: undefined,
          revenueSurprisePercentage: undefined,
          time: e.time,
          period: `Q${e.quarter}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
          year: e.year,
          isFutureReport: true,
          currency: e.currency || 'USD'
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
        data: Array<{
          symbol: string;
          name: string;
          currency: string;
          exchange: string;
          mic_code: string;
          country: string;
          type: string;
        }>;
      }>('/symbol_search', { keywords: query });

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
    try {
      const news = await this.makeRequest<Array<{
        id: string;
        title: string;
        summary: string;
        url: string;
        source: string;
        published_at: string;
        image_url?: string;
        symbols?: string[];
        category: string;
      }>>('/news', {
        limit,
        symbols: symbols.length > 0 ? symbols.join(',') : undefined
      });

      return news
        .filter(article => !symbols.length || 
          symbols.some(symbol => 
            article.title.toLowerCase().includes(symbol.toLowerCase()) ||
            article.summary.toLowerCase().includes(symbol.toLowerCase()) ||
            (article.symbols && article.symbols.some(s => s.toLowerCase().includes(symbol.toLowerCase())))
          )
        )
        .slice(0, limit)
        .map(article => ({
          id: article.id,
          source: article.source,
          title: article.title,
          summary: article.summary,
          url: article.url,
          publishedAt: new Date(article.published_at),
          imageUrl: article.image_url || undefined,
          relatedSymbols: article.symbols || []
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
} 