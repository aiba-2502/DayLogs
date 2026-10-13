import * as React from 'react';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/NativeSelect/NativeSelect';
import {useQuery} from 'react-apollo';
import {Tags} from '../../gql/__generated__/Tags';
import * as gqlTags from '../../gql/tags';
import {EntryType, StatsInterval} from '../../gql/__generated__/globalTypes';
import {toTagSelectorEntry} from '../../tag/tagSelectorEntry';
import {FormTagSelector} from '../../tag/FormTagSelector';
import {Dashboards_dashboards_items, Dashboards_dashboards_items_statsSelection_range} from '../../gql/__generated__/Dashboards';
import {RelativeDateTimeSelector} from '../../common/RelativeDateTimeSelector';
import {parseRelativeTime} from '../../utils/time';
import {Grid, Typography, Switch} from '@material-ui/core';

interface EditPopupProps {
    entry: Dashboards_dashboards_items;
    onChange: (entry: Dashboards_dashboards_items | null) => void;
    disabled?: boolean;
    ranges: Record<string, string>;
}

const entryTypeLabels: Record<EntryType, string> = {
    [EntryType.PieChart]: '円グラフ',
    [EntryType.BarChart]: '棒グラフ',
    [EntryType.StackedBarChart]: '積み上げ棒グラフ',
    [EntryType.LineChart]: '折れ線グラフ',
    [EntryType.VerticalTable]: '表（縦）',
    [EntryType.HorizontalTable]: '表（横）',
};

const intervalLabels: Record<StatsInterval, string> = {
    [StatsInterval.Hourly]: '1時間ごと',
    [StatsInterval.Daily]: '日ごと',
    [StatsInterval.Weekly]: '週ごと',
    [StatsInterval.Monthly]: '月ごと',
    [StatsInterval.Yearly]: '年ごと',
    [StatsInterval.Single]: '期間全体',
};

