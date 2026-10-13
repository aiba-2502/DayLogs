package dailyreport

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// ReportMembers returns the members of a department.
func (r *ResolverForDailyReport) ReportMembers(ctx context.Context, departmentID int) ([]*gqlmodel.ReportMember, error) {
	if err := r.canRead(auth.GetUser(ctx), departmentID); err != nil {
		return nil, err
	}
	return r.members(departmentID)
}

// SetReportMembers replaces the members of a department.
func (r *ResolverForDailyReport) SetReportMembers(ctx context.Context, departmentID int, members []*gqlmodel.InputReportMember) ([]*gqlmodel.ReportMember, error) {
	if r.DB.First(&model.ReportDepartment{}, departmentID).RecordNotFound() {
		return nil, errNoAccess
	}
	names := map[string]bool{}
	users := map[int]bool{}
	for _, m := range members {
		name := strings.TrimSpace(m.Name)
		if name == "" {
			return nil, errors.New("名前を入力してください")
		}
		if names[name] {
			return nil, fmt.Errorf("名前「%s」が重複しています", name)
		}
		names[name] = true
		if m.UserID != 0 {
			if users[m.UserID] {
				return nil, fmt.Errorf("「%s」のユーザーは他の名前に割り当て済みです", name)
			}
			users[m.UserID] = true
			if r.DB.First(&model.User{}, m.UserID).RecordNotFound() {
				return nil, fmt.Errorf("「%s」のユーザーが存在しません", name)
			}
		}
	}

	err := r.transaction(func(tx *gorm.DB) error {
		if err := tx.Where("department_id = ?", departmentID).Delete(&model.ReportMember{}).Error; err != nil {
			return err
		}
		for _, m := range members {
			member := model.ReportMember{DepartmentID: departmentID, UserID: m.UserID, Name: strings.TrimSpace(m.Name), FreeeEmployeeNo: strings.TrimSpace(m.FreeeEmployeeNo)}
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return r.members(departmentID)
}

func (r *ResolverForDailyReport) members(departmentID int) ([]*gqlmodel.ReportMember, error) {
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
