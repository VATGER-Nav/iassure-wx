import axios from 'axios';
import regionsService from './regions.service';

import { WxFix } from '@shared/types/config.types';
import { WxFixData, WxData } from '@shared/types/wx.types';

const cachedData: { [key: string]: WxData } = {};

const qnhLevelMapping = {
  200: 390,
  250: 340,
  300: 300,
  400: 240,
  500: 180,
  600: 140,
  700: 100,
  800: 64,
  850: 50,
  900: 30,
  925: 25,
};

const necessaryDatapoints = [
  'winddirection',
  'windspeed',
  'temperature',
];

const requestedData: string[] = [
  'temperature_2m',
  'windspeed_10m',
  'winddirection_10m',
];

for (const qnh of Object.keys(qnhLevelMapping)) {
  for (const necessaryDatapoint of necessaryDatapoints) {
    requestedData.push(`${necessaryDatapoint}_${qnh}hPa`);
  }
}

export async function getDataAtFix(fix: WxFix, index: number): Promise<WxFixData> {
  const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${fix.lat}&longitude=${fix.lon}&windspeed_unit=kn&forecast_days=1&hourly=${requestedData.join(',')}`);
  const hourlyData = response.data.hourly;

  const data: WxFixData = {
    coords: {
      lat: String(fix.lat),
      long: String(fix.lon),
    },
    levels: {},
  };

  data.levels['0'] = {
    'T(K)': String(Number(hourlyData?.temperature_2m?.[index]) + 273.15),
    'windspeed': String(hourlyData?.windspeed_10m?.[index]),
    'windhdg': String(hourlyData?.winddirection_10m?.[index]),
  };

  for (const [qnh, fl] of Object.entries(qnhLevelMapping)) {
    const temp = Number(hourlyData?.[`temperature_${qnh}hPa`]?.[index]) + 273.15;
    const dir = hourlyData?.[`winddirection_${qnh}hPa`]?.[index];
    const speed = hourlyData?.[`windspeed_${qnh}hPa`]?.[index]; 

    data.levels[String(fl)] = {
      'T(K)': String(temp),
      'windspeed': String(speed),
      'windhdg': String(dir),
    };
  }

  return data;
}

export async function generateData() {
  const regions = regionsService.getRegions();

  for (const region of regions) {
    const now = new Date();

    const regionData: WxData = {
      info: {
        date: now.toISOString(),
        datestring: `${now.getUTCDate()}${now.getUTCHours()}`,
        legal: 'Weather data by Open-Meteo.com (https://open-meteo.com)',
      },
      data: {},
    };

    for (const fix of region.fixes) {
      regionData.data[fix.name] = await getDataAtFix(fix, now.getUTCHours());
    }

    cachedData[region.identifier] = regionData;
  }

  return cachedData;
}

export function wrappedGenerateData() {
  generateData().catch((...params) => console.error(...params));
}

export function getWx(region: string): WxData | null {
  const data = cachedData[region];

  return data;
}

export default {
  getWx,
  generateData,
  wrappedGenerateData,
};
