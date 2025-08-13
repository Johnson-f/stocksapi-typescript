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
 * EODHD API client implementation
 * Documentation: https://eodhd.com/
 */
export class EODHDClient extends BaseStockApiClient {
  protected readonly baseUrl: string;

  constructor(apiKey: string, requestTimeout: number = 30000) {
    const baseUrl = 'https://eodhd.com/api';
    super(apiKey, baseUrl, requestTimeout);
    this.baseUrl = baseUrl;
  }

  // Helper method to make API requests with error handling
  protected async makeRequest<T>(
    endpoint: string, 
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    try {
      const cleanParams: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          cleanParams[key] = String(value);
        }
      }
      
      cleanParams.api_token = this.apiKey;
      
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
      
      console.error(`EODHD API request failed: ${errorMessage}`, { endpoint, params });
      throw new Error(`Failed to fetch data from EODHD: ${errorMessage}`);
    }
  }

  async getQuote(symbol: string, includeHistorical: boolean = true): Promise<StockQuote> {
    try {
      const quoteData = await this.makeRequest<{
        code: string;
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        previousClose: number;
        change: number;
        change_p: number;
        name?: string;
        exchange?: string;
        currency?: string;
      }>('/real-time/' + symbol, { fmt: 'json' });

      const timestamp = new Date(quoteData.timestamp * 1000);
      
      const quote: StockQuote = {
        symbol: quoteData.code,
        price: quoteData.close,
        change: quoteData.change,
        changePercent: quoteData.change_p,
        timestamp,
        volume: quoteData.volume,
        high: quoteData.high,
        low: quoteData.low,
        open: quoteData.open,
        previousClose: quoteData.previousClose,
      };

      if (includeHistorical) {
        try {
          const oneYearAgo = subYears(new Date(), 1);
          const historicalData = await this.getTimeSeries(symbol, 'daily', 365, oneYearAgo, new Date());
          const volumeMetrics = this.calculateVolumeMetrics(historicalData);
          const performance = this.calculatePerformanceMetrics(historicalData, quote.price, timestamp);
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
        results[symbol] = { success: true, data: quote, symbol: quote.symbol };
      } catch (error) {
        results[symbol] = { success: false, error: error as Error, symbol };
      }
    }
    
    return results;
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    try {
      const fundamentalData = await this.makeRequest<{
        General: {
          Code: string;
          Name: string;
          Exchange: string;
          CurrencyCode: string;
          Sector: string;
          Industry: string;
          Description: string;
          WebURL: string;
          LogoURL: string;
          FullTimeEmployees: number;
          UpdatedAt: string;
        };
        Highlights: {
          MarketCapitalization: number;
          DividendShare: number;
          DividendYield: number;
          PERatio: number;
          PEGRatio: number;
          EarningsShare: number;
        };
        SharesStats: {
          SharesOutstanding: number;
          SharesFloat: number;
        };
      }>('/fundamentals/' + symbol, { fmt: 'json' });

      const general = fundamentalData.General;
      const highlights = fundamentalData.Highlights;
      const sharesStats = fundamentalData.SharesStats;
      
      return {
        symbol: general.Code,
        name: general.Name,
        description: general.Description,
        exchange: general.Exchange,
        currency: general.CurrencyCode,
        sector: general.Sector,
        industry: general.Industry,
        website: general.WebURL,
        logo: general.LogoURL,
        marketCap: highlights.MarketCapitalization,
        employees: general.FullTimeEmployees,
        lastUpdated: new Date(general.UpdatedAt),
        sharesOutstanding: sharesStats.SharesOutstanding,
        floatShares: sharesStats.SharesFloat,
        dividendPerShare: highlights.DividendShare,
        dividendYield: highlights.DividendYield,
        peRatio: highlights.PERatio,
        eps: highlights.EarningsShare,
      };
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
        results[symbol] = { success: true, data: profile, symbol: profile.symbol };
      } catch (error) {
        results[symbol] = { success: false, error: error as Error, symbol };
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
      const intervalMap: Record<string, string> = {
        '1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m', '60min': '1h',
        '1d': 'd', 'daily': 'd', 'weekly': 'w', 'monthly': 'm'
      };

      const mappedInterval = intervalMap[interval] || 'd';
      
      let from: string;
      if (startDate) {
        from = startDate.toISOString().split('T')[0];
      } else {
        const fromDate = subDays(endDate, period);
        from = fromDate.toISOString().split('T')[0];
      }
      
      const to = endDate.toISOString().split('T')[0];

      const data = await this.makeRequest<Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>>('/eod/' + symbol, {
        from: from,
        to: to,
        period: mappedInterval,
        fmt: 'json'
      });

      return data.map(value => ({
        timestamp: new Date(value.date),
        open: value.open,
        high: value.high,
        low: value.low,
        close: value.close,
        volume: value.volume
      }));
    } catch (error) {
      console.error(`Failed to fetch time series data for ${symbol}:`, error);
      throw error;
    }
  }

  async getFinancialMetrics(
    symbol: string, 
    asOfDate?: Date,
    period: 'annual' | 'quarterly' | 'ttm' = 'annual',
    includeGrowthMetrics: boolean = true
  ): Promise<FinancialMetrics> {
    try {
      const fundamentalData = await this.makeRequest<{
        General: { Code: string; UpdatedAt: string; };
        Highlights: {
          MarketCapitalization: number;
          EBITDA: number;
          PERatio: number;
          PEGRatio: number;
          DividendShare: number;
          DividendYield: number;
          EarningsShare: number;
          ProfitMargin: number;
          OperatingMarginTTM: number;
          ReturnOnAssetsTTM: number;
          ReturnOnEquityTTM: number;
          RevenueTTM: number;
          GrossProfitTTM: number;
        };
        Valuation: {
          TrailingPE: number;
          ForwardPE: number;
          PriceBookMRQ: number;
          EnterpriseValueEbitda: number;
        };
        Technicals: {
          Beta: number;
          FiftyTwoWeekHigh: number;
          FiftyTwoWeekLow: number;
        };
        SharesStats: {
          SharesOutstanding: number;
          SharesFloat: number;
        };
      }>('/fundamentals/' + symbol, { fmt: 'json' });

      const highlights = fundamentalData.Highlights;
      const valuation = fundamentalData.Valuation;
      const technicals = fundamentalData.Technicals;
      const sharesStats = fundamentalData.SharesStats;

      return {
        symbol: fundamentalData.General.Code,
        asOfDate: asOfDate || new Date(fundamentalData.General.UpdatedAt),
        marketCap: highlights.MarketCapitalization,
        peRatio: highlights.PERatio,
        forwardPERatio: valuation.ForwardPE,
        pegRatio: highlights.PEGRatio,
        eps: highlights.EarningsShare,
        priceToBookRatio: valuation.PriceBookMRQ,
        evToEbitda: valuation.EnterpriseValueEbitda,
        revenue: highlights.RevenueTTM,
        grossProfit: highlights.GrossProfitTTM,
        operatingIncome: highlights.EBITDA,
        netIncome: highlights.RevenueTTM * highlights.ProfitMargin,
        ebitda: highlights.EBITDA,
        grossMargin: highlights.GrossProfitTTM / highlights.RevenueTTM,
        operatingMargin: highlights.OperatingMarginTTM,
        profitMargin: highlights.ProfitMargin,
        returnOnEquity: highlights.ReturnOnEquityTTM,
        returnOnAssets: highlights.ReturnOnAssetsTTM,
        dividendYield: highlights.DividendYield,
        dividendPerShare: highlights.DividendShare,
        beta: technicals.Beta,
        fiftyTwoWeekHigh: technicals.FiftyTwoWeekHigh,
        fiftyTwoWeekLow: technicals.FiftyTwoWeekLow,
        sharesOutstanding: sharesStats.SharesOutstanding,
        floatShares: sharesStats.SharesFloat,
        reportPeriod: period === 'ttm' ? 'annual' : period,
        fiscalYearEnd: '12-31'
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
        date: string;
        value: number;
        currency: string;
      }>>('/div/' + symbol, {
        from: from,
        to: to,
        fmt: 'json'
      });

      return dividends.map(d => ({
        symbol: symbol,
        amount: d.value,
        exDate: new Date(d.date),
        paymentDate: new Date(d.date),
        recordDate: new Date(d.date),
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
      const from = options?.startDate ? options.startDate.toISOString().split('T')[0] : undefined;
      const to = options?.endDate ? options.endDate.toISOString().split('T')[0] : undefined;
      
      const earnings = await this.makeRequest<Array<{
        date: string;
        time: string;
        epsActual: number;
        epsEstimate: number;
        epsDifference: number;
        surprisePercent: number;
        revenueActual: number;
        revenueEstimate: number;
        revenueDifference: number;
        revenueSurprisePercent: number;
      }>>('/earnings/' + symbol, {
        from: from,
        to: to,
        fmt: 'json'
      });

      return earnings.map(e => {
        const date = new Date(e.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        let period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
        
        if (month <= 3) period = 'Q1';
        else if (month <= 6) period = 'Q2';
        else if (month <= 9) period = 'Q3';
        else period = 'Q4';

        return {
          symbol: symbol,
          fiscalDateEnding: date,
          reportedDate: date,
          reportedEPS: e.epsActual,
          estimatedEPS: e.epsEstimate,
          surprise: e.epsDifference,
          surprisePercentage: e.surprisePercent,
          reportedRevenue: e.revenueActual,
          estimatedRevenue: e.revenueEstimate,
          revenueSurprise: e.revenueDifference,
          revenueSurprisePercentage: e.revenueSurprisePercent,
          period,
          year,
          time: e.time,
          currency: 'USD'
        };
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
      const from = options.startDate ? options.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const to = options.endDate ? options.endDate.toISOString().split('T')[0] : subMonths(new Date(), -3).toISOString().split('T')[0];
      
      const earnings = await this.makeRequest<Array<{
        code: string;
        date: string;
        time: string;
        epsEstimate: number;
        revenueEstimate: number;
      }>>('/calendar/earnings', {
        from: from,
        to: to,
        symbols: options.symbols?.join(','),
        fmt: 'json'
      });

      return earnings.map(e => {
        const date = new Date(e.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        let period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'FY';
        
        if (month <= 3) period = 'Q1';
        else if (month <= 6) period = 'Q2';
        else if (month <= 9) period = 'Q3';
        else period = 'Q4';

        return {
          symbol: e.code,
          fiscalDateEnding: date,
          reportedDate: date,
          reportedEPS: 0, // Not available for future reports
          estimatedEPS: e.epsEstimate,
          estimatedRevenue: e.revenueEstimate,
          period,
          year,
          time: e.time,
          isFutureReport: true,
          currency: 'USD'
        };
      });
    } catch (error) {
      console.error(`Failed to fetch upcoming earnings:`, error);
      throw error;
    }
  }

  async searchSymbols(query: string): Promise<StockSymbol[]> {
    try {
      const results = await this.makeRequest<Array<{
        Code: string;
        Name: string;
        Exchange: string;
        CurrencyCode: string;
        CountryName: string;
        Type: string;
      }>>('/search/' + query, { fmt: 'json' });

      return results.map(r => ({
        symbol: r.Code,
        name: r.Name,
        currency: r.CurrencyCode,
        exchange: r.Exchange,
        country: r.CountryName,
        type: r.Type
      }));
    } catch (error) {
      console.error(`Failed to search symbols for query "${query}":`, error);
      throw error;
    }
  }

  async getMarketNews(symbols: string[] = [], limit: number = 10): Promise<NewsArticle[]> {
    try {
      const news = await this.makeRequest<Array<{
        date: string;
        title: string;
        text: string;
        url: string;
        symbols: string;
        source: string;
        uuid: string;
      }>>('/news', {
        s: symbols.join(','),
        limit: limit,
        fmt: 'json'
      });

      return news.map(n => ({
        id: n.uuid,
        source: n.source,
        title: n.title,
        summary: n.text,
        url: n.url,
        publishedAt: new Date(n.date),
        relatedSymbols: n.symbols ? n.symbols.split(',').map(s => s.trim()) : []
      }));
    } catch (error) {
      console.error(`Failed to fetch market news:`, error);
      throw error;
    }
  }

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
   * EODHD doesn't support economic events - return empty array
   */
  async getEconomicEvents(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic events are not supported by EODHD');
    return [];
  }

  /**
   * EODHD doesn't support economic calendar - return empty array
   */
  async getEconomicCalendar(): Promise<import('../types').EconomicCalendarEntry[]> {
    console.warn('Economic calendar is not supported by EODHD');
    return [];
  }

  /**
   * EODHD doesn't support economic indicators - return empty array
   */
  async getEconomicIndicator(): Promise<import('../types').EconomicEvent[]> {
    console.warn('Economic indicators are not supported by EODHD');
    return [];
  }
}
