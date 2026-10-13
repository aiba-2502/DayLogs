import {makeStyles} from '@material-ui/core/styles';

export const useReportStyles = makeStyles((theme) => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(3),
        maxWidth: 1400,
        margin: '0 auto',
    },
    paper: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    row: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: `${theme.spacing(2)}px`,
    },
    buttons: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${theme.spacing(1)}px`,
        marginTop: theme.spacing(2),
    },
}));
