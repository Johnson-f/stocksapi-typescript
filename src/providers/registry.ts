import { 
    StockApiClient, 
    StockQuote, 
    CompanyProfile, 
    TimeSeriesPoint, 
    FinancialMetrics, 
    Dividend, 
    EarningsReport, 
    StockSymbol, 
    NewsArticle, 
    TimeInterval,
    BatchQuoteResult,
    BatchCompanyProfileResult
  } from '../types';
  import { FinnhubClient } from './finnhub';
import { TwelveDataClient } from './twelve-data';
import { MarketstackClient } from './marketstack';
import { EODHDClient } from './eodhd';
import { FinancialModelingPrepClient } from './financial-modeling-prep';
import { TiingoClient } from './tiingo';
  
  // Feature type defining all available API features
export type Feature = 
  | 'getQuote' 
  | 'getQuotes' 
  | 'getCompanyProfile' 
  | 'getCompanyProfiles' 
  | 'getTimeSeries' 
  | 'getFinancialMetrics' 
  | 'getDividends' 
  | 'getEarnings' 
  | 'searchSymbols' 
  | 'getMarketNews'
  | 'realtime'
  | 'fundamentals'
  | 'historical'
  | 'news';
  
import { StocksApiConfig, ProviderName, getEnabledProviders, ApiProviderConfig } from '../config';
  /**
   * Provider registry manages multiple API providers and handles fallback logic
   */
  export class ProviderRegistry {
    private providers: Partial<Record<ProviderName, StockApiClient>> = {};
    private providerPriorities: Partial<Record<ProviderName, number>> = {};
    private providerFeatures: Partial<Record<ProviderName, Record<Feature, boolean>>> = {};
    private config: StocksApiConfig;
  
    constructor(config: StocksApiConfig) {
      this.config = config;
    }
  
    /**
     * Register a new provider
     */
    registerProvider(name: ProviderName, provider: StockApiClient, priority: number = 10, config?: ApiProviderConfig): void {
      this.providers[name] = provider;
      this.providerPriorities[name] = priority;
      
      // Initialize provider features based on config or default to all true
      if (config) {
        this.providerFeatures[name] = {
          getQuote: config.features?.realtime || false,
          getQuotes: config.features?.realtime || false,
          getCompanyProfile: config.features?.fundamentals || false,
          getCompanyProfiles: config.features?.fundamentals || false,
          getTimeSeries: config.features?.historical || false,
          getFinancialMetrics: config.features?.fundamentals || false,
          getDividends: config.features?.fundamentals || false,
          getEarnings: config.features?.fundamentals || false,
          searchSymbols: true, // Most providers support this
          getMarketNews: config.features?.news || false,
          realtime: config.features?.realtime || false,
          fundamentals: config.features?.fundamentals || false,
          historical: config.features?.historical || false,
          news: config.features?.news || false
        } as Record<Feature, boolean>;
      } else {
        // Default to all features enabled
        this.providerFeatures[name] = {
          getQuote: true,
          getQuotes: true,
          getCompanyProfile: true,
          getCompanyProfiles: true,
          getTimeSeries: true,
          getFinancialMetrics: true,
          getDividends: true,
          getEarnings: true,
          searchSymbols: true,
          getMarketNews: true,
          realtime: true,
          fundamentals: true,
          historical: true,
          news: true
        } as Record<Feature, boolean>;
      }
    }
  
    /**
     * Get a provider by name
     */
    getProvider(name: ProviderName): StockApiClient | undefined {
      return this.providers[name];
    }
  
    /**
     * Get all registered providers
     */
    getAllProviders(): Partial<Record<ProviderName, StockApiClient>> {
      return { ...this.providers };
    }
  
    /**
     * Get the best available provider for a specific feature
     */
    private getBestProviderForFeature(feature: Feature): StockApiClient | null {
      const enabledProviders = getEnabledProviders(this.config);
      
      for (const providerConfig of enabledProviders) {
        const provider = this.providers[providerConfig.name];
        if (provider && this.providerFeatures[providerConfig.name]?.[feature]) {
          return provider;
        }
      }
      
      return null;
    }
  
    /**
     * Execute a function with fallback to other providers if the primary fails
     */
    async withFallback<T>(
      feature: Feature,
      callback: (provider: StockApiClient) => Promise<T | null | undefined>
    ): Promise<T> {
      const providers = this.getProvidersForFeature(feature);
  
      for (const provider of providers) {
        try {
          const result = await callback(provider);
          // Only return if result is truthy and not an empty object
          if (result !== null && result !== undefined && 
              (typeof result !== 'object' || Object.keys(result as object).length > 0)) {
            return result;
          }
        } catch (error) {
          console.warn(`Provider failed with error:`, error);
          continue; // Try next provider
        }
      }
  
      // If we get here, all providers failed
      throw new Error('All providers failed');
    }
  
    /**
     * Update provider priorities based on configuration
     */
    private updateProviderPriorities(): void {
      const enabledProviders = getEnabledProviders(this.config);
      this.providerPriorities = enabledProviders
        .sort((a, b) => a.priority - b.priority)
        .reduce((acc, p) => ({ ...acc, [p.name.toLowerCase() as ProviderName]: p.priority }), {});
    }
  
    /**
     * Get a list of providers that support a specific feature
     */
    getProvidersForFeature(feature: Feature): StockApiClient[] {
      return Object.entries(this.providerFeatures)
        .filter(([_, features]) => {
          return features?.[feature] === true;
        })
        .sort(([aName], [bName]) => (this.providerPriorities[aName as ProviderName] || 0) - (this.providerPriorities[bName as ProviderName] || 0))
        .map(([name]) => this.providers[name as ProviderName]!)
        .filter((provider): provider is StockApiClient => provider !== undefined);
    }
  
    /**
     * Export the Feature type for use in other modules
     */
    
  }