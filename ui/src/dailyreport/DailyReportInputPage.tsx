import * as React from 'react';
import {useMutation, useQuery} from '@apollo/react-hooks';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {useSnackbar} from 'notistack';
import * as gqlReport from '../gql/dailyReport';
import * as gqlUser from '../gql/user';
import {CurrentUser} from '../gql/__generated__/CurrentUser';
import {ReportMembers, ReportMembersVariables} from '../gql/__generated__/ReportMembers';
import {MyReportData, MyReportDataVariables} from '../gql/__generated__/MyReportData';
import {SaveDailyReport, SaveDailyReportVariables} from '../gql/__generated__/SaveDailyReport';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {handleError} from '../utils/errors';
import {DepartmentSelect, useReportDepartment} from './department';
import {EntryTable} from './EntryTable';
import {SavedReports} from './SavedReports';
import {useReportStyles} from './styles';
import {
    BASE_WORK_HOURS,
    buildCsv,
    copyLine,
    copyToClipboard,
    csvFileName,
    downloadText,
    emptyRow,
    EntryRow,
    formatClock,
    formatDate,
    hasInput,
    hours,
    markdown,
    parseSettings,
    ReportSettings,
    sumHours,
    toHalfWidth,
    trimRow,
    validateRows,
    weekday,
    workHours,
} from './logic';

export const DailyReportInputPage = () => {
    const classes = useReportStyles();
    const {departments, department, select, loading} = useReportDepartment(false);
    const userQuery = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const user = userQuery.data && userQuery.data.user;
    const membersQuery = useQuery<ReportMembers, ReportMembersVariables>(gqlReport.ReportMembers, {
        variables: {departmentId: department ? department.id : 0},
        skip: !department,
    });
    if (loading || !user || (department && membersQuery.loading)) {
        return <CenteredSpinner />;
    }
    const members = (membersQuery.data && membersQuery.data.reportMembers) || [];
    const member = members.find((m) => m.userId === user.id);
    if (!department || !member) {
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
            <ReportForm
                key={department.id}
                departmentId={department.id}
                userId={user.id}
                name={member.name}
                settings={parseSettings(department.settings)}
            />
        </div>
    );
};

interface Draft {
    date: string;
    workStart: string;
    workEnd: string;
    breakTime: string;
    rows: EntryRow[];
}

const emptyRows = () => [emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()];

const newDraft = (settings: ReportSettings): Draft => ({
    date: formatDate(new Date()),
    workStart: settings.workTime.start,
    workEnd: settings.workTime.end,
    breakTime: String(settings.workTime.breakTime),
    rows: emptyRows(),
});

// 入力途中の行はこのブラウザに自動保存し、次に開いたときに復元する。
// 日付・勤務時間は元ツールと同じく、開くたびに今日・既定値に戻す
const useDraft = (key: string, settings: ReportSettings): [Draft, (d: Draft) => void] => {
    const [draft, setDraft] = React.useState<Draft>(() => {
        const initial = newDraft(settings);
        try {
            const rows = JSON.parse(localStorage.getItem(key) || 'null');
            // 元ツールと同じく、入力のある行が1つもなければ空の5行で始める
            return Array.isArray(rows) && rows.some(hasInput) ? {...initial, rows} : initial;
        } catch (e) {
            return initial;
        }
    });
    React.useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(draft.rows));
        } catch (e) {
            // the draft is only a convenience
        }
    }, [key, draft.rows]);
    return [draft, setDraft];
};

interface FormProps {
    departmentId: number;
    userId: number;
    name: string;
    settings: ReportSettings;
}

