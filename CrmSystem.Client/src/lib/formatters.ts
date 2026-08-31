import { formatCurrencyGlobal } from '../context/SystemProfileContext';

export { formatCurrencyGlobal };

export const formatCurrency = (
  value: number,
  currency = 'USD',
  maximumFractionDigits = 0
): string => {
  return formatCurrencyGlobal(value, currency, maximumFractionDigits);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0);
};

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${(Number(value) || 0).toFixed(decimals)}%`;
};
