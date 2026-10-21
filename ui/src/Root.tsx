import * as React from 'react';
import './global.css';
import {ThemeProvider} from './provider/ThemeProvider';
import {ApolloProvider} from './provider/ApolloProvider';
import {SnackbarProvider} from './provider/SnackbarProvider';
import {Router} from './Router';
import {HashRouter} from 'react-router-dom';
import {BootUserSettings} from './provider/UserSettingsProvider';

export const Root = () => {
    return (
        <ApolloProvider>
            <BootUserSettings>
                <ThemeProvider>
                    <SnackbarProvider>
                        <HashRouter>
                            <Router />
                        </HashRouter>
                    </SnackbarProvider>
                </ThemeProvider>
            </BootUserSettings>
        </ApolloProvider>
    );
};
