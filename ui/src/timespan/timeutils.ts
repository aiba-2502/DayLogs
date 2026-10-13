import moment from 'moment-timezone';
import prettyMs from 'pretty-ms';

const jaUnits: Record<string, string> = {y: '年', d: '日', h: '時間', m: '分', s: '秒', ms: 'ミリ秒'};

// pretty-ms has no locale option, so its short units (1h 2m) are mapped to Japanese (1時間2分).
export const prettyDuration = (ms: number, unitCount?: number): string =>
    ms === 0
        ? '0秒'
        : prettyMs(ms, {unitCount})
              .replace(/^~/, '')
              .replace(/(\d)(ms|[ydhms])/g, (_, n, unit) => n + jaUnits[unit])
              .replace(/ /g, '');

export const timeRunning = (date: moment.Moment, now: moment.Moment) => {
    const d = inUserTz(now).unix() - inUserTz(date).unix();
    return prettyDuration(d * 1000, 2);
};

export const timeRunningCalendar = (date: moment.Moment, now: moment.Moment) => {
    const d = inUserTz(now).unix() - inUserTz(date).unix();

    if (d < 60) {
        return '<1分';
    }

    return prettyDuration(d * 1000, d < 60 * 24 ? 1 : 2);
};

export const uglyConvertToLocalTime = (m: moment.Moment): moment.Moment => {
    const withoutTimeZone: string = m.format('YYYY-MM-DDTHH:mm:ss');
    return moment(withoutTimeZone);
};

export const inUserTz = (m: moment.Moment): moment.Moment => m.tz(moment.tz.guess());
