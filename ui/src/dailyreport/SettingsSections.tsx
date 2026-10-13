import * as React from 'react';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import Select from '@material-ui/core/NativeSelect/NativeSelect';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import CloseIcon from '@material-ui/icons/Close';
import {Users_users} from '../gql/__generated__/Users';
import {
    categoryPairs,
    CategoryDraft,
    findPairOverride,
    MemberDraft,
    ReportCategory,
    ReportGroup,
    setOverride,
    SubcategoryWorkOverride,
    WorkCategory,
} from './logic';

export const Section: React.FC<{title: string; help?: string; expanded?: boolean}> = ({
    title,
    help,
    expanded = false,
    children,
}) => (
    <ExpansionPanel defaultExpanded={expanded}>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">{title}</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails style={{display: 'block'}}>
            {help ? (
                <Typography variant="body2" color="textSecondary" style={{marginBottom: 8, whiteSpace: 'pre-line'}}>
                    {help}
                </Typography>
            ) : null}
            {children}
        </ExpansionPanelDetails>
    </ExpansionPanel>
);

function replaceAt<T>(list: T[], index: number, value: T) {
    return list.map((v, i) => (i === index ? value : v));
}
function removeAt<T>(list: T[], index: number) {
    return list.filter((_, i) => i !== index);
}

