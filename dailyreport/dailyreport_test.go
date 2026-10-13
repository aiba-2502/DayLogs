package dailyreport

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
	"github.com/traggo/server/test"
	"github.com/traggo/server/test/fake"
)

func setup(t *testing.T) (*test.Database, ResolverForDailyReport, int) {
	db := test.InMemoryDB(t)
	db.User(1)
	db.User(2)
	db.User(3)
	department := model.ReportDepartment{Name: "開発室", Settings: "{}"}
	db.Create(&department)
	db.Create(&model.ReportMember{DepartmentID: department.ID, UserID: 1, Name: "山田"})
	db.Create(&model.ReportMember{DepartmentID: department.ID, UserID: 2, Name: "佐藤"})
	return db, ResolverForDailyReport{DB: db.DB}, department.ID
}

func entry(key, title string, time float64) *gqlmodel.InputReportEntry {
	return &gqlmodel.InputReportEntry{IssueKey: key, Title: title, Category: "開発", Group: "その他", Time: time}
}

func TestSaveDailyReport_overwritesSameIssueKeyAndTitle(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()
	user := fake.UserWithPerm(1, false)

	_, err := r.SaveDailyReport(user, dep, "2026-10-13", "10:00", "19:00", 1, []*gqlmodel.InputReportEntry{entry("A-1", "実装", 3), entry("", "会議", 1)})
	require.NoError(t, err)
	saved, err := r.SaveDailyReport(user, dep, "2026-10-13", "10:00", "20:00", 1, []*gqlmodel.InputReportEntry{entry("A-1", "実装", 5)})
	require.NoError(t, err)
	require.Equal(t, "山田", saved[0].Name)

	entries, err := r.ReportEntries(user, dep, 1)
	require.NoError(t, err)
	require.Len(t, entries, 2)
	times := map[string]float64{}
	for _, e := range entries {
		times[e.Title] = e.Time
	}
	require.Equal(t, map[string]float64{"実装": 5, "会議": 1}, times)

	attendances, err := r.ReportAttendances(user, dep, 1)
	require.NoError(t, err)
	require.Equal(t, []*gqlmodel.ReportAttendance{{Date: "2026-10-13", WorkStart: "10:00", WorkEnd: "20:00", BreakTime: 1}}, attendances)
}

func TestSaveDailyReport_rejectsInvalidInput(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()

	_, err := r.SaveDailyReport(fake.UserWithPerm(3, false), dep, "2026-10-13", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "実装", 1)})
	require.Equal(t, errNoAccess, err)
	_, err = r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026/10/13", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "実装", 1)})
	require.Error(t, err)
	_, err = r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026-10-13", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "実装", 0)})
	require.Error(t, err)
	_, err = r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026-10-13", "10時", "19:00", 1, nil)
	require.Error(t, err)
}

func TestReportEntries_returnsUserEntriesToMembers(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()
	_, err := r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026-10-12", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "実装", 1)})
	require.NoError(t, err)
	_, err = r.SaveDailyReport(fake.UserWithPerm(2, false), dep, "2026-10-13", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "調査", 2)})
	require.NoError(t, err)

	entries, err := r.ReportEntries(fake.UserWithPerm(1, false), dep, 2)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	require.Equal(t, "佐藤", entries[0].Name)

	_, err = r.ReportEntries(fake.UserWithPerm(3, false), dep, 1)
	require.Equal(t, errNoAccess, err)
	entries, err = r.ReportEntries(fake.UserWithPerm(3, true), dep, 1)
	require.NoError(t, err)
	require.Len(t, entries, 1)
}

func TestRemoveReportEntry_onlyOwnEntries(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()
	saved, err := r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026-10-13", "", "", 0, []*gqlmodel.InputReportEntry{entry("", "実装", 1)})
	require.NoError(t, err)

	_, err = r.RemoveReportEntry(fake.UserWithPerm(2, true), saved[0].ID)
	require.Error(t, err)
	_, err = r.RemoveReportEntry(fake.UserWithPerm(1, false), saved[0].ID)
	require.NoError(t, err)
	entries, _ := r.ReportEntries(fake.UserWithPerm(1, false), dep, 1)
	require.Empty(t, entries)
}

func TestReportDepartments_onlyMembershipsForUsers(t *testing.T) {
	db, r, _ := setup(t)
	defer db.Close()
	_, err := r.CreateReportDepartment(fake.User(3), "営業", `{"groups":[]}`)
	require.NoError(t, err)
	_, err = r.CreateReportDepartment(fake.User(3), "壊れた設定", `[1]`)
	require.Error(t, err)

	departments, err := r.ReportDepartments(fake.UserWithPerm(1, false))
	require.NoError(t, err)
	require.Len(t, departments, 1)
	require.Equal(t, "開発室", departments[0].Name)
	departments, err = r.ReportDepartments(fake.UserWithPerm(3, true))
	require.NoError(t, err)
	require.Len(t, departments, 2)
}

func TestRemoveReportDepartment_removesData(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()
	_, err := r.SaveDailyReport(fake.UserWithPerm(1, false), dep, "2026-10-13", "10:00", "19:00", 1, []*gqlmodel.InputReportEntry{entry("", "実装", 1)})
	require.NoError(t, err)

	_, err = r.RemoveReportDepartment(fake.User(3), dep)
	require.NoError(t, err)
	for _, m := range []interface{}{&model.ReportMember{}, &model.ReportEntry{}, &model.ReportAttendance{}} {
		count := 0
		db.Model(m).Count(&count)
		require.Zero(t, count)
	}
}

func TestSetReportMembers_validates(t *testing.T) {
	db, r, dep := setup(t)
	defer db.Close()

	_, err := r.SetReportMembers(fake.User(3), dep, []*gqlmodel.InputReportMember{{UserID: 1, Name: "山田"}, {UserID: 0, Name: "山田"}})
	require.Error(t, err)
	_, err = r.SetReportMembers(fake.User(3), dep, []*gqlmodel.InputReportMember{{UserID: 1, Name: "山田"}, {UserID: 1, Name: "田中"}})
	require.Error(t, err)
	_, err = r.SetReportMembers(fake.User(3), dep, []*gqlmodel.InputReportMember{{UserID: 99, Name: "田中"}})
	require.Error(t, err)

	members, err := r.SetReportMembers(fake.User(3), dep, []*gqlmodel.InputReportMember{{UserID: 3, Name: " 鈴木 ", FreeeEmployeeNo: "8"}, {UserID: 0, Name: "外部"}})
	require.NoError(t, err)
	require.Len(t, members, 2)
	require.Equal(t, "鈴木", members[0].Name)
	_, err = r.member(1, dep)
	require.Equal(t, errNoAccess, err)
}
