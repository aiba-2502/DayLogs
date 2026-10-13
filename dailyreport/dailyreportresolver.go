package dailyreport

import (
	"errors"

	"github.com/jinzhu/gorm"
	"github.com/traggo/server/model"
)

// ResolverForDailyReport resolves daily report specific things.
type ResolverForDailyReport struct {
	DB *gorm.DB
}

var errNoAccess = errors.New("部署が存在しないか、部署のメンバーではありません")

// member returns the membership of the user in the department.
func (r *ResolverForDailyReport) member(userID, departmentID int) (model.ReportMember, error) {
	member := model.ReportMember{}
	if userID == 0 || r.DB.Where("department_id = ? AND user_id = ?", departmentID, userID).First(&member).RecordNotFound() {
		return member, errNoAccess
	}
	return member, nil
}

// canRead checks that the department exists and the user is a member of it or an admin.
func (r *ResolverForDailyReport) canRead(user *model.User, departmentID int) error {
	if r.DB.First(&model.ReportDepartment{}, departmentID).RecordNotFound() {
		return errNoAccess
	}
	if user.Admin {
		return nil
	}
	_, err := r.member(user.ID, departmentID)
	return err
}

func (r *ResolverForDailyReport) transaction(fn func(tx *gorm.DB) error) error {
	tx := r.DB.Begin()
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}
