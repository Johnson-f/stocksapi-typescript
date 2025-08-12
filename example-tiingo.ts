import { StocksApi } from './src/stocks-api';
import { StocksApiConfig } from './src/config';

/**
 * Example usage of the Tiingo provider
 * 
 * To use this example:
 * 1. Set your TIINGO_API_KEY environment variable
 * 2. Run: npm run example:tiingo
 */

async function main() {
  // Configuration with Tiingo enabled
  const config: StocksApiConfig = {
    providers: {
      tiingo: {
        name: 'Tiingo',
        baseUrl: 'https://api.tiingo.com',
        apiKey: process.env.TIINGO_API_KEY || '',
        enabled: true,
        priority: 1, // Set as primary provider
        rateLimit: 1000,
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
      }
    }
  };

  try {
    // Initialize the API with Tiingo configuration
    const api = new StocksApi(config);
    
    console.log('🔍 Fetching stock quote for AAPL...');
    const quote = await api.getQuote('AAPL');
    console.log('📊 Stock Quote:', {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      timestamp: quote.timestamp
    });

    console.log('\n🏢 Fetching company profile for AAPL...');
    const profile = await api.getCompanyProfile('AAPL');
    console.log('📋 Company Profile:', {
      name: profile.name,
      sector: profile.sector,
      industry: profile.industry,
      marketCap: profile.marketCap,
      employees: profile.employees
    });

    console.log('\n📈 Fetching historical data for AAPL (last 30 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const timeSeries = await api.getTimeSeries('AAPL', 'daily', undefined, startDate, endDate);
    console.log(`📊 Historical Data: ${timeSeries.length} data points`);
    if (timeSeries.length > 0) {
      console.log('Latest data point:', {
        date: timeSeries[0].timestamp,
        open: timeSeries[0].open,
        high: timeSeries[0].high,
        low: timeSeries[0].low,
        close: timeSeries[0].close,
        volume: timeSeries[0].volume
      });
    }

    console.log('\n💰 Fetching financial metrics for AAPL...');
    const financials = await api.getFinancialMetrics('AAPL');
    console.log('💹 Financial Metrics:', {
      marketCap: financials.marketCap,
      peRatio: financials.peRatio,
      eps: financials.eps,
      dividendYield: financials.dividendYield,
      beta: financials.beta
    });

    console.log('\n🔍 Searching for symbols containing "APPLE"...');
    const searchResults = await api.searchSymbols('APPLE');
    console.log('🔎 Search Results:', searchResults.map(s => ({
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange
    })));

    console.log('\n📰 Fetching market news...');
    const news = await api.getMarketNews(['AAPL'], 5);
    console.log('📰 Latest News:', news.map(article => ({
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main }; 