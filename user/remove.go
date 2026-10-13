package user

import (
	"context"
	"fmt"

	"github.com/jinzhu/copier"
	"github.com/traggo/server/generated/gqlmodel"
	"github.com/traggo/server/model"
)

// RemoveUser removes a user
func (r *ResolverForUser) RemoveUser(ctx context.Context, id int) (*gqlmodel.User, error) {
	user := model.User{ID: id}
	if r.DB.Find(&user).RecordNotFound() {
		return nil, fmt.Errorf("user with id %d does not exist", user.ID)
	}

	// 日報のメンバーは残し、アカウントなしにする
	if err := r.DB.Model(&model.ReportMember{}).Where("user_id = ?", id).Update("user_id", 0).Error; err != nil {
		return nil, err
	}
	remove := r.DB.Delete(&user)
	gqlUser := &gqlmodel.User{}
	copier.Copy(gqlUser, &user)
	return gqlUser, remove.Error
}
