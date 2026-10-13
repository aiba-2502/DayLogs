// Settings and pure logic of the daily report (ported from daily_report_tool.html).
import * as JSON5 from 'json5';

export interface ReportGroup {
    id: string;
    name: string;
}

export interface ReportCategory {
    name: string;
    defaultGroupId: string;
    subcategories: string[];
}

export interface WorkCategory {
    id: string;
    name: string;
    role?: string;
}

export interface SubcategoryWorkOverride {
    category: string;
    subcategory: string;
    workCategoryId: string;
    assetFlag: string;
}

export interface ReportSettings {
    workTime: {start: string; end: string; breakTime: number};
    groups: ReportGroup[];
    categories: ReportCategory[];
    workCategories: WorkCategory[];
    subcategoryWorkOverrides: SubcategoryWorkOverride[];
    // other keys of the settings file (Backlog, links, ...) are kept as they are
    [key: string]: unknown;
}

const DEFAULT_WORK_CATEGORIES: WorkCategory[] = [
    {id: 'juchu', name: '受注制作'},
    {id: 'kiki', name: '機器組込み'},
    {id: 'jisha', name: '自社利用・市場販売'},
    {id: 'hoshu', name: '保守（不具合解消）'},
    {id: 'kenkyu', name: '研究開発'},
    {id: 'anbun', name: '按分対象', role: 'allocate'},
    {id: 'gaitou_gai', name: '対象外', role: 'exclude'},
];

export const BASE_WORK_HOURS = 8;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export const parseSettings = (json: string): ReportSettings => {
    let raw: Record<string, unknown> = {};
    try {
        const parsed = JSON.parse(json);
        raw = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        raw = {};
    }
    const workTime = (raw.workTime || {}) as Partial<ReportSettings['workTime']>;
    const workCategories = asArray<WorkCategory>(raw.workCategories);
    return {
        ...raw,
        workTime: {
            start: workTime.start || '09:00',
            end: workTime.end || '18:00',
            breakTime: typeof workTime.breakTime === 'number' ? workTime.breakTime : 1,
        },
        groups: asArray<ReportGroup>(raw.groups),
        categories: asArray<ReportCategory>(raw.categories).map((c) => ({...c, subcategories: asArray<string>(c.subcategories)})),
        workCategories: workCategories.length ? workCategories : DEFAULT_WORK_CATEGORIES,
        subcategoryWorkOverrides: asArray<SubcategoryWorkOverride>(raw.subcategoryWorkOverrides),
    };
};

export const subcategoriesOf = (settings: ReportSettings, category: string): string[] => {
    const found = settings.categories.find((c) => c.name === category);
    return found ? found.subcategories : [];
};

const groupName = (settings: ReportSettings, id: string): string => {
    const found = settings.groups.find((g) => g.id === id);
    return found ? found.name : '';
};

const defaultGroupOf = (settings: ReportSettings, category: string): string => {
    const found = settings.categories.find((c) => c.name === category);
    return found ? groupName(settings, found.defaultGroupId) : '';
};

export const findPairOverride = (overrides: SubcategoryWorkOverride[], category: string, subcategory: string) =>
    overrides.find((o) => o.category === category && (o.subcategory || '') === subcategory);

// 分類のないカテゴリは分類を空文字として設定する
const findOverride = (settings: ReportSettings, category: string, subcategory: string) =>
    findPairOverride(settings.subcategoryWorkOverrides, category, subcategory);

export const resolveWorkCategoryName = (settings: ReportSettings, category: string, subcategory: string): string => {
    const override = findOverride(settings, category, subcategory);
    const workCategory = override && settings.workCategories.find((w) => w.id === override.workCategoryId);
    return workCategory ? workCategory.name : '';
};

export const resolveAssetFlag = (settings: ReportSettings, category: string, subcategory: string): string => {
    const override = findOverride(settings, category, subcategory);
    return override && override.assetFlag ? override.assetFlag : '0';
};

const pad = (n: number) => String(n).padStart(2, '0');

