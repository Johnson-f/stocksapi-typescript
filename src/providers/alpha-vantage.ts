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
  async getQuote(symbol: string): Promise<StockQuote> {
    const data = await this.makeRequest<Record<string, any>>(this.baseQuoteUrl, {
      function: 'GLOBAL_QUOTE',
      symbol,
      apikey: this.apiKey
    });

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('Invalid response format from Alpha Vantage');
    }

    return this.mapQuote(quote, symbol);
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
   * Get company profile information
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const data = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
      function: 'OVERVIEW',
      symbol,
      apikey: this.apiKey
    });

    return this.mapCompanyProfile(data);
  }

  /**
   * Get multiple company profiles
   */
  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const results: BatchCompanyProfileResult = {};
    
    for (const symbol of symbols) {
      try {
        const profile = await this.getCompanyProfile(symbol);
        results[symbol] = {
          success: true,
          data: profile,
          symbol: profile.symbol // Ensure symbol is included in the result
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
   * Get time series data for a symbol
   */
  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval = 'daily',
    period: number = 100
  ): Promise<TimeSeriesPoint[]> {
    let functionName: string;
    
    // Map our interval to Alpha Vantage's function names
    switch (interval) {
      case '1min':
        functionName = 'TIME_SERIES_INTRADAY&interval=1min';
        break;
      case '5min':
        functionName = 'TIME_SERIES_INTRADAY&interval=5min';
        break;
      case '15min':
        functionName = 'TIME_SERIES_INTRADAY&interval=15min';
        break;
      case '30min':
        functionName = 'TIME_SERIES_INTRADAY&interval=30min';
        break;
      case '60min':
        functionName = 'TIME_SERIES_INTRADAY&interval=60min';
        break;
      case 'daily':
        functionName = 'TIME_SERIES_DAILY';
        break;
      case 'weekly':
        functionName = 'TIME_SERIES_WEEKLY';
        break;
      case 'monthly':
        functionName = 'TIME_SERIES_MONTHLY';
        break;
      default:
        throw new Error(`Unsupported interval: ${interval}`);
    }

    const data = await this.makeRequest<Record<string, any>>(this.baseUrl, {
      function: functionName,
      symbol,
      outputsize: period > 100 ? 'full' : 'compact',
      apikey: this.apiKey
    });

    return this.mapTimeSeries(data, interval);
  }

  /**
   * Get financial metrics for a company
   */
  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics> {
    const [overview, income] = await Promise.all([
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'OVERVIEW',
        symbol,
        apikey: this.apiKey
      }),
      this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
        function: 'INCOME_STATEMENT',
        symbol,
        apikey: this.apiKey
      })
    ]);

    return this.mapFinancialMetrics(overview, income);
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
  async getEarnings(symbol: string, limit: number = 4): Promise<EarningsReport[]> {
    const data = await this.makeRequest<Record<string, any>>(this.baseFundamentalUrl, {
      function: 'EARNINGS',
      symbol,
      apikey: this.apiKey
    });

    return this.mapEarnings(data, symbol).slice(0, limit);
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
  
  private mapQuote(data: Record<string, string>, symbol: string): StockQuote {
    // Extract the company name from the data if available (some providers might include it)
    // For Alpha Vantage, we don't get the company name in the quote response,
    // so we'll leave it undefined. The StocksAPI class can fetch it separately if needed.
    return {
      symbol,
      companyName: undefined, // Will be populated by the StocksAPI class if needed
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      timestamp: new Date(data['07. latest trading day']),
      volume: parseInt(data['06. volume'], 10),
      open: parseFloat(data['02. open']),
      high: parseFloat(data['03. high']),
      low: parseFloat(data['04. low']),
      previousClose: parseFloat(data['08. previous close'])
    };
  };

  private mapCompanyProfile(data: Record<string, any>): CompanyProfile {
    // Ensure required fields have defaults
    const result: CompanyProfile = {
      symbol: data['Symbol'] || '',
      name: data['Name'] || '',
      description: data['Description'] || '',
      exchange: data['Exchange'] || '',
      currency: data['Currency'] || 'USD',
      sector: data['Sector'] || undefined,
      industry: data['Industry'] || undefined,
      website: data['Website'] || undefined,
      // Alpha Vantage doesn't provide logo URLs
      logo: undefined,
      employees: data['FullTimeEmployees'] ? parseInt(data['FullTimeEmployees'], 10) : undefined,
      marketCap: data['MarketCapitalization'] ? parseFloat(data['MarketCapitalization']) * 1000000 : undefined
      // Note: peRatio, dividendYield, and beta were removed as they're not part of the CompanyProfile interface
      // Consider adding them to FinancialMetrics if needed
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
    income: Record<string, any>
  ): FinancialMetrics {
    const latestIncome = income.quarterlyReports?.[0] || income.annualReports?.[0] || {};
    
    return {
      symbol: overview['Symbol'],
      marketCap: parseFloat(overview['MarketCapitalization']) * 1000000, // Convert from millions to units
      peRatio: parseFloat(overview['PERatio']) || undefined,
      pegRatio: parseFloat(overview['PEGRatio']) || undefined,
      eps: parseFloat(overview['EPS']) || undefined,
      revenue: parseFloat(latestIncome['totalRevenue']) || undefined,
      profitMargin: parseFloat(overview['ProfitMargin']) || undefined,
      dividendYield: parseFloat(overview['DividendYield']) || undefined,
      beta: parseFloat(overview['Beta']) || undefined,
      fiftyTwoWeekHigh: parseFloat(overview['52WeekHigh']) || undefined,
      fiftyTwoWeekLow: parseFloat(overview['52WeekLow']) || undefined
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
    
    return quarterlyEarnings.map((earning: any) => ({
      symbol,
      fiscalDateEnding: new Date(earning.fiscalDateEnding),
      reportedDate: new Date(earning.reportedDate),
      reportedEPS: parseFloat(earning.reportedEPS),
      estimatedEPS: parseFloat(earning.estimatedEPS) || undefined,
      surprise: parseFloat(earning.surprise) || undefined,
      surprisePercentage: parseFloat(earning.surprisePercentage) || undefined,
      period: earning.fiscalDateEnding.split('-')[1] === '12-31' ? 'Q4' : 
              earning.fiscalDateEnding.split('-')[1] === '09-30' ? 'Q3' :
              earning.fiscalDateEnding.split('-')[1] === '06-30' ? 'Q2' : 'Q1',
      year: new Date(earning.fiscalDateEnding).getFullYear()
    }));
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
}
