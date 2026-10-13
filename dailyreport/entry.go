package dailyreport

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

var clockPattern = regexp.MustCompile(`^\d{1,2}:\d{2}$`)

// SaveDailyReport saves the lines and the working hours of a day for the current user.
// Like the original tool, a line with the same date, issue key and title overwrites the saved line.
func (r *ResolverForDailyReport) SaveDailyReport(ctx context.Context, departmentID int, date string, workStart string, workEnd string, breakTime float64, entries []*gqlmodel.InputReportEntry) ([]*gqlmodel.ReportEntry, error) {
	user := auth.GetUser(ctx)
	member, err := r.member(user.ID, departmentID)
	if err != nil {
		return nil, err
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return nil, fmt.Errorf("日付が不正です: %s", date)
	}
	saveAttendance := workStart != "" && workEnd != ""
	if saveAttendance && (!clockPattern.MatchString(workStart) || !clockPattern.MatchString(workEnd) || breakTime < 0) {
		return nil, errors.New("勤務時間が不正です")
	}
	if len(entries) == 0 {
		return nil, errors.New("保存するデータがありません")
	}
	for i, e := range entries {
		if strings.TrimSpace(e.Title) == "" || e.Time <= 0 {
			return nil, fmt.Errorf("%d行目: タイトルと実績時間を入力してください", i+1)
		}
	}

	saved := []*gqlmodel.ReportEntry{}
	err = r.transaction(func(tx *gorm.DB) error {
		for _, e := range entries {
			entry := model.ReportEntry{}
			tx.Where("department_id = ? AND user_id = ? AND date = ? AND issue_key = ? AND title = ?",
				departmentID, user.ID, date, strings.TrimSpace(e.IssueKey), strings.TrimSpace(e.Title)).First(&entry)
			entry.DepartmentID = departmentID
			entry.UserID = user.ID
			entry.Date = date
			entry.Name = member.Name
			entry.IssueKey = strings.TrimSpace(e.IssueKey)
			entry.Title = strings.TrimSpace(e.Title)
			entry.Category = strings.TrimSpace(e.Category)
			entry.Subcategory = strings.TrimSpace(e.Subcategory)
			entry.GroupName = strings.TrimSpace(e.Group)
			entry.Time = e.Time
			if err := tx.Save(&entry).Error; err != nil {
				return err
			}
			saved = append(saved, toExternalEntry(entry))
		}
		if saveAttendance {
			attendance := model.ReportAttendance{DepartmentID: departmentID, UserID: user.ID, Date: date, WorkStart: workStart, WorkEnd: workEnd, BreakTime: breakTime}
			return tx.Save(&attendance).Error
		}
		return nil
	})
	return saved, err
}

// RemoveReportEntry removes a line of the current user.
func (r *ResolverForDailyReport) RemoveReportEntry(ctx context.Context, id int) (*gqlmodel.ReportEntry, error) {
	entry := model.ReportEntry{}
	if r.DB.Where("id = ? AND user_id = ?", id, auth.GetUser(ctx).ID).First(&entry).RecordNotFound() {
		return nil, errors.New("日報が存在しないか、削除する権限がありません")
	}
	if err := r.DB.Delete(&entry).Error; err != nil {
		return nil, err
	}
	return toExternalEntry(entry), nil
}

// ReportEntries returns the lines of a user in a department.
func (r *ResolverForDailyReport) ReportEntries(ctx context.Context, departmentID int, userID int) ([]*gqlmodel.ReportEntry, error) {
	if err := r.canRead(auth.GetUser(ctx), departmentID); err != nil {
		return nil, err
	}
	var entries []model.ReportEntry
	if err := r.DB.Where("department_id = ? AND user_id = ?", departmentID, userID).Order("date DESC, id").Find(&entries).Error; err != nil {
		return nil, err
	}
	result := []*gqlmodel.ReportEntry{}
	for _, e := range entries {
		result = append(result, toExternalEntry(e))
	}
	return result, nil
}

// ReportAttendances returns the working hours of a user in a department.
func (r *ResolverForDailyReport) ReportAttendances(ctx context.Context, departmentID int, userID int) ([]*gqlmodel.ReportAttendance, error) {
	if err := r.canRead(auth.GetUser(ctx), departmentID); err != nil {
		return nil, err
	}
	var attendances []model.ReportAttendance
	if err := r.DB.Where("department_id = ? AND user_id = ?", departmentID, userID).Order("date DESC").Find(&attendances).Error; err != nil {
		return nil, err
	}
	result := []*gqlmodel.ReportAttendance{}
	for _, a := range attendances {
		result = append(result, &gqlmodel.ReportAttendance{Date: a.Date, WorkStart: a.WorkStart, WorkEnd: a.WorkEnd, BreakTime: a.BreakTime})
	}
	return result, nil
}

func toExternalEntry(e model.ReportEntry) *gqlmodel.ReportEntry {
	return &gqlmodel.ReportEntry{
		ID:          e.ID,
		Date:        e.Date,
		Name:        e.Name,
		IssueKey:    e.IssueKey,
		Title:       e.Title,
		Category:    e.Category,
		Subcategory: e.Subcategory,
		Group:       e.GroupName,
		Time:        e.Time,
		UpdatedAt:   model.Time(e.UpdatedAt),
	}
}
