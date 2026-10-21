import * as React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import {changeCategory, EntryRow, ReportSettings, subcategoriesOf, toHalfWidth} from './logic';

// datalist の id。lists は表ごとの接頭辞（同じページの日報入力と保存済みデータで id が重ならないように）
const categoryList = (lists: string) => `${lists}-category-list`;
const groupList = (lists: string) => `${lists}-group-list`;

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
            <EntryDatalists lists="dr" settings={settings} />
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
                            <EntryCells
                                lists="dr"
                                rowKey={index}
                                row={row}
                                settings={settings}
                                onChange={(r) => update(index, r)}
                            />
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

// カテゴリとグループの選択肢。EntryCells と同じ lists を渡す
export const EntryDatalists: React.FC<{lists: string; settings: ReportSettings}> = ({lists, settings}) => (
    <>
        <datalist id={categoryList(lists)}>
            {settings.categories.map((c) => (
                <option key={c.name} value={c.name} />
            ))}
        </datalist>
        <datalist id={groupList(lists)}>
            {settings.groups.map((g) => (
                <option key={g.id} value={g.name} />
            ))}
        </datalist>
    </>
);

// 1行分の入力欄（課題キー〜実績時間のセル）。rowKey は表の中で一意な値
export const EntryCells: React.FC<{
    lists: string;
    rowKey: number;
    row: EntryRow;
    settings: ReportSettings;
    onChange: (row: EntryRow) => void;
}> = ({lists, rowKey, row, settings, onChange}) => {
    const subList = `${lists}-sub-list-${rowKey}`;
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
                <TextField
                    fullWidth
                    value={row.category}
                    placeholder="カテゴリを入力..."
                    inputProps={{list: categoryList(lists)}}
                    onChange={(e) => onChange(changeCategory(settings, row, e.target.value))}
                />
            </TableCell>
            <TableCell>
                <datalist id={subList}>
                    {subcategoriesOf(settings, row.category).map((s) => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
                <TextField
                    fullWidth
                    value={row.subcategory}
                    placeholder="分類を入力..."
                    inputProps={{list: subList}}
                    onChange={set('subcategory')}
                />
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth
                    value={row.group}
                    placeholder="グループを入力..."
                    inputProps={{list: groupList(lists)}}
                    onChange={(e) => onChange({...row, group: e.target.value, groupAuto: false})}
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
