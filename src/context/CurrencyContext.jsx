import React, { createContext, useContext, useState, useEffect } from 'react';

export const SUPPORTED_CURRENCIES = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    rateToUSD: 1.0,
    decimals: 2
  },
  LKR: {
    code: 'LKR',
    name: 'Sri Lankan Rupee',
    symbol: '₨',
    flag: '🇱🇰',
    rateToUSD: 310.0,
    decimals: 0
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    rateToUSD: 0.92,
    decimals: 2
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    rateToUSD: 0.79,
    decimals: 2
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    rateToUSD: 3.67,
    decimals: 2
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    flag: '🇸🇬',
    rateToUSD: 1.35,
    decimals: 2
  }
};

const STORAGE_KEY = 'rwa_platform_preferred_currency';

const CurrencyContext = createContext(undefined);

export function CurrencyProvider({ children }) {
  // Default to USD or read from localStorage
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_CURRENCIES[saved]) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to access localStorage for currency:', e);
    }
    return 'USD';
  });

  const changeCurrency = (currencyCode) => {
    if (SUPPORTED_CURRENCIES[currencyCode]) {
      setSelectedCurrency(currencyCode);
      try {
        localStorage.setItem(STORAGE_KEY, currencyCode);
      } catch (e) {
        console.warn('Failed to save currency to localStorage:', e);
      }
    }
  };

  const currentCurrencyInfo = SUPPORTED_CURRENCIES[selectedCurrency] || SUPPORTED_CURRENCIES.USD;

  /**
   * Convert an amount from one currency to another (via USD peg)
   */
  const convertAmount = (amount, fromCode = 'USD', toCode = selectedCurrency) => {
    const num = Number(amount) || 0;
    if (num === 0) return 0;

    const fromCurrency = SUPPORTED_CURRENCIES[fromCode] || (fromCode === 'mUSD' ? SUPPORTED_CURRENCIES.USD : SUPPORTED_CURRENCIES.LKR);
    const toCurrency = SUPPORTED_CURRENCIES[toCode] || SUPPORTED_CURRENCIES.USD;

    // Convert from origin currency to USD base
    const amountInUSD = num / (fromCurrency.rateToUSD || 1.0);

    // Convert from USD base to target currency
    return amountInUSD * (toCurrency.rateToUSD || 1.0);
  };

  /**
   * Format an amount from any currency into the currently selected currency
   */
  const formatAmount = (amount, fromCode = 'USD', options = {}) => {
    const num = Number(amount) || 0;
    const converted = convertAmount(num, fromCode, selectedCurrency);
    const curr = currentCurrencyInfo;

    const {
      showCode = false,
      compact = false,
      minimumFractionDigits = curr.decimals,
      maximumFractionDigits = curr.decimals
    } = options;

    if (compact) {
      if (Math.abs(converted) >= 1_000_000) {
        return `${curr.symbol}${(converted / 1_000_000).toFixed(1)}M${showCode ? ` ${curr.code}` : ''}`;
      }
      if (Math.abs(converted) >= 1_000) {
        return `${curr.symbol}${(converted / 1_000).toFixed(1)}k${showCode ? ` ${curr.code}` : ''}`;
      }
    }

    const formattedNum = converted.toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    });

    return `${curr.symbol} ${formattedNum}${showCode ? ` ${curr.code}` : ''}`;
  };

  /**
   * Specific helper to convert on-chain LKR valuations to selected currency
   */
  const formatLKR = (lkrAmount, options = {}) => {
    return formatAmount(lkrAmount, 'LKR', options);
  };

  /**
   * Specific helper to convert mUSD (USD-pegged ERC20) amounts to selected currency
   */
  const formatMUSD = (mUsdAmount, options = {}) => {
    return formatAmount(mUsdAmount, 'USD', options);
  };

  const value = {
    currency: selectedCurrency,
    currencyInfo: currentCurrencyInfo,
    currencies: SUPPORTED_CURRENCIES,
    setCurrency: changeCurrency,
    convert: convertAmount,
    format: formatAmount,
    formatLKR,
    formatMUSD
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
