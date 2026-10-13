package dailyreport

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/auth"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// ReportDepartments returns the departments of the current user, or all departments for admins with all.
func (r *ResolverForDailyReport) ReportDepartments(ctx context.Context, all bool) ([]*gqlmodel.ReportDepartment, error) {
	user := auth.GetUser(ctx)
	var departments []model.ReportDepartment
	q := r.DB.Order("name, id")
	if !(all && user.Admin) {
		q = q.Where("id IN (?)", r.DB.Table("report_members").Select("department_id").Where("user_id = ?", user.ID).QueryExpr())
	}
	if err := q.Find(&departments).Error; err != nil {
		return nil, err
	}
	result := []*gqlmodel.ReportDepartment{}
	for _, d := range departments {
		result = append(result, toExternalDepartment(d))
	}
	return result, nil
}

// CreateReportDepartment creates a department.
func (r *ResolverForDailyReport) CreateReportDepartment(ctx context.Context, name string, settings string) (*gqlmodel.ReportDepartment, error) {
	department := model.ReportDepartment{Name: strings.TrimSpace(name), Settings: settings}
	if err := validateDepartment(department); err != nil {
		return nil, err
	}
	if err := r.DB.Create(&department).Error; err != nil {
		return nil, err
	}
	return toExternalDepartment(department), nil
}

// UpdateReportDepartment updates the name, settings and members of a department.
func (r *ResolverForDailyReport) UpdateReportDepartment(ctx context.Context, id int, name string, settings string, members []*gqlmodel.InputReportMember) (*gqlmodel.ReportDepartment, error) {
	department := model.ReportDepartment{}
	if r.DB.First(&department, id).RecordNotFound() {
		return nil, errNoAccess
	}
	department.Name = strings.TrimSpace(name)
	department.Settings = settings
	if err := validateDepartment(department); err != nil {
		return nil, err
	}
	if err := r.validateMembers(members); err != nil {
		return nil, err
	}
	err := r.transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&department).Error; err != nil {
			return err
		}
		if err := tx.Where("department_id = ?", id).Delete(&model.ReportMember{}).Error; err != nil {
			return err
		}
		for _, m := range members {
			member := model.ReportMember{DepartmentID: id, UserID: m.UserID, Name: strings.TrimSpace(m.Name), FreeeEmployeeNo: strings.TrimSpace(m.FreeeEmployeeNo)}
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return toExternalDepartment(department), err
}

// RemoveReportDepartment removes a department. Its members, entries and attendances are removed by ON DELETE CASCADE.
func (r *ResolverForDailyReport) RemoveReportDepartment(ctx context.Context, id int) (*gqlmodel.ReportDepartment, error) {
	department := model.ReportDepartment{}
	if r.DB.First(&department, id).RecordNotFound() {
		return nil, errNoAccess
	}
	return toExternalDepartment(department), r.DB.Delete(&department).Error
}

func validateDepartment(department model.ReportDepartment) error {
	if department.Name == "" {
		return errors.New("部署名を入力してください")
	}
	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(department.Settings), &settings); err != nil {
		return errors.New("設定がJSONオブジェクトではありません: " + err.Error())
	}
	return nil
}

func toExternalDepartment(department model.ReportDepartment) *gqlmodel.ReportDepartment {
	return &gqlmodel.ReportDepartment{ID: department.ID, Name: department.Name, Settings: department.Settings}
}
