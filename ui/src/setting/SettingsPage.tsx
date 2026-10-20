import * as React from 'react';
import makeStyles from '@material-ui/core/styles/makeStyles';
import {Paper} from '@material-ui/core';
import {SetSettings as SetSettingsGQL, Settings as SettingsGQL, useSettings} from '../gql/settings';
import {useMutation} from '@apollo/react-hooks';
import {SetSettings, SetSettingsVariables} from '../gql/__generated__/SetSettings';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/NativeSelect/NativeSelect';
import {DateLocale, Theme, WeekDay, DateTimeInputStyle} from '../gql/__generated__/globalTypes';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';

const dateLocaleLabels: Array<[DateLocale, string]> = [
    [DateLocale.Japanese, '日本語 (YYYY/MM/DD 24時間)'],
    [DateLocale.American, 'アメリカ式'],
    [DateLocale.American24h, 'アメリカ式 (24時間)'],
    [DateLocale.German, 'ドイツ式'],
    [DateLocale.Australian, 'オーストラリア式'],
    [DateLocale.British, 'イギリス式'],
];

const themeLabels: Record<Theme, string> = {
    [Theme.Glow]: 'グロー (ダーク)',
    [Theme.FirstGaming]: 'First Gaming (ダーク)',
    [Theme.GruvboxDark]: 'Gruvbox (ダーク)',
    [Theme.GruvboxLight]: 'Gruvbox (ライト)',
    [Theme.MaterialDark]: 'Material (ダーク)',
    [Theme.MaterialLight]: 'Material (ライト)',
};

const weekDayLabels: Array<[WeekDay, string]> = [
    [WeekDay.Sunday, '日曜日'],
    [WeekDay.Monday, '月曜日'],
    [WeekDay.Tuesday, '火曜日'],
    [WeekDay.Wednesday, '水曜日'],
    [WeekDay.Thursday, '木曜日'],
    [WeekDay.Friday, '金曜日'],
    [WeekDay.Saturday, '土曜日'],
];

const dateTimeInputStyleLabels: Record<DateTimeInputStyle, string> = {
    [DateTimeInputStyle.Fancy]: 'ピッカー',
    [DateTimeInputStyle.Native]: 'ブラウザ標準',
};

const useStyles = makeStyles((theme) => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(3),
        maxWidth: 500,
        margin: '0 auto',
    },
}));

export const SettingsPage: React.FC = () => {
    const classes = useStyles();
    const {done, ...settings} = useSettings();
    const {enqueueSnackbar} = useSnackbar();
    const [setSettings] = useMutation<SetSettings, SetSettingsVariables>(SetSettingsGQL, {
        refetchQueries: [{query: SettingsGQL}],
    });
    return (
        <Paper elevation={1} className={classes.root}>
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>日付形式</InputLabel>
                <Select
                    fullWidth
                    value={settings.dateLocale}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    dateLocale: e.target.value as DateLocale,
                                },
                            },
                        })
                            .then(() => {
                                enqueueSnackbar('日付形式を変更しました', {
                                    variant: 'success',
                                });
                                enqueueSnackbar('新しい日付形式を完全に反映するにはページを再読み込みしてください', {
                                    variant: 'info',
                                    preventDuplicate: true,
                                    persist: true,
                                });
                            })
                            .catch(handleError('日付形式の変更', enqueueSnackbar));
                    }}>
                    {dateLocaleLabels.map(([type, label]) => (
                        <option key={type} value={type}>
                            {label}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>テーマ</InputLabel>
                <Select
                    fullWidth
                    value={settings.theme}
                    onChange={(e) => {
                        setSettings({variables: {settings: {...settings, theme: e.target.value as Theme}}})
                            .then(() =>
                                enqueueSnackbar('テーマを変更しました', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('テーマの変更', enqueueSnackbar));
                    }}>
                    {Object.values(Theme).map((type) => (
                        <option key={type} value={type}>
                            {themeLabels[type]}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>週の開始曜日</InputLabel>
                <Select
                    fullWidth
                    value={settings.firstDayOfTheWeek}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    firstDayOfTheWeek: e.target.value as WeekDay,
                                },
                            },
                        })
                            .then(() =>
                                enqueueSnackbar('週の開始曜日を変更しました', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('週の開始曜日の変更', enqueueSnackbar));
                    }}>
                    {weekDayLabels.map(([type, label]) => (
                        <option key={type} value={type}>
                            {label}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>日時入力方式</InputLabel>
                <Select
                    fullWidth
                    value={settings.dateTimeInputStyle}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    dateTimeInputStyle: e.target.value as DateTimeInputStyle,
                                },
                            },
                        })
                            .then(() =>
                                enqueueSnackbar('日時入力方式を変更しました', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('日時入力方式の変更', enqueueSnackbar));
                    }}>
                    {[DateTimeInputStyle.Fancy, DateTimeInputStyle.Native].map((type) => (
                        <option key={type} value={type}>
                            {dateTimeInputStyleLabels[type]}
                        </option>
                    ))}
                </Select>
            </FormControl>
        </Paper>
    );
};
