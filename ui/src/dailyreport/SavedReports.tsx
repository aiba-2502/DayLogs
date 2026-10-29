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
import TableSortLabel from '@material-ui/core/TableSortLabel';
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
    const [ascending, setAscending] = React.useState(true);
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
    // 日付順に並べ、同じ日は入力順のまま（sortは元の配列を変えるのでコピーしてから）
    const shown = filtered
        .slice()
        .sort((a, b) => (ascending ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.id - b.id);
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

    // 同じ日の行には開始・終了・勤務時間を1回だけ表示する
    const shownDates = new Set<string>();
    const attendanceOf = (date: string) => {
        const attendance = attendances.find((a) => a.date === date);
        if (!attendance || shownDates.has(date)) {
            return null;
        }
        shownDates.add(date);
        const value = workHours(attendance.workStart, attendance.workEnd, attendance.breakTime);
        return {...attendance, hours: value === null ? '' : formatWorkHours(value)};
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
                <div style={{overflow: 'auto', maxHeight: '70vh'}}>
                    <Table size="small" stickyHeader={true} style={editingShown ? {minWidth: 1350} : undefined}>
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={ascending ? 'asc' : 'desc'}>
                                    <TableSortLabel
                                        active={true}
                                        direction={ascending ? 'asc' : 'desc'}
                                        onClick={() => setAscending(!ascending)}>
                                        日付
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>開始</TableCell>
                                <TableCell>終了</TableCell>
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
                                const attendance = attendanceOf(e.date);
                                return (
                                    <TableRow key={e.id}>
                                        <TableCell style={{whiteSpace: 'nowrap'}}>
                                            {e.date}（{weekday(e.date)}）
                                        </TableCell>
                                        <TableCell style={{whiteSpace: 'nowrap'}}>{attendance && attendance.workStart}</TableCell>
                                        <TableCell style={{whiteSpace: 'nowrap'}}>{attendance && attendance.workEnd}</TableCell>
                                        <TableCell align="right" style={{whiteSpace: 'nowrap'}}>
                                            {attendance && attendance.hours}
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
