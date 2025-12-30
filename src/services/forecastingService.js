import { getShiftData, getHoursData, getApplicants, getNewStartsSummary } from './firestoreService';
import logger from '../utils/logger';

/**
 * Generate staffing forecast based on historical data and trends
 * @param {Date} forecastStartDate - Start date for forecast
 * @param {number} forecastDays - Number of days to forecast
 * @returns {Object} Forecast data with recommendations
 */
export const generateForecast = async (forecastStartDate, forecastDays = 30) => {
  try {
    // Get historical data (last 90 days)
    const historicalStartDate = new Date(forecastStartDate);
    historicalStartDate.setDate(historicalStartDate.getDate() - 90);

    const [shiftResult, hoursResult, applicantsResult] = await Promise.all([
      getShiftData(historicalStartDate, forecastStartDate),
      getHoursData(historicalStartDate, forecastStartDate),
      getApplicants()
    ]);

    if (!shiftResult.success || !hoursResult.success) {
      throw new Error('Failed to fetch historical data');
    }

    const shiftData = shiftResult.data;
    const applicants = applicantsResult.data || [];

    // Calculate key metrics
    const metrics = calculateMetrics(shiftData);

    // Reconcile new starts across sources to compute a more accurate avgNewStarts
    try {
      const ns = await getNewStartsSummary(historicalStartDate, forecastStartDate);
      if (ns.success) {
        metrics.avgNewStarts = ns.data.chosenCount / Math.max(1, shiftData.length);
      }
    } catch (err) {
      logger.warn('Unable to reconcile new starts for forecast:', err);
    }

    // Detect seasonal trends
    const seasonalTrend = detectSeasonalTrend(shiftData);

    // Calculate turnover rate
    const turnoverRate = calculateTurnoverRate(shiftData);

    // Predict future headcount needs
    const forecastedHeadcount = predictHeadcount(
      metrics.avgHeadcount,
      seasonalTrend,
      turnoverRate,
      forecastDays
    );

    // Calculate recruiting recommendations
    const recruitingPlan = generateRecruitingPlan(
      forecastedHeadcount,
      metrics.avgHeadcount,
      turnoverRate,
      applicants
    );

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(shiftData.length, metrics.variance);

    return {
      success: true,
      forecast: {
        currentAvgHeadcount: Math.round(metrics.avgHeadcount),
        predictedHeadcount: Math.round(forecastedHeadcount),
        headcountChange: Math.round(forecastedHeadcount - metrics.avgHeadcount),
        turnoverRate: turnoverRate.toFixed(2),
        seasonalTrend: seasonalTrend.trend,
        seasonalFactor: seasonalTrend.factor,
        confidenceScore: confidenceScore,
        recruitingPlan,
        metrics: {
          avgAttendanceShift1: metrics.avgShift1,
          avgAttendanceShift2: metrics.avgShift2,
          avgSendHomes: metrics.avgSendHomes,
          avgNewStarts: metrics.avgNewStarts,
          totalDataPoints: shiftData.length
        }
      }
    };
  } catch (error) {
    logger.error('Error generating forecast:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate key metrics from historical shift data
 */
function calculateMetrics(shiftData) {
  if (shiftData.length === 0) {
    return {
      avgHeadcount: 0,
      avgShift1: 0,
      avgShift2: 0,
      avgSendHomes: 0,
      avgNewStarts: 0,
      variance: 0
    };
  }

  let totalHeadcount = 0;
  let shift1Count = 0;
  let shift2Count = 0;
  let shift1Total = 0;
  let shift2Total = 0;
  let sendHomesTotal = 0;
  let newStartsTotal = 0;
  const headcounts = [];

  shiftData.forEach(shift => {
    const headcount = shift.numberWorking || 0;
    totalHeadcount += headcount;
    headcounts.push(headcount);

    if (shift.shift === '1st') {
      shift1Total += headcount;
      shift1Count++;
    } else if (shift.shift === '2nd') {
      shift2Total += headcount;
      shift2Count++;
    }

    sendHomesTotal += shift.sendHomes || 0;
    newStartsTotal += shift.newStarts?.length || 0;
  });

  const avgHeadcount = totalHeadcount / shiftData.length;

  // Calculate variance
  const variance = headcounts.reduce((sum, val) => {
    return sum + Math.pow(val - avgHeadcount, 2);
  }, 0) / headcounts.length;

  return {
    avgHeadcount,
    avgShift1: shift1Count > 0 ? shift1Total / shift1Count : 0,
    avgShift2: shift2Count > 0 ? shift2Total / shift2Count : 0,
    avgSendHomes: sendHomesTotal / shiftData.length,
    avgNewStarts: newStartsTotal / shiftData.length,
    variance
  };
}

/**
 * Detect seasonal trends in the data
 */
function detectSeasonalTrend(shiftData) {
  if (shiftData.length < 30) {
    return { trend: 'insufficient_data', factor: 1.0 };
  }

  // Split data into recent (last 30 days) vs older
  const sortedData = [...shiftData].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sortedData.slice(0, 30);
  const older = sortedData.slice(30, 60);

  if (older.length === 0) {
    return { trend: 'stable', factor: 1.0 };
  }

  const recentAvg = recent.reduce((sum, s) => sum + (s.numberWorking || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + (s.numberWorking || 0), 0) / older.length;

  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

  let trend, factor;
  if (percentChange > 10) {
    trend = 'growing';
    factor = 1.15;
  } else if (percentChange < -10) {
    trend = 'declining';
    factor = 0.85;
  } else {
    trend = 'stable';
    factor = 1.0;
  }

  return { trend, factor, percentChange: percentChange.toFixed(2) };
}

/**
 * Calculate turnover rate based on send-homes and new starts
 */
function calculateTurnoverRate(shiftData) {
  if (shiftData.length === 0) return 0;

  const totalNewStarts = shiftData.reduce((sum, s) => sum + (s.newStarts?.length || 0), 0);
  const totalSendHomes = shiftData.reduce((sum, s) => sum + (s.sendHomes || 0), 0);

  // Estimate average headcount
  const avgHeadcount = shiftData.reduce((sum, s) => sum + (s.numberWorking || 0), 0) / shiftData.length;

  if (avgHeadcount === 0) return 0;

  // Monthly turnover rate estimate
  const daysCovered = shiftData.length / 2; // Assuming 2 shifts per day
  const monthlyTurnover = ((totalSendHomes + totalNewStarts) / daysCovered) * 30;

  return (monthlyTurnover / avgHeadcount) * 100;
}

/**
 * Predict future headcount based on trends
 */
function predictHeadcount(currentAvg, seasonalTrend, turnoverRate, forecastDays) {
  // Apply seasonal adjustment
  let predicted = currentAvg * seasonalTrend.factor;

  // Apply turnover adjustment (assuming replacement need)
  const turnoverAdjustment = (turnoverRate / 100) * (forecastDays / 30);
  predicted = predicted * (1 + turnoverAdjustment);

  return predicted;
}

/**
 * Generate recruiting plan recommendations
 */
function generateRecruitingPlan(forecastedHeadcount, currentHeadcount, turnoverRate, applicants) {
  const headcountGap = forecastedHeadcount - currentHeadcount;

  // Calculate pipeline status
  const pipelineCount = applicants.filter(a =>
    ['Applied', 'Interviewed', 'Processed', 'Hired'].includes(a.status)
  ).length;

  const projectedStarts = applicants.filter(a =>
    a.status === 'Hired' && a.projectedStartDate
  ).length;

  // Recommended hires accounting for turnover
  const monthlyTurnoverNeed = Math.ceil((currentHeadcount * (turnoverRate / 100)) / 12);
  const totalNeed = Math.max(0, Math.ceil(headcountGap)) + monthlyTurnoverNeed;

  const plan = {
    recommendedHires: totalNeed,
    currentPipeline: pipelineCount,
    projectedStarts: projectedStarts,
    additionalNeeded: Math.max(0, totalNeed - projectedStarts),
    urgency: 'normal'
  };

  // Determine urgency
  if (plan.additionalNeeded > 10) {
    plan.urgency = 'high';
    plan.recommendation = 'Immediate recruiting push needed. Schedule additional interview days.';
  } else if (plan.additionalNeeded > 5) {
    plan.urgency = 'medium';
    plan.recommendation = 'Increase recruiting efforts. Focus on processing current pipeline.';
  } else if (plan.additionalNeeded > 0) {
    plan.urgency = 'low';
    plan.recommendation = 'Maintain current recruiting pace. Pipeline is healthy.';
  } else {
    plan.urgency = 'none';
    plan.recommendation = 'Pipeline exceeds current needs. Focus on quality over quantity.';
  }

  return plan;
}

/**
 * Calculate confidence score for the forecast
 */
function calculateConfidenceScore(dataPoints, variance) {
  // More data points = higher confidence
  let score = Math.min(dataPoints / 90, 1) * 50; // Max 50 points for data quantity

  // Lower variance = higher confidence
  const varianceScore = Math.max(0, 50 - (variance / 10)); // Max 50 points for consistency
  score += varianceScore;

  return Math.min(Math.round(score), 100);
}

/**
 * Get recruiting timeline recommendations
 */
export const getRecruitingTimeline = (forecastData) => {
  if (!forecastData || !forecastData.recruitingPlan) {
    return [];
  }

  const plan = forecastData.recruitingPlan;
  const timeline = [];

  const today = new Date();

  // Week 1: Initial push
  timeline.push({
    week: 1,
    startDate: new Date(today),
    action: 'Post job ads and reach out to referrals',
    goal: Math.ceil(plan.additionalNeeded * 0.3),
    metric: 'Applications received'
  });

  // Week 2: Interviews
  const week2 = new Date(today);
  week2.setDate(week2.getDate() + 7);
  timeline.push({
    week: 2,
    startDate: week2,
    action: 'Schedule and conduct initial interviews',
    goal: Math.ceil(plan.additionalNeeded * 0.25),
    metric: 'Interviews completed'
  });

  // Week 3: Processing
  const week3 = new Date(today);
  week3.setDate(week3.getDate() + 14);
  timeline.push({
    week: 3,
    startDate: week3,
    action: 'Process applications and extend offers',
    goal: Math.ceil(plan.additionalNeeded * 0.20),
    metric: 'Offers extended'
  });

  // Week 4: Onboarding
  const week4 = new Date(today);
  week4.setDate(week4.getDate() + 21);
  timeline.push({
    week: 4,
    startDate: week4,
    action: 'Onboard new hires and schedule start dates',
    goal: plan.additionalNeeded,
    metric: 'New starts scheduled'
  });

  return timeline;
};
