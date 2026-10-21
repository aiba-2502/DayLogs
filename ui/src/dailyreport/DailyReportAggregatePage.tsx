import * as React from 'react';
import {useApolloClient, useQuery} from '@apollo/react-hooks';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/NativeSelect/NativeSelect';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import {Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useSnackbar} from 'notistack';
import * as gqlReport from '../gql/dailyReport';
import * as gqlUser from '../gql/user';
import {CurrentUser} from '../gql/__generated__/CurrentUser';
import {ReportMembers, ReportMembersVariables} from '../gql/__generated__/ReportMembers';
import {MyReportData, MyReportData_reportEntries, MyReportDataVariables} from '../gql/__generated__/MyReportData';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {Colors} from './colors';
import {handleError} from '../utils/errors';
import {DepartmentSelect, useReportDepartment} from './department';
import {useReportStyles} from './styles';
import {aggregate, AggregateBy, AggregateFilter, AggregateRow, filterEntries, QuickRange, quickRange, weekday} from './logic';

const GROUPS: Array<[AggregateBy, string]> = [
    ['category', 'カテゴリ'],
    ['subcategory', '分類'],
    ['group', 'グループ'],
    ['name', '名前'],
    ['month', '月'],
    ['date', '日付'],
    ['detail', '詳細'],
];

const QUICK: Array<[QuickRange, string]> = [
    ['prevMonth', '前月'],
    ['thisMonth', '今月'],
    ['prevWeek', '先週'],
    ['thisWeek', '今週'],
];

const label = (key: string) => key || '（なし）';
const round = (n: number) => Math.round(n * 100) / 100;

export const DailyReportAggregatePage = () => {
    const classes = useReportStyles();
    const userQuery = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const user = userQuery.data && userQuery.data.user;
    // 管理者は所属していない部署も集計できる
    const {departments, department, select, loading} = useReportDepartment(!!(user && user.admin));
    const membersQuery = useQuery<ReportMembers, ReportMembersVariables>(gqlReport.ReportMembers, {
        variables: {departmentId: department ? department.id : 0},
        skip: !department,
    });
    if (loading || !user || (department && membersQuery.loading)) {
        return <CenteredSpinner />;
    }
    const members = (membersQuery.data && membersQuery.data.reportMembers) || [];
    if (!department || !(user.admin || members.some((m) => m.userId === user.id))) {
        return (
            <Typography align="center" style={{marginTop: 32}}>
                所属している部署がありません。管理者に「日報設定」でメンバー登録を依頼してください。
            </Typography>
        );
    }
    return (
        <div className={classes.root}>
            {departments.length > 1 ? (
                <div style={{marginBottom: 16}}>
                    <DepartmentSelect departments={departments} value={department.id} onChange={select} />
                </div>
            ) : null}
            <Aggregate
                key={department.id}
                departmentId={department.id}
                userIds={members.map((m) => m.userId).filter((id) => id > 0)}
            />
        </div>
    );
};

// 部署の全メンバーの保存済みデータ（API はメンバーごとなので並べて取得する）
const useDepartmentEntries = (departmentId: number, userIds: number[]): MyReportData_reportEntries[] | null => {
    const client = useApolloClient();
    const {enqueueSnackbar} = useSnackbar();
    const [entries, setEntries] = React.useState<MyReportData_reportEntries[] | null>(null);
    const ids = userIds.join(',');
    React.useEffect(() => {
        let current = true;
        setEntries(null);
        Promise.all(
            ids
                .split(',')
                .filter((id) => id)
                .map((id) =>
                    client.query<MyReportData, MyReportDataVariables>({
                        query: gqlReport.MyReportData,
                        variables: {departmentId, userId: Number(id)},
                        fetchPolicy: 'network-only',
                    })
                )
        )
            .then(
                (results) =>
                    current &&
                    setEntries(results.reduce<MyReportData_reportEntries[]>((all, r) => all.concat(r.data.reportEntries), []))
            )
            .catch((e) => {
                handleError('日報の取得', enqueueSnackbar)(e);
                if (current) {
                    setEntries([]);
                }
            });
        return () => {
            current = false;
        };
    }, [client, enqueueSnackbar, departmentId, ids]);
    return entries;
};

