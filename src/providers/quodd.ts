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
import { subDays, subMonths, subYears, isBefore, isSameDay, startOfYear, format } from 'date-fns';

/**
 * Quodd API client implementation
 * Documentation: https://www.quodd.com/
 * 
 * Quodd provides comprehensive market data including real-time quotes,
 * historical data, fundamentals, and news across multiple asset classes.
 */
export class QuoddClient extends BaseStockApiClient {
  protected readonly baseUrl: string;
  protected readonly httpClient: AxiosInstance;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    const baseUrl = 'https://api.quodd.com/v1';
    super(apiKey, baseUrl, requestTimeout);
    this.baseUrl = baseUrl;
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
        errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error(`Quodd API request failed: ${errorMessage}`, { 
        endpoint, 
        params 
      });
      
      throw new Error(`Failed to fetch data from Quodd: ${errorMessage}`);
    }
  }

  // Stock data methods
  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      // Get current quote
      const quoteData = await this.makeRequest<{
        symbol: string;
        name?: string;
        last: number;
        change: number;
        change_pct: number;
        high: number;
        low: number;
        open: number;
        prev_close: number;
        volume: number;
        timestamp: string;
        bid?: number;
        ask?: number;
        bid_size?: number;
        ask_size?: number;
      }>('/quotes/equities', { symbol });

      const timestamp = new Date(quoteData.timestamp);
      
      const quote: StockQuote = {
        symbol: quoteData.symbol,
        companyName: quoteData.name,
        price: quoteData.last,
        change: quoteData.change,
        changePercent: quoteData.change_pct,
        timestamp,
        volume: quoteData.volume,
        high: quoteData.high,
        low: quoteData.low,
        open: quoteData.open,
        previousClose: quoteData.prev_close,
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
            quoteData.last, 
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
    
    try {
      // Quodd supports batch quotes
      const batchData = await this.makeRequest<Array<{
        symbol: string;
        name?: string;
        last: number;
        change: number;
        change_pct: number;
        high: number;
        low: number;
        open: number;
        prev_close: number;
        volume: number;
        timestamp: string;
      }>>('/quotes/equities/batch', { symbols: symbols.join(',') });

      for (const quoteData of batchData) {
        const timestamp = new Date(quoteData.timestamp);
        
        results[quoteData.symbol] = {
          success: true,
          data: {
            symbol: quoteData.symbol,
            companyName: quoteData.name,
            price: quoteData.last,
            change: quoteData.change,
            changePercent: quoteData.change_pct,
            timestamp,
            volume: quoteData.volume,
            high: quoteData.high,
            low: quoteData.low,
            open: quoteData.open,
            previousClose: quoteData.prev_close,
          },
          symbol: quoteData.symbol
        };
      }
      
      // Mark any missing symbols as failed
      for (const symbol of symbols) {
        if (!results[symbol]) {
          results[symbol] = {
            success: false,
            error: new Error(`Symbol ${symbol} not found`),
            symbol
          };
        }
      }
    } catch (error) {
      // If batch fails, try individual quotes
      for (const symbol of symbols) {
        try {
          const quote = await this.getQuote(symbol, false);
          results[symbol] = {
            success: true,
            data: quote,
            symbol: quote.symbol
          };
        } catch (err) {
          results[symbol] = {
            success: false,
            error: err as Error,
            symbol
          };
        }
      }
    }
    
    return results;
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      const profile = await this.makeRequest<{
        symbol: string;
        name: string;
        description: string;
        exchange: string;
        currency: string;
        sector: string;
        industry: string;
        website: string;
        logo_url: string;
        market_cap: number;
        employees: number;
        ipo_date: string;
        shares_outstanding: number;
        float_shares: number;
        beta: number;
        dividend_yield: number;
        dividend_per_share: number;
        pe_ratio: number;
        eps: number;
      }>('/fundamentals/company-profile', { symbol });

      const companyProfile: CompanyProfile = {
        symbol: profile.symbol,
        name: profile.name,
        description: profile.description,
        exchange: profile.exchange,
        currency: profile.currency,
        sector: profile.sector,
        industry: profile.industry,
        website: profile.website,
        logo: profile.logo_url,
        marketCap: profile.market_cap,
        employees: profile.employees,
        ipoDate: profile.ipo_date ? new Date(profile.ipo_date) : undefined,
        sharesOutstanding: profile.shares_outstanding,
        floatShares: profile.float_shares,
        beta: profile.beta,
        dividendYield: profile.dividend_yield,
        dividendPerShare: profile.dividend_per_share,
        peRatio: profile.pe_ratio,
        eps: profile.eps,
        lastUpdated: new Date()
      };

      return companyProfile;
    } catch (error) {
      console.error(`Failed to fetch company profile for ${symbol}:`, error);
      throw error;
    }
  }

  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const results: BatchCompanyProfileResult = {};
    
    // Process each symbol individually
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
    period?: number,
    startDate?: Date,
    endDate?: Date,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<TimeSeriesPoint[]> {
    try {
      // Map interval to Quodd's format
      const intervalMap: Record<TimeInterval, string> = {
        '1min': '1m',
        '5min': '5m',
        '15min': '15m',
        '30min': '30m',
        '60min': '1h',
        '1d': 'daily',
        'daily': 'daily',
        'weekly': 'weekly',
        'monthly': 'monthly'
      };

      const params: Record<string, string | number | undefined> = {
        symbol,
        interval: intervalMap[interval] || 'daily',
        limit: outputSize === 'full' ? 5000 : (period || 100)
      };

      if (startDate) {
        params.start_date = format(startDate, 'yyyy-MM-dd');
      }
      if (endDate) {
        params.end_date = format(endDate, 'yyyy-MM-dd');
      }

      const response = await this.makeRequest<{
        data: Array<{
          date: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }>;
      }>('/historical/equities', params);

      return response.data.map(point => ({
        timestamp: new Date(point.date),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
      }));
    } catch (error) {
      console.error(`Failed to fetch time series for ${symbol}:`, error);
      throw error;
    }
  }

  async getFinancialMetrics(
    symbol: string, 
    asOfDate?: Date,
    period: 'annual' | 'quarterly' | 'ttm' = 'ttm',
    includeGrowthMetrics: boolean = true
  ): Promise<FinancialMetrics> {
    try {
      const params: Record<string, string | undefined> = {
        symbol,
        period
      };

      if (asOfDate) {
        params.as_of_date = format(asOfDate, 'yyyy-MM-dd');
      }

      const metrics = await this.makeRequest<{
        symbol: string;
        as_of_date: string;
        market_cap: number;
        enterprise_value: number;
        pe_ratio: number;
        forward_pe_ratio: number;
        peg_ratio: number;
        eps: number;
        price_to_book: number;
        ev_to_ebitda: number;
        ev_to_revenue: number;
        roe: number;
        revenue: number;
        gross_profit: number;
        operating_income: number;
        net_income: number;
        ebitda: number;
        gross_margin: number;
        operating_margin: number;
        profit_margin: number;
        ebitda_margin: number;
        total_debt: number;
        total_equity: number;
        current_ratio: number;
        quick_ratio: number;
        debt_to_equity: number;
        operating_cash_flow: number;
        free_cash_flow: number;
        free_cash_flow_per_share: number;
        return_on_equity: number;
        return_on_assets: number;
        return_on_capital_employed: number;
        revenue_growth_yoy?: number;
        revenue_growth_qoq?: number;
        eps_growth_yoy?: number;
        eps_growth_qoq?: number;
        dividend_yield: number;
        dividend_per_share: number;
        dividend_payout_ratio: number;
        beta: number;
        fifty_two_week_high: number;
        fifty_two_week_low: number;
        shares_outstanding: number;
        float_shares: number;
        report_period: string;
        fiscal_year_end: string;
      }>('/fundamentals/financial-metrics', params);

      const financialMetrics: FinancialMetrics = {
        symbol: metrics.symbol,
        asOfDate: new Date(metrics.as_of_date),
        marketCap: metrics.market_cap,
        enterpriseValue: metrics.enterprise_value,
        peRatio: metrics.pe_ratio,
        forwardPERatio: metrics.forward_pe_ratio,
        pegRatio: metrics.peg_ratio,
        eps: metrics.eps,
        priceToBookRatio: metrics.price_to_book,
        evToEbitda: metrics.ev_to_ebitda,
        evToRevenue: metrics.ev_to_revenue,
        roe: metrics.roe,
        revenue: metrics.revenue,
        grossProfit: metrics.gross_profit,
        operatingIncome: metrics.operating_income,
        netIncome: metrics.net_income,
        ebitda: metrics.ebitda,
        grossMargin: metrics.gross_margin,
        operatingMargin: metrics.operating_margin,
        profitMargin: metrics.profit_margin,
        ebitdaMargin: metrics.ebitda_margin,
        totalDebt: metrics.total_debt,
        totalEquity: metrics.total_equity,
        currentRatio: metrics.current_ratio,
        quickRatio: metrics.quick_ratio,
        debtToEquity: metrics.debt_to_equity,
        operatingCashFlow: metrics.operating_cash_flow,
        freeCashFlow: metrics.free_cash_flow,
        freeCashFlowPerShare: metrics.free_cash_flow_per_share,
        returnOnEquity: metrics.return_on_equity,
        returnOnAssets: metrics.return_on_assets,
        returnOnCapitalEmployed: metrics.return_on_capital_employed,
        dividendYield: metrics.dividend_yield,
        dividendPerShare: metrics.dividend_per_share,
        dividendPayoutRatio: metrics.dividend_payout_ratio,
        beta: metrics.beta,
        fiftyTwoWeekHigh: metrics.fifty_two_week_high,
        fiftyTwoWeekLow: metrics.fifty_two_week_low,
        sharesOutstanding: metrics.shares_outstanding,
        floatShares: metrics.float_shares,
        reportPeriod: metrics.report_period as 'annual' | 'quarterly',
        fiscalYearEnd: metrics.fiscal_year_end
      };

      if (includeGrowthMetrics) {
        financialMetrics.revenueGrowthYOY = metrics.revenue_growth_yoy;
        financialMetrics.revenueGrowthQOQ = metrics.revenue_growth_qoq;
        financialMetrics.epsGrowthYOY = metrics.eps_growth_yoy;
        financialMetrics.epsGrowthQOQ = metrics.eps_growth_qoq;
      }

      return financialMetrics;
    } catch (error) {
      console.error(`Failed to fetch financial metrics for ${symbol}:`, error);
      throw error;
    }
  }

  async getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]> {
    try {
      const params: Record<string, string | undefined> = {
        symbol
      };

      if (startDate) {
        params.start_date = format(startDate, 'yyyy-MM-dd');
      }
      if (endDate) {
        params.end_date = format(endDate, 'yyyy-MM-dd');
      }

      const response = await this.makeRequest<{
        dividends: Array<{
          symbol: string;
          amount: number;
          ex_date: string;
          payment_date: string;
          record_date: string;
          declaration_date: string;
          currency: string;
        }>;
      }>('/fundamentals/dividends', params);

      return response.dividends.map(div => ({
        symbol: div.symbol,
        amount: div.amount,
        exDate: new Date(div.ex_date),
        paymentDate: new Date(div.payment_date),
        recordDate: new Date(div.record_date),
        declarationDate: div.declaration_date ? new Date(div.declaration_date) : undefined,
        currency: div.currency
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
      const params: Record<string, string | number | undefined> = {
        symbol,
        limit: options?.limit || 10
      };

      if (options?.startDate) {
        params.start_date = format(options.startDate, 'yyyy-MM-dd');
      }
      if (options?.endDate) {
        params.end_date = format(options.endDate, 'yyyy-MM-dd');
      }
      if (options?.includeFutureReports) {
        params.include_future = 'true';
      }

      const response = await this.makeRequest<{
        earnings: Array<{
          symbol: string;
          fiscal_date_ending: string;
          reported_date: string;
          reported_eps: number;
          estimated_eps: number;
          surprise: number;
          surprise_percentage: number;
          reported_revenue: number;
          estimated_revenue: number;
          revenue_surprise: number;
          revenue_surprise_percentage: number;
          period: string;
          year: number;
          is_future_report: boolean;
          time: string;
          currency: string;
        }>;
      }>('/fundamentals/earnings', params);

      return response.earnings.map(earning => ({
        symbol: earning.symbol,
        fiscalDateEnding: new Date(earning.fiscal_date_ending),
        reportedDate: new Date(earning.reported_date),
        reportedEPS: earning.reported_eps,
        estimatedEPS: earning.estimated_eps,
        surprise: earning.surprise,
        surprisePercentage: earning.surprise_percentage,
        reportedRevenue: earning.reported_revenue,
        estimatedRevenue: earning.estimated_revenue,
        revenueSurprise: earning.revenue_surprise,
        revenueSurprisePercentage: earning.revenue_surprise_percentage,
        period: earning.period as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY',
        year: earning.year,
        isFutureReport: earning.is_future_report,
        time: earning.time,
        currency: earning.currency
      }));
    } catch (error) {
      console.error(`Failed to fetch earnings for ${symbol}:`, error);
      throw error;
    }
  }

  async getUpcomingEarnings(
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    }
  ): Promise<EarningsReport[]> {
    try {
      const params: Record<string, string | number | undefined> = {
        limit: options?.limit || 100,
        start_date: format(options?.startDate || new Date(), 'yyyy-MM-dd'),
        end_date: format(options?.endDate || subMonths(new Date(), -3), 'yyyy-MM-dd')
      };

      if (options?.symbols && options.symbols.length > 0) {
        params.symbols = options.symbols.join(',');
      }

      const response = await this.makeRequest<{
        earnings: Array<{
          symbol: string;
          fiscal_date_ending: string;
          reported_date: string;
          estimated_eps: number;
          period: string;
          year: number;
          time: string;
          currency: string;
        }>;
      }>('/fundamentals/earnings/upcoming', params);

      return response.earnings.map(earning => ({
        symbol: earning.symbol,
        fiscalDateEnding: new Date(earning.fiscal_date_ending),
        reportedDate: new Date(earning.reported_date),
        reportedEPS: 0,
        estimatedEPS: earning.estimated_eps,
        period: earning.period as 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY',
        year: earning.year,
        isFutureReport: true,
        time: earning.time,
        currency: earning.currency
      }));
    } catch (error) {
      console.error('Failed to fetch upcoming earnings:', error);
      throw error;
    }
  }

  async searchSymbols(query: string): Promise<StockSymbol[]> {
    try {
      const response = await this.makeRequest<{
        results: Array<{
          symbol: string;
          name: string;
          currency: string;
          exchange: string;
          mic_code: string;
          country: string;
          type: string;
        }>;
      }>('/search/symbols', { query });

      return response.results.map(result => ({
        symbol: result.symbol,
        name: result.name,
        currency: result.currency,
        exchange: result.exchange,
        mic_code: result.mic_code,
        country: result.country,
        type: result.type
      }));
    } catch (error) {
      console.error('Failed to search symbols:', error);
      throw error;
    }
  }

  async getMarketNews(symbols?: string[], limit: number = 50): Promise<NewsArticle[]> {
    try {
      const params: Record<string, string | number | undefined> = {
        limit
      };

      if (symbols && symbols.length > 0) {
        params.symbols = symbols.join(',');
      }

      const response = await this.makeRequest<{
        news: Array<{
          id: string;
          source: string;
          title: string;
          summary: string;
          url: string;
          published_at: string;
          image_url?: string;
          related_symbols: string[];
        }>;
      }>('/news/market', params);

      return response.news.map(article => ({
        id: article.id,
        source: article.source,
        title: article.title,
        summary: article.summary,
        url: article.url,
        publishedAt: new Date(article.published_at),
        imageUrl: article.image_url,
        relatedSymbols: article.related_symbols
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
