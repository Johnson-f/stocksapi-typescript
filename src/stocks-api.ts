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
  BatchCompanyProfileResult
} from './types';

import { validateConfig, StocksApiConfig } from './config';
import { ProviderRegistry } from './providers';
import { AlphaVantageClient } from './providers/alpha-vantage';
import { PolygonIoClient } from './providers/polygon-io';

/**
 * The main StocksAPI class that provides a unified interface to multiple stock market data providers.
 * It automatically handles fallback to alternative providers if the primary one fails.
 * 
 * @example
 * ```typescript
 * // Basic usage with environment variables for API keys
 * const api = new StocksAPI({
 *   alphaVantage: { apiKey: process.env.ALPHA_VANTAGE_API_KEY },
 *   finnhub: { apiKey: process.env.FINNHUB_API_KEY }
 * });
 * 
 * // Get a stock quote with automatic fallback
 * const quote = await api.getQuote('AAPL');
 * ```
 */
export class StocksAPI implements StockApiClient {
  private registry: ProviderRegistry;
  private config: StocksApiConfig;

  /**
   * Create a new StocksAPI instance
   * @param config - Configuration object with API keys and provider settings
   */
  constructor(config: Partial<StocksApiConfig> = {}) {
    // Validate and merge with default config
    this.config = validateConfig(config);
    
    // Initialize provider registry
    this.registry = new ProviderRegistry(this.config);
    
    // Register all available providers
    this.initializeProviders();
  }
  
  /**
   * Initialize and register all configured providers
   */
  private initializeProviders(): void {
    const { providers } = this.config;
    
    // Register Alpha Vantage if configured
    if (providers.alphaVantage?.enabled) {
      this.registry.registerProvider(
        'alphaVantage',
        new AlphaVantageClient(
          providers.alphaVantage.apiKey,
          this.config.requestTimeout
        )
      );
    }
    
    // Register Polygon.io if configured
    if (providers.polygon?.enabled) {
      this.registry.registerProvider(
        'polygon',
        new PolygonIoClient(
          providers.polygon.apiKey,
          this.config.requestTimeout
        )
      );
    }
    
    // Register other providers here as they are implemented
    /*
    if (providers.finnhub?.enabled) {
      this.registry.registerProvider(
        'finnhub',
        new FinnhubClient(
          providers.finnhub.apiKey,
          this.config.requestTimeout
        )
      );
    }
    */
  }