const Aggregate: React.FC<{departmentId: number; userIds: number[]}> = ({departmentId, userIds}) => {
    const classes = useReportStyles();
    const entries = useDepartmentEntries(departmentId, userIds);
    // 元ツールと同じく今月で始める
    const [filter, setFilter] = React.useState<AggregateFilter>(() => ({
        ...quickRange('thisMonth', new Date()),
        name: '',
        category: '',
        subcategory: '',
        group: '',
    }));
    const [by, setBy] = React.useState<AggregateBy>('category');
    if (!entries) {
        return <CenteredSpinner />;
    }
    const shown = filterEntries(entries, filter);
    const total = round(shown.reduce((sum, e) => sum + e.time, 0));
    const set = (key: keyof AggregateFilter) => (value: string) => setFilter({...filter, [key]: value});
    // 選択肢は保存済みデータにある値。分類は選択中のカテゴリのものだけ
    const optionsOf = (key: 'name' | 'category' | 'subcategory' | 'group') =>
        Array.from(
            new Set(
                entries
                    .filter((e) => key !== 'subcategory' || !filter.category || e.category === filter.category)
                    .map((e) => e[key])
            )
        )
            .filter((v) => v)
            .sort();
    const rows = by === 'detail' ? [] : aggregate(shown, by).map((r) => ({...r, key: label(r.key)}));
    const byLabel = (GROUPS.find(([value]) => value === by) || GROUPS[0])[1];

    return (
        <>
            <Paper className={classes.paper}>
                <div className={classes.row}>
                    <TextField
                        label="期間（開始）"
                        type="date"
                        value={filter.from}
                        onChange={(e) => set('from')(e.target.value)}
                        InputLabelProps={{shrink: true}}
                    />
                    <TextField
                        label="期間（終了）"
                        type="date"
                        value={filter.to}
                        onChange={(e) => set('to')(e.target.value)}
                        InputLabelProps={{shrink: true}}
                    />
                    {QUICK.map(([range, text]) => (
                        <Button
                            key={range}
                            size="small"
                            variant="outlined"
                            onClick={() => setFilter({...filter, ...quickRange(range, new Date())})}>
                            {text}
                        </Button>
                    ))}
                    <Button size="small" onClick={() => setFilter({...filter, from: '', to: ''})}>
                        全期間
                    </Button>
                </div>
                <div className={classes.row} style={{marginTop: 16}}>
                    <FilterSelect label="名前" value={filter.name} options={optionsOf('name')} onChange={set('name')} />
                    <FilterSelect
                        label="カテゴリ"
                        value={filter.category}
                        options={optionsOf('category')}
                        onChange={(category) => setFilter({...filter, category, subcategory: ''})}
                    />
                    <FilterSelect
                        label="分類"
                        value={filter.subcategory}
                        options={optionsOf('subcategory')}
                        onChange={set('subcategory')}
                    />
                    <FilterSelect label="グループ" value={filter.group} options={optionsOf('group')} onChange={set('group')} />
                </div>
                <div className={classes.row} style={{marginTop: 16, alignItems: 'center'}}>
                    <Typography>集計グループ：</Typography>
                    <RadioGroup row value={by} onChange={(e) => setBy(e.target.value as AggregateBy)}>
                        {GROUPS.map(([value, text]) => (
                            <FormControlLabel key={value} value={value} control={<Radio size="small" />} label={text} />
                        ))}
                    </RadioGroup>
                </div>
            </Paper>
            <Paper className={classes.paper}>
                <div className={classes.row} style={{alignItems: 'baseline'}}>
                    <Typography variant="h6">件数 {shown.length}件</Typography>
                    <Typography variant="h6">合計時間 {total.toFixed(2)}時間</Typography>
                </div>
                {shown.length === 0 ? (
                    <Typography align="center" color="textSecondary" style={{padding: 20}}>
                        条件に合う日報はありません
                    </Typography>
                ) : by === 'detail' ? (
                    <DetailTable entries={shown} />
                ) : (
                    <>
                        <AggregateChart rows={rows} byTime={by === 'date' || by === 'month'} />
                        <div style={{overflowX: 'auto'}}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{byLabel}</TableCell>
                                        <TableCell align="right">件数</TableCell>
                                        <TableCell align="right">合計時間</TableCell>
                                        <TableCell align="right">割合</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow key={r.key}>
                                            <TableCell>{r.key}</TableCell>
                                            <TableCell align="right">{r.count}</TableCell>
                                            <TableCell align="right">{r.time.toFixed(2)}</TableCell>
                                            <TableCell align="right">
                                                {total ? ((r.time / total) * 100).toFixed(1) : '0.0'}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </Paper>
        </>
    );
};

const FilterSelect: React.FC<{label: string; value: string; options: string[]; onChange: (value: string) => void}> = ({
    label: text,
    value,
    options,
    onChange,
}) => (
    <FormControl style={{minWidth: 180, maxWidth: 320}}>
        <InputLabel shrink>{text}</InputLabel>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">すべて</option>
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </Select>
    </FormControl>
);

// 日付・月は棒グラフ、それ以外は円グラフ
const AggregateChart: React.FC<{rows: AggregateRow[]; byTime: boolean}> = ({rows, byTime}) => (
    <div style={{height: 320, marginTop: 16, marginBottom: 16}}>
        <ResponsiveContainer>
            {byTime ? (
                <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="key" />
                    <YAxis unit="h" />
                    <Tooltip />
                    <Bar dataKey="time" name="時間" fill={Colors[0]} isAnimationActive={false} />
                </BarChart>
            ) : (
                <PieChart>
                    <Pie data={rows} dataKey="time" nameKey="key" isAnimationActive={false}>
                        {rows.map((_, index) => (
                            <Cell key={index} fill={Colors[index % Colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            )}
        </ResponsiveContainer>
    </div>
);

const DetailTable: React.FC<{entries: MyReportData_reportEntries[]}> = ({entries}) => (
    <div style={{overflowX: 'auto'}}>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>日付</TableCell>
                    <TableCell>名前</TableCell>
                    <TableCell>課題キー</TableCell>
                    <TableCell>タイトル</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell>分類</TableCell>
                    <TableCell>グループ</TableCell>
                    <TableCell align="right">時間</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {entries
                    .slice()
                    .sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1))
                    .map((e) => (
                        <TableRow key={e.id}>
                            <TableCell style={{whiteSpace: 'nowrap'}}>
                                {e.date}（{weekday(e.date)}）
                            </TableCell>
                            <TableCell style={{whiteSpace: 'nowrap'}}>{e.name}</TableCell>
                            <TableCell>{e.issueKey}</TableCell>
                            <TableCell>{e.title}</TableCell>
                            <TableCell>{e.category}</TableCell>
                            <TableCell>{e.subcategory}</TableCell>
                            <TableCell>{e.group}</TableCell>
                            <TableCell align="right">{e.time.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
            </TableBody>
        </Table>
    </div>
);