export const formatDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatClock = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const weekday = (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    const value = new Date(y, m - 1, d);
    return isNaN(value.getTime()) ? '' : WEEKDAYS[value.getDay()];
};

export const toHalfWidth = (text: string): string =>
    text.replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

const minutesOf = (clock: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

// 勤務時間（終了-開始-休憩、時間単位）。時刻が不正なら null
export const workHours = (start: string, end: string, breakTime: number): number | null => {
    const s = minutesOf(start);
    const e = minutesOf(end);
    if (s === null || e === null) {
        return null;
    }
    return Math.round(((e - s) / 60 - breakTime) * 100) / 100;
};

export interface EntryRow {
    issueKey: string;
    title: string;
    category: string;
    subcategory: string;
    group: string;
    time: string;
    // グループがカテゴリから自動設定されたか（手動で変えたら以後は自動設定しない）
    groupAuto: boolean;
}

export const emptyRow = (): EntryRow => ({
    issueKey: '',
    title: '',
    category: '',
    subcategory: '',
    group: '',
    time: '',
    groupAuto: true,
});

// カテゴリ変更時: 選択肢にない分類はクリアし、既定グループを設定する
export const changeCategory = (settings: ReportSettings, row: EntryRow, category: string): EntryRow => {
    const subs = subcategoriesOf(settings, category);
    const subcategory = row.subcategory && subs.length > 0 && subs.indexOf(row.subcategory) < 0 ? '' : row.subcategory;
    const group = defaultGroupOf(settings, category);
    const useDefault = group !== '' && (row.group === '' || row.groupAuto);
    return {...row, category, subcategory, group: useDefault ? group : row.group, groupAuto: useDefault || row.groupAuto};
};

export const hours = (row: EntryRow): number => parseFloat(row.time) || 0;

export const hasInput = (row: EntryRow): boolean =>
    [row.issueKey, row.title, row.category, row.subcategory, row.group, row.time].some((v) => v !== '');

export const trimRow = (row: EntryRow): EntryRow => ({...row, issueKey: row.issueKey.trim(), title: row.title.trim()});

export const sumHours = (rows: EntryRow[]): number => Math.round(rows.reduce((sum, row) => sum + hours(row), 0) * 100) / 100;

// タイトルを入力した行の必須チェック。エラーがなければ空文字
export const validateRows = (settings: ReportSettings, rows: EntryRow[]): string => {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.title.trim()) {
            continue;
        }
        const line = `${i + 1}行目`;
        if (!row.category) {
            return `${line}: カテゴリが未選択です`;
        }
        if (subcategoriesOf(settings, row.category).length > 0 && !row.subcategory) {
            return `${line}: 分類が未選択です`;
        }
        if (!row.group) {
            return `${line}: グループが未選択です`;
        }
        if (hours(row) <= 0) {
            return `${line}: 実績時間が未入力です`;
        }
    }
    return '';
};

export const copyLine = (row: {category: string; subcategory: string; title: string}): string =>
    row.subcategory ? `${row.category}\t${row.subcategory}\t${row.title}` : `${row.category}\t${row.title}`;

export const markdown = (date: string, workStart: string, workEnd: string, breakTime: number, lines: string[]): string =>
    [
        `# ${date.replace(/-/g, '/')}`,
        `- 勤務時間：${workStart}～${workEnd}（休憩${breakTime}時間）`,
        '',
        '### 本日の作業',
        ...lines.map((line) => `- ${line}`),
        '',
        '### 連絡事項',
        '',
        '',
    ].join('\n');

export interface CsvEntry {
    date: string;
    name: string;
    issueKey: string;
    category: string;
    subcategory: string;
    title: string;
    time: number;
    group: string;
    timestamp: string;
}

const CSV_COLUMNS = [
    'date',
    'name',
    'project',
    'issueKey',
    'category',
    'subcategory',
    'title',
    'time',
    'timestamp',
    'category_div',
    'recordType',
    'progress',
    'content',
    'dueDate',
    'workCategory',
    'assetFlag',
];
const BOM = String.fromCharCode(0xfeff);
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;