  /**
   * Get a stock quote with automatic fallback to other providers if needed.
   * If the quote doesn't include a company name, it will be fetched from the company profile.
   * @param symbol - The stock symbol to get a quote for
   * @param includeCompanyName - Whether to include the company name in the response (default: true)
   * @returns A StockQuote object with the latest price and other market data
   * @throws {Error} If no provider can fulfill the request
   * 
   * @example
   * ```typescript
   * // Get a basic quote
   * const quote = await api.getQuote('AAPL');
   * console.log(`${quote.symbol} (${quote.companyName}): $${quote.price}`);
   * ```
   */
  async getQuote(symbol: string, includeCompanyName: boolean = true): Promise<StockQuote> {
    // First, get the quote data
    const result = await this.registry.withFallback('realtime', (provider) => 
      provider.getQuote(symbol)
    );
    
    if (!result) {
      throw new Error(`Could not fetch quote for symbol: ${symbol}`);
    }
    
    // If the quote already has a company name or we don't need to include it, return as is
    if (!includeCompanyName || result.companyName) {
      return result;
    }
    
    try {
      // Try to get the company profile to populate the company name
      const profile = await this.getCompanyProfile(symbol);
      if (profile && profile.name) {
        return {
          ...result,
          companyName: profile.name
        };
      }
    } catch (error) {
      // If we can't get the company profile, just return the quote without the name
      console.warn(`Could not fetch company name for ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return result;
  }

  /**
   * Get multiple stock quotes with fallback support
   */
  async getQuotes(symbols: string[]): Promise<BatchQuoteResult> {
    // Handle empty array case
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return Promise.resolve({});
    }

    // Get all providers that support realtime data
    const providers = this.registry.getProvidersForFeature('realtime');
    
    // Initialize results with all symbols as not found
    const results: BatchQuoteResult = {};
    for (const symbol of symbols) {
      results[symbol] = {
        success: false,
        symbol,
        error: new Error('No provider could fetch this symbol')
      };
    }
    
    // Try each provider to fill in missing data
    for (const provider of providers) {
      try {
        const providerResults = await provider.getQuotes(symbols);
        
        // Update results with successful fetches
        for (const [symbol, result] of Object.entries(providerResults)) {
          if (result.success && result.data) {
            results[symbol] = result;
          }
        }
        
        // Check if we have all the data we need
        const hasAllData = Object.values(results).every(r => r.success);
        if (hasAllData) {
          break;
        }
      } catch (error) {
        console.warn(`Error getting quotes from provider:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get company profile with fallback support
   * @throws {Error} If no provider can fulfill the request
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const result = await this.registry.withFallback('fundamentals', (provider) => 
      provider.getCompanyProfile(symbol)
    );
    
    if (!result) {
      throw new Error(`Could not fetch company profile for symbol: ${symbol}`);
    }
    
    return result;
  }

  /**
   * Get multiple company profiles with fallback support
   */
  async getCompanyProfiles(symbols: string[]): Promise<BatchCompanyProfileResult> {
    // Handle empty array case
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return Promise.resolve({});
    }

    const providers = this.registry.getProvidersForFeature('fundamentals');
    const results: BatchCompanyProfileResult = {};
    
    // Initialize results with all symbols as not found
    for (const symbol of symbols) {
      results[symbol] = {
        success: false,
        symbol,
        error: new Error('No provider could fetch this symbol')
      };
    }
    
    // Try each provider to fill in missing data
    for (const provider of providers) {
      try {
        const providerResults = await provider.getCompanyProfiles(symbols);
        
        // Update results with successful fetches
        for (const [symbol, result] of Object.entries(providerResults)) {
          if (result.success && result.data) {
            results[symbol] = result;
          }
        }
        
        // Check if we have all the data we need
        const hasAllData = Object.values(results).every(r => r.success);
        if (hasAllData) {
          break;
        }
      } catch (error) {
        console.warn(`Error getting company profiles from provider:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get time series data with fallback support
   * @throws {Error} If no provider can fulfill the request
   */
  async getTimeSeries(
    symbol: string, 
    interval: TimeInterval,
    period: number = 100
  ): Promise<TimeSeriesPoint[]> {
    // Determine which feature to use based on interval
    const isIntraday = [
      '1m', '5m', '15m', '30m', '1h'
    ].includes(interval);
    
    const feature = isIntraday ? 'realtime' : 'historical';
    
    const result = await this.registry.withFallback(feature, (provider) => 
      provider.getTimeSeries(symbol, interval, period)
    );
    
    if (!result) {
      throw new Error(`Could not fetch time series data for symbol: ${symbol}`);
    }
    
    return result;
  }

  /**
   * Get financial metrics with fallback support
   * @throws {Error} If no provider can fulfill the request
   */
  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics> {
    const result = await this.registry.withFallback('fundamentals', (provider) => 
      provider.getFinancialMetrics(symbol)
    );
    
    if (!result) {
      throw new Error(`Could not fetch financial metrics for symbol: ${symbol}`);
    }
    
    return result;
  }

  /**
   * Get dividend history with fallback support
   * @returns Array of dividends, or empty array if none found
   */
  async getDividends(
    symbol: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Dividend[]> {
    try {
      const result = await this.registry.withFallback('fundamentals', (provider) => 
        provider.getDividends(symbol, startDate, endDate)
      );
      
      return result || [];
    } catch (error) {
      console.warn(`Error fetching dividends for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get earnings reports with fallback support
   * @param symbol Stock symbol to get earnings for
   * @param optionsOrLimit Either a number limit or options object
   * @param optionsOrLimit.limit Maximum number of reports to return (default: 4)
   * @param optionsOrLimit.includeFutureReports Whether to include future/upcoming earnings reports (default: false)
   * @param optionsOrLimit.startDate Optional start date to filter reports
   * @param optionsOrLimit.endDate Optional end date to filter reports
   * @returns Array of earnings reports, or empty array if none found
   */
  async getEarnings(
    symbol: string, 
    optionsOrLimit?: number | {
      limit?: number;
      includeFutureReports?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<EarningsReport[]> {
    try {
      // Handle both signatures: (symbol, limit) and (symbol, options)
      const options = typeof optionsOrLimit === 'number' 
        ? { limit: optionsOrLimit }
        : optionsOrLimit || {};
      
      const result = await this.registry.withFallback('fundamentals', (provider) => 
        provider.getEarnings(symbol, options)
      );
      
      return result || [];
    } catch (error) {
      console.warn(`Error fetching earnings for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get upcoming earnings reports for multiple stocks
   * @param options Options for fetching upcoming earnings
   * @param options.limit Maximum number of reports to return (default: 50)
   * @param options.startDate Start date for filtering (default: today)
   * @param options.endDate End date for filtering (default: 3 months from now)
   * @param options.symbols Array of symbols to filter by (if not provided, returns all stocks)
   * @returns Array of upcoming earnings reports, or empty array if none found
   */
  async getUpcomingEarnings(
    options: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      symbols?: string[];
    } = {}
  ): Promise<EarningsReport[]> {
    try {
      const result = await this.registry.withFallback('fundamentals', (provider) => 
        provider.getUpcomingEarnings(options)
      );
      
      return result || [];
    } catch (error) {
      console.warn('Error fetching upcoming earnings:', error);
      return [];
    }
  }

  /**
   * Search for stock symbols with fallback support
   * @returns Array of stock symbols, or empty array if none found
   */
  async searchSymbols(query: string): Promise<StockSymbol[]> {
    try {
      const result = await this.registry.withFallback('fundamentals', (provider) => 
        provider.searchSymbols(query)
      );
      
      return result || [];
    } catch (error) {
      console.warn(`Error searching for symbols with query "${query}":`, error);
      return [];
    }
  }

  /**
   * Get market news with fallback support
   * @param symbols - Array of symbols to filter news by (optional)
   * @param limit - Maximum number of news articles to return (default: 10)
   * @returns Array of news articles, or empty array if none found
   */
  async getMarketNews(
    symbols: string[] = [], 
    limit: number = 10
  ): Promise<NewsArticle[]> {
    try {
      const result = await this.registry.withFallback('news', (provider) => 
        provider.getMarketNews(symbols, limit)
      );
      
      return result || [];
    } catch (error) {
      console.warn('No news providers available or all failed:', error);
      return [];
    }
  }
  
  /**
   * Get the list of enabled providers
   */
  getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config?.enabled)
      .map(([name]) => name);
  }
}

// Re-export types and config for convenience
export * from './types';
export * from './config';

// Export provider implementations
export * from './providers';
