import * as React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import * as gqlDevice from '../gql/device';
import {MutationFetchResult} from 'react-apollo';
import {useMutation} from '@apollo/react-hooks';
import {CreateDevice, CreateDeviceVariables} from '../gql/__generated__/CreateDevice';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import {DeviceType} from '../gql/__generated__/globalTypes';
import {deviceTypeToString} from './typeutils';
import Select from '@material-ui/core/NativeSelect';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

interface AddTagDialogProps {
    initialName: string;
    open: boolean;
    close: () => void;
}

export const AddDeviceDialog: React.FC<AddTagDialogProps> = ({close, open, initialName}) => {
    const [token, setToken] = React.useState('');
    const [name, setName] = React.useState(initialName);
    const [deviceType, setDeviceType] = React.useState(DeviceType.NoExpiry);
    const {enqueueSnackbar} = useSnackbar();

    const [addDevice] = useMutation<CreateDevice, CreateDeviceVariables>(gqlDevice.CreateDevice, {
        refetchQueries: [{query: gqlDevice.Devices}],
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        addDevice({variables: {deviceType, name}})
            .then((result: MutationFetchResult<CreateDevice>) => {
                if (result.data && result.data.device) {
                    enqueueSnackbar('デバイスを作成しました', {variant: 'success'});
                    setToken(result.data.device.token);
                }
            })
            .catch(handleError('デバイスの作成', enqueueSnackbar));
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                if (token === '') {
                    close();
                }
            }}
            aria-labelledby="form-dialog-title"
            fullWidth>
            {token === '' ? (
                <form onSubmit={submit} noValidate autoComplete="off">
                    <DialogTitle id="form-dialog-title">デバイスを作成</DialogTitle>
                    <DialogContent>
                        <DialogContentText />
                        <TextField
                            autoFocus
                            margin="dense"
                            id="name"
                            label="名前"
                            type="text"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <FormControl margin={'normal'} fullWidth>
                            <InputLabel>有効期限</InputLabel>
                            <Select value={deviceType} onChange={(e) => setDeviceType(e.target.value as DeviceType)} fullWidth>
                                <option value={DeviceType.NoExpiry}>{deviceTypeToString(DeviceType.NoExpiry)}</option>
                                <option value={DeviceType.ShortExpiry}>{deviceTypeToString(DeviceType.ShortExpiry)}</option>
                                <option value={DeviceType.LongExpiry}>{deviceTypeToString(DeviceType.LongExpiry)}</option>
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={close} color="primary">
                            キャンセル
                        </Button>
                        <Button type="submit" onClick={submit} color="primary">
                            デバイスを作成
                        </Button>
                    </DialogActions>
                </form>
            ) : (
                <>
                    <DialogTitle id="form-dialog-title">デバイスを作成しました</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            このデバイスの認証トークンは以下のとおりです。このダイアログを閉じると再表示できないため、コピーして保存してください。
                            <br /> <b>{token}</b>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={close} color="primary">
                            閉じる
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};