export const isValidDashboardEntry = (item: Dashboards_dashboards_items): boolean => {
    return (
        item.statsSelection.tags !== null &&
        item.statsSelection.tags.length > 0 &&
        ((item.statsSelection.range &&
            parseRelativeTime(item.statsSelection.range.from, 'startOf').success &&
            parseRelativeTime(item.statsSelection.range.to, 'startOf').success) ||
            !!item.statsSelection.rangeId) &&
        item.title.length > 0
    );
};
export const DashboardEntryForm: React.FC<EditPopupProps> = ({entry, onChange: setEntry, disabled = false, ranges}) => {
    const [staticRange, setStaticRange] = React.useState(!entry.statsSelection.rangeId);

    const tagsResult = useQuery<Tags>(gqlTags.Tags);

    let tagKeys;
    let excludeTags;
    let includeTags;
    if (!tagsResult.error && !tagsResult.loading && tagsResult.data && tagsResult.data.tags) {
        const keyInputTags = (entry.statsSelection.tags || []).map((key) => ({key, value: ''}));
        tagKeys = toTagSelectorEntry(tagsResult.data.tags, keyInputTags);
        excludeTags = toTagSelectorEntry(tagsResult.data.tags, entry.statsSelection.excludeTags || []);
        includeTags = toTagSelectorEntry(tagsResult.data.tags, entry.statsSelection.includeTags || []);
    }

    const range: Dashboards_dashboards_items_statsSelection_range = entry.statsSelection.range
        ? entry.statsSelection.range
        : {
              from: 'now/w',
              to: 'now/w',
              __typename: 'RelativeOrStaticRange',
          };

    return (
        <>
            <TextField
                label={'タイトル'}
                value={entry.title}
                disabled={disabled}
                onChange={(e) => {
                    entry.title = e.target.value;
                    setEntry(entry);
                }}
                fullWidth
            />
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>種類</InputLabel>
                <Select
                    fullWidth
                    value={entry.entryType}
                    disabled={disabled}
                    onChange={(e) => {
                        entry.entryType = e.target.value as EntryType;
                        setEntry(entry);
                    }}>
                    {Object.values(EntryType).map((type) => (
                        <option key={type} value={type}>
                            {entryTypeLabels[type]}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl margin={'normal'} fullWidth>
                <InputLabel>間隔</InputLabel>
                <Select
                    fullWidth
                    disabled={disabled}
                    value={entry.statsSelection.interval}
                    onChange={(e) => {
                        entry.statsSelection.interval = e.target.value as StatsInterval;
                        setEntry(entry);
                    }}>
                    {Object.values(StatsInterval).map((type) => (
                        <option key={type} value={type}>
                            {intervalLabels[type]}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <Typography component="div">
                <Grid component="label" container alignItems="center" spacing={1}>
                    <Grid item>期間: </Grid>
                    <Grid item>グローバル</Grid>
                    <Grid item>
                        <Switch
                            checked={staticRange}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setStaticRange(true);
                                    entry.statsSelection.rangeId = null;
                                    setEntry(entry);
                                } else {
                                    setStaticRange(false);

                                    if (entry.statsSelection.range === null) {
                                        entry.statsSelection.range = range;
                                        setEntry(entry);
                                    }
                                }
                            }}
                        />
                    </Grid>
                    <Grid item>固定</Grid>
                </Grid>
            </Typography>
            {staticRange ? (
                <>
                    <RelativeDateTimeSelector
                        label={'開始'}
                        disabled={disabled}
                        value={range.from}
                        onChange={(startDate) => {
                            entry.statsSelection.rangeId = null;
                            entry.statsSelection.range = {...range, from: startDate};
                            setEntry(entry);
                        }}
                        type="startOf"
                    />
                    <RelativeDateTimeSelector
                        label={'終了'}
                        disabled={disabled}
                        value={range.to}
                        onChange={(endDate) => {
                            entry.statsSelection.rangeId = null;
                            entry.statsSelection.range = {...range, to: endDate};
                            setEntry(entry);
                        }}
                        type="endOf"
                    />
                </>
            ) : (
                <Select
                    fullWidth
                    disabled={disabled}
                    value={entry.statsSelection.rangeId || ''}
                    onChange={(e) => {
                        if (e.target.value === '') {
                            return;
                        }
                        entry.statsSelection.rangeId = parseInt(e.target.value, 10);
                        entry.statsSelection.range = null;
                        setEntry(entry);
                    }}>
                    {entry.statsSelection.rangeId ? (
                        undefined
                    ) : (
                        <option key={''} value={''}>
                            期間を選択
                        </option>
                    )}
                    {Object.keys(ranges).map((key) => (
                        <option key={key} value={key}>
                            {ranges[key]}
                        </option>
                    ))}
                </Select>
            )}
            {entry.entryType !== EntryType.PieChart ? (
                <Typography component="div">
                    <Grid component="label" container alignItems="center" spacing={1}>
                        <Grid item>{getTotalTitle(entry.entryType)}</Grid>
                        <Grid item>
                            <Switch
                                checked={entry.total}
                                onChange={(e) => {
                                    entry.total = e.target.checked;
                                    setEntry(entry);
                                }}
                            />
                        </Grid>
                    </Grid>
                </Typography>
            ) : (
                undefined
            )}
            <FormTagSelector
                label="タグ"
                selectedEntries={tagKeys || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.tags = tags.map((tag) => tag.tag.key);
                    setEntry(entry);
                }}
                createTags={false}
                onlySelectKeys
            />

            <FormTagSelector
                label="除外"
                selectedEntries={excludeTags || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.excludeTags = tags.map((tag) => ({
                        key: tag.tag.key,
                        value: tag.value,
                        __typename: 'TimeSpanTag',
                    }));
                    setEntry(entry);
                }}
                allowDuplicateKeys
                createTags={false}
            />
            <FormTagSelector
                label="含める"
                selectedEntries={includeTags || []}
                onSelectedEntriesChanged={(tags) => {
                    entry.statsSelection.includeTags = tags.map((tag) => ({
                        key: tag.tag.key,
                        value: tag.value,
                        __typename: 'TimeSpanTag',
                    }));
                    setEntry(entry);
                }}
                allowDuplicateKeys
                createTags={false}
            />
        </>
    );
};

const getTotalTitle = (entryType: EntryType) => {
    switch (entryType) {
        case EntryType.HorizontalTable:
            return '「合計」行を表示:';
        case EntryType.VerticalTable:
            return '「合計」列を表示:';
        case EntryType.BarChart:
        case EntryType.StackedBarChart:
        case EntryType.LineChart:
            return 'ツールチップに「合計」を表示:';
        default:
            return '';
    }
};
