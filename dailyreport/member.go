package dailyreport

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// ReportMembers returns the members of a department.
func (r *ResolverForDailyReport) ReportMembers(ctx context.Context, departmentID int) ([]*gqlmodel.ReportMember, error) {
	if err := r.canRead(auth.GetUser(ctx), departmentID); err != nil {
		return nil, err
	}
	var members []model.ReportMember
	if err := r.DB.Where("department_id = ?", departmentID).Order("id").Find(&members).Error; err != nil {
		return nil, err
	}
	result := []*gqlmodel.ReportMember{}
	for _, m := range members {
		result = append(result, &gqlmodel.ReportMember{ID: m.ID, UserID: m.UserID, Name: m.Name, FreeeEmployeeNo: m.FreeeEmployeeNo})
	}
	return result, nil
}

// validateMembers checks that the names are set and unique and that each user exists and is assigned only once.
func (r *ResolverForDailyReport) validateMembers(members []*gqlmodel.InputReportMember) error {
	names := map[string]bool{}
	users := map[int]bool{}
	for _, m := range members {
		name := strings.TrimSpace(m.Name)
		if name == "" {
			return errors.New("名前を入力してください")
		}
		if names[name] {
			return fmt.Errorf("名前「%s」が重複しています", name)
		}
		names[name] = true
		if m.UserID == 0 {
			continue
		}
		if users[m.UserID] {
			return fmt.Errorf("「%s」のユーザーは他の名前に割り当て済みです", name)
		}
		users[m.UserID] = true
		if r.DB.First(&model.User{}, m.UserID).RecordNotFound() {
			return fmt.Errorf("「%s」のユーザーが存在しません", name)
		}
	}
	return nil
}
