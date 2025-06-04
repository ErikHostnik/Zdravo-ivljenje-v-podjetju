import { subDays, eachDayOfInterval, format, parseISO } from 'date-fns';

// Generate last 7 days with filled data
export const getWeeklyData = (stats) => {
  const end = new Date();
  const start = subDays(end, 6);
  const dateRange = eachDayOfInterval({ start, end });
  
  return dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const stat = stats.find(s => 
      format(parseISO(s.date), 'yyyy-MM-dd') === dateStr
    );
    
    return {
      date: dateStr,
      stepCount: stat?.stepCount || 0,
      distance: stat?.distance || 0,
      speed: stat?.speed || 0,
      altitude: stat?.altitude || 0
    };
  });
};

// Aggregate yearly data by month
export const getYearlyData = (stats, year) => {
  const monthlyAggregate = Array(12).fill().map(() => ({
    steps: 0,
    distance: 0,
    speedSum: 0,
    speedCount: 0,
    altitude: 0,
    count: 0
  }));

  stats.forEach(stat => {
    const date = new Date(stat.date);
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      monthlyAggregate[month].steps += stat.stepCount;
      monthlyAggregate[month].distance += stat.distance;
      if (stat.speed !== undefined) {
        monthlyAggregate[month].speedSum += stat.speed;
        monthlyAggregate[month].speedCount++;
      }
      monthlyAggregate[month].altitude += stat.altitude || 0;
      monthlyAggregate[month].count++;
    }
  });

  return monthlyAggregate.map((data, index) => ({
    month: new Date(year, index).toLocaleString('sl-SI', { month: 'short' }),
    avgSteps: data.count ? Math.round(data.steps / data.count) : 0,
    totalDistance: data.distance,
    avgSpeed: data.speedCount ? (data.speedSum / data.speedCount) : 0,
    totalAltitude: data.altitude
  }));
};

// Calculate lifetime stats
export const getLifetimeStats = (stats) => {
  return stats.reduce((acc, stat) => ({
    totalSteps: acc.totalSteps + stat.stepCount,
    totalDistance: acc.totalDistance + stat.distance,
    totalCalories: acc.totalCalories + (stat.stepCount * 0.04),
    totalSpeed: acc.totalSpeed + (stat.speed || 0),
    totalAltitude: acc.totalAltitude + (stat.altitude || 0),
    daysCount: acc.daysCount + 1
  }), {
    totalSteps: 0,
    totalDistance: 0,
    totalCalories: 0,
    totalSpeed: 0,
    totalAltitude: 0,
    daysCount: 0
  });
};

export const getMonthlyData = (stats, year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // zadnji dan meseca
  const dateRange = eachDayOfInterval({ start, end });

  return dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const stat = stats.find(s => 
      format(parseISO(s.date), 'yyyy-MM-dd') === dateStr
    );

    return {
      date: dateStr,
      stepCount: stat?.stepCount || 0,
      distance: stat?.distance || 0,
      speed: stat?.speed || 0,
      altitude: stat?.altitude || 0
    };
  });
};
