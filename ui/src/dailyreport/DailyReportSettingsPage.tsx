import * as React from 'react';
import {useMutation, useQuery} from '@apollo/react-hooks';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import {useSnackbar} from 'notistack';
import * as gqlReport from '../gql/dailyReport';
import * as gqlUser from '../gql/user';
import {Users, Users_users} from '../gql/__generated__/Users';
import {ReportDepartments_reportDepartments} from '../gql/__generated__/ReportDepartments';
import {ReportMembers, ReportMembersVariables, ReportMembers_reportMembers} from '../gql/__generated__/ReportMembers';
import {CreateReportDepartment, CreateReportDepartmentVariables} from '../gql/__generated__/CreateReportDepartment';
import {UpdateReportDepartment, UpdateReportDepartmentVariables} from '../gql/__generated__/UpdateReportDepartment';
import {RemoveReportDepartment, RemoveReportDepartmentVariables} from '../gql/__generated__/RemoveReportDepartment';
import {SetReportMembers, SetReportMembersVariables} from '../gql/__generated__/SetReportMembers';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {handleError} from '../utils/errors';
import {DepartmentSelect, useReportDepartment} from './department';
import {CategoriesEditor, MembersEditor, OverridesEditor, Section} from './SettingsSections';
import {useReportStyles} from './styles';
import {
    draftCategories,
    downloadText,
    exportSettingsJs,
    fromSettingsDraft,
    importSettingsJs,
    parseGroups,
    parseSettings,
    SettingsDraft,
    toSettingsDraft,
} from './logic';

export const DailyReportSettingsPage = () => {
    const classes = useReportStyles();
    const {enqueueSnackbar} = useSnackbar();
    const {departments, department, select, loading} = useReportDepartment();
    const usersQuery = useQuery<Users>(gqlUser.Users);
    const membersQuery = useQuery<ReportMembers, ReportMembersVariables>(gqlReport.ReportMembers, {
        variables: {departmentId: department ? department.id : 0},
        skip: !department,
    });
    const [create] = useMutation<CreateReportDepartment, CreateReportDepartmentVariables>(gqlReport.CreateReportDepartment, {
        refetchQueries: [{query: gqlReport.ReportDepartments}],
        awaitRefetchQueries: true,
    });
    if (loading || usersQuery.loading || membersQuery.loading) {
        return <CenteredSpinner />;
    }
    const users = (usersQuery.data && usersQuery.data.users) || [];
    const members = (membersQuery.data && membersQuery.data.reportMembers) || [];

    const createDepartment = () =>
        create({variables: {name: '新しい部署', settings: '{}'}})
            .then((result) => {
                if (result.data) {
                    select(result.data.createReportDepartment.id);
                }
                enqueueSnackbar('部署を追加しました', {variant: 'success'});
            })
            .catch(handleError('部署の追加', enqueueSnackbar));

    return (
        <div className={classes.root}>
            <Paper className={classes.paper}>
                <div className={classes.row}>
                    {department ? <DepartmentSelect departments={departments} value={department.id} onChange={select} /> : null}
                    <Button variant="outlined" onClick={createDepartment}>
                        ＋ 部署を追加
                    </Button>
                </div>
                {department ? null : (
                    <Typography style={{marginTop: 16}}>
                        部署がありません。「部署を追加」してから、既存の設定ファイル（daily_report_settings_00N.js）をインポートできます。
                    </Typography>
                )}
            </Paper>
            {department ? (
                <DepartmentEditor
                    key={`${department.id}:${department.settings}:${members.map((m) => m.id).join(',')}`}
                    department={department}
                    members={members}
                    users={users}
                />
            ) : null}
        </div>
    );
};