// 元ツールと同じ列の日報CSV（BOM付き）。開発工数区分・資産フラグは設定から解決する
export const buildCsv = (settings: ReportSettings, entries: CsvEntry[]): string => {
    const lines = entries.map((e) => {
        const workCategory = resolveWorkCategoryName(settings, e.category, e.subcategory);
        const assetFlag = resolveAssetFlag(settings, e.category, e.subcategory);
        const fields = [e.date, e.name, '', e.issueKey, e.category, e.subcategory, e.title].map(quote);
        const rest = [e.timestamp, e.group, 'task', '', '', '', workCategory, assetFlag].map(quote);
        return [...fields, String(e.time || 0), ...rest].join(',');
    });
    const header = CSV_COLUMNS.map(quote).join(',');
    return [BOM + header, ...lines].join('\n') + '\n';
};

export const csvFileName = (name: string, date: string): string => `${name}_${date.replace(/-/g, '')}_${weekday(date)}.csv`;

export const downloadText = (fileName: string, text: string, type = 'text/csv;charset=utf-8;') => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], {type}));
    link.download = fileName;
    link.click();
};

export interface SettingsFile {
    name: string;
    members: Array<{name: string; freeeEmployeeNo: string}>;
    settings: ReportSettings;
}

interface NameEntry {
    name: string;
    freeeEmployeeNo?: string;
    settingsGroupNo?: string;
}

// daily_report_settings_00N.js（var DAILY_REPORT_SETTINGS = {...}）を読み込む。
// 共有フォルダのファイルは誰でも書き換えられるため、スクリプトとして実行せず {...} 部分を JSON5 として読む。
// sharedMembers は settingsGroupNo で他の設定ファイルも使う人（他の部署にもメンバー登録が必要）
export const importSettingsJs = (text: string): SettingsFile & {sharedMembers: string[]} => {
    const match = /DAILY_REPORT_SETTINGS\s*=\s*\{/.exec(text);
    const end = text.lastIndexOf('}');
    if (!match || end < match.index) {
        throw new Error('DAILY_REPORT_SETTINGS が見つかりません');
    }
    const value = JSON5.parse(text.slice(match.index + match[0].length - 1, end + 1));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('DAILY_REPORT_SETTINGS がオブジェクトではありません');
    }
    const {names, settingsGroupName, ...rest} = value as Record<string, unknown>;
    // APIキーは各自のブラウザに持つもので、部署の設定（メンバー全員が読める）には入れない
    if (rest.backlog && typeof rest.backlog === 'object') {
        const backlog = {...(rest.backlog as Record<string, unknown>)};
        delete backlog.apiKey;
        rest.backlog = backlog;
    }
    // 元ツールの names は名前だけの文字列でも書ける
    const entries = asArray<string | NameEntry>(names).map((n): NameEntry => (typeof n === 'string' ? {name: n} : n));
    return {
        name: typeof settingsGroupName === 'string' ? settingsGroupName : '',
        members: entries.map((n) => ({name: n.name, freeeEmployeeNo: n.freeeEmployeeNo || ''})),
        sharedMembers: entries.filter((n) => n.settingsGroupNo).map((n) => `${n.name}（${n.settingsGroupNo}）`),
        settings: parseSettings(JSON.stringify(rest)),
    };
};

export const exportSettingsJs = (file: SettingsFile): string => {
    const value = {settingsGroupName: file.name, names: file.members, ...file.settings};
    return `var DAILY_REPORT_SETTINGS = ${JSON.stringify(value, null, 4)};\n`;
};

// navigator.clipboard は https / localhost でしか使えないため、社内の http 配信では execCommand で代用する
export const copyToClipboard = (text: string): Promise<void> => {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'));
};

// 勤務時間の表示（例: 8:30（0:30）、括弧内は残業）
export const formatWorkHours = (value: number): string => {
    const minutes = Math.round(value * 60);
    const hm = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
    const overtime = minutes - BASE_WORK_HOURS * 60;
    return overtime > 0 ? `${hm(minutes)}（${hm(overtime)}）` : hm(minutes);
};

