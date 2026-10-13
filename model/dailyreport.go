package model

import "time"

// ReportDepartment is a department of the daily report. Settings holds the master data (categories, groups, ...) as JSON.
type ReportDepartment struct {
	ID       int `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	Name     string
	Settings string `gorm:"type:text"`
}

// ReportMember is a person who writes daily reports in a department.
// UserID is 0 for people without a DayLogs account.
type ReportMember struct {
	ID              int `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	DepartmentID    int `gorm:"type:int REFERENCES report_departments(id) ON DELETE CASCADE"`
	UserID          int
	Name            string
	FreeeEmployeeNo string
}

// ReportEntry is one line of a daily report. The columns match the CSV format of the daily report tool.
type ReportEntry struct {
	ID           int `gorm:"primary_key;unique_index;AUTO_INCREMENT"`
	DepartmentID int `gorm:"type:int REFERENCES report_departments(id) ON DELETE CASCADE"`
	UserID       int
	Date         string
	Name         string
	IssueKey     string
	Title        string
	Category     string
	Subcategory  string
	GroupName    string
	Time         float64
	UpdatedAt    time.Time
}

// ReportAttendance holds the working hours of a day.
type ReportAttendance struct {
	DepartmentID int    `gorm:"primary_key;auto_increment:false;type:int REFERENCES report_departments(id) ON DELETE CASCADE"`
	UserID       int    `gorm:"primary_key;auto_increment:false"`
	Date         string `gorm:"primary_key"`
	WorkStart    string
	WorkEnd      string
	BreakTime    float64
}
