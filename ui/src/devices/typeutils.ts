import {DeviceType} from '../gql/__generated__/globalTypes';
import {expectNever} from '../utils/never';

export const deviceTypeToString = (type: DeviceType) => {
    switch (type) {
        case DeviceType.LongExpiry:
            return '1か月間操作なし';
        case DeviceType.ShortExpiry:
            return '1時間操作なし';
        case DeviceType.NoExpiry:
            return '無期限';
        default:
            return expectNever(type);
    }
};