const ReportForm: React.FC<FormProps> = ({departmentId, userId, name, settings}) => {
    const classes = useReportStyles();
    const {enqueueSnackbar} = useSnackbar();
    const [draft, setDraft] = useDraft(`dailyReport.draft.${departmentId}.${userId}`, settings);
    const [result, setResult] = React.useState<{text: string; markdown: string} | null>(null);
    const [confirmClear, setConfirmClear] = React.useState(false);
    const dataVariables = {departmentId, userId};
    const dataQuery = useQuery<MyReportData, MyReportDataVariables>(gqlReport.MyReportData, {variables: dataVariables});
    const [saveReport, {loading: saving}] = useMutation<SaveDailyReport, SaveDailyReportVariables>(gqlReport.SaveDailyReport, {
        refetchQueries: [{query: gqlReport.MyReportData, variables: dataVariables}],
        awaitRefetchQueries: true,
    });

    const breakTime = parseFloat(draft.breakTime) || 0;
    const work = workHours(draft.workStart, draft.workEnd, breakTime);
    const total = sumHours(draft.rows);
    const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({...draft, [key]: e.target.value});
    // 全角で入力された時刻も受け付ける
    const clock = (key: 'workStart' | 'workEnd') => (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft({...draft, [key]: toHalfWidth(e.target.value).trim()});

    const save = () => {
        if (!draft.date) {
            enqueueSnackbar('日付を入力してください', {variant: 'warning'});
            return;
        }
        if (draft.workStart && draft.workEnd && work === null) {
            enqueueSnackbar('勤務時間は 09:00 の形式で入力してください', {variant: 'warning'});
            return;
        }
        const error = validateRows(settings, draft.rows);
        if (error) {
            enqueueSnackbar(error, {variant: 'warning'});
            return;
        }
        const rows = draft.rows.map(trimRow).filter((row) => row.title && hours(row) > 0);
        if (rows.length === 0) {
            enqueueSnackbar('一時保存するデータがありません', {variant: 'warning'});
            return;
        }
        const saved = sumHours(rows);
        if (work !== null && saved < work) {
            enqueueSnackbar(`実績時間が${(work - saved).toFixed(2)}時間足りていません`, {variant: 'warning'});
        }
        const entries = rows.map((row) => ({
            issueKey: row.issueKey,
            title: row.title,
            category: row.category,
            subcategory: row.subcategory,
            group: row.group,
            time: hours(row),
        }));
        saveReport({
            variables: {departmentId, date: draft.date, workStart: draft.workStart, workEnd: draft.workEnd, breakTime, entries},
        })
            .then(() => {
                enqueueSnackbar(`${entries.length}件のデータを一時保存しました`, {variant: 'success'});
                const lines = rows.map(copyLine);
                setResult({
                    text: lines.join('\n'),
                    markdown: markdown(draft.date, draft.workStart, draft.workEnd, breakTime, lines),
                });
            })
            .catch(handleError('日報の保存', enqueueSnackbar));
    };

    const exportCsv = () => {
        const rows = draft.rows.map(trimRow).filter((row) => row.title || hours(row) > 0);
        if (rows.length === 0) {
            enqueueSnackbar('出力するデータがありません', {variant: 'warning'});
            return;
        }
        const timestamp = new Date().toISOString();
        const csv = buildCsv(
            settings,
            rows.map((row) => ({...row, date: draft.date, name, time: hours(row), timestamp}))
        );
        downloadText(csvFileName(name, draft.date), csv);
        enqueueSnackbar('CSVを出力しました', {variant: 'success'});
    };

    const copy = (text: string, label: string) =>
        copyToClipboard(text)
            .then(() => enqueueSnackbar(`${label}をコピーしました`, {variant: 'success'}))
            .catch(() => enqueueSnackbar('コピーに失敗しました', {variant: 'error'}));

    const clear = () => {
        setDraft(newDraft(settings));
        setResult(null);
    };

    return (
        <>
            <Paper className={classes.paper}>
                <div className={classes.row}>
                    <TextField
                        label="日付"
                        type="date"
                        value={draft.date}
                        onChange={set('date')}
                        InputLabelProps={{shrink: true}}
                    />
                    <Typography style={{marginBottom: 6}}>({weekday(draft.date)})</Typography>
                    <TextField
                        label="開始"
                        placeholder="09:00"
                        value={draft.workStart}
                        onChange={clock('workStart')}
                        InputLabelProps={{shrink: true}}
                    />
                    <TextField
                        label="終了"
                        placeholder="18:00"
                        value={draft.workEnd}
                        onChange={clock('workEnd')}
                        InputLabelProps={{shrink: true}}
                    />
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDraft({...draft, workEnd: formatClock(new Date())})}>
                        現在
                    </Button>
                    <TextField
                        label="休憩（時間）"
                        type="number"
                        value={draft.breakTime}
                        onChange={set('breakTime')}
                        inputProps={{step: 0.25, min: 0}}
                        style={{width: 100}}
                    />
                    <Typography style={{marginBottom: 6}}>
                        総勤務時間{' '}
                        {work === null
                            ? '--'
                            : `${work.toFixed(2)}時間（残業 ${Math.max(0, work - BASE_WORK_HOURS).toFixed(2)}時間）`}
                    </Typography>
                    <Typography variant="h6" style={{marginLeft: 'auto'}}>
                        実績時間 合計 {total.toFixed(2)}時間
                    </Typography>
                </div>
                <Typography variant="caption" component="p" style={{marginTop: 8}}>
                    課題タイトルを入力した行は * の項目が必須です
                </Typography>
                <EntryTable settings={settings} rows={draft.rows} onChange={(rows) => setDraft({...draft, rows})} />
                <div className={classes.buttons}>
                    <Button variant="outlined" onClick={() => setDraft({...draft, rows: [...draft.rows, emptyRow()]})}>
                        ＋ 行を追加
                    </Button>
                    <div style={{flexGrow: 1}} />
                    <Button variant="contained" color="primary" onClick={save} disabled={saving}>
                        一時保存
                    </Button>
                    <Button variant="outlined" onClick={() => setConfirmClear(true)}>
                        クリア
                    </Button>
                    <Button variant="outlined" color="primary" onClick={exportCsv}>
                        CSV出力
                    </Button>
                </div>
                {result ? (
                    <div style={{marginTop: 16}}>
                        <div className={classes.row}>
                            <Typography variant="subtitle1">一時保存結果</Typography>
                            <Button size="small" variant="outlined" onClick={() => copy(result.text, 'テキスト')}>
                                テキストコピー
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => copy(result.markdown, 'Markdown')}>
                                Markdownコピー
                            </Button>
                        </div>
                        <pre style={{whiteSpace: 'pre-wrap', marginBottom: 0}}>{result.text}</pre>
                    </div>
                ) : null}
            </Paper>
            {confirmClear ? (
                <ConfirmDialog title="確認" fClose={() => setConfirmClear(false)} fOnSubmit={clear}>
                    日報の入力内容をクリアしますか？
                </ConfirmDialog>
            ) : null}
            <SavedReports
                settings={settings}
                name={name}
                data={dataQuery.data}
                refetch={() => dataQuery.refetch()}
                onLoad={(rows) => setDraft({...draft, rows})}
            />
        </>
    );
};
