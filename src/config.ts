/**
 * Configuration for the stock market data API clients
 */

export interface ApiProviderConfig {
  /** Provider name */
  name: string;
  /** Base URL for the API */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Whether this provider is enabled */
  enabled: boolean;
  /** Priority for fallback (lower number = higher priority) */
  priority: number;
  /** Rate limit in requests per minute */
  rateLimit: number;
  /** Whether this is a premium (paid) plan */
  isPremium: boolean;
  /** Supported features */
  features: {
    realtime: boolean;
    historical: boolean;
    fundamentals: boolean;
    news: boolean;
    forex: boolean;
    crypto: boolean;
    technicals: boolean;
  };
}

export type ProviderName = 
  | 'alphaVantage' 
  | 'polygon' 
  | 'finnhub' 
  | 'twelveData' 
  | 'iexCloud' 
  | 'marketStack' 
  | 'eodHistorical' 
  | 'eodhd'
  | 'financialModelingPrep' 
  | 'stooq' 
  | 'tradingEconomics' 
  | 'investing' 
  | 'econoDB' 
  | 'myMarketCalendar' 
  | 'quandl' 
  | 'benzinga' 
  | 'fred' 
  | 'worldTradingData' 
  | 'tiingo' 
  | 'alphaSense';

export interface StocksApiConfig {
  /** Default timeout for API requests in milliseconds */
  requestTimeout: number;
  /** Maximum number of retries for failed requests */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** List of API providers */
  providers: {
    alphaVantage?: ApiProviderConfig;
    polygon?: ApiProviderConfig;
    finnhub?: ApiProviderConfig;
    twelveData?: ApiProviderConfig;
    marketStack?: ApiProviderConfig;
    iexCloud?: ApiProviderConfig;
    eodHistorical?: ApiProviderConfig;
    eodhd?: ApiProviderConfig;
    financialModelingPrep?: ApiProviderConfig;
    stooq?: ApiProviderConfig;
    tradingEconomics?: ApiProviderConfig;
    investingCom?: ApiProviderConfig;
    econoDb?: ApiProviderConfig;
    marketCalendar?: ApiProviderConfig;
    quandl?: ApiProviderConfig;
    benzinga?: ApiProviderConfig;
    fred?: ApiProviderConfig;
    worldTradingData?: ApiProviderConfig;
    tiingo?: ApiProviderConfig;
    alphaSense?: ApiProviderConfig;
  };
}

/**
 * Default configuration with placeholders for API keys
 */
export const DEFAULT_CONFIG: StocksApiConfig = {
  requestTimeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  providers: {
    alphaVantage: {
      name: 'Alpha Vantage',
      baseUrl: 'https://www.alphavantage.co/query',
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
      enabled: true,
      priority: 1,
      rateLimit: 5, // Free tier: 5 requests per minute
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: false,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    // Other providers will be added with their specific configurations
    polygon: {
      name: 'Polygon.io',
      baseUrl: 'https://api.polygon.io',
      apiKey: process.env.POLYGON_API_KEY || '',
      enabled: true,
      priority: 2,
      rateLimit: 5, // Free tier: 5 requests per minute
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    finnhub: {
      name: 'Finnhub',
      baseUrl: 'https://finnhub.io/api/v1',
      apiKey: process.env.FINNHUB_API_KEY || '',
      enabled: true,
      priority: 3,
      rateLimit: 60, // Free tier: 60 requests per minute
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    twelveData: {
      name: 'Twelve Data',
      baseUrl: 'https://api.twelvedata.com',
      apiKey: process.env.TWELVE_DATA_API_KEY || '',
      enabled: true,
      priority: 4,
      rateLimit: 8, // Free tier: 8 requests per minute
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    marketStack: {
      name: 'Marketstack',
      baseUrl: 'http://api.marketstack.com/v1',
      apiKey: process.env.MARKETSTACK_API_KEY || '',
      enabled: true,
      priority: 5,
      rateLimit: 100, // Free tier: 100 requests per month
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: false, // Limited fundamental data
        news: false, // No news data
        forex: true,
        crypto: false,
        technicals: false
      }
    },
    eodhd: {
      name: 'EODHD',
      baseUrl: 'https://eodhd.com/api',
      apiKey: process.env.EODHD_API_KEY || '',
      enabled: true,
      priority: 6,
      rateLimit: 1000, // Free tier: 1000 requests per day
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    financialModelingPrep: {
      name: 'Financial Modeling Prep',
      baseUrl: 'https://financialmodelingprep.com/api/v3',
      apiKey: process.env.FINANCIAL_MODELING_PREP_API_KEY || '',
      enabled: true,
      priority: 7,
      rateLimit: 250, // Free tier: 250 requests per day
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: true,
        technicals: true
      }
    },
    // Additional providers will be added with their specific configurations
    tiingo: {
      name: 'Tiingo',
      baseUrl: 'https://api.tiingo.com',
      apiKey: process.env.TIINGO_API_KEY || '',
      enabled: true,
      priority: 8,
      rateLimit: 1000, // Free tier: 1000 requests per day
      isPremium: false,
      features: {
        realtime: true,
        historical: true,
        fundamentals: true,
        news: true,
        forex: true,
        crypto: false,
        technicals: false
      }
    },
  }
};

/**
 * Validates the configuration and returns a sanitized version
 */
export function validateConfig(config: Partial<StocksApiConfig> = {}): StocksApiConfig {
  const mergedConfig: StocksApiConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    providers: {
      ...DEFAULT_CONFIG.providers,
      ...(config.providers || {})
    }
  };

  // Disable providers without API keys
  Object.values(mergedConfig.providers).forEach(provider => {
    if (provider && !provider.apiKey) {
      console.warn(`API key not found for ${provider.name}. Disabling provider.`);
      provider.enabled = false;
    }
  });

  return mergedConfig;
}

/**
 * Get a list of enabled providers sorted by priority
 */
export function getEnabledProviders(config: StocksApiConfig): Array<ApiProviderConfig & { name: ProviderName }> {
  // Safely get all provider entries and filter out undefined values
  const providerEntries = Object.entries(config.providers) as [ProviderName, ApiProviderConfig | undefined][];
  
  return providerEntries
    .filter((entry): entry is [ProviderName, ApiProviderConfig] => {
      const provider = entry[1];
      return !!provider && provider.enabled === true;
    })
    .map(([name, provider]) => ({
      ...provider,
      // Ensure all required fields have default values
      baseUrl: provider.baseUrl || '',
      apiKey: provider.apiKey || '',
      enabled: provider.enabled !== false,
      priority: provider.priority || 0,
      rateLimit: provider.rateLimit || 0,
      isPremium: provider.isPremium || false,
      features: {
        realtime: provider.features?.realtime || false,
        historical: provider.features?.historical || false,
        fundamentals: provider.features?.fundamentals || false,
        news: provider.features?.news || false,
        forex: provider.features?.forex || false,
        crypto: provider.features?.crypto || false,
        technicals: provider.features?.technicals || false,
      },
      name
    }))
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
}
