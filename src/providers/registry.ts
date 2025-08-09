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
  
  // Updated Feature type to match what's used in stocks-api.ts
  type Feature = 
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
    | 'realtime'      // Added for stocks-api.ts compatibility
    | 'fundamentals'  // Added for stocks-api.ts compatibility
    | 'historical'    // Added for stocks-api.ts compatibility
    | 'news';         // Added for stocks-api.ts compatibility
  
  import { StocksApiConfig, ProviderName, getEnabledProviders } from '../config';
  export { Feature };
  /**
   * Provider registry manages multiple API providers and handles fallback logic
   */
  export class ProviderRegistry {
    private providers: Partial<Record<ProviderName, StockApiClient>> = {};
    private providerPriorities: Partial<Record<ProviderName, number>> = {};
    private providerFeatures: Partial<Record<ProviderName, {
      getQuote: boolean;
      getQuotes: boolean;
      getCompanyProfile: boolean;
      getCompanyProfiles: boolean;
      getTimeSeries: boolean;
      getFinancialMetrics: boolean;
      getDividends: boolean;
      getEarnings: boolean;
      searchSymbols: boolean;
      getMarketNews: boolean;
      realtime: boolean;
      fundamentals: boolean;
      historical: boolean;
      news: boolean;
    }>> = {};
    private config: StocksApiConfig;
  
    constructor(config: StocksApiConfig) {
      this.config = config;
    }
  
    /**
     * Register a new provider
     */
    registerProvider(name: ProviderName, provider: StockApiClient): void {
      this.providers[name] = provider;
      this.providerPriorities[name] = this.providerPriorities[name] || 0;
      
      // Default all features to true for now - can be customized per provider
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
      };
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
    // In your ProviderRegistry class
async withFallback<T>(
    feature: Feature,
    callback: (provider: StockApiClient) => Promise<T>
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