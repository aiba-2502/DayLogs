import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import {TimeSpans, TimeSpansVariables} from '../gql/__generated__/TimeSpans';
import * as gqlTimeSpan from '../gql/timeSpan';
import {useSnackbar} from 'notistack';
import {isSameDate} from '../utils/time';
import moment from 'moment';
import {Fab, Zoom} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';

export const RefreshTimeSpans: React.FC = () => {
    const {refetch, data} = useQuery<TimeSpans, TimeSpansVariables>(gqlTimeSpan.TimeSpans, {
        variables: {cursor: {pageSize: 30}},
    });
    const {enqueueSnackbar, closeSnackbar} = useSnackbar();
    const hasMovedEntries =
        data &&
        data.timeSpans &&
        data.timeSpans.timeSpans.some(({start, oldStart}) => !isSameDate(moment(start), oldStart ? moment(oldStart) : undefined));
    React.useEffect(() => {
        if (hasMovedEntries) {
            const id = enqueueSnackbar('一部の記録が移動されました。更新ボタンで記録を並べ替えてください', {
                variant: 'info',
                persist: true,
                preventDuplicate: true,
            });
            return () => {
                if (id) {
                    closeSnackbar(id);
                }
            };
        }
        return () => {};
    }, [hasMovedEntries, enqueueSnackbar, closeSnackbar]);

    if (!hasMovedEntries) {
        return <></>;
    }

    return (
        <Zoom
            in={true}
            timeout={50}
            style={{
                transitionDelay: `5ms`,
            }}
            unmountOnExit>
            <Fab
                aria-label={'更新'}
                onClick={() => {
                    refetch({cursor: {pageSize: 30}}).then(() => {
                        enqueueSnackbar('記録を更新しました', {variant: 'success'});
                    });
                }}
                style={{position: 'fixed', bottom: '30px', right: '30px', zIndex: 100000}}
                color="primary">
                <RefreshIcon />
            </Fab>
        </Zoom>
    );
};
