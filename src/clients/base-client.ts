import { 
  StockApiClient, 
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
  BatchCompanyProfileResult,
  BatchResult
} from '../types';

/**
 * Base class for all stock API clients
 * Implements the StockApiClient interface with common functionality
 * This is like a template for connecting to any stock market API
 * It handles the boring stuff like:
 * Making HTTP requests to get data
 * Handling timeouts (when requests take too long)
 * Managing API keys
 * Converting dates and numbers to the right format
 */

export abstract class BaseStockApiClient implements StockApiClient {
  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly requestTimeout: number;

  constructor(apiKey: string, baseUrl: string, requestTimeout: number = 10000) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.requestTimeout = requestTimeout;
  }

  // Abstract methods that must be implemented by subclasses
  abstract getQuote(symbol: string): Promise<StockQuote>;
  
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    const result: BatchQuoteResult = {};
    
    // Process in parallel with a reasonable concurrency limit
    const BATCH_SIZE = 5; // Adjust based on API rate limits
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(symbol => 
        this.getQuote(symbol)
          .then(quote => ({
            success: true,
            data: quote,
            symbol
          } as BatchResult<StockQuote>))
          .catch(error => ({
            success: false,
            error,
            symbol
          } as BatchResult<StockQuote>))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to the final output
      batchResults.forEach(item => {
        result[item.symbol] = item;
      });
      
      // Add a small delay between batches to respect rate limits
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return result;
  }
  
  abstract getCompanyProfile(symbol: string): Promise<CompanyProfile>;
  
  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    const result: BatchCompanyProfileResult = {};
    
    // Process in parallel with a reasonable concurrency limit
    const BATCH_SIZE = 5; // Adjust based on API rate limits
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(symbol => 
        this.getCompanyProfile(symbol)
          .then(profile => ({
            success: true,
            data: profile,
            symbol
          } as BatchResult<CompanyProfile>))
          .catch(error => ({
            success: false,
            error,
            symbol
          } as BatchResult<CompanyProfile>))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to the final output
      batchResults.forEach(item => {
        result[item.symbol] = item;
      });
      
      // Add a small delay between batches to respect rate limits
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return result;
  }
  
  abstract getTimeSeries(
    symbol: string, 
    interval: TimeInterval,
    period?: number
  ): Promise<TimeSeriesPoint[]>;
  abstract getFinancialMetrics(symbol: string): Promise<FinancialMetrics>;
  abstract getDividends(symbol: string, startDate?: Date, endDate?: Date): Promise<Dividend[]>;
  abstract getEarnings(symbol: string, limit?: number): Promise<EarningsReport[]>;
  abstract searchSymbols(query: string): Promise<StockSymbol[]>;
  abstract getMarketNews(symbols?: string[], limit?: number): Promise<NewsArticle[]>;

  /**
   * Helper method to make HTTP requests
   */
  protected async makeRequest<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    // Add API key and format=json to all requests
    const searchParams = new URLSearchParams({
      ...params,
      apikey: this.apiKey,
      datatype: 'json',
    });
    
    url.search = searchParams.toString();
    
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
   * Helper method to convert date strings to Date objects
   */
  protected parseDate(dateString: string | Date): Date {
    return typeof dateString === 'string' ? new Date(dateString) : dateString;
  }
}
