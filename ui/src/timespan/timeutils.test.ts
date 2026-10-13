import {prettyDuration} from './timeutils';

it('formats durations in japanese', () => {
    expect(prettyDuration(90 * 60 * 1000)).toEqual('1時間30分');
    expect(prettyDuration(90061 * 1000)).toEqual('1日1時間1分1秒');
    expect(prettyDuration(90061 * 1000, 2)).toEqual('1日1時間');
    expect(prettyDuration(1500)).toEqual('1.5秒');
    expect(prettyDuration(0)).toEqual('0秒');
    expect(prettyDuration(500)).toEqual('500ミリ秒');
});
