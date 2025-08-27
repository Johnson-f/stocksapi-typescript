import { FinnhubClient } from '../src/providers/finnhub';
import { subDays, subMonths, subYears, startOfYear } from 'date-fns';

describe('FinnhubClient', () => {
  let client: FinnhubClient;
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
    client = new FinnhubClient(mockApiKey);
    // Mock the makeRequest method for testing
    (client as any).makeRequest = jest.fn();
    jest.clearAllMocks();
  });
  
  describe('getQuote', () => {
    it('should fetch and map a stock quote with historical data', async () => {
      // Mock the makeRequest method for the quote
      (client as any).makeRequest
        .mockResolvedValueOnce({
          c: 150.25,  // current price
          d: 1.25,    // change
          dp: 0.84,   // percent change
          h: 151.50,  // high
          l: 149.75,  // low
          o: 150.00,  // open
          pc: 149.00, // previous close
          t: Math.floor(mockNow.getTime() / 1000) // timestamp
        })
        // Mock historical data response
        .mockResolvedValueOnce({
          s: 'ok',
          t: [
            Math.floor(subDays(mockNow, 2).getTime() / 1000),
            Math.floor(subDays(mockNow, 1).getTime() / 1000),
            Math.floor(mockNow.getTime() / 1000)
          ],
          o: [148.5, 149.0, 150.0],
          h: [149.0, 150.0, 151.5],
          l: [148.0, 148.5, 149.75],
          c: [148.75, 149.5, 150.25],
          v: [500000, 750000, 1000000]
        });
      
      const quote = await client.getQuote('AAPL');
      
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(1.25);
      expect(quote.changePercent).toBe(0.84);
      expect(quote.high).toBe(151.50);
      expect(quote.low).toBe(149.75);
      expect(quote.open).toBe(150.00);
      expect(quote.previousClose).toBe(149.00);
      
      // Verify volume metrics
      expect(quote.volumeMetrics).toBeDefined();
      expect(quote.volumeMetrics?.currentVolume).toBe(1000000);
      
      // Verify performance metrics
      expect(quote.performance).toBeDefined();
      expect(quote.performance?.oneWeek).toBeDefined();
    });
    
    it('should handle API errors gracefully', async () => {
      (client as any).makeRequest.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(client.getQuote('INVALID')).rejects.toThrow('API Error');
    });
  });
  
  describe('getQuotes', () => {
    it('should fetch multiple stock quotes', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Set up mock responses for each symbol (2 calls per symbol: quote + historical)
      symbols.forEach(symbol => {
        // First call: Quote
        (client as any).makeRequest
          .mockResolvedValueOnce({
            c: 150.25,
            d: 1.25,
            dp: 0.84,
            h: 151.50,
            l: 149.75,
            o: 150.00,
            pc: 149.00,
            t: Math.floor(mockNow.getTime() / 1000)
          })
          // Second call: Historical data
          .mockResolvedValueOnce({
            s: 'ok',
            t: [Math.floor(subDays(mockNow, 1).getTime() / 1000)],
            o: [149.0],
            h: [150.0],
            l: [148.5],
            c: [149.5],
            v: [1000000]
          });
      });
      
      const results = await client.getQuotes(symbols);
      
      expect(Object.keys(results)).toHaveLength(3);
      expect(results['AAPL'].success).toBe(true);
      expect(results['AAPL'].data?.price).toBe(150.25);
      expect(results['MSFT'].success).toBe(true);
      expect(results['GOOGL'].success).toBe(true);
    });
    
    it('should handle partial failures', async () => {
      (client as any).makeRequest
        .mockResolvedValueOnce({
          c: 150.25,
          d: 1.25,
          dp: 0.84,
          t: Math.floor(mockNow.getTime() / 1000)
        })
        .mockResolvedValueOnce({ s: 'ok', t: [], o: [], h: [], l: [], c: [], v: [] })
        .mockRejectedValueOnce(new Error('API Error'));
      
      const results = await client.getQuotes(['AAPL', 'INVALID']);
      
      expect(results['AAPL'].success).toBe(true);
      expect(results['INVALID'].success).toBe(false);
      expect(results['INVALID'].error).toBeDefined();
    });
  });
  
  describe('getCompanyProfile', () => {
    it('should fetch and map company profile data', async () => {
      const mockProfile = {
        name: 'Apple Inc',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        ipo: '1980-12-12',
        marketCapitalization: 2500000000000,
        shareOutstanding: 16000000000,
        weburl: 'https://www.apple.com',
        logo: 'https://logo.clearbit.com/apple.com',
        finnhubIndustry: 'Technology',
        country: 'US',
        currency: 'USD'
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockProfile);
      
      const profile = await client.getCompanyProfile('AAPL');
      
      expect(profile.symbol).toBe('AAPL');
      expect(profile.name).toBe('Apple Inc');
      expect(profile.exchange).toBe('NASDAQ');
      expect(profile.currency).toBe('USD');
      expect(profile.sector).toBe('Technology');
      expect(profile.industry).toBe('Technology');
      expect(profile.website).toBe('https://www.apple.com');
      expect(profile.logo).toBe('https://logo.clearbit.com/apple.com');
      expect(profile.marketCap).toBe(2500000000000);
      expect(profile.ipoDate).toEqual(new Date('1980-12-12'));
    });
    
    it('should handle missing optional fields', async () => {
      const minimalProfile = {
        name: 'Test Company',
        ticker: 'TEST',
        exchange: 'TEST',
        ipo: '2020-01-01',
        marketCapitalization: 1000000,
        shareOutstanding: 1000000,
        weburl: '',
        logo: '',
        finnhubIndustry: 'Test',
        country: 'US',
        currency: 'USD'
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(minimalProfile);
      
      const profile = await client.getCompanyProfile('TEST');
      
      expect(profile.symbol).toBe('TEST');
      expect(profile.name).toBe('Test Company');
      expect(profile.website).toBe('');
      expect(profile.logo).toBe('');
    });
  });
  
  describe('getTimeSeries', () => {
    it('should fetch and map time series data', async () => {
      const mockData = {
        s: 'ok',
        t: [
          Math.floor(subDays(mockNow, 2).getTime() / 1000),
          Math.floor(subDays(mockNow, 1).getTime() / 1000),
          Math.floor(mockNow.getTime() / 1000)
        ],
        o: [148.5, 149.0, 150.0],
        h: [149.0, 150.0, 151.5],
        l: [148.0, 148.5, 149.75],
        c: [148.75, 149.5, 150.25],
        v: [500000, 750000, 1000000]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockData);
      
      const timeSeries = await client.getTimeSeries('AAPL', 'daily', 3);
      
      expect(timeSeries).toHaveLength(3);
      expect(timeSeries[0].timestamp).toBeInstanceOf(Date);
      expect(timeSeries[0].open).toBe(148.5);
      expect(timeSeries[0].high).toBe(149.0);
      expect(timeSeries[0].low).toBe(148.0);
      expect(timeSeries[0].close).toBe(148.75);
      expect(timeSeries[0].volume).toBe(500000);
    });
    
    it('should handle empty time series response', async () => {
      (client as any).makeRequest.mockResolvedValueOnce({
        s: 'ok',
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: []
      });
      
      const timeSeries = await client.getTimeSeries('AAPL', 'daily', 5);
      expect(timeSeries).toHaveLength(0);
    });
    
    it('should handle different intervals', async () => {
      (client as any).makeRequest.mockResolvedValueOnce({
        s: 'ok',
        t: [Math.floor(mockNow.getTime() / 1000)],
        o: [150.0],
        h: [151.0],
        l: [149.0],
        c: [150.5],
        v: [1000000]
      });
      
      await client.getTimeSeries('AAPL', '1min', 1);
      expect((client as any).makeRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          resolution: '1'
        })
      );
    });
  });
  
  describe('getFinancialMetrics', () => {
    it('should fetch and map financial metrics', async () => {
      const mockMetrics = {
        metric: {
          marketCapitalization: 2500000000000,
          peNormalizedAnnual: 28.5,
          pegRatio: 2.1,
          priceBookValueRatioAnnual: 35.2,
          enterpriseValueEbitdaAnnual: 22.1,
          enterpriseValueRevenueAnnual: 7.5,
          revenuePerShareAnnual: 23.75,
          ebitdPerShareAnnual: 8.2,
          netProfitMarginAnnual: 0.25,
          debtEquityRatioAnnual: 1.5,
          dividendYieldIndicatedAnnual: 0.0058,
          beta: 1.23,
          '52WeekHigh': 182.94,
          '52WeekLow': 124.17,
          sharesOutstanding: 16000000000
        },
        series: {
          annual: {},
          quarterly: {}
        }
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockMetrics);
      
      const metrics = await client.getFinancialMetrics('AAPL');
      
      expect(metrics.symbol).toBe('AAPL');
      expect(metrics.marketCap).toBe(2500000000000);
      expect(metrics.peRatio).toBe(28.5);
      expect(metrics.pegRatio).toBe(2.1);
      expect(metrics.priceToBookRatio).toBe(35.2);
      expect(metrics.evToEbitda).toBe(22.1);
      expect(metrics.evToRevenue).toBe(7.5);
      expect(metrics.revenue).toBe(23.75 * 16000000000); // revenuePerShare * sharesOutstanding
      expect(metrics.ebitda).toBe(8.2 * 16000000000); // ebitdPerShare * sharesOutstanding
      expect(metrics.profitMargin).toBe(0.25);
      expect(metrics.debtToEquity).toBe(1.5);
      expect(metrics.dividendYield).toBe(0.0058);
      expect(metrics.beta).toBe(1.23);
      expect(metrics.fiftyTwoWeekHigh).toBe(182.94);
      expect(metrics.fiftyTwoWeekLow).toBe(124.17);
      expect(metrics.sharesOutstanding).toBe(16000000000);
    });
  });
  
  describe('getDividends', () => {
    it('should fetch and map dividend data', async () => {
      const mockDividends = [
        {
          symbol: 'AAPL',
          date: '2023-05-12',
          amount: 0.23,
          declaredDate: '2023-05-04',
          recordDate: '2023-05-15',
          paymentDate: '2023-05-18',
          currency: 'USD'
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockDividends);
      
      const dividends = await client.getDividends('AAPL');
      
      expect(dividends).toHaveLength(1);
      expect(dividends[0].symbol).toBe('AAPL');
      expect(dividends[0].amount).toBe(0.23);
      expect(dividends[0].exDate).toEqual(new Date('2023-05-12'));
      expect(dividends[0].declarationDate).toEqual(new Date('2023-05-04'));
      expect(dividends[0].recordDate).toEqual(new Date('2023-05-15'));
      expect(dividends[0].paymentDate).toEqual(new Date('2023-05-18'));
      expect(dividends[0].currency).toBe('USD');
    });
  });
  
  describe('getEarnings', () => {
    it('should fetch and map earnings data', async () => {
      const mockEarnings = {
        earnings: [
          {
            period: '2023-03-31',
            symbol: 'AAPL',
            year: 2023,
            quarter: 1,
            surprise: 0.05,
            surprisePercent: 2.5,
            actual: 1.52,
            estimate: 1.47,
            date: '2023-04-27 16:30:00'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockEarnings);
      
      const earnings = await client.getEarnings('AAPL');
      
      expect(earnings).toHaveLength(1);
      expect(earnings[0].symbol).toBe('AAPL');
      expect(earnings[0].reportedEPS).toBe(1.52);
      expect(earnings[0].estimatedEPS).toBe(1.47);
      expect(earnings[0].surprise).toBe(0.05);
      expect(earnings[0].surprisePercentage).toBe(2.5);
      expect(earnings[0].period).toBe('Q1');
      expect(earnings[0].year).toBe(2023);
      expect(earnings[0].reportedDate).toEqual(new Date('2023-04-27T15:30:00.000Z'));
    });
  });
  
  describe('getUpcomingEarnings', () => {
    it('should fetch and map upcoming earnings data', async () => {
      const mockUpcomingEarnings = [
        {
          symbol: 'AAPL',
          date: '2023-07-27',
          hour: 'amc',
          year: 2023,
          quarter: 3,
          epsEstimate: 1.19,
          revenueEstimateLow: 81500000000,
          revenueEstimateHigh: 83500000000,
          revenueEstimateAvg: 82500000000
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockUpcomingEarnings);
      
      const upcomingEarnings = await client.getUpcomingEarnings({
        startDate: new Date('2023-07-01'),
        endDate: new Date('2023-08-31')
      });
      
      expect(upcomingEarnings).toHaveLength(1);
      expect(upcomingEarnings[0].symbol).toBe('AAPL');
      expect(upcomingEarnings[0].estimatedEPS).toBe(1.19);
      expect(upcomingEarnings[0].period).toBe('Q3');
      expect(upcomingEarnings[0].year).toBe(2023);
      expect(upcomingEarnings[0].time).toBe('amc');
      expect(upcomingEarnings[0].isFutureReport).toBe(true);
    });
  });
  
  describe('searchSymbols', () => {
    it('should search for symbols and map results', async () => {
      const mockSearchResults = {
        result: [
          {
            symbol: 'AAPL',
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            type: 'Common Stock',
            currency: 'USD'
          },
          {
            symbol: 'AAPL.SW',
            description: 'Apple Inc',
            displaySymbol: 'AAPL.SW',
            type: 'Common Stock',
            currency: 'CHF'
          }
        ]
      };
      
      (client as any).makeRequest.mockResolvedValueOnce(mockSearchResults);
      
      const results = await client.searchSymbols('apple');
      
      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toBe('Apple Inc');
      expect(results[0].currency).toBe('USD');
      expect(results[1].symbol).toBe('AAPL.SW');
      expect(results[1].currency).toBe('CHF');
    });
  });
  
  describe('getMarketNews', () => {
    it('should fetch and map market news', async () => {
      const mockNews = [
        {
          category: 'company',
          datetime: Math.floor(new Date('2023-05-15T14:30:00Z').getTime() / 1000),
          headline: 'Apple announces new product',
          id: 12345,
          image: 'https://example.com/image.jpg',
          related: 'AAPL',
          source: 'News Source',
          summary: 'Apple has announced a new product...',
          url: 'https://example.com/news/12345'
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockNews);
      
      const news = await client.getMarketNews(['AAPL'], 10);
      
      expect(news).toHaveLength(1);
      expect(news[0].id).toBe('12345');
      expect(news[0].title).toBe('Apple announces new product');
      expect(news[0].source).toBe('News Source');
      expect(news[0].summary).toBe('Apple has announced a new product...');
      expect(news[0].url).toBe('https://example.com/news/12345');
      expect(news[0].imageUrl).toBe('https://example.com/image.jpg');
      expect(news[0].relatedSymbols).toEqual(['AAPL']);
      expect(news[0].publishedAt).toEqual(new Date('2023-05-15T14:30:00.000Z'));
    });
    
    it('should filter news by symbols', async () => {
      const mockNews = [
        {
          category: 'company',
          datetime: Math.floor(Date.now() / 1000) - 3600,
          headline: 'Apple announces new product',
          id: 12345,
          image: '',
          related: 'AAPL',
          source: 'News Source',
          summary: 'Apple has announced a new product...',
          url: 'https://example.com/news/12345'
        },
        {
          category: 'company',
          datetime: Math.floor(Date.now() / 1000) - 7200,
          headline: 'Microsoft cloud growth',
          id: 12346,
          image: '',
          related: 'MSFT',
          source: 'News Source',
          summary: 'Microsoft reports strong cloud growth...',
          url: 'https://example.com/news/12346'
        }
      ];
      
      (client as any).makeRequest.mockResolvedValueOnce(mockNews);
      
      const news = await client.getMarketNews(['AAPL'], 10);
      
      expect(news).toHaveLength(1);
      expect(news[0].title).toBe('Apple announces new product');
    });
  });
});
