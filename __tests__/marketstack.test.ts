import { MarketstackClient } from '../src/providers/marketstack';

describe('MarketstackClient', () => {
  let client: MarketstackClient;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    client = new MarketstackClient(mockApiKey);
    // Mock the makeRequest method for testing
    (client as any).makeRequest = jest.fn();
    jest.clearAllMocks();
  });
  
  describe('getQuote', () => {
    it('should fetch and map a stock quote', async () => {
      const mockQuoteData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        mic_code: 'XNAS',
        currency: 'USD',
        datetime: '2023-05-15T16:00:00+00:00',
        timestamp: 1684166400,
        open: 150.00,
        high: 151.50,
        low: 149.75,
        close: 150.25,
        volume: 1000000,
        previous_close: 149.00,
        change: 1.25,
        percent_change: 0.84,
        is_market_open: true
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockQuoteData);
      
      const quote = await client.getQuote('AAPL', false); // Don't include historical data for this test
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(1.25);
      expect(quote.changePercent).toBe(0.84);
      expect(quote.high).toBe(151.50);
      expect(quote.low).toBe(149.75);
      expect(quote.open).toBe(150.00);
      expect(quote.previousClose).toBe(149.00);
      expect(quote.volume).toBe(1000000);
      expect(quote.timestamp).toEqual(new Date('2023-05-15T16:00:00+00:00'));
    });
    
    it('should handle missing optional fields gracefully', async () => {
      const mockQuoteData = {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        currency: 'USD',
        datetime: '2023-05-15T16:00:00+00:00',
        timestamp: 1684166400,
        open: 150.00,
        high: 151.50,
        low: 149.75,
        close: 150.25,
        volume: 1000000
        // Missing previous_close, change, percent_change
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockQuoteData);
      
      const quote = await client.getQuote('AAPL', false);
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(0); // Default value
      expect(quote.changePercent).toBe(0); // Default value
      expect(quote.previousClose).toBe(150.25); // Falls back to close price
    });
    
    it('should handle API errors gracefully', async () => {
      (client as any).makeRequest.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(client.getQuote('INVALID')).rejects.toThrow('API Error');
    });
  });
  
  describe('getCompanyProfile', () => {
    it('should fetch and map company profile data', async () => {
      const mockProfile = {
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            exchange: 'NASDAQ',
            mic_code: 'XNAS',
            currency: 'USD',
            country: 'US',
            type: 'Common Stock'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);
      
      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc.');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.description).toBe('Apple Inc.'); // Uses name as description
      expect(profile.lastUpdated).toBeInstanceOf(Date);
    });
  });
  
  describe('getTimeSeries', () => {
    it('should fetch and map time series data', async () => {
      const mockTimeSeriesData = {
        pagination: {
          limit: 100,
          offset: 0,
          count: 2,
          total: 2
        },
        data: [
          {
            open: 150.00,
            high: 151.50,
            low: 149.75,
            close: 150.25,
            volume: 1000000,
            adj_high: 151.50,
            adj_low: 149.75,
            adj_close: 150.25,
            adj_open: 150.00,
            adj_volume: 1000000,
            split_factor: 1,
            dividend: 0,
            symbol: 'AAPL',
            exchange: 'NASDAQ',
            date: '2023-05-15'
          },
          {
            open: 149.00,
            high: 150.50,
            low: 148.75,
            close: 149.25,
            volume: 950000,
            adj_high: 150.50,
            adj_low: 148.75,
            adj_close: 149.25,
            adj_open: 149.00,
            adj_volume: 950000,
            split_factor: 1,
            dividend: 0,
            symbol: 'AAPL',
            exchange: 'NASDAQ',
            date: '2023-05-14'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockTimeSeriesData);
      
      const timeSeries = await client.getTimeSeries('AAPL', 'daily', 30);
      
      expect(timeSeries).toHaveLength(2);
      expect(timeSeries[0].timestamp).toEqual(new Date('2023-05-15'));
      expect(timeSeries[0].open).toBe(150.00);
      expect(timeSeries[0].high).toBe(151.50);
      expect(timeSeries[0].low).toBe(149.75);
      expect(timeSeries[0].close).toBe(150.25);
      expect(timeSeries[0].volume).toBe(1000000);
    });
    
    it('should handle empty time series data', async () => {
      const mockTimeSeriesData = {
        pagination: {
          limit: 100,
          offset: 0,
          count: 0,
          total: 0
        },
        data: []
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockTimeSeriesData);
      
      const timeSeries = await client.getTimeSeries('INVALID', 'daily', 30);
      
      expect(timeSeries).toHaveLength(0);
    });
  });
  
  describe('searchSymbols', () => {
    it('should search for symbols and map results', async () => {
      const mockSearchResults = {
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            currency: 'USD',
            exchange: 'NASDAQ',
            mic_code: 'XNAS',
            country: 'US',
            type: 'Common Stock'
          },
          {
            symbol: 'AAPL.L',
            name: 'Apple Inc.',
            currency: 'GBP',
            exchange: 'LSE',
            mic_code: 'XLON',
            country: 'GB',
            type: 'Common Stock'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockSearchResults);
      
      const results = await client.searchSymbols('apple');
      
      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toBe('Apple Inc.');
      expect(results[0].currency).toBe('USD');
      expect(results[0].exchange).toBe('NASDAQ');
      expect(results[1].symbol).toBe('AAPL.L');
      expect(results[1].currency).toBe('GBP');
    });
  });
  
  describe('getDividends', () => {
    it('should fetch and map dividend data', async () => {
      const mockDividendData = {
        pagination: {
          limit: 1000,
          offset: 0,
          count: 2,
          total: 2
        },
        data: [
          {
            symbol: 'AAPL',
            date: '2023-05-15',
            dividend: 0.24,
            currency: 'USD'
          },
          {
            symbol: 'AAPL',
            date: '2023-02-15',
            dividend: 0.23,
            currency: 'USD'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockDividendData);
      
      const dividends = await client.getDividends('AAPL');
      
      expect(dividends).toHaveLength(2);
      expect(dividends[0].symbol).toBe('AAPL');
      expect(dividends[0].amount).toBe(0.24);
      expect(dividends[0].exDate).toEqual(new Date('2023-05-15'));
      expect(dividends[0].paymentDate).toEqual(new Date('2023-05-15'));
      expect(dividends[0].recordDate).toEqual(new Date('2023-05-15'));
      expect(dividends[0].currency).toBe('USD');
    });
    
    it('should filter out zero dividends', async () => {
      const mockDividendData = {
        pagination: {
          limit: 1000,
          offset: 0,
          count: 3,
          total: 3
        },
        data: [
          {
            symbol: 'AAPL',
            date: '2023-05-15',
            dividend: 0.24,
            currency: 'USD'
          },
          {
            symbol: 'AAPL',
            date: '2023-04-15',
            dividend: 0, // Zero dividend
            currency: 'USD'
          },
          {
            symbol: 'AAPL',
            date: '2023-02-15',
            dividend: 0.23,
            currency: 'USD'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockDividendData);
      
      const dividends = await client.getDividends('AAPL');
      
      expect(dividends).toHaveLength(2); // Only non-zero dividends
      expect(dividends[0].amount).toBe(0.24);
      expect(dividends[1].amount).toBe(0.23);
    });
  });
  
  describe('getFinancialMetrics', () => {
    it('should return basic financial metrics from price data', async () => {
      // Mock the getQuote method
      (client as any).getQuote = jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        price: 150.25
      });
      
      // Mock the getTimeSeries method
      (client as any).getTimeSeries = jest.fn().mockResolvedValue([
        { close: 140.00, timestamp: new Date('2023-01-01') },
        { close: 160.00, timestamp: new Date('2023-06-01') },
        { close: 150.25, timestamp: new Date('2023-12-01') }
      ]);
      
      const metrics = await client.getFinancialMetrics('AAPL');
      
      expect(metrics.symbol).toBe('AAPL');
      expect(metrics.fiftyTwoWeekHigh).toBe(160.00);
      expect(metrics.fiftyTwoWeekLow).toBe(140.00);
      expect(metrics.reportPeriod).toBe('annual');
      expect(metrics.fiscalYearEnd).toBe('12-31');
    });
  });
  
  describe('getEarnings', () => {
    it('should return empty array as earnings data is not supported', async () => {
      const earnings = await client.getEarnings('AAPL');
      
      expect(earnings).toEqual([]);
    });
  });
  
  describe('getUpcomingEarnings', () => {
    it('should return empty array as upcoming earnings data is not supported', async () => {
      const earnings = await client.getUpcomingEarnings();
      
      expect(earnings).toEqual([]);
    });
  });
  
  describe('getMarketNews', () => {
    it('should return empty array as news data is not supported', async () => {
      const news = await client.getMarketNews(['AAPL']);
      
      expect(news).toEqual([]);
    });
  });
  
  describe('getQuotes', () => {
    it('should fetch multiple quotes', async () => {
      const mockQuoteDataAAPL = {
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        currency: 'USD',
        datetime: '2023-05-15T16:00:00+00:00',
        timestamp: 1684166400,
        open: 150.00,
        high: 151.50,
        low: 149.75,
        close: 150.25,
        volume: 1000000
      };
      
      const mockQuoteDataMSFT = {
        symbol: 'MSFT',
        exchange: 'NASDAQ',
        currency: 'USD',
        datetime: '2023-05-15T16:00:00+00:00',
        timestamp: 1684166400,
        open: 300.00,
        high: 301.50,
        low: 299.75,
        close: 300.25,
        volume: 2000000
      };
      
      // Mock the makeRequest method for quotes - each call returns different data
      (client as any).makeRequest
        .mockResolvedValueOnce(mockQuoteDataAAPL)
        .mockResolvedValueOnce(mockQuoteDataMSFT);
      
      // Mock the getTimeSeries method to avoid historical data fetching
      (client as any).getTimeSeries = jest.fn().mockResolvedValue([]);
      
      const quotes = await client.getQuotes(['AAPL', 'MSFT']);
      
      expect(Object.keys(quotes)).toHaveLength(2);
      expect(quotes.AAPL.success).toBe(true);
      expect(quotes.AAPL.data?.symbol).toBe('AAPL');
      expect(quotes.MSFT.success).toBe(true);
      expect(quotes.MSFT.data?.symbol).toBe('MSFT');
    });
    
    it('should handle errors for individual symbols', async () => {
      (client as any).makeRequest
        .mockResolvedValueOnce({
          symbol: 'AAPL',
          exchange: 'NASDAQ',
          currency: 'USD',
          datetime: '2023-05-15T16:00:00+00:00',
          timestamp: 1684166400,
          open: 150.00,
          high: 151.50,
          low: 149.75,
          close: 150.25,
          volume: 1000000
        })
        .mockRejectedValueOnce(new Error('Symbol not found'));
      
      const quotes = await client.getQuotes(['AAPL', 'INVALID']);
      
      expect(quotes.AAPL.success).toBe(true);
      expect(quotes.INVALID.success).toBe(false);
      expect(quotes.INVALID.error).toBeInstanceOf(Error);
    });
  });
}); 