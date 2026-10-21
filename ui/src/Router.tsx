import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {CurrentUser} from './gql/__generated__/CurrentUser';
import * as gqlUser from './gql/user';
import {CenteredSpinner} from './common/CenteredSpinner';
import {LoginPage} from './login/LoginPage';
import {Typography} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import {ApolloError} from 'apollo-boost';
import Grid from '@material-ui/core/Grid';
import {DefaultPaper} from './common/DefaultPaper';
import {Page} from './common/Page';
import {Redirect, Route, Switch} from 'react-router';
import {DevicesPage} from './devices/DevicesPage';
import {UsersPage} from './user/UsersPage';
import {SettingsPage} from './setting/SettingsPage';
import {DailyReportAggregatePage} from './dailyreport/DailyReportAggregatePage';
import {DailyReportInputPage} from './dailyreport/DailyReportInputPage';
import {DailyReportSettingsPage} from './dailyreport/DailyReportSettingsPage';

export const Router = () => {
    const {loading, error, data, refetch} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    if (loading) {
        return <CenteredSpinner />;
    }
    if (error) {
        return <Error refetch={refetch} error={error} />;
    }
    const loggedIn = data && data.user;
    const admin = data && data.user && data.user.admin;

    return (
        <Switch>
            <Route path="/user/login">{loggedIn ? <Redirect to="/" /> : <LoginPage />}</Route>
            {loggedIn ? null : <Redirect to="/user/login" />}

            <Page>
                <Switch>
                    <Route exact path="/report/input" component={DailyReportInputPage} />
                    <Route exact path="/report/aggregate" component={DailyReportAggregatePage} />
                    <Route exact path="/user/settings" component={SettingsPage} />
                    <Route exact path="/user/devices" component={DevicesPage} />
                    {admin ? <Route exact path="/admin/users" component={UsersPage} /> : null}
                    {admin ? <Route exact path="/admin/report-settings" component={DailyReportSettingsPage} /> : null}
                    {/* 削除したタイムシート・ダッシュボード・タグの URL などは日報入力へ */}
                    <Redirect to="/report/input" />
                </Switch>
            </Page>
        </Switch>
    );
};

const Error: React.FC<{error: ApolloError; refetch: () => void}> = ({error, refetch}) => {
    return (
        <Grid container direction="row" alignItems="center" justify="center" style={{height: '100%'}}>
            <Grid item>
                <DefaultPaper>
                    <Typography variant="h3" component="h1" gutterBottom={true}>
                        エラー
                    </Typography>
                    <Typography component="p">
                        {error.networkError && error.networkError.name + ': ' + error.networkError.message}
                        {error.graphQLErrors.map((gqlError) => gqlError.message).join(', ')}
                    </Typography>
                    <Button style={{marginTop: 10}} size="large" variant="outlined" onClick={() => refetch()}>
                        再試行
                    </Button>
                </DefaultPaper>
            </Grid>
        </Grid>
    );
};

export const TODO = () => {
    return (
        <Typography align="center" variant={'h2'}>
            TODO
        </Typography>
    );
};
