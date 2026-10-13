import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/NativeSelect/NativeSelect';
import * as gqlReport from '../gql/dailyReport';
import {ReportDepartments, ReportDepartments_reportDepartments} from '../gql/__generated__/ReportDepartments';

const STORAGE_KEY = 'dailyReport.departmentId';

const readSelected = (): number => {
    try {
        return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch (e) {
        return 0;
    }
};

// 部署の一覧と、選択中の部署（このブラウザに記憶）
export const useReportDepartment = () => {
    const {data, loading} = useQuery<ReportDepartments>(gqlReport.ReportDepartments);
    const departments = (data && data.reportDepartments) || [];
    const [selectedId, setSelectedId] = React.useState(readSelected);
    const department: ReportDepartments_reportDepartments | undefined =
        departments.find((d) => d.id === selectedId) || departments[0];
    const select = (id: number) => {
        setSelectedId(id);
        try {
            localStorage.setItem(STORAGE_KEY, String(id));
        } catch (e) {
            // the selection is only a convenience
        }
    };
    return {loading, departments, department, select};
};

export const DepartmentSelect: React.FC<{
    departments: ReportDepartments_reportDepartments[];
    value: number;
    onChange: (id: number) => void;
}> = ({departments, value, onChange}) => (
    <FormControl style={{minWidth: 200}}>
        <InputLabel shrink>部署</InputLabel>
        <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
            {departments.map((d) => (
                <option key={d.id} value={d.id}>
                    {d.name}
                </option>
            ))}
        </Select>
    </FormControl>
);
