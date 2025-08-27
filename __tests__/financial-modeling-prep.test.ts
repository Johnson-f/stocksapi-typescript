import { FinancialModelingPrepClient } from '../src/providers/financial-modeling-prep';
import { TimeInterval } from '../src/types';
import { subDays, subMonths, subYears, startOfYear } from 'date-fns';

describe('FinancialModelingPrepClient', () => {
  let client: FinancialModelingPrepClient;
  const mockApiKey = 'test-api-key';
  
  // Mock dates
  const mockNow = new Date('2023-05-15T16:00:00Z');
  const mockOneYearAgo = subYears(mockNow, 1);
  
  beforeAll(() => {
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });
  
  beforeEach(() => {
    client = new FinancialModelingPrepClient(mockApiKey);
    // Mock the makeRequest method for testing
    (client as any).makeRequest = jest.fn();
    jest.clearAllMocks();
    
    // Suppress console.warn during tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console.warn after each test
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should create client with correct base URL and timeout', () => {
      const client = new FinancialModelingPrepClient('test-key', 15000);
      expect((client as any).baseUrl).toBe('https://financialmodelingprep.com/api/v3');
      expect((client as any).requestTimeout).toBe(15000);
    });
    
    it('should use default timeout when not specified', () => {
      const client = new FinancialModelingPrepClient('test-key');
      expect((client as any).requestTimeout).toBe(30000);
    });
  });
  
  describe('getQuote', () => {
    it('should fetch and map a stock quote with historical data', async () => {
      // Mock the makeRequest method for the quote
      (client as any).makeRequest
        .mockResolvedValueOnce([{
          symbol: 'AAPL',
          price: 150.25,
          changes: 1.25,
          changesPercentage: 0.84,
          volume: 1000000,
          open: 150.00,
          dayHigh: 151.50,
          dayLow: 149.75,
          previousClose: 149.00
        }])
        // Mock historical data response
        .mockResolvedValueOnce([
          {
            date: subDays(mockNow, 2).toISOString(),
            open: 148.5,
            high: 149.0,
            low: 148.0,
            close: 148.75,
            volume: 500000
          },
          {
            date: subDays(mockNow, 1).toISOString(),
            open: 149.0,
            high: 150.0,
            low: 148.5,
            close: 149.5,
            volume: 750000
          },
          {
            date: mockNow.toISOString(),
            open: 150.0,
            high: 151.5,
            low: 149.75,
            close: 150.25,
            volume: 1000000
          }
        ]);
      
      const quote = await client.getQuote('AAPL');
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(1.25);
      expect(quote.changePercent).toBe(0.84);
      expect(quote.high).toBe(151.50);
      expect(quote.low).toBe(149.75);
      expect(quote.open).toBe(150.00);
      expect(quote.previousClose).toBe(149.00);
      expect(quote.volume).toBe(1000000);
      
      // Verify volume metrics
      expect(quote.volumeMetrics).toBeDefined();
      expect(quote.volumeMetrics?.currentVolume).toBe(1000000);
      expect(quote.volumeMetrics?.avgDailyVolume).toBe(750000);
      
      // Verify performance metrics
      expect(quote.performance).toBeDefined();
      expect(quote.performance?.oneWeek).toBeDefined();
    });
    
    it('should fetch quote without historical data when includeHistorical is false', async () => {
      (client as any).makeRequest.mockResolvedValueOnce([{
        symbol: 'AAPL',
        price: 150.25,
        changes: 1.25,
        changesPercentage: 0.84,
        volume: 1000000,
        open: 150.00,
        dayHigh: 151.50,
        dayLow: 149.75,
        previousClose: 149.00
      }]);
      
      const quote = await client.getQuote('AAPL', false);
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.volumeMetrics).toBeUndefined();
      expect(quote.performance).toBeUndefined();
    });
    
    it('should handle API errors gracefully', async () => {
      (client as any).makeRequest.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(client.getQuote('INVALID')).rejects.toThrow('API Error');
    });
    
    it('should handle empty quote data', async () => {
      (client as any).makeRequest.mockResolvedValueOnce([]);
      
      await expect(client.getQuote('INVALID')).rejects.toThrow('No quote data found for symbol: INVALID');
    });
    
    it('should handle historical data fetch errors gracefully', async () => {
      (client as any).makeRequest
        .mockResolvedValueOnce([{
          symbol: 'AAPL',
          price: 150.25,
          changes: 1.25,
          changesPercentage: 0.84,
          volume: 1000000,
          open: 150.00,
          dayHigh: 151.50,
          dayLow: 149.75,
          previousClose: 149.00
        }])
        .mockRejectedValueOnce(new Error('Historical data error'));
      
      const quote = await client.getQuote('AAPL');
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.volumeMetrics).toBeUndefined();
      expect(quote.performance).toBeUndefined();
    });
  });
  
  describe('getQuotes', () => {
    it('should fetch multiple stock quotes', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      (client as any).makeRequest.mockResolvedValueOnce([
        {
          symbol: 'AAPL',
          price: 150.25,
          changes: 1.25,
          changesPercentage: 0.84,
          volume: 1000000,
          open: 150.00,
          dayHigh: 151.50,
          dayLow: 149.75,
          previousClose: 149.00
        },
        {
          symbol: 'MSFT',
          price: 300.50,
          changes: 2.50,
          changesPercentage: 0.84,
          volume: 2000000,
          open: 300.00,
          dayHigh: 301.00,
          dayLow: 299.00,
          previousClose: 298.00
        },
        {
          symbol: 'GOOGL',
          price: 2500.00,
          changes: 25.00,
          changesPercentage: 1.01,
          volume: 500000,
          open: 2500.00,
          dayHigh: 2510.00,
          dayLow: 2490.00,
          previousClose: 2475.00
        }
      ]);
      
      const quotes = await client.getQuotes(symbols);
      
      expect(Object.keys(quotes)).toHaveLength(3);
      expect(quotes.AAPL.success).toBe(true);
      expect(quotes.MSFT.success).toBe(true);
      expect(quotes.GOOGL.success).toBe(true);
      
      expect(quotes.AAPL.data?.price).toBe(150.25);
      expect(quotes.MSFT.data?.price).toBe(300.50);
      expect(quotes.GOOGL.data?.price).toBe(2500.00);
    });
    
    it('should handle partial failures in batch quotes', async () => {
      const symbols = ['AAPL', 'INVALID', 'MSFT'];
      
      (client as any).makeRequest.mockResolvedValueOnce([
        {
          symbol: 'AAPL',
          price: 150.25,
          changes: 1.25,
          changesPercentage: 0.84,
          volume: 1000000,
          open: 150.00,
          dayHigh: 151.50,
          dayLow: 149.75,
          previousClose: 149.00
        },
        {
          symbol: 'MSFT',
          price: 300.50,
          changes: 2.50,
          changesPercentage: 0.84,
          volume: 2000000,
          open: 300.00,
          dayHigh: 301.00,
          dayLow: 299.00,
          previousClose: 298.00
        }
      ]);
      
      const quotes = await client.getQuotes(symbols);
      
      expect(quotes.AAPL.success).toBe(true);
      expect(quotes.INVALID.success).toBe(false);
      expect(quotes.MSFT.success).toBe(true);
      expect(quotes.INVALID.error?.message).toBe('Symbol not found');
    });
    
    it('should handle empty response', async () => {
      const symbols = ['AAPL', 'MSFT'];
      
      (client as any).makeRequest.mockResolvedValueOnce([]);
      
      const quotes = await client.getQuotes(symbols);
      
      expect(quotes.AAPL.success).toBe(false);
      expect(quotes.MSFT.success).toBe(false);
      expect(quotes.AAPL.error?.message).toBe('Symbol not found');
    });
  });
  
  describe('getCompanyProfile', () => {
    it('should fetch and map company profile', async () => {
      (client as any).makeRequest.mockResolvedValueOnce([{
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables and accessories.',
        exchange: 'NASDAQ',
        currency: 'USD',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        website: 'https://www.apple.com',
        image: 'https://example.com/apple-logo.png',
        mktCap: 2500000000000,
        fullTimeEmployees: 154000,
        ipoDate: '1980-12-12',
        sharesOutstanding: 16000000000,
        floatShares: 15900000000,
        beta: 1.2,
        dividend: 0.88,
        dividendYield: 0.58,
        pe: 25.5,
        eps: 5.89
      }]);
      
      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc.');
      expect(profile.description).toBe('Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables and accessories.');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.sector).toBe('Technology');
      expect(profile.industry).toBe('Consumer Electronics');
      expect(profile.website).toBe('https://www.apple.com');
      expect(profile.logo).toBe('https://example.com/apple-logo.png');
      expect(profile.marketCap).toBe(2500000000000);
      expect(profile.employees).toBe(154000);
      expect(profile.ipoDate).toEqual(new Date('1980-12-12'));
      expect(profile.sharesOutstanding).toBe(16000000000);
      expect(profile.floatShares).toBe(15900000000);
      expect(profile.beta).toBe(1.2);
      expect(profile.dividendPerShare).toBe(0.88);
      expect(profile.dividendYield).toBe(0.58);
      expect(profile.peRatio).toBe(25.5);
      expect(profile.eps).toBe(5.89);
    });
    
    it('should handle empty profile data', async () => {
      (client as any).makeRequest.mockResolvedValueOnce([]);
      
      await expect(client.getCompanyProfile('INVALID')).rejects.toThrow('No profile data found for symbol: INVALID');
    });
  });
  
  describe('getCompanyProfiles', () => {
    it('should fetch multiple company profiles', async () => {
      const symbols = ['AAPL', 'MSFT'];
      
      (client as any).makeRequest.mockResolvedValueOnce([
        {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          description: 'Apple Inc. designs, manufactures, and markets smartphones.',
          exchange: 'NASDAQ',
          currency: 'USD',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          website: 'https://www.apple.com',
          image: 'https://example.com/apple-logo.png',
          mktCap: 2500000000000,
          fullTimeEmployees: 154000,
          ipoDate: '1980-12-12',
          sharesOutstanding: 16000000000,
          floatShares: 15900000000,
          beta: 1.2,
          dividend: 0.88,
          dividendYield: 0.58,
          pe: 25.5,
          eps: 5.89
        },
        {
          symbol: 'MSFT',
          companyName: 'Microsoft Corporation',
          description: 'Microsoft Corporation develops, licenses, and supports software products.',
          exchange: 'NASDAQ',
          currency: 'USD',
          sector: 'Technology',
          industry: 'Software',
          website: 'https://www.microsoft.com',
          image: 'https://example.com/microsoft-logo.png',
          mktCap: 2000000000000,
          fullTimeEmployees: 181000,
          ipoDate: '1986-03-13',
          sharesOutstanding: 7500000000,
          floatShares: 7400000000,
          beta: 0.9,
          dividend: 2.48,
          dividendYield: 0.82,
          pe: 30.2,
          eps: 9.95
        }
      ]);
      
      const profiles = await client.getCompanyProfiles(symbols);
      
      expect(Object.keys(profiles)).toHaveLength(2);
      expect(profiles.AAPL.success).toBe(true);
      expect(profiles.MSFT.success).toBe(true);
      
      expect(profiles.AAPL.data?.name).toBe('Apple Inc.');
      expect(profiles.MSFT.data?.name).toBe('Microsoft Corporation');
    });
  });
  
  describe('getTimeSeries', () => {
    it('should fetch daily time series data', async () => {
      const mockData = [
        {
          date: subDays(mockNow, 2).toISOString(),
          open: 148.5,
          high: 149.0,
          low: 148.0,
          close: 148.75,
          volume: 500000
        },
        {
          date: subDays(mockNow, 1).toISOString(),
          open: 149.0,
          high: 150.0,
          low: 148.5,
          close: 149.5,
          volume: 750000
        },
        {
          date: mockNow.toISOString(),
          open: 150.0,
          high: 151.5,
          low: 149.75,
          close: 150.25,
          volume: 1000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const timeSeries = await client.getTimeSeries('AAPL', 'daily');
      
      expect(timeSeries).toHaveLength(3);
      expect(timeSeries[0].timestamp).toEqual(subDays(mockNow, 2));
      expect(timeSeries[0].open).toBe(148.5);
      expect(timeSeries[0].high).toBe(149.0);
      expect(timeSeries[0].low).toBe(148.0);
      expect(timeSeries[0].close).toBe(148.75);
      expect(timeSeries[0].volume).toBe(500000);
    });
    
    it('should handle different time intervals', async () => {
      const mockData = [
        {
          date: mockNow.toISOString(),
          open: 150.0,
          high: 151.5,
          low: 149.75,
          close: 150.25,
          volume: 1000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      await client.getTimeSeries('AAPL', '1min');
      
      expect((client as any).makeRequest).toHaveBeenCalledWith(
        'https://financialmodelingprep.com/api/v3/historical-chart/1min/AAPL'
      );
    });
    
    it('should filter data by date range', async () => {
      const mockData = [
        {
          date: subDays(mockNow, 5).toISOString(),
          open: 145.0,
          high: 146.0,
          low: 144.0,
          close: 145.5,
          volume: 400000
        },
        {
          date: subDays(mockNow, 2).toISOString(),
          open: 148.5,
          high: 149.0,
          low: 148.0,
          close: 148.75,
          volume: 500000
        },
        {
          date: mockNow.toISOString(),
          open: 150.0,
          high: 151.5,
          low: 149.75,
          close: 150.25,
          volume: 1000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const startDate = subDays(mockNow, 3);
      const endDate = mockNow;
      
      const timeSeries = await client.getTimeSeries('AAPL', 'daily', undefined, startDate, endDate);
      
      expect(timeSeries).toHaveLength(2);
      expect(timeSeries[0].timestamp).toEqual(subDays(mockNow, 2));
      expect(timeSeries[1].timestamp).toEqual(mockNow);
    });
    
    it('should handle invalid time series data', async () => {
      (client as any).makeRequest.mockResolvedValueOnce(null);
      
      await expect(client.getTimeSeries('INVALID')).rejects.toThrow('Invalid time series data format');
    });
  });
  
  describe('getFinancialMetrics', () => {
    it('should fetch and map financial metrics', async () => {
      const keyMetrics = {
        symbol: 'AAPL',
        marketCap: 2500000000000,
        enterpriseValue: 2600000000000,
        peRatio: 25.5,
        forwardPE: 24.2,
        pbRatio: 15.2,
        evToEbitda: 18.5,
        evToRevenue: 6.2,
        pegRatio: 1.8,
        ebitda: 120000000000,
        grossProfitMargin: 0.42,
        operatingIncomeMargin: 0.28,
        netIncomeMargin: 0.24,
        ebitdaMargin: 0.30,
        currentRatio: 1.2,
        quickRatio: 1.1,
        debtToEquity: 1.5,
        roe: 0.15,
        roa: 0.12,
        roce: 0.18,
        dividendYield: 0.58,
        dividendPerShare: 0.88,
        dividendPayoutRatio: 0.25,
        sharesOutstanding: 16000000000,
        floatShares: 15900000000,
        beta: 1.2,
        fiftyTwoWeekHigh: 180.0,
        fiftyTwoWeekLow: 120.0,
        eps: 5.89
      };
      
      const incomeStatement = {
        revenue: 394328000000,
        grossProfit: 170782000000,
        operatingIncome: 110949000000,
        netIncome: 94680000000
      };
      
      const balanceSheet = {
        totalDebt: 100000000000,
        totalStockholdersEquity: 630900000000
      };
      
      const cashFlow = {
        operatingCashFlow: 122151000000,
        freeCashFlow: 111443000000
      };
      
      (client as any).makeRequest
        .mockResolvedValueOnce([keyMetrics])
        .mockResolvedValueOnce([incomeStatement])
        .mockResolvedValueOnce([balanceSheet])
        .mockResolvedValueOnce([cashFlow]);
      
      const metrics = await client.getFinancialMetrics('AAPL');
      
      expect(metrics.symbol).toBe('AAPL');
      expect(metrics.marketCap).toBe(2500000000000);
      expect(metrics.peRatio).toBe(25.5);
      expect(metrics.revenue).toBe(394328000000);
      expect(metrics.grossMargin).toBe(0.42);
      expect(metrics.currentRatio).toBe(1.2);
      expect(metrics.roe).toBe(0.15);
    });
  });
  
  describe('getDividends', () => {
    it('should fetch and map dividend data', async () => {
      const mockData = [
        {
          date: '2023-05-15',
          dividend: 0.88
        },
        {
          date: '2023-02-15',
          dividend: 0.88
        },
        {
          date: '2022-11-15',
          dividend: 0.85
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const dividends = await client.getDividends('AAPL');
      
      expect(dividends).toHaveLength(3);
      expect(dividends[0].symbol).toBe('AAPL');
      expect(dividends[0].amount).toBe(0.88);
      expect(dividends[0].exDate).toEqual(new Date('2023-05-15'));
    });
    
    it('should filter dividends by date range', async () => {
      const mockData = [
        {
          date: '2023-05-15',
          dividend: 0.88
        },
        {
          date: '2023-02-15',
          dividend: 0.88
        },
        {
          date: '2022-11-15',
          dividend: 0.85
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-06-01');
      
      const dividends = await client.getDividends('AAPL', startDate, endDate);
      
      expect(dividends).toHaveLength(2);
      expect(dividends[0].exDate).toEqual(new Date('2023-05-15'));
      expect(dividends[1].exDate).toEqual(new Date('2023-02-15'));
    });
    
    it('should filter out zero dividends', async () => {
      const mockData = [
        {
          date: '2023-05-15',
          dividend: 0.88
        },
        {
          date: '2023-02-15',
          dividend: 0
        },
        {
          date: '2022-11-15',
          dividend: 0.85
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const dividends = await client.getDividends('AAPL');
      
      expect(dividends).toHaveLength(2);
      expect(dividends.every(d => d.amount > 0)).toBe(true);
    });
  });
  
  describe('getEarnings', () => {
    it('should fetch earnings with limit option', async () => {
      const mockData = [
        {
          date: '2023-03-31',
          eps: 1.52,
          epsEstimated: 1.43,
          epsSurprise: 0.09,
          epsSurprisePercentage: 6.29,
          revenue: 94836000000,
          revenueEstimated: 92900000000,
          revenueSurprise: 1936000000,
          revenueSurprisePercentage: 2.08
        },
        {
          date: '2022-12-31',
          eps: 1.88,
          epsEstimated: 1.94,
          epsSurprise: -0.06,
          epsSurprisePercentage: -3.09,
          revenue: 117154000000,
          revenueEstimated: 12100000000,
          revenueSurprise: -3846000000,
          revenueSurprisePercentage: -3.18
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const earnings = await client.getEarnings('AAPL', 2);
      
      expect(earnings).toHaveLength(2);
      expect(earnings[0].reportedEPS).toBe(1.52);
      expect(earnings[0].estimatedEPS).toBe(1.43);
      expect(earnings[0].surprise).toBe(0.09);
      expect(earnings[0].reportedRevenue).toBe(94836000000);
      expect(earnings[0].isFutureReport).toBe(false);
    });
    
    it('should fetch earnings with options object', async () => {
      const mockData = [
        {
          date: '2023-03-31',
          eps: 1.52,
          epsEstimated: 1.43,
          epsSurprise: 0.09,
          epsSurprisePercentage: 6.29,
          revenue: 94836000000,
          revenueEstimated: 92900000000,
          revenueSurprise: 1936000000,
          revenueSurprisePercentage: 2.08
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const earnings = await client.getEarnings('AAPL', {
        limit: 1,
        includeFutureReports: false
      });
      
      expect(earnings).toHaveLength(1);
      expect(earnings[0].reportedEPS).toBe(1.52);
    });
    
    it('should include future earnings when requested', async () => {
      const historicalData = [
        {
          date: '2023-03-31',
          eps: 1.52,
          epsEstimated: 1.43,
          epsSurprise: 0.09,
          epsSurprisePercentage: 6.29,
          revenue: 94836000000,
          revenueEstimated: 92900000000,
          revenueSurprise: 1936000000,
          revenueSurprisePercentage: 2.08
        }
      ];
      
      const futureData = [
        {
          date: '2023-06-30',
          epsEstimated: 1.65,
          revenueEstimated: 85000000000
        }
      ];
      
      (client as any).makeRequest
        .mockResolvedValueOnce(historicalData)
        .mockResolvedValueOnce(futureData);
      
      const earnings = await client.getEarnings('AAPL', {
        limit: 2,
        includeFutureReports: true
      });
      
      expect(earnings).toHaveLength(2);
      expect(earnings[0].isFutureReport).toBe(true);
      expect(earnings[0].estimatedEPS).toBe(1.65);
      expect(earnings[1].isFutureReport).toBe(false);
      expect(earnings[1].reportedEPS).toBe(1.52);
    });
  });
  
  describe('getUpcomingEarnings', () => {
    it('should fetch upcoming earnings with default options', async () => {
      const mockData = [
        {
          date: '2023-06-30',
          symbol: 'AAPL',
          epsEstimated: 1.65,
          revenueEstimated: 85000000000
        },
        {
          date: '2023-06-30',
          symbol: 'MSFT',
          epsEstimated: 2.45,
          revenueEstimated: 55000000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const earnings = await client.getUpcomingEarnings();
      
      expect(earnings).toHaveLength(2);
      expect(earnings[0].symbol).toBe('AAPL');
      expect(earnings[0].isFutureReport).toBe(true);
      expect(earnings[0].estimatedEPS).toBe(1.65);
    });
    
    it('should filter earnings by date range', async () => {
      const mockData = [
        {
          date: '2023-06-30',
          symbol: 'AAPL',
          epsEstimated: 1.65,
          revenueEstimated: 85000000000
        },
        {
          date: '2023-09-30',
          symbol: 'MSFT',
          epsEstimated: 2.45,
          revenueEstimated: 55000000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-07-01');
      
      const earnings = await client.getUpcomingEarnings({
        startDate,
        endDate
      });
      
      expect(earnings).toHaveLength(1);
      expect(earnings[0].symbol).toBe('AAPL');
    });
  });
  
  describe('searchSymbols', () => {
    it('should search for stock symbols', async () => {
      const mockData = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currency: 'USD',
          exchange: 'NASDAQ',
          country: 'US',
          type: 'Common Stock'
        },
        {
          symbol: 'AAPL.L',
          name: 'Apple Inc.',
          currency: 'GBP',
          exchange: 'LSE',
          country: 'GB',
          type: 'Common Stock'
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const results = await client.searchSymbols('Apple');
      
      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toBe('Apple Inc.');
      expect(results[0].currency).toBe('USD');
      expect(results[0].exchange).toBe('NASDAQ');
      expect(results[0].country).toBe('US');
      expect(results[0].type).toBe('Common Stock');
    });
    
    it('should handle empty search results', async () => {
      (client as any).makeRequest.mockResolvedValueOnce([]);
      
      const results = await client.searchSymbols('INVALID');
      
      expect(results).toHaveLength(0);
    });
  });
  
  describe('getMarketNews', () => {
    it('should fetch market news without symbol filter', async () => {
      const mockData = [
        {
          id: 1,
          site: 'Reuters',
          title: 'Apple Reports Strong Q2 Earnings',
          text: 'Apple Inc. reported better-than-expected quarterly earnings...',
          url: 'https://example.com/apple-earnings',
          publishedDate: '2023-05-15T10:00:00Z',
          image: 'https://example.com/apple-image.jpg',
          symbols: ['AAPL']
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const news = await client.getMarketNews();
      
      expect(news).toHaveLength(1);
      expect(news[0].id).toBe(1);
      expect(news[0].source).toBe('Reuters');
      expect(news[0].title).toBe('Apple Reports Strong Q2 Earnings');
      expect(news[0].summary).toBe('Apple Inc. reported better-than-expected quarterly earnings...');
      expect(news[0].url).toBe('https://example.com/apple-earnings');
      expect(news[0].publishedAt).toEqual(new Date('2023-05-15T10:00:00Z'));
      expect(news[0].imageUrl).toBe('https://example.com/apple-image.jpg');
      expect(news[0].relatedSymbols).toEqual(['AAPL']);
    });
    
    it('should fetch market news filtered by symbols', async () => {
      const mockData = [
        {
          id: 1,
          site: 'Reuters',
          title: 'Apple Reports Strong Q2 Earnings',
          text: 'Apple Inc. reported better-than-expected quarterly earnings...',
          url: 'https://example.com/apple-earnings',
          publishedDate: '2023-05-15T10:00:00Z',
          image: 'https://example.com/apple-image.jpg',
          symbols: ['AAPL']
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const news = await client.getMarketNews(['AAPL', 'MSFT'], 5);
      
      expect(news).toHaveLength(1);
      expect((client as any).makeRequest).toHaveBeenCalledWith(
        'https://financialmodelingprep.com/api/v3/stock_news?tickers=AAPL,MSFT'
      );
    });
    
    it('should limit news results', async () => {
      const mockData = [
        { id: 1, site: 'Reuters', title: 'News 1', text: 'Text 1', url: 'url1', publishedDate: '2023-05-15T10:00:00Z', image: 'img1', symbols: [] },
        { id: 2, site: 'Bloomberg', title: 'News 2', text: 'Text 2', url: 'url2', publishedDate: '2023-05-15T11:00:00Z', image: 'img2', symbols: [] },
        { id: 3, site: 'CNBC', title: 'News 3', text: 'Text 3', url: 'url3', publishedDate: '2023-05-15T12:00:00Z', image: 'img3', symbols: [] }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const news = await client.getMarketNews(undefined, 2);
      
      expect(news).toHaveLength(2);
      expect(news[0].id).toBe(1);
      expect(news[1].id).toBe(2);
    });
  });
  
  describe('helper methods', () => {
    describe('calculateVolumeMetrics', () => {
      it('should calculate volume metrics from historical data', () => {
        const historicalData = [
          { timestamp: subDays(mockNow, 2), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
          { timestamp: subDays(mockNow, 1), open: 105, high: 115, low: 95, close: 110, volume: 2000 },
          { timestamp: mockNow, open: 110, high: 120, low: 100, close: 115, volume: 3000 }
        ];
        
        const metrics = (client as any).calculateVolumeMetrics(historicalData);
        
        expect(metrics.avgDailyVolume).toBe(2000);
        expect(metrics.avgDailyVolumeDollar).toBe(223333); // (1000*105 + 2000*110 + 3000*115) / 3 = 670000 / 3 = 223333
        expect(metrics.currentVolume).toBe(3000);
      });
      
      it('should handle empty historical data', () => {
        const metrics = (client as any).calculateVolumeMetrics([]);
        
        expect(metrics.avgDailyVolume).toBe(0);
        expect(metrics.avgDailyVolumeDollar).toBe(0);
        expect(metrics.currentVolume).toBe(0);
      });
    });
    
    describe('calculatePerformanceMetrics', () => {
      it('should calculate performance metrics', () => {
        const historicalData = [
          { timestamp: subDays(mockNow, 10), open: 100, high: 110, low: 90, close: 100, volume: 1000 },
          { timestamp: subDays(mockNow, 5), open: 100, high: 110, low: 90, close: 105, volume: 1000 },
          { timestamp: mockNow, open: 105, high: 115, low: 95, close: 110, volume: 1000 }
        ];
        
        const currentPrice = 110;
        const metrics = (client as any).calculatePerformanceMetrics(historicalData, currentPrice, mockNow);
        
        expect(metrics.oneWeek).toBeDefined();
        expect(metrics.oneMonth).toBeDefined();
        expect(metrics.threeMonth).toBeDefined();
        expect(metrics.oneYear).toBeDefined();
        expect(metrics.yearToDate).toBeDefined();
      });
    });
    
    describe('getFiscalQuarter', () => {
      it('should return correct fiscal quarter for different months', () => {
        expect((client as any).getFiscalQuarter(new Date('2023-01-15'))).toBe('Q1');
        expect((client as any).getFiscalQuarter(new Date('2023-04-15'))).toBe('Q2');
        expect((client as any).getFiscalQuarter(new Date('2023-07-15'))).toBe('Q3');
        expect((client as any).getFiscalQuarter(new Date('2023-10-15'))).toBe('Q4');
      });
    });
  });
});