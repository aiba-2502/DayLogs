import * as React from 'react';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import IconButton from '@material-ui/core/IconButton';
import UsersIcon from '@material-ui/icons/SupervisorAccount';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuIcon from '@material-ui/icons/Menu';
import SettingsIcon from '@material-ui/icons/Settings';
import DevicesIcon from '@material-ui/icons/DevicesOther';
import ReportIcon from '@material-ui/icons/Assignment';
import ReportSettingsIcon from '@material-ui/icons/Description';
import ReportAggregateIcon from '@material-ui/icons/Assessment';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {ListSubheader, Menu} from '@material-ui/core';
import HrefLink from '@material-ui/core/Link';
import * as gqlUser from '../gql/user';
import * as gqlVersion from '../gql/version';
import Button from '@material-ui/core/Button';
import AccountCircle from '@material-ui/icons/AccountCircle';
import {Link} from 'react-router-dom';
import MenuItem from '@material-ui/core/MenuItem';
import {useMutation, useQuery} from '@apollo/react-hooks';
import {Logout} from '../gql/__generated__/Logout';
import {Version} from '../gql/__generated__/Version';
import {CurrentUser} from '../gql/__generated__/CurrentUser';
import makeStyles from '@material-ui/core/styles/makeStyles';
import {Route, Switch} from 'react-router';

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        height: '100%',
    },
    drawer: {
        [theme.breakpoints.up('md')]: {
            width: drawerWidth,
            flexShrink: 0,
        },
    },
    appBar: {
        marginLeft: drawerWidth,
        [theme.breakpoints.up('md')]: {
            width: `calc(100% - ${drawerWidth}px)`,
        },
    },
    menuButton: {
        marginRight: 20,
        [theme.breakpoints.up('md')]: {
            display: 'none',
        },
    },
    toolbar: {
        ...theme.mixins.toolbar,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    drawerPaper: {
        width: drawerWidth,
    },
    content: {
        flexGrow: 1,
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
    },
    grow: {
        flexGrow: 1,
    },
    sectionDesktop: {
        display: 'none',
        [theme.breakpoints.up('xs')]: {
            display: 'flex',
        },
    },
    sectionMobile: {
        display: 'flex',
        [theme.breakpoints.up('xs')]: {
            display: 'none',
        },
    },
}));

// tslint:disable-next-line:no-any
const routerLink = (to: string): any => {
    return React.forwardRef<HTMLAnchorElement>((props, ref) => <Link innerRef={ref} to={to} {...props} />);
};

export const Page: React.FC = ({children}) => {
    const classes = useStyles();
    const {data} = useQuery<CurrentUser>(gqlUser.CurrentUser);

    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [userMenuOpen, setUserMenuOpen] = React.useState<null | HTMLElement>(null);
    const [logout] = useMutation<Logout>(gqlUser.Logout, {refetchQueries: [{query: gqlUser.CurrentUser}]});
    const {data: {version = gqlVersion.VersionDefault.version} = gqlVersion.VersionDefault} = useQuery<Version>(
        gqlVersion.Version
    );

    const username = (data && data.user && data.user.name) || '不明';
    const admin = data && data.user && data.user.admin;

    const drawer = (
        <div>
            <div className={classes.toolbar}>
                <HrefLink href="https://github.com/traggo" underline="none" target="_blank">
                    <Typography variant="h5" align="center" color="textPrimary">
                        DayLogs
                    </Typography>
                </HrefLink>
                <HrefLink href="https://github.com/traggo/server/releases" underline="none" target="_blank">
                    <Typography variant="subtitle2" align="center" color="textPrimary">
                        {version.name}@{version.commit.slice(0, 8)}
                    </Typography>
                </HrefLink>
            </div>
            <Divider />
            <List subheader={<ListSubheader>日報</ListSubheader>} dense={true}>
                <ListItem button component={routerLink('/report/input')}>
                    <ListItemIcon>
                        <ReportIcon />
                    </ListItemIcon>
                    <ListItemText primary="日報入力" />
                </ListItem>
                <ListItem button component={routerLink('/report/aggregate')}>
                    <ListItemIcon>
                        <ReportAggregateIcon />
                    </ListItemIcon>
                    <ListItemText primary="集計・分析" />
                </ListItem>
            </List>
            <Divider />
            <List subheader={<ListSubheader>ユーザー</ListSubheader>} dense={true}>
                <ListItem button component={routerLink('/user/devices')}>
                    <ListItemIcon>
                        <DevicesIcon />
                    </ListItemIcon>
                    <ListItemText primary="デバイス" />
                </ListItem>
                <ListItem button component={routerLink('/user/settings')}>
                    <ListItemIcon>
                        <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="設定" />
                </ListItem>
            </List>
            {admin ? (
                <>
                    <Divider />
                    <List subheader={<ListSubheader>管理</ListSubheader>} dense={true}>
                        <ListItem button component={routerLink('/admin/users')}>
                            <ListItemIcon>
                                <UsersIcon />
                            </ListItemIcon>
                            <ListItemText primary="ユーザー" />
                        </ListItem>
                        <ListItem button component={routerLink('/admin/report-settings')}>
                            <ListItemIcon>
                                <ReportSettingsIcon />
                            </ListItemIcon>
                            <ListItemText primary="日報設定" />
                        </ListItem>
                    </List>
                </>
            ) : null}
            <Divider />
        </div>
    );

    return (
        <div className={classes.root}>
            <CssBaseline />
            <AppBar position="fixed" className={classes.appBar}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="メニューを開く"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className={classes.menuButton}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" color="inherit" noWrap>
                        <Switch>
                            <Route exact path="/user/settings">
                                ユーザー / 設定
                            </Route>
                            <Route exact path="/user/devices">
                                ユーザー / デバイス
                            </Route>
                            <Route exact path="/admin/users">
                                管理 / ユーザー
                            </Route>
                            <Route exact path="/admin/report-settings">
                                管理 / 日報設定
                            </Route>
                            <Route exact path="/report/input">
                                日報 / 入力
                            </Route>
                            <Route exact path="/report/aggregate">
                                日報 / 集計・分析
                            </Route>
                        </Switch>
                    </Typography>
                    <div className={classes.grow} />
                    <div className={classes.sectionDesktop}>
                        <Button color="inherit" onClick={(e) => setUserMenuOpen(e.currentTarget)}>
                            <AccountCircle />
                            &nbsp;{username}
                        </Button>
                        <Menu
                            anchorEl={userMenuOpen}
                            anchorOrigin={{vertical: 'top', horizontal: 'right'}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}
                            open={!!userMenuOpen}
                            onClose={() => setUserMenuOpen(null)}>
                            <MenuItem onClick={() => setUserMenuOpen(null)} component={routerLink('/user/settings')}>
                                設定
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setUserMenuOpen(null);
                                    logout();
                                }}>
                                ログアウト
                            </MenuItem>
                        </Menu>
                    </div>
                </Toolbar>
            </AppBar>
            <nav className={classes.drawer}>
                <Hidden mdUp implementation="js">
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={() => setMobileOpen(false)}
                        classes={{
                            paper: classes.drawerPaper,
                        }}>
                        {drawer}
                    </Drawer>
                </Hidden>
                <Hidden smDown implementation="js">
                    <Drawer
                        classes={{
                            paper: classes.drawerPaper,
                        }}
                        variant="permanent"
                        open>
                        {drawer}
                    </Drawer>
                </Hidden>
            </nav>
            <main className={classes.content}>
                <div className={classes.toolbar} />
                {children}
            </main>
        </div>
    );
};
