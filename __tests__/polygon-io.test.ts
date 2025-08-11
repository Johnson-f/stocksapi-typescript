import { PolygonIoClient } from '../src/providers/polygon-io';
import { TimeInterval } from '../src/types';

describe('PolygonIoClient', () => {
  let client: PolygonIoClient;
  const apiKey = process.env.POLYGON_API_KEY || 'test-api-key';
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  beforeEach(() => {
    client = new PolygonIoClient(apiKey);
    
    // Mock the makeRequest method to avoid actual API calls during tests
    jest.spyOn(client as any, 'makeRequest').mockImplementation(async () => ({}));
    
    // Mock date-fns functions to return fixed dates for consistent testing
    jest.spyOn(global.Date, 'now').mockImplementation(() => now.getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getQuote', () => {
    it('should fetch a stock quote with historical data', async () => {
      // Mock the current quote
      (client as any).makeRequest.mockResolvedValueOnce({
        results: [{
          T: 'AAPL',
          c: 151.00,
          h: 151.25,
          l: 149.75,
          o: 150.50,
          t: now.getTime(),
          v: 1000000,
          vw: 150.75
        }]
      });

      // Mock the time series data for historical metrics
      (client as any).makeRequest.mockResolvedValueOnce({
        results: [
          // Today
          {
            o: 150.50,
            h: 151.25,
            l: 149.75,
            c: 151.00,
            v: 1000000,
            t: now.getTime(),
            vw: 150.75,
            n: 5000
          },
          // Yesterday
          {
            o: 149.50,
            h: 150.25,
            l: 149.25,
            c: 150.00,
            v: 950000,
            t: oneDayAgo.getTime(),
            vw: 149.75,
            n: 4800
          },
          // One week ago
          {
            o: 148.00,
            h: 148.75,
            l: 147.50,
            c: 148.25,
            v: 900000,
            t: oneWeekAgo.getTime(),
            vw: 148.25,
            n: 4500
          }
        ]
      });

      const quote = await client.getQuote('AAPL', true);
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(151.00);
      expect(quote.high).toBe(151.25);
      expect(quote.low).toBe(149.75);
      expect(quote.open).toBe(150.50);
      expect(quote.volume).toBe(1000000);
      
      // Verify volume metrics
      expect(quote.volumeMetrics).toBeDefined();
      if (quote.volumeMetrics) {
        expect(quote.volumeMetrics.avgVolume30Day).toBeGreaterThan(0);
        expect(quote.volumeMetrics.avgVolume90Day).toBeGreaterThan(0);
        expect(quote.volumeMetrics.avgVolume1Year).toBeGreaterThan(0);
      }
      
      // Verify performance metrics
      expect(quote.performance).toBeDefined();
      if (quote.performance) {
        expect(quote.performance.oneDay).toBeDefined();
        expect(quote.performance.fiveDay).toBeDefined();
        expect(quote.performance.oneMonth).toBeDefined();
      }
    });
  });

  describe('getQuotes', () => {
    it('should fetch multiple stock quotes', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Mock responses for each symbol
      symbols.forEach((symbol, index) => {
        (client as any).makeRequest
          .mockResolvedValueOnce({
            results: [{
              T: symbol,
              c: 150 + index,
              h: 151 + index,
              l: 149 + index,
              o: 149.5 + index,
              t: now.getTime(),
              v: 1000000 + (index * 100000),
              vw: 150 + index
            }]
          })
          .mockResolvedValueOnce({
            results: [{
              o: 150 + index,
              h: 151 + index,
              l: 149 + index,
              c: 150.5 + index,
              v: 1000000 + (index * 100000),
              t: now.getTime(),
              vw: 150.25 + index
            }]
          });
      });

      const quotes = await client.getQuotes(symbols);
      
      expect(Object.keys(quotes)).toHaveLength(3);
      expect(quotes['AAPL']).toBeDefined();
      expect(quotes['MSFT']).toBeDefined();
      expect(quotes['GOOGL']).toBeDefined();
      expect(quotes['AAPL']?.data?.price).toBe(150);
      expect(quotes['MSFT']?.data?.price).toBe(151);
      expect(quotes['GOOGL']?.data?.price).toBe(152);
    });
  });

  describe('getCompanyProfile', () => {
    it('should fetch company profile data', async () => {
      const mockProfile = {
        results: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
          exchange: 'NASDAQ',
          currency_name: 'USD',
          primary_exchange: 'NASDAQ',
          sic_description: 'Electronic Computers',
          total_employees: 154000,
          market_cap: 2500000000000,
          share_class_shares_outstanding: 16406400000,
          weighted_shares_outstanding: 16406400000,
          round_lot: 100,
          homepage_url: 'https://www.apple.com',
          logo_url: 'https://logo.clearbit.com/apple.com',
          list_date: '1980-12-12',
          sic_code: '3571',
          industry_category: 'Technology',
          industry_group: 'Consumer Electronics'
        }
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);

      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc.');
      expect(profile.description).toContain('Apple Inc. designs');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.sector).toBe('Consumer Electronics');
      expect(profile.employees).toBe(154000);
      expect(profile.marketCap).toBe(2500000000000);
      expect(profile.sharesOutstanding).toBe(16406400000);
      expect(profile.website).toBe('https://www.apple.com');
      expect(profile.logo).toBe('https://logo.clearbit.com/apple.com');
    });
  });

  describe('getTimeSeries', () => {
    it('should fetch time series data', async () => {
      const mockData = {
        results: [
          // Today
          {
            o: 150.50,
            h: 151.25,
            l: 149.75,
            c: 151.00,
            v: 1000000,
            t: now.getTime(),
            vw: 150.75,
            n: 5000
          },
          // Yesterday
          {
            o: 149.50,
            h: 150.25,
            l: 149.25,
            c: 150.00,
            v: 950000,
            t: oneDayAgo.getTime(),
            vw: 149.75,
            n: 4800
          }
        ]
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockData);

      const timeSeries = await client.getTimeSeries('AAPL', '1d', 2);
      
      expect(timeSeries).toHaveLength(2);
      expect(timeSeries[0].open).toBe(150.50);
      expect(timeSeries[1].close).toBe(150);
      expect(timeSeries[0].volume).toBe(1000000);
    });
  });

  describe('getEarnings', () => {
    it('should fetch earnings data', async () => {
      const mockEarnings = {
        results: [
          {
            ticker: 'AAPL',
            fiscal_period: 'Q2',
            fiscal_year: '2023',
            report_date: '2023-05-02',
            date: '2023-05-02T16:30:00Z',
            eps: {
              actual: 1.52,
              estimate: 1.43,
              surprise: 0.09,
              surprise_percent: 6.29
            },
            revenue: {
              actual: 94800000000,
              estimate: 92900000000,
              surprise: 1900000000,
              surprise_percent: 2.05
            },
            is_confirmed: true,
            updated: '2023-05-02T16:30:00Z'
          }
        ]
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockEarnings);

      const earnings = await client.getEarnings('AAPL');
      
      expect(earnings).toHaveLength(1);
      expect(earnings[0].symbol).toBe('AAPL');
      expect(earnings[0].reportedEPS).toBe(1.52);
      expect(earnings[0].estimatedEPS).toBe(1.43);
      expect(earnings[0].reportedRevenue).toBe(94800000000);
    });
  });

  describe('getUpcomingEarnings', () => {
    it('should fetch upcoming earnings data', async () => {
      const mockUpcomingEarnings = {
        results: [
          {
            ticker: 'AAPL',
            fiscal_period: 'Q3',
            fiscal_year: '2023',
            report_date: '2023-08-03',
            date: '2023-08-03T16:30:00Z',
            eps: {
              estimate: 1.19
            },
            revenue: {
              estimate: 81790000000
            },
            is_confirmed: true,
            updated: '2023-07-20T12:00:00Z'
          }
        ]
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockUpcomingEarnings);

      const upcomingEarnings = await client.getUpcomingEarnings({
        symbols: ['AAPL']
      });
      
      expect(upcomingEarnings).toHaveLength(1);
      expect(upcomingEarnings[0].symbol).toBe('AAPL');
      expect(upcomingEarnings[0].estimatedEPS).toBe(1.19);
      expect(upcomingEarnings[0].isFutureReport).toBe(true);
    });
  });

  describe('getCompanyProfile', () => {
    it('should fetch company profile data', async () => {
      const mockProfile = {
        results: {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
          sic_description: 'Electronic Computers',
          homepage_url: 'https://www.apple.com',
          market_cap: 2500000000000,
          total_employees: 164000,
          list_date: '1980-12-12',
          share_class_shares_outstanding: 16000000000,
          weighted_shares_outstanding: 16000000000,
          round_lot: 100,
          primary_exchange: 'XNAS',
          currency_name: 'usd',
          market: 'stocks',
          locale: 'us',
          active: true,
          updated: '2023-07-20T00:00:00Z'
        }
      };

      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);

      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc.');
      expect(profile.exchange).toBe('XNAS');
      expect(profile.currency).toBe('usd');
      expect(profile.marketCap).toBe(2500000000000);
    });
  });
});
