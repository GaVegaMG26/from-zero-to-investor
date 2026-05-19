export function calcMonthsToPayoff(balance, annualRate, monthlyPayment) {
  if (!balance || balance <= 0) return 0;
  if (!monthlyPayment || monthlyPayment <= 0) return Infinity;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);
  const interest = balance * monthlyRate;
  if (monthlyPayment <= interest) return Infinity;
  return Math.ceil(-Math.log(1 - interest / monthlyPayment) / Math.log(1 + monthlyRate));
}

export function calcTotalInterest(balance, annualRate, monthlyPayment) {
  const months = calcMonthsToPayoff(balance, annualRate, monthlyPayment);
  if (!isFinite(months)) return Infinity;
  return Math.max(0, months * monthlyPayment - balance);
}

export function calcDebtFreeDate(balance, annualRate, monthlyPayment) {
  const months = calcMonthsToPayoff(balance, annualRate, monthlyPayment);
  if (!isFinite(months)) return null;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

export function calcFinancialScore({ savingsRate, fundMonths, highestRate, netFlow }) {
  let score = 0;
  // Net flow (0–25)
  if (netFlow > 0) score += 25;
  else if (netFlow === 0) score += 10;
  // Savings rate (0–25)
  if (savingsRate >= 20) score += 25;
  else if (savingsRate >= 15) score += 20;
  else if (savingsRate >= 10) score += 14;
  else if (savingsRate > 0) score += 7;
  // Emergency fund (0–25)
  if (fundMonths >= 6) score += 25;
  else if (fundMonths >= 3) score += 18;
  else if (fundMonths >= 1) score += 10;
  else if (fundMonths > 0) score += 5;
  // Debt rate (0–25)
  if (highestRate === 0) score += 25;
  else if (highestRate <= 5) score += 20;
  else if (highestRate <= 15) score += 13;
  else if (highestRate <= 30) score += 5;
  return Math.round(Math.min(100, score));
}

export function calcTrafficLight({ highestRate, netFlow, fundMonths, savingsRate }) {
  if (highestRate > 15 || netFlow < 0 || fundMonths === 0) return 'red';
  if (highestRate <= 15 && netFlow > 0 && fundMonths >= 1 && fundMonths < 3) return 'yellow';
  if (highestRate <= 15 && netFlow > 0 && fundMonths >= 3 && savingsRate < 15) return 'yellow';
  if (highestRate <= 15 && netFlow > 0 && fundMonths >= 3 && savingsRate >= 15) return 'green';
  return 'yellow';
}

export function calcStockScore({ pe, profitMargin, debtEquity, priceVsMA, newsSentiment }) {
  let score = 0;
  if (pe !== null && pe !== undefined) {
    if (pe < 15) score += 2;
    else if (pe <= 25) score += 1;
    else if (pe > 35) score -= 2;
  }
  if (profitMargin !== null && profitMargin !== undefined) {
    if (profitMargin > 15) score += 2;
    else if (profitMargin >= 5) score += 1;
    else if (profitMargin < 0) score -= 3;
  }
  if (debtEquity !== null && debtEquity !== undefined) {
    if (debtEquity < 0.5) score += 1;
    else if (debtEquity > 2) score -= 2;
  }
  if (priceVsMA !== null && priceVsMA !== undefined) {
    if (priceVsMA > 0) score += 1;
    else score -= 1;
  }
  if (newsSentiment !== null && newsSentiment !== undefined) {
    if (newsSentiment > 0.6) score += 1;
    else if (newsSentiment < 0.4) score -= 1;
  }
  return score;
}

export function calcRiskScore({ pe, debtEquity, profitMargin, marketCap }) {
  let risk = 0;
  if (pe !== null && pe !== undefined) {
    if (pe > 40) risk += 2;
    else if (pe >= 20) risk += 1;
  }
  if (debtEquity !== null && debtEquity !== undefined) {
    if (debtEquity > 2) risk += 2;
    else if (debtEquity >= 1) risk += 1;
  }
  if (profitMargin !== null && profitMargin !== undefined) {
    if (profitMargin < 5) risk += 2;
    else if (profitMargin <= 15) risk += 1;
  }
  if (marketCap !== null && marketCap !== undefined) {
    const capB = marketCap / 1e9;
    if (capB < 2) risk += 2;
    else if (capB < 10) risk += 1;
  }
  return Math.max(1, Math.min(10, risk));
}

export function calc20DayMA(candles) {
  if (!candles || candles.length < 20) return null;
  const last20 = candles.slice(-20).map(c => c.close);
  return last20.reduce((a, b) => a + b, 0) / 20;
}

export function calcNewsSentiment(articles) {
  if (!articles || articles.length === 0) return null;
  const BULLISH = ['surge', 'soar', 'gain', 'rise', 'rally', 'beat', 'record', 'profit', 'growth', 'positive', 'strong', 'upgrade', 'buy', 'bullish', 'outperform', 'boost'];
  const BEARISH = ['fall', 'drop', 'decline', 'loss', 'miss', 'weak', 'cut', 'downgrade', 'sell', 'bearish', 'risk', 'concern', 'warning', 'plunge', 'crash', 'layoff'];
  let bullish = 0, bearish = 0;
  articles.forEach(a => {
    const text = (a.headline || '').toLowerCase();
    if (BULLISH.some(w => text.includes(w))) bullish++;
    else if (BEARISH.some(w => text.includes(w))) bearish++;
  });
  const total = bullish + bearish;
  if (total === 0) return 0.5;
  return bullish / total;
}

export function getArticleSentiment(headline) {
  const BULLISH = ['surge', 'soar', 'gain', 'rise', 'rally', 'beat', 'record', 'profit', 'growth', 'positive', 'strong', 'upgrade', 'buy', 'bullish', 'outperform', 'boost'];
  const BEARISH = ['fall', 'drop', 'decline', 'loss', 'miss', 'weak', 'cut', 'downgrade', 'sell', 'bearish', 'risk', 'concern', 'warning', 'plunge', 'crash', 'layoff'];
  const text = (headline || '').toLowerCase();
  if (BULLISH.some(w => text.includes(w))) return 'bullish';
  if (BEARISH.some(w => text.includes(w))) return 'bearish';
  return 'neutral';
}
