import {
    buildCsv,
    categoryPairs,
    fromSettingsDraft,
    setOverride,
    toSettingsDraft,
    changeCategory,
    copyLine,
    csvFileName,
    emptyRow,
    exportSettingsJs,
    importSettingsJs,
    parseSettings,
    resolveAssetFlag,
    resolveWorkCategoryName,
    toHalfWidth,
    validateRows,
    workHours,
} from './logic';

const settings = parseSettings(
    JSON.stringify({
        groups: [
            {id: '001', name: 'PoC'},
            {id: '999', name: 'その他'},
        ],
        categories: [
            {name: '開発', defaultGroupId: '001', subcategories: ['実装', '設計']},
            {name: '雑務', defaultGroupId: '999'},
        ],
        subcategoryWorkOverrides: [
            {category: '開発', subcategory: '実装', workCategoryId: 'kenkyu', assetFlag: '1'},
            {category: '開発', subcategory: '', workCategoryId: 'jisha', assetFlag: '0'},
        ],
        backlog: {space: 'example'},
    })
);

it('fills defaults and keeps unknown keys', () => {
    expect(settings.workTime).toEqual({start: '09:00', end: '18:00', breakTime: 1});
    expect(settings.workCategories.length).toBe(7);
    expect(settings.categories[1].subcategories).toEqual([]);
    expect(settings.backlog).toEqual({space: 'example'});
    expect(parseSettings('broken').groups).toEqual([]);
});

it('resolves work category per subcategory, then per category', () => {
    expect(resolveWorkCategoryName(settings, '開発', '実装')).toBe('研究開発');
    expect(resolveAssetFlag(settings, '開発', '実装')).toBe('1');
    expect(resolveWorkCategoryName(settings, '開発', '設計')).toBe('自社利用・市場販売');
    expect(resolveWorkCategoryName(settings, '雑務', '')).toBe('');
    expect(resolveAssetFlag(settings, '雑務', '')).toBe('0');
});

it('sets the default group until the group is changed by hand', () => {
    const row = changeCategory(settings, {...emptyRow(), subcategory: '不明'}, '開発');
    expect(row.group).toBe('PoC');
    expect(row.subcategory).toBe('');
    expect(changeCategory(settings, row, '雑務').group).toBe('その他');
    expect(changeCategory(settings, {...row, group: '手動', groupAuto: false}, '雑務').group).toBe('手動');
});

it('validates rows with a title', () => {
    const row = {...emptyRow(), title: '実装', category: '開発', subcategory: '実装', group: 'PoC', time: '1.5'};
    expect(validateRows(settings, [emptyRow(), row])).toBe('');
    expect(validateRows(settings, [emptyRow(), {...row, subcategory: ''}])).toBe('2行目: 分類が未選択です');
    expect(validateRows(settings, [{...row, category: '雑務', subcategory: ''}])).toBe('');
    expect(validateRows(settings, [{...row, time: '0'}])).toBe('1行目: 実績時間が未入力です');
    expect(validateRows(settings, [{...row, group: ''}])).toBe('1行目: グループが未選択です');
});

it('calculates working hours', () => {
    expect(workHours('10:00', '19:30', 1)).toBe(8.5);
    expect(workHours('9:00', '18:00', 1)).toBe(8);
    expect(workHours('10', '19:00', 1)).toBeNull();
    expect(toHalfWidth('１．５')).toBe('1.5');
});

it('builds the CSV of the original tool', () => {
    const csv = buildCsv(settings, [
        {
            date: '2026-10-13',
            name: '山田',
            issueKey: 'A-1',
            category: '開発',
            subcategory: '実装',
            title: 'say "hi"',
            time: 1.5,
            group: 'PoC',
            timestamp: 'T',
        },
    ]);
    expect(csv).toBe(
        String.fromCharCode(0xfeff) +
            '"date","name","project","issueKey","category","subcategory","title","time","timestamp","category_div","recordType","progress","content","dueDate","workCategory","assetFlag"\n' +
            '"2026-10-13","山田","","A-1","開発","実装","say ""hi""",1.5,"T","PoC","task","","","","研究開発","1"\n'
    );
    expect(csvFileName('山田', '2026-10-13')).toBe('山田_20261013_火.csv');
    expect(copyLine({category: '雑務', subcategory: '', title: 'x'})).toBe('雑務\tx');
});

it('imports and exports the settings file', () => {
    const file = importSettingsJs(`
        // comment
        var DAILY_REPORT_SETTINGS = {
            settingsGroupName: "開発室",
            names: [{ name: "山田", freeeEmployeeNo: "8" }, "佐藤"],
            groups: [{ id: "001", name: "PoC" }],
        };`);
    expect(file.name).toBe('開発室');
    expect(file.members).toEqual([
        {name: '山田', freeeEmployeeNo: '8'},
        {name: '佐藤', freeeEmployeeNo: ''},
    ]);
    expect(file.settings.groups).toEqual([{id: '001', name: 'PoC'}]);
    expect(file.settings.names).toBeUndefined();
    expect(importSettingsJs(exportSettingsJs(file))).toEqual(file);
    expect(() => importSettingsJs('var X = 1;')).toThrow();
});

it('converts settings to the editor state and back', () => {
    const draft = toSettingsDraft('開発室', settings, [{userId: 1, name: '山田', freeeEmployeeNo: ''}]);
    expect(draft.groupsText).toBe('001=PoC\n999=その他');
    expect(JSON.parse(draft.otherJson).backlog).toEqual({space: 'example'});
    expect(fromSettingsDraft(draft)).toEqual(settings);

    const edited = fromSettingsDraft({
        ...draft,
        groupsText: ' 001 = PoC \nbroken\n=x\n',
        categories: [
            {name: '開発', subcategoriesText: '実装\n\n', defaultGroupId: '001'},
            {name: '', subcategoriesText: '', defaultGroupId: '001'},
        ],
        overrides: [
            ...settings.subcategoryWorkOverrides,
            {category: '削除済み', subcategory: '', workCategoryId: 'kenkyu', assetFlag: '0'},
        ],
        otherJson: '',
    });
    expect(edited.groups).toEqual([{id: '001', name: 'PoC'}]);
    expect(edited.categories).toEqual([{name: '開発', defaultGroupId: '001', subcategories: ['実装']}]);
    expect(edited.subcategoryWorkOverrides).toEqual(settings.subcategoryWorkOverrides);
    expect(() => fromSettingsDraft({...draft, otherJson: '[1]'})).toThrow();
});

it('keeps only meaningful overrides', () => {
    const base = settings.subcategoryWorkOverrides;
    const changed = setOverride(base, {category: '開発', subcategory: '実装', workCategoryId: '', assetFlag: '0'});
    expect(changed).toEqual([base[1]]);
    expect(setOverride(changed, {category: '雑務', subcategory: '', workCategoryId: 'kenkyu', assetFlag: '0'}).length).toBe(2);
    expect(categoryPairs(settings.categories)).toEqual([
        {category: '開発', subcategory: '実装'},
        {category: '開発', subcategory: '設計'},
        {category: '雑務', subcategory: ''},
    ]);
});
