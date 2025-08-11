import { AlphaVantageClient } from '../src/providers/alpha-vantage';
import { TimeInterval } from '../src/types';

describe('AlphaVantageClient', () => {
  let client: AlphaVantageClient;
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'test-api-key';

  beforeEach(() => {
    client = new AlphaVantageClient(apiKey);
    
    // Mock the makeRequest method to avoid actual API calls during tests
    jest.spyOn(client as any, 'makeRequest').mockImplementation(async () => ({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should fetch a stock quote with historical data', async () => {
      const mockQuote = {
        'Global Quote': {
          '01. symbol': 'AAPL',
          '02. open': '150.5000',
          '03. high': '151.2500',
          '04. low': '149.7500',
          '05. price': '151.0000',
          '06. volume': '1000000',
          '07. latest trading day': '2023-05-15',
          '08. previous close': '149.2500',
          '09. change': '1.7500',
          '10. change percent': '1.17%'
        }
      };

      const mockTimeSeries = {
        'Time Series (Daily)': {
          '2023-05-15': {
            '1. open': '150.5000',
            '2. high': '151.2500',
            '3. low': '149.7500',
            '4. close': '151.0000',
            '5. volume': '1000000'
          },
          '2023-05-14': {
            '1. open': '149.0000',
            '2. high': '150.0000',
            '3. low': '148.5000',
            '4. close': '149.2500',
            '5. volume': '950000'
          }
        }
      };

      (client as any).makeRequest
        .mockResolvedValueOnce(mockQuote) // First call for current quote
        .mockResolvedValueOnce(mockTimeSeries); // Second call for historical data

      const quote = await client.getQuote('AAPL', true);
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(151.00);
      expect(quote.change).toBe(1.75);
      expect(quote.changePercent).toBe(1.17);
      expect(quote.volume).toBe(1000000);
      expect(quote.volumeMetrics).toBeDefined();
      expect(quote.performance).toBeDefined();
    });
  });

  describe('getQuotes', () => {
    it('should fetch multiple stock quotes', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Mock responses for each symbol - NEED 2 CALLS PER SYMBOL (quote + time series)
      symbols.forEach(symbol => {
        // First call: Global Quote
        (client as any).makeRequest
          .mockResolvedValueOnce({
            'Global Quote': {
              '01. symbol': symbol,
              '05. price': '150.00',
              '09. change': '1.00',
              '10. change percent': '0.67%',
              '06. volume': '1000000',
              '02. open': '149.50',
              '03. high': '151.25',
              '04. low': '149.25',
              '08. previous close': '149.00'
            }
          })
          // Second call: Time Series for historical data
          .mockResolvedValueOnce({
            'Time Series (Daily)': {
              '2023-05-15': {
                '1. open': '150.5000',
                '2. high': '151.2500',
                '3. low': '149.7500',
                '4. close': '151.0000',
                '5. volume': '1000000'
              }
            }
          });
      });

      const quotes = await client.getQuotes(symbols);
      
      expect(Object.keys(quotes)).toHaveLength(3);
      expect(quotes['AAPL']).toBeDefined();
      expect(quotes['AAPL']?.data?.price).toBe(150);
      expect(quotes['MSFT']?.data?.price).toBe(150);
      expect(quotes['GOOGL']?.data?.price).toBe(150);
    });
  });

  describe('getCompanyProfile', () => {
    it('should fetch company profile data', async () => {
      const mockProfile = {
        Symbol: 'AAPL',
        AssetType: 'Common Stock',
        Name: 'Apple Inc',
        Description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        Exchange: 'NASDAQ',
        Currency: 'USD',
        Country: 'United States',
        Sector: 'Technology',
        Industry: 'Consumer Electronics',
        Address: 'One Apple Park Way, Cupertino, CA, United States, 95014',
        FullTimeEmployees: '154000',
        MarketCapitalization: '2500000000000',
        EBITDA: '123456789000',
        PERatio: '28.5',
        PEGRatio: '2.5',
        BookValue: '4.50',
        DividendPerShare: '0.88',
        DividendYield: '0.0058',
        EPS: '5.67',
        RevenueTTM: '394328000000',
        ProfitMargin: '0.258',
        ReturnOnAssetsTTM: '0.20',
        ReturnOnEquityTTM: '1.45',
        RevenuePerShareTTM: '23.45',
        QuarterlyEarningsGrowthYOY: '0.12',
        QuarterlyRevenueGrowthYOY: '0.11',
        AnalystTargetPrice: '175.00',
        TrailingPE: '28.5',
        ForwardPE: '25.3',
        PriceToSalesRatioTTM: '7.5',
        PriceToBookRatio: '35.2',
        EVToRevenue: '6.8',
        EVToEBITDA: '20.3',
        Beta: '1.2',
        '52WeekHigh': '182.94',
        '52WeekLow': '124.17',
        '50DayMovingAverage': '165.42',
        '200DayMovingAverage': '150.75',
        SharesOutstanding: '16406400000',
        DividendDate: '2023-05-18',
        ExDividendDate: '2023-05-12'
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);

      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc');
      expect(profile.description).toContain('Apple Inc. designs');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.sector).toBe('Technology');
      expect(profile.employees).toBe(154000);
      expect(profile.marketCap).toBe(2500000000000); // Changed from string to number
    });
  });

  describe('getTimeSeries', () => {
    it('should fetch time series data', async () => {
      const mockTimeSeries = {
        'Time Series (Daily)': {
          '2023-05-15': {
            '1. open': '150.5000',
            '2. high': '151.2500',
            '3. low': '149.7500',
            '4. close': '151.0000',
            '5. volume': '1000000'
          },
          '2023-05-14': {
            '1. open': '149.0000',
            '2. high': '150.0000',
            '3. low': '148.5000',
            '4. close': '149.2500',
            '5. volume': '950000'
          }
        }
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockTimeSeries);

      const timeSeries = await client.getTimeSeries('AAPL', 'daily', 2);
      
      expect(timeSeries).toHaveLength(2);
      // Implementation sorts by date ascending, so [0] is older date (2023-05-14)
      expect(timeSeries[0].open).toBe(149.0);
      expect(timeSeries[0].high).toBe(150.0);
      expect(timeSeries[0].low).toBe(148.5);
      expect(timeSeries[0].close).toBe(149.25);
      expect(timeSeries[0].volume).toBe(950000); // Changed to match the actual mock data
    });
  });

  // Add more test cases for other methods like getFinancials, getDividends, etc.
  // This is a basic structure that can be expanded based on the actual methods in AlphaVantageClient
});