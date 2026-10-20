import * as React from 'react';
import {MuiThemeProvider, Theme} from '@material-ui/core/styles';
import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import CssBaseline from '@material-ui/core/CssBaseline';
import {useSettings} from '../gql/settings';
import {Theme as SettingTheme} from '../gql/__generated__/globalTypes';

// Arial for latin text; Japanese glyphs fall back to the OS gothic font.
const typography = {
    fontFamily: 'Arial, Helvetica, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif',
};

const themes: Record<SettingTheme, Theme> = {
    // Colors picked from a glowing-sphere image: near-black teal background, deep blue sphere,
    // azure glow and a violet/magenta/pink rim. A soft blue-violet glow sits behind the page like in the image.
    [SettingTheme.Glow]: createMuiTheme({
        typography,
        overrides: {
            MuiCssBaseline: {
                '@global': {
                    body: {
                        backgroundColor: '#010a13',
                        backgroundImage:
                            'radial-gradient(ellipse 70% 55% at 55% 100%, rgba(0, 16, 163, 0.35) 0%, rgba(106, 15, 192, 0.16) 45%, rgba(1, 10, 19, 0) 75%)',
                        backgroundAttachment: 'fixed',
                    },
                },
            },
            MuiLink: {
                root: {
                    color: '#5aa9ff',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: 'linear-gradient(90deg, #010a13 0%, #0010a3 50%, #6a0fc0 80%, #a3168f 100%)',
                    color: '#ffffff',
                },
            },
            MuiDrawer: {
                paper: {
                    background: 'linear-gradient(180deg, #021322 0%, #060c33 100%)',
                },
            },
        },
        palette: {
            background: {
                default: '#010a13',
                paper: '#0a1730',
            },
            text: {
                primary: '#ffffff',
            },
            primary: {
                main: '#3d8bff',
                contrastText: '#000000',
            },
            secondary: {
                main: '#a63cf0',
                contrastText: '#ffffff',
            },
            type: 'dark',
        },
    }),
    // Colors picked from the First Gaming logo: green lettering, violet waves, maroon label, navy background.
    [SettingTheme.FirstGaming]: createMuiTheme({
        typography,
        overrides: {
            MuiLink: {
                root: {
                    color: '#6eab37',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: 'linear-gradient(90deg, #04010e 0%, #4803a5 100%)',
                    color: '#ffffff',
                },
            },
        },
        palette: {
            background: {
                default: '#080027',
                paper: '#151040',
            },
            text: {
                primary: '#ffffff',
            },
            primary: {
                main: '#6eab37',
                contrastText: '#000000',
            },
            secondary: {
                main: '#a347ba',
                contrastText: '#ffffff',
            },
            type: 'dark',
        },
    }),
    [SettingTheme.GruvboxDark]: createMuiTheme({
        typography,
        overrides: {
            MuiLink: {
                root: {
                    color: '#458588',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#a89984',
                },
            },
        },
        palette: {
            background: {
                default: '#282828',
                paper: '#32302f',
            },
            text: {
                primary: '#fbf1d4',
            },
            primary: {
                main: '#a89984',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'dark',
        },
    }),
    [SettingTheme.GruvboxLight]: createMuiTheme({
        typography,
        overrides: {
            MuiLink: {
                root: {
                    color: '#458588',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
            MuiListItemIcon: {
                root: {
                    color: 'inherit',
                },
            },
            MuiToolbar: {
                root: {
                    background: '#7c6f64',
                },
            },
        },
        palette: {
            background: {
                default: '#fbf1c7',
                paper: '#f9f5d7',
            },
            text: {
                primary: '#282828',
            },
            primary: {
                main: '#7c6f64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'light',
        },
    }),
    [SettingTheme.MaterialLight]: createMuiTheme({
        typography,
        overrides: {
            MuiLink: {
                root: {
                    color: '#2980b9',
                },
            },
            MuiIconButton: {
                root: {
                    color: 'inherit',
                },
            },
        },
        palette: {
            background: {default: '#eeeeee'},
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'light',
        },
    }),
    [SettingTheme.MaterialDark]: createMuiTheme({
        typography,
        overrides: {
            MuiLink: {
                root: {
                    color: '#3498db',
                },
            },
        },
        palette: {
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            type: 'dark',
        },
    }),
};

export const ThemeProvider: React.FC = ({children}) => {
    const {theme} = useSettings();
    return (
        <MuiThemeProvider theme={themes[theme] || themes[SettingTheme.Glow]}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
