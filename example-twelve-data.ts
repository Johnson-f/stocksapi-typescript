import { StocksAPI } from './src/index';

/**
 * Example usage of the Twelve Data provider
 * 
 * To use this example:
 * 1. Set your Twelve Data API key as an environment variable: TWELVE_DATA_API_KEY
 * 2. Run: npm run build && node dist/example-twelve-data.js
 */

async function exampleTwelveData() {
  try {
    // Initialize the API with Twelve Data configuration
    const api = new StocksAPI({
      twelveData: {
        apiKey: process.env.TWELVE_DATA_API_KEY || 'your-api-key-here',
        enabled: true,
        priority: 1, // High priority
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
      }
    });

    console.log('🔍 Fetching stock quote for AAPL...');
    const quote = await api.getQuote('AAPL');
    console.log('📈 Quote:', {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      high: quote.high,
      low: quote.low,
      open: quote.open,
      previousClose: quote.previousClose
    });

    console.log('\n🏢 Fetching company profile for AAPL...');
    const profile = await api.getCompanyProfile('AAPL');
    console.log('📋 Profile:', {
      symbol: profile.symbol,
      name: profile.name,
      exchange: profile.exchange,
      sector: profile.sector,
      industry: profile.industry,
      marketCap: profile.marketCap,
      website: profile.website
    });

    console.log('\n📊 Fetching time series data for AAPL (last 5 days)...');
    const timeSeries = await api.getTimeSeries('AAPL', 'daily', 5);
    console.log('📈 Time Series (last 5 days):', timeSeries.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume
    })));

    console.log('\n💰 Fetching financial metrics for AAPL...');
    const metrics = await api.getFinancialMetrics('AAPL');
    console.log('📊 Financial Metrics:', {
      symbol: metrics.symbol,
      marketCap: metrics.marketCap,
      peRatio: metrics.peRatio,
      dividendYield: metrics.dividendYield,
      beta: metrics.beta,
      fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: metrics.fiftyTwoWeekLow
    });

    console.log('\n🔍 Searching for symbols containing "apple"...');
    const searchResults = await api.searchSymbols('apple');
    console.log('🔎 Search Results:', searchResults.slice(0, 3).map(result => ({
      symbol: result.symbol,
      name: result.name,
      exchange: result.exchange,
      currency: result.currency
    })));

    console.log('\n📰 Fetching market news...');
    const news = await api.getMarketNews(['AAPL'], 3);
    console.log('📰 Market News:', news.map(article => ({
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt.toISOString().split('T')[0],
      url: article.url
    })));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleTwelveData();
}

export { exampleTwelveData }; 