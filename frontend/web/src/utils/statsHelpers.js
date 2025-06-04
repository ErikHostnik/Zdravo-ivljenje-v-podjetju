import { subDays, eachDayOfInterval, format, parseISO } from 'date-fns';

// Helper za izračun min, max in avg speed iz polja vrednosti
const calculateSpeedStats = (speeds) => {
  const filteredSpeeds = speeds.filter(s => s !== undefined && s !== null);
  if (filteredSpeeds.length === 0) {
    return { avgSpeed: 0, minSpeed: 0, maxSpeed: 0 };
  }
  const minSpeed = Math.min(...filteredSpeeds);
  const maxSpeed = Math.max(...filteredSpeeds);
  const sumSpeed = filteredSpeeds.reduce((acc, val) => acc + val, 0);
  const avgSpeed = sumSpeed / filteredSpeeds.length;

  return { avgSpeed, minSpeed, maxSpeed };
};

// Generate zadnjih 7 dni z avg, min, max speed in altitudeDistance
export const getWeeklyData = (stats) => {
  const end = new Date();
  const start = subDays(end, 6);
  const dateRange = eachDayOfInterval({ start, end });

  return dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const stat = stats.find(s =>
      format(parseISO(s.date), 'yyyy-MM-dd') === dateStr
    );

    const stepCount = stat?.stepCount || 0;
    const distance = stat?.distance || 0;
    const avgSpeed = stat?.avgSpeed || 0;
    const minSpeed = stat?.minSpeed || 0;
    const maxSpeed = stat?.maxSpeed || 0;
    const altitudeDistance = stat?.altitudeDistance || 0;

    return {
      date: dateStr,
      stepCount,
      distance,
      avgSpeed,
      minSpeed,
      maxSpeed,
      altitudeDistance
    };
  });
};

// Agregacija po mesecih za izbrano leto, z avg, min, max speed in skupno višino
export const getYearlyData = (stats, year) => {
  const monthlyAggregate = Array(12).fill().map(() => ({
    steps: 0,
    distance: 0,
    avgSpeedValues: [],
    minSpeedValues: [],
    maxSpeedValues: [],
    altitudeDistance: 0,
    count: 0
  }));

  stats.forEach(stat => {
    const date = new Date(stat.date);
    if (date.getFullYear() === year) {
      const month = date.getMonth();
      monthlyAggregate[month].steps += stat.stepCount;
      monthlyAggregate[month].distance += stat.distance;

      if (stat.avgSpeed !== undefined && stat.avgSpeed !== null) {
        monthlyAggregate[month].avgSpeedValues.push(stat.avgSpeed);
      }
      if (stat.minSpeed !== undefined && stat.minSpeed !== null) {
        monthlyAggregate[month].minSpeedValues.push(stat.minSpeed);
      }
      if (stat.maxSpeed !== undefined && stat.maxSpeed !== null) {
        monthlyAggregate[month].maxSpeedValues.push(stat.maxSpeed);
      }

      monthlyAggregate[month].altitudeDistance += stat.altitudeDistance || 0;
      monthlyAggregate[month].count++;
    }
  });

  return monthlyAggregate.map((data, index) => {
    const { avgSpeed: monthAvgSpeed } = calculateSpeedStats(data.avgSpeedValues);
    const { minSpeed: monthMinSpeed } = calculateSpeedStats(data.minSpeedValues);
    const { maxSpeed: monthMaxSpeed } = calculateSpeedStats(data.maxSpeedValues);

    return {
      month: new Date(year, index).toLocaleString('sl-SI', { month: 'short' }),
      avgSteps: data.count ? Math.round(data.steps / data.count) : 0,
      totalDistance: data.distance,
      avgSpeed: monthAvgSpeed,
      minSpeed: monthMinSpeed,
      maxSpeed: monthMaxSpeed,
      totalAltitudeDistance: data.altitudeDistance
    };
  });
};

// Izračun življenjske statistike z avg, min, max speed in skupno višino
export const getLifetimeStats = (stats) => {
  const avgSpeedValues = stats
    .map(stat => stat.avgSpeed || 0)
    .filter(s => s !== 0);
  const minSpeedValues = stats
    .map(stat => stat.minSpeed || 0)
    .filter(s => s !== 0);
  const maxSpeedValues = stats
    .map(stat => stat.maxSpeed || 0)
    .filter(s => s !== 0);

  const { avgSpeed } = calculateSpeedStats(avgSpeedValues);
  const { minSpeed } = calculateSpeedStats(minSpeedValues);
  const { maxSpeed } = calculateSpeedStats(maxSpeedValues);

  const totalAltitudeDistance = stats.reduce(
    (acc, stat) => acc + (stat.altitudeDistance || 0),
    0
  );

  const totalSteps = stats.reduce((acc, stat) => acc + stat.stepCount, 0);
  const totalDistance = stats.reduce((acc, stat) => acc + stat.distance, 0);
  const totalCalories = stats.reduce((acc, stat) => acc + stat.stepCount * 0.04, 0);

  return {
    totalSteps,
    totalDistance,
    totalCalories,
    avgSpeed,
    minSpeed,
    maxSpeed,
    totalAltitudeDistance,
    daysCount: stats.length
  };
};

// Agregacija po dnevih z avg, min, max speed in višino v izbranem mesecu/leto
export const getMonthlyData = (stats, year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const dateRange = eachDayOfInterval({ start, end });

  return dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const stat = stats.find(s =>
      format(parseISO(s.date), 'yyyy-MM-dd') === dateStr
    );

    const stepCount = stat?.stepCount || 0;
    const distance = stat?.distance || 0;
    const avgSpeed = stat?.avgSpeed || 0;
    const minSpeed = stat?.minSpeed || 0;
    const maxSpeed = stat?.maxSpeed || 0;
    const altitudeDistance = stat?.altitudeDistance || 0;

    return {
      date: dateStr,
      stepCount,
      distance,
      avgSpeed,
      minSpeed,
      maxSpeed,
      altitudeDistance
    };
  });
};
