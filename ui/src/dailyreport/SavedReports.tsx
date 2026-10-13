import * as React from 'react';
import {useMutation} from '@apollo/react-hooks';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import {useSnackbar} from 'notistack';
import * as gqlReport from '../gql/dailyReport';
import {MyReportData, MyReportData_reportEntries} from '../gql/__generated__/MyReportData';
import {RemoveReportEntry, RemoveReportEntryVariables} from '../gql/__generated__/RemoveReportEntry';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {handleError} from '../utils/errors';
import {useReportStyles} from './styles';
import {buildCsv, downloadText, EntryRow, formatDate, formatWorkHours, ReportSettings, weekday, workHours} from './logic';

const SHOWN = 20;

interface Props {
    settings: ReportSettings;
    name: string;
    data?: MyReportData;
    refetch: () => void;
    onLoad: (rows: EntryRow[]) => void;
}

export const SavedReports: React.FC<Props> = ({settings, name, data, refetch, onLoad}) => {
    const classes = useReportStyles();
    const {enqueueSnackbar} = useSnackbar();
    const [loadDate, setLoadDate] = React.useState(formatDate(new Date()));
    const [removing, setRemoving] = React.useState<MyReportData_reportEntries | null>(null);
    const [removeEntry] = useMutation<RemoveReportEntry, RemoveReportEntryVariables>(gqlReport.RemoveReportEntry);
    const entries = (data && data.reportEntries) || [];
    const attendances = (data && data.reportAttendances) || [];

    const load = () => {
        const rows = entries.filter((e) => e.date === loadDate);
        if (rows.length === 0) {
            enqueueSnackbar('該当する日報データがありません', {variant: 'warning'});
            return;
        }
        onLoad(
            rows.map((e) => ({
                issueKey: e.issueKey,
                title: e.title,
                category: e.category,
                subcategory: e.subcategory,
                group: e.group,
                time: String(e.time),
                groupAuto: false,
            }))
        );
        enqueueSnackbar(`日報 ${rows.length}件を読み込みました`, {variant: 'success'});
    };

    const exportAll = () => {
        if (entries.length === 0) {
            enqueueSnackbar('データがありません', {variant: 'warning'});
            return;
        }
        downloadText(
            `${name}_all.csv`,
            buildCsv(
                settings,
                entries.map((e) => ({...e, timestamp: e.updatedAt}))
            )
        );
        enqueueSnackbar('CSVを出力しました', {variant: 'success'});
    };

    const remove = (entry: MyReportData_reportEntries) =>
        removeEntry({variables: {id: entry.id}})
            .then(() => {
                enqueueSnackbar('削除しました', {variant: 'success'});
                refetch();
            })
            .catch(handleError('日報の削除', enqueueSnackbar));

    // 同じ日の行には勤務時間を1回だけ表示する
    const shownDates = new Set<string>();
    const workTimeOf = (date: string) => {
        const attendance = attendances.find((a) => a.date === date);
        if (!attendance || shownDates.has(date)) {
            return '';
        }
        shownDates.add(date);
        const value = workHours(attendance.workStart, attendance.workEnd, attendance.breakTime);
        return value === null ? '' : formatWorkHours(value);
    };

    return (
        <Paper className={classes.paper}>
            <div className={classes.row}>
                <Typography variant="h6">保存済みデータ</Typography>
                <Typography color="textSecondary">{entries.length}件</Typography>
                <div style={{flexGrow: 1}} />
                <TextField type="date" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} />
                <Button variant="outlined" onClick={load}>
                    日報を読み込み
                </Button>
                <Button variant="outlined" onClick={exportAll}>
                    全データCSV出力
                </Button>
            </div>
            {entries.length === 0 ? (
                <Typography align="center" color="textSecondary" style={{padding: 20}}>
                    保存されたデータはありません
                </Typography>
            ) : (
                <div style={{overflowX: 'auto'}}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>日付</TableCell>
                                <TableCell>課題キー</TableCell>
                                <TableCell>タイトル</TableCell>
                                <TableCell>カテゴリ</TableCell>
                                <TableCell>分類</TableCell>
                                <TableCell align="right">勤務時間</TableCell>
                                <TableCell align="right">実績時間</TableCell>
                                <TableCell padding="none" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.slice(0, SHOWN).map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell style={{whiteSpace: 'nowrap'}}>
                                        {e.date}（{weekday(e.date)}）
                                    </TableCell>
                                    <TableCell>{e.issueKey}</TableCell>
                                    <TableCell>{e.title}</TableCell>
                                    <TableCell>{e.category}</TableCell>
                                    <TableCell>{e.subcategory}</TableCell>
                                    <TableCell align="right" style={{whiteSpace: 'nowrap'}}>
                                        {workTimeOf(e.date)}
                                    </TableCell>
                                    <TableCell align="right">{e.time.toFixed(2)}</TableCell>
                                    <TableCell padding="none">
                                        <IconButton size="small" title="削除" onClick={() => setRemoving(e)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {entries.length > SHOWN ? (
                        <Typography align="center" color="textSecondary" variant="body2" style={{marginTop: 8}}>
                            最新{SHOWN}件を表示（全{entries.length}件）
                        </Typography>
                    ) : null}
                </div>
            )}
            {removing ? (
                <ConfirmDialog title="確認" fClose={() => setRemoving(null)} fOnSubmit={() => remove(removing)}>
                    「{removing.date} {removing.title}」を削除しますか？
                </ConfirmDialog>
            ) : null}
        </Paper>
    );
};