export interface MemberDraft {
    userId: number;
    name: string;
    freeeEmployeeNo: string;
}

export interface CategoryDraft {
    name: string;
    subcategoriesText: string;
    defaultGroupId: string;
}

// 日報設定画面の編集中の状態。設定画面で編集しない項目は otherJson にJSONのまま持つ
export interface SettingsDraft {
    name: string;
    members: MemberDraft[];
    workStart: string;
    workEnd: string;
    breakTime: string;
    groupsText: string;
    categories: CategoryDraft[];
    overrides: SubcategoryWorkOverride[];
    otherJson: string;
}

const nonEmptyLines = (text: string) =>
    text
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s);

export const toSettingsDraft = (name: string, settings: ReportSettings, members: MemberDraft[]): SettingsDraft => {
    const {workTime, groups, categories, subcategoryWorkOverrides, ...other} = settings;
    return {
        name,
        members,
        workStart: workTime.start,
        workEnd: workTime.end,
        breakTime: String(workTime.breakTime),
        groupsText: groups.map((g) => `${g.id}=${g.name}`).join('\n'),
        categories: categories.map((c) => ({
            name: c.name,
            subcategoriesText: c.subcategories.join('\n'),
            defaultGroupId: c.defaultGroupId,
        })),
        overrides: subcategoryWorkOverrides,
        otherJson: JSON.stringify(other, null, 2),
    };
};

// 「ID=グループ名」を1行1件で
export const parseGroups = (text: string): ReportGroup[] =>
    nonEmptyLines(text)
        .map((line) => [line.substring(0, line.indexOf('=')).trim(), line.substring(line.indexOf('=') + 1).trim()])
        .filter(([id, name]) => id && name)
        .map(([id, name]) => ({id, name}));

// 名前のないカテゴリだけ捨てる（デフォルトグループは未選択でもよい）
export const draftCategories = (categories: CategoryDraft[]): ReportCategory[] =>
    categories
        .filter((c) => c.name.trim())
        .map((c) => ({name: c.name.trim(), defaultGroupId: c.defaultGroupId, subcategories: nonEmptyLines(c.subcategoriesText)}));

// カテゴリ×分類の組（分類のないカテゴリは分類を空文字としてカテゴリ全体に設定する）
export const categoryPairs = (categories: ReportCategory[]): Array<{category: string; subcategory: string}> =>
    categories.reduce<Array<{category: string; subcategory: string}>>(
        (pairs, c) => [
            ...pairs,
            ...(c.subcategories.length ? c.subcategories : ['']).map((s) => ({category: c.name, subcategory: s})),
        ],
        []
    );

// 開発工数区分が未設定かつ資産フラグ0の組は保存しない（元ツールと同じ）
export const setOverride = (overrides: SubcategoryWorkOverride[], next: SubcategoryWorkOverride): SubcategoryWorkOverride[] => [
    ...overrides.filter((o) => o !== findPairOverride(overrides, next.category, next.subcategory)),
    ...(next.workCategoryId || next.assetFlag === '1' ? [next] : []),
];

// 編集中の状態から保存する設定を作る。otherJson が不正なら例外
export const fromSettingsDraft = (draft: SettingsDraft): ReportSettings => {
    const other = JSON.parse(draft.otherJson.trim() || '{}');
    if (!other || typeof other !== 'object' || Array.isArray(other)) {
        throw new Error('その他の設定がJSONオブジェクトではありません');
    }
    const categories = draftCategories(draft.categories);
    const pairs = categoryPairs(categories);
    return parseSettings(
        JSON.stringify({
            ...other,
            workTime: {start: draft.workStart, end: draft.workEnd, breakTime: parseFloat(draft.breakTime) || 0},
            groups: parseGroups(draft.groupsText),
            categories,
            // 元ツールと同じく、表に表示しているカテゴリ×分類の設定だけ残す（見えない設定が効き続けないように）
            subcategoryWorkOverrides: draft.overrides.filter((o) =>
                pairs.some((p) => p.category === o.category && p.subcategory === (o.subcategory || ''))
            ),
        })
    );
};
