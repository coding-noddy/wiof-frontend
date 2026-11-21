import { isValueSuspicious, toAqiView } from './aqi-scorecard.component';

/** A WAQI feed response, in the API's real shape (values made up). */
const FEED = {
  aqi: 152,
  dominentpol: 'pm25',
  city: { name: 'Anand Vihar, Delhi, Delhi, India' },
  time: { s: '2026-11-21 15:00:00', tz: '+05:30' },
  attributions: [
    { name: 'CPCB - India Central Pollution Control Board', url: 'http://www.cpcb.nic.in/' },
    { name: 'World Air Quality Index Project', url: 'https://waqi.info/' }
  ],
  iaqi: { t: { v: 24.5 }, pm25: { v: 152 }, h: { v: 61 }, no2: { v: 18.3 }, pm10: { v: 98 }, xyz: { v: 1 } }
};

describe('AQI scorecard view (WAQI)', () => {
  it('labels pollutant values as AQI sub-indices, not concentrations, and lists them before the weather', () => {
    const view = toAqiView(FEED);
    expect(view.params.map((p) => `${p.label} ${p.value} ${p.unit}`)).toEqual([
      'PM2.5 152 AQI', 'NO₂ 18.3 AQI', 'PM10 98 AQI', 'Temp 24.5 °C', 'Humidity 61 %'
    ]);
    expect(view.params.some((p) => p.unit.includes('µg'))).toBeFalse();
  });

  it('drops codes it does not know', () => {
    expect(toAqiView(FEED).params.map((p) => p.code)).not.toContain('xyz');
  });

  it('shows when the station measured it, in the station\'s own time', () => {
    expect(toAqiView(FEED).updated).toBe('Updated 21 Nov, 3:00 pm (station time)');
  });

  it('credits the original source (here India\'s CPCB) as well as WAQI', () => {
    expect(toAqiView(FEED).sources).toEqual([{ name: 'CPCB - India Central Pollution Control Board', url: 'http://www.cpcb.nic.in/' }]);
  });

  it('copes with a station that sends "-" or nothing', () => {
    const view = toAqiView({ aqi: '-', iaqi: {}, city: {} });
    expect(view.aqi).toBeNull();
    expect(view.params).toEqual([]);
    expect(view.updated).toBe('');
    expect(isValueSuspicious('pm25', NaN)).toBeTrue();
    expect(isValueSuspicious('t', 70)).toBeTrue();
  });
});
