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
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import {useSnackbar} from 'notistack';
import * as gqlReport from '../gql/dailyReport';
import {MyReportData, MyReportData_reportEntries} from '../gql/__generated__/MyReportData';
import {RemoveReportEntry, RemoveReportEntryVariables} from '../gql/__generated__/RemoveReportEntry';
import {UpdateReportEntry, UpdateReportEntryVariables} from '../gql/__generated__/UpdateReportEntry';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {handleError} from '../utils/errors';
import {useReportStyles} from './styles';
import {EntryCells} from './EntryTable';
import {
    buildCsv,
    downloadText,
    EntryRow,
    formatWorkHours,
    ReportSettings,
    toInputEntry,
    trimRow,
    validateRow,
    weekday,
    workHours,
} from './logic';

const SHOWN = 20;

interface Props {
    settings: ReportSettings;
    name: string;
    data?: MyReportData;
    refetch: () => void;
}

const toRow = (e: MyReportData_reportEntries): EntryRow => ({
    issueKey: e.issueKey,
    title: e.title,
    category: e.category,
    subcategory: e.subcategory,
    group: e.group,
    time: String(e.time),
    groupAuto: false,
});

export const SavedReports: React.FC<Props> = ({settings, name, data, refetch}) => {
    const classes = useReportStyles();
    const {enqueueSnackbar} = useSnackbar();
    // 空なら全件
    const [filterDate, setFilterDate] = React.useState('');
    const [removing, setRemoving] = React.useState<MyReportData_reportEntries | null>(null);
    const [removeEntry] = useMutation<RemoveReportEntry, RemoveReportEntryVariables>(gqlReport.RemoveReportEntry);
    // 編集中の行（1行ずつ）
    const [editing, setEditing] = React.useState<{id: number; row: EntryRow} | null>(null);
    const [updateEntry, {loading: updating}] = useMutation<UpdateReportEntry, UpdateReportEntryVariables>(
        gqlReport.UpdateReportEntry
    );
    const entries = (data && data.reportEntries) || [];
    const attendances = (data && data.reportAttendances) || [];
    const filtered = filterDate ? entries.filter((e) => e.date === filterDate) : entries;
    const shown = filtered.slice(0, SHOWN);
    // 編集中の行が削除や新しい保存で表示から外れたら、編集をやめた扱いにする
    const editingShown = editing && shown.some((e) => e.id === editing.id) ? editing : null;

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

    const saveEdit = (id: number, edited: EntryRow) => {
        const row = trimRow(edited);
        const error = row.title ? validateRow(settings, row) : '課題タイトルを入力してください';
        if (error) {
            enqueueSnackbar(error, {variant: 'warning'});
            return;
        }
        updateEntry({variables: {id, entry: toInputEntry(row)}})
            .then(() => {
                enqueueSnackbar('更新しました', {variant: 'success'});
                setEditing(null);
                refetch();
            })
            .catch(handleError('日報の更新', enqueueSnackbar));
    };

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
                <Typography color="textSecondary">
                    {filterDate ? `${filtered.length}件（全${entries.length}件）` : `${entries.length}件`}
                </Typography>
                <div style={{flexGrow: 1}} />
                <TextField
                    type="date"
                    label="日付で絞り込み"
                    InputLabelProps={{shrink: true}}
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                />
                <Button variant="outlined" disabled={!filterDate} onClick={() => setFilterDate('')}>
                    全件表示
                </Button>
                <Button variant="outlined" onClick={exportAll}>
                    全データCSV出力
                </Button>
            </div>
            {filtered.length === 0 ? (
                <Typography align="center" color="textSecondary" style={{padding: 20}}>
                    {filterDate ? 'この日付のデータはありません' : '保存されたデータはありません'}
                </Typography>
            ) : (
                <div style={{overflowX: 'auto'}}>
                    <Table size="small" style={editingShown ? {minWidth: 1200} : undefined}>
                        <TableHead>
                            <TableRow>
                                <TableCell>日付</TableCell>
                                <TableCell align="right">勤務時間</TableCell>
                                <TableCell>課題キー</TableCell>
                                <TableCell>タイトル</TableCell>
                                <TableCell>カテゴリ</TableCell>
                                <TableCell>分類</TableCell>
                                <TableCell>グループ</TableCell>
                                <TableCell align="right">実績時間</TableCell>
                                <TableCell padding="none" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shown.map((e) => {
                                const edit = editingShown && editingShown.id === e.id ? editingShown : null;
                                return (
                                    <TableRow key={e.id}>
                                        <TableCell style={{whiteSpace: 'nowrap'}}>
                                            {e.date}（{weekday(e.date)}）
                                        </TableCell>
                                        <TableCell align="right" style={{whiteSpace: 'nowrap'}}>
                                            {workTimeOf(e.date)}
                                        </TableCell>
                                        {edit ? (
                                            <EntryCells
                                                row={edit.row}
                                                settings={settings}
                                                onChange={(row) => setEditing({id: e.id, row})}
                                            />
                                        ) : (
                                            <>
                                                <TableCell>{e.issueKey}</TableCell>
                                                <TableCell>{e.title}</TableCell>
                                                <TableCell>{e.category}</TableCell>
                                                <TableCell>{e.subcategory}</TableCell>
                                                <TableCell>{e.group}</TableCell>
                                                <TableCell align="right">{e.time.toFixed(2)}</TableCell>
                                            </>
                                        )}
                                        <TableCell padding="none" style={{whiteSpace: 'nowrap'}}>
                                            {edit ? (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        title="保存"
                                                        disabled={updating}
                                                        onClick={() => saveEdit(e.id, edit.row)}>
                                                        <CheckIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" title="キャンセル" onClick={() => setEditing(null)}>
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        title="編集"
                                                        onClick={() => setEditing({id: e.id, row: toRow(e)})}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" title="削除" onClick={() => setRemoving(e)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {filtered.length > SHOWN ? (
                        <Typography align="center" color="textSecondary" variant="body2" style={{marginTop: 8}}>
                            最新{SHOWN}件を表示（全{filtered.length}件）
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
