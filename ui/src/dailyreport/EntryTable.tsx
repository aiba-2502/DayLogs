import * as React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import {ComboField} from './ComboField';
import {changeCategory, EntryRow, ReportSettings, subcategoriesOf, toHalfWidth} from './logic';

const Required = () => <span style={{color: '#e57373'}}>*</span>;

interface Props {
    settings: ReportSettings;
    rows: EntryRow[];
    onChange: (rows: EntryRow[]) => void;
}

export const EntryTable: React.FC<Props> = ({settings, rows, onChange}) => {
    const update = (index: number, row: EntryRow) => onChange(rows.map((r, i) => (i === index ? row : r)));
    const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
    return (
        <div style={{overflowX: 'auto'}}>
            <Table size="small" style={{minWidth: 900}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: 130}}>課題キー</TableCell>
                        <TableCell>課題タイトル</TableCell>
                        <TableCell style={{width: 240}}>
                            カテゴリ
                            <Required />
                        </TableCell>
                        <TableCell style={{width: 200}}>
                            分類
                            <Required />
                        </TableCell>
                        <TableCell style={{width: 160}}>
                            グループ
                            <Required />
                        </TableCell>
                        <TableCell style={{width: 90}}>
                            実績時間
                            <Required />
                        </TableCell>
                        <TableCell style={{width: 48}} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index}>
                            <EntryCells row={row} settings={settings} onChange={(r) => update(index, r)} />
                            <TableCell padding="none">
                                <IconButton size="small" title="削除" onClick={() => remove(index)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

// 1行分の入力欄（課題キー〜実績時間のセル）
export const EntryCells: React.FC<{
    row: EntryRow;
    settings: ReportSettings;
    onChange: (row: EntryRow) => void;
}> = ({row, settings, onChange}) => {
    const set = (key: keyof EntryRow) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({...row, [key]: e.target.value});
    return (
        <>
            <TableCell>
                <TextField fullWidth value={row.issueKey} placeholder="TECSUP-1234" onChange={set('issueKey')} />
            </TableCell>
            <TableCell>
                <TextField fullWidth value={row.title} placeholder="課題タイトル" onChange={set('title')} />
            </TableCell>
            <TableCell>
                <ComboField
                    value={row.category}
                    options={settings.categories.map((c) => c.name)}
                    placeholder="カテゴリを入力..."
                    onChange={(category) => onChange(changeCategory(settings, row, category))}
                />
            </TableCell>
            <TableCell>
                <ComboField
                    value={row.subcategory}
                    options={subcategoriesOf(settings, row.category)}
                    placeholder="分類を入力..."
                    onChange={(subcategory) => onChange({...row, subcategory})}
                />
            </TableCell>
            <TableCell>
                <ComboField
                    value={row.group}
                    options={settings.groups.map((g) => g.name)}
                    placeholder="グループを入力..."
                    onChange={(group) => onChange({...row, group, groupAuto: false})}
                />
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth
                    value={row.time}
                    placeholder="0.00"
                    inputProps={{inputMode: 'decimal', style: {textAlign: 'right'}}}
                    onChange={(e) => onChange({...row, time: toHalfWidth(e.target.value)})}
                />
            </TableCell>
        </>
    );
};