const DepartmentEditor: React.FC<{
    department: ReportDepartments_reportDepartments;
    members: ReportMembers_reportMembers[];
    users: Users_users[];
}> = ({department, members, users}) => {
    const classes = useReportStyles();
    const {enqueueSnackbar} = useSnackbar();
    const [draft, setDraft] = React.useState<SettingsDraft>(() =>
        toSettingsDraft(
            department.name,
            parseSettings(department.settings),
            members.map((m) => ({userId: m.userId, name: m.name, freeeEmployeeNo: m.freeeEmployeeNo}))
        )
    );
    const [confirmRemove, setConfirmRemove] = React.useState(false);
    const fileInput = React.useRef<HTMLInputElement>(null);
    const refetch = {
        refetchQueries: [
            {query: gqlReport.ReportDepartments},
            {query: gqlReport.ReportMembers, variables: {departmentId: department.id}},
        ],
        awaitRefetchQueries: true,
    };
    const [update] = useMutation<UpdateReportDepartment, UpdateReportDepartmentVariables>(gqlReport.UpdateReportDepartment);
    const [setMembers] = useMutation<SetReportMembers, SetReportMembersVariables>(gqlReport.SetReportMembers, refetch);
    const [remove] = useMutation<RemoveReportDepartment, RemoveReportDepartmentVariables>(
        gqlReport.RemoveReportDepartment,
        refetch
    );
    const set = <K extends keyof SettingsDraft>(key: K) => (value: SettingsDraft[K]) => setDraft({...draft, [key]: value});
    const text = (key: 'name' | 'workStart' | 'workEnd' | 'breakTime' | 'groupsText' | 'otherJson') => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setDraft({...draft, [key]: e.target.value});

    const settingsOrError = (): string | null => {
        try {
            return JSON.stringify(fromSettingsDraft(draft));
        } catch (e) {
            enqueueSnackbar(`その他の設定(JSON)が不正です: ${e.message}`, {variant: 'warning'});
            return null;
        }
    };

    const save = () => {
        const settings = settingsOrError();
        if (settings === null) {
            return;
        }
        update({variables: {id: department.id, name: draft.name, settings}})
            .then(() => setMembers({variables: {departmentId: department.id, members: draft.members}}))
            .then(() => enqueueSnackbar('日報設定を保存しました', {variant: 'success'}))
            .catch(handleError('日報設定の保存', enqueueSnackbar));
    };

    const importFile = (file: File) =>
        new Response(file).text().then((content) => {
            try {
                const imported = importSettingsJs(content);
                // 同じ名前のメンバーは、割り当て済みのユーザーを引き継ぐ
                const userIdOf = (name: string) => (draft.members.find((m) => m.name === name) || {userId: 0}).userId;
                const importedMembers = imported.members.map((m) => ({...m, userId: userIdOf(m.name)}));
                setDraft(toSettingsDraft(imported.name || draft.name, imported.settings, importedMembers));
                enqueueSnackbar('インポートしました。内容を確認して「保存」してください', {variant: 'info'});
            } catch (e) {
                enqueueSnackbar(`設定ファイルを読み込めません: ${e.message}`, {variant: 'error'});
            }
        });

    const exportFile = () => {
        const settings = settingsOrError();
        if (settings !== null) {
            const file = {
                name: draft.name,
                members: draft.members.map((m) => ({name: m.name, freeeEmployeeNo: m.freeeEmployeeNo})),
            };
            downloadText(
                'daily_report_settings.js',
                exportSettingsJs({...file, settings: parseSettings(settings)}),
                'text/javascript;charset=utf-8;'
            );
        }
    };

    const groups = parseGroups(draft.groupsText);
    return (
        <>
            <Paper className={classes.paper}>
                <div className={classes.row}>
                    <TextField label="部署名" value={draft.name} onChange={text('name')} style={{minWidth: 280}} />
                    <div style={{flexGrow: 1}} />
                    <input
                        type="file"
                        accept=".js"
                        ref={fileInput}
                        style={{display: 'none'}}
                        onChange={(e) => {
                            const files = e.target.files;
                            if (files && files[0]) {
                                importFile(files[0]);
                            }
                            e.target.value = '';
                        }}
                    />
                    <Button variant="outlined" onClick={() => fileInput.current && fileInput.current.click()}>
                        設定ファイルをインポート (.js)
                    </Button>
                    <Button variant="outlined" onClick={exportFile}>
                        エクスポート (.js)
                    </Button>
                    <Button variant="outlined" onClick={() => setConfirmRemove(true)}>
                        部署を削除
                    </Button>
                    <Button variant="contained" color="primary" onClick={save}>
                        保存
                    </Button>
                </div>
            </Paper>
            <Section
                title="メンバー"
                expanded
                help="日報を書く人と DayLogs のユーザーを対応付けます。1人が複数の部署に所属できます。">
                <MembersEditor members={draft.members} users={users} onChange={set('members')} />
            </Section>
            <Section title="勤務時間デフォルト" expanded>
                <div className={classes.row}>
                    <TextField
                        label="開始"
                        type="time"
                        value={draft.workStart}
                        onChange={text('workStart')}
                        InputLabelProps={{shrink: true}}
                    />
                    <TextField
                        label="終了"
                        type="time"
                        value={draft.workEnd}
                        onChange={text('workEnd')}
                        InputLabelProps={{shrink: true}}
                    />
                    <TextField
                        label="休憩（時間）"
                        type="number"
                        value={draft.breakTime}
                        onChange={text('breakTime')}
                        inputProps={{step: 0.25, min: 0}}
                    />
                </div>
            </Section>
            <Section
                title="グループ設定"
                help={
                    '「ID=グループ名」の形式で1行に1つずつ入力します。IDは3桁の連番（001, 002, ...）を使ってください。\nグループ名を変えてもIDが同じなら集計の整合性は保たれます。'
                }>
                <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={draft.groupsText}
                    onChange={text('groupsText')}
                    variant="outlined"
                />
            </Section>
            <Section title="カテゴリ・分類設定" help="カテゴリを選ぶと、分類の選択肢とデフォルトグループが切り替わります。">
                <CategoriesEditor categories={draft.categories} groups={groups} onChange={set('categories')} />
            </Section>
            <Section
                title="開発工数区分・資産フラグ設定"
                help="カテゴリ×分類ごとに開発工数区分と資産フラグ（チェックあり=1（資産）、なし=0（費用））を設定します。未設定の分類は集計で「未設定」になります。">
                <OverridesEditor
                    categories={draftCategories(draft.categories)}
                    overrides={draft.overrides}
                    workCategories={parseSettings(draft.otherJson).workCategories}
                    onChange={set('overrides')}
                />
            </Section>
            <Section
                title="その他の設定（JSON）"
                help="開発工数区分マスタ（workCategories）、Backlog連携、お役立ちリンクなど、この画面にない設定です。設定ファイルの書式をJSONで編集します。">
                <TextField
                    fullWidth
                    multiline
                    rows={16}
                    value={draft.otherJson}
                    onChange={text('otherJson')}
                    variant="outlined"
                    inputProps={{style: {fontFamily: 'monospace', fontSize: 13}}}
                />
            </Section>
            {confirmRemove ? (
                <ConfirmDialog
                    title="確認"
                    fClose={() => setConfirmRemove(false)}
                    fOnSubmit={() =>
                        remove({variables: {id: department.id}})
                            .then(() => enqueueSnackbar('部署を削除しました', {variant: 'success'}))
                            .catch(handleError('部署の削除', enqueueSnackbar))
                    }>
                    部署「{department.name}」を削除しますか？ この部署のメンバー・日報・勤務時間もすべて削除されます。
                </ConfirmDialog>
            ) : null}
        </>
    );
};
