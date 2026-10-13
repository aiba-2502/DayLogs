import {gql} from 'apollo-boost';

export const ReportDepartments = gql`
    query ReportDepartments {
        reportDepartments {
            id
            name
            settings
        }
    }
`;

export const ReportMembers = gql`
    query ReportMembers($departmentId: Int!) {
        reportMembers(departmentId: $departmentId) {
            id
            userId
            name
            freeeEmployeeNo
        }
    }
`;

export const MyReportData = gql`
    query MyReportData($departmentId: Int!, $userId: Int!) {
        reportEntries(departmentId: $departmentId, userId: $userId) {
            id
            date
            name
            issueKey
            title
            category
            subcategory
            group
            time
            updatedAt
        }
        reportAttendances(departmentId: $departmentId, userId: $userId) {
            date
            workStart
            workEnd
            breakTime
        }
    }
`;

export const SaveDailyReport = gql`
    mutation SaveDailyReport(
        $departmentId: Int!
        $date: String!
        $workStart: String!
        $workEnd: String!
        $breakTime: Float!
        $entries: [InputReportEntry!]!
    ) {
        saveDailyReport(
            departmentId: $departmentId
            date: $date
            workStart: $workStart
            workEnd: $workEnd
            breakTime: $breakTime
            entries: $entries
        ) {
            id
        }
    }
`;

export const RemoveReportEntry = gql`
    mutation RemoveReportEntry($id: Int!) {
        removeReportEntry(id: $id) {
            id
        }
    }
`;

export const CreateReportDepartment = gql`
    mutation CreateReportDepartment($name: String!, $settings: String!) {
        createReportDepartment(name: $name, settings: $settings) {
            id
        }
    }
`;

export const UpdateReportDepartment = gql`
    mutation UpdateReportDepartment($id: Int!, $name: String!, $settings: String!) {
        updateReportDepartment(id: $id, name: $name, settings: $settings) {
            id
        }
    }
`;

export const RemoveReportDepartment = gql`
    mutation RemoveReportDepartment($id: Int!) {
        removeReportDepartment(id: $id) {
            id
        }
    }
`;

export const SetReportMembers = gql`
    mutation SetReportMembers($departmentId: Int!, $members: [InputReportMember!]!) {
        setReportMembers(departmentId: $departmentId, members: $members) {
            id
        }
    }
`;