export const MembersEditor: React.FC<{members: MemberDraft[]; users: Users_users[]; onChange: (m: MemberDraft[]) => void}> = ({
    members,
    users,
    onChange,
}) => (
    <>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>DayLogs ユーザー</TableCell>
                    <TableCell>日報上の名前</TableCell>
                    <TableCell>freee従業員番号</TableCell>
                    <TableCell padding="none" />
                </TableRow>
            </TableHead>
            <TableBody>
                {members.map((m, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <Select
                                value={m.userId}
                                onChange={(e) => onChange(replaceAt(members, i, {...m, userId: Number(e.target.value)}))}>
                                <option value={0}>（アカウントなし）</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </Select>
                        </TableCell>
                        <TableCell>
                            <TextField
                                fullWidth
                                value={m.name}
                                onChange={(e) => onChange(replaceAt(members, i, {...m, name: e.target.value}))}
                            />
                        </TableCell>
                        <TableCell>
                            <TextField
                                value={m.freeeEmployeeNo}
                                onChange={(e) => onChange(replaceAt(members, i, {...m, freeeEmployeeNo: e.target.value}))}
                            />
                        </TableCell>
                        <TableCell padding="none">
                            <IconButton size="small" title="削除" onClick={() => onChange(removeAt(members, i))}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <Button style={{marginTop: 8}} onClick={() => onChange([...members, {userId: 0, name: '', freeeEmployeeNo: ''}])}>
            ＋ メンバーを追加
        </Button>
    </>
);

export const CategoriesEditor: React.FC<{
    categories: CategoryDraft[];
    groups: ReportGroup[];
    onChange: (c: CategoryDraft[]) => void;
}> = ({categories, groups, onChange}) => (
    <>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell style={{width: '30%'}}>カテゴリ名</TableCell>
                    <TableCell>分類（1行1件）</TableCell>
                    <TableCell style={{width: '25%'}}>デフォルトグループ</TableCell>
                    <TableCell padding="none" />
                </TableRow>
            </TableHead>
            <TableBody>
                {categories.map((c, i) => (
                    <TableRow key={i} style={{verticalAlign: 'top'}}>
                        <TableCell>
                            <TextField
                                fullWidth
                                multiline
                                value={c.name}
                                onChange={(e) => onChange(replaceAt(categories, i, {...c, name: e.target.value}))}
                            />
                        </TableCell>
                        <TableCell>
                            <TextField
                                fullWidth
                                multiline
                                rowsMax={8}
                                value={c.subcategoriesText}
                                onChange={(e) => onChange(replaceAt(categories, i, {...c, subcategoriesText: e.target.value}))}
                            />
                        </TableCell>
                        <TableCell>
                            <Select
                                fullWidth
                                value={c.defaultGroupId}
                                onChange={(e) => onChange(replaceAt(categories, i, {...c, defaultGroupId: e.target.value}))}>
                                <option value="">（未選択）</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.id}={g.name}
                                    </option>
                                ))}
                            </Select>
                        </TableCell>
                        <TableCell padding="none">
                            <IconButton size="small" title="削除" onClick={() => onChange(removeAt(categories, i))}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <Button
            style={{marginTop: 8}}
            onClick={() => onChange([...categories, {name: '', subcategoriesText: '', defaultGroupId: ''}])}>
            ＋ カテゴリを追加
        </Button>
    </>
);

const pairKey = (category: string, subcategory: string) => `${category}\n${subcategory}`;

const WorkCategorySelect: React.FC<{
    value: string;
    workCategories: WorkCategory[];
    blank: string;
    onChange: (v: string) => void;
}> = ({value, workCategories, blank, onChange}) => (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{blank}</option>
        {workCategories.map((w) => (
            <option key={w.id} value={w.id}>
                {w.name}
            </option>
        ))}
    </Select>
);

export const OverridesEditor: React.FC<{
    categories: ReportCategory[];
    overrides: SubcategoryWorkOverride[];
    workCategories: WorkCategory[];
    onChange: (o: SubcategoryWorkOverride[]) => void;
}> = ({categories, overrides, workCategories, onChange}) => {
    const pairs = categoryPairs(categories);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [bulkWorkCategory, setBulkWorkCategory] = React.useState('');
    const [bulkAsset, setBulkAsset] = React.useState('');
    const toggle = (key: string) =>
        setSelected(selected.indexOf(key) >= 0 ? selected.filter((k) => k !== key) : [...selected, key]);
    const current = (category: string, subcategory: string) =>
        findPairOverride(overrides, category, subcategory) || {category, subcategory, workCategoryId: '', assetFlag: '0'};
    const applyBulk = () =>
        onChange(
            pairs
                .filter((p) => selected.indexOf(pairKey(p.category, p.subcategory)) >= 0)
                .reduce((list, p) => {
                    const o = current(p.category, p.subcategory);
                    return setOverride(list, {
                        ...o,
                        workCategoryId: bulkWorkCategory || o.workCategoryId,
                        assetFlag: bulkAsset || o.assetFlag,
                    });
                }, overrides)
        );
    return (
        <>
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8}}>
                <Checkbox
                    checked={pairs.length > 0 && selected.length === pairs.length}
                    onChange={(e) => setSelected(e.target.checked ? pairs.map((p) => pairKey(p.category, p.subcategory)) : [])}
                />
                <Typography variant="body2">{selected.length}件選択中</Typography>
                <div style={{flexGrow: 1}} />
                <WorkCategorySelect
                    value={bulkWorkCategory}
                    workCategories={workCategories}
                    blank="開発工数区分（変更しない）"
                    onChange={setBulkWorkCategory}
                />
                <Select value={bulkAsset} onChange={(e) => setBulkAsset(e.target.value)}>
                    <option value="">資産フラグ（変更しない）</option>
                    <option value="1">1（資産）にする</option>
                    <option value="0">0（費用）にする</option>
                </Select>
                <Button variant="outlined" size="small" onClick={applyBulk} disabled={selected.length === 0}>
                    選択行に適用
                </Button>
            </div>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>カテゴリ</TableCell>
                        <TableCell>分類</TableCell>
                        <TableCell>開発工数区分</TableCell>
                        <TableCell>資産</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pairs.map((p) => {
                        const key = pairKey(p.category, p.subcategory);
                        const o = current(p.category, p.subcategory);
                        return (
                            <TableRow key={key}>
                                <TableCell padding="checkbox">
                                    <Checkbox checked={selected.indexOf(key) >= 0} onChange={() => toggle(key)} />
                                </TableCell>
                                <TableCell>{p.category}</TableCell>
                                <TableCell>{p.subcategory || '（分類なし・カテゴリ全体）'}</TableCell>
                                <TableCell>
                                    <WorkCategorySelect
                                        value={o.workCategoryId}
                                        workCategories={workCategories}
                                        blank="（未設定）"
                                        onChange={(v) => onChange(setOverride(overrides, {...o, workCategoryId: v}))}
                                    />
                                </TableCell>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={o.assetFlag === '1'}
                                        onChange={(e) =>
                                            onChange(setOverride(overrides, {...o, assetFlag: e.target.checked ? '1' : '0'}))
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </>
    );
};
