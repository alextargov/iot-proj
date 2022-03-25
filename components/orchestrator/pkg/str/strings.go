package str

func Ptr(str string) *string {
	return &str
}

func PtrStrToStr(str *string) string {
	if str == nil {
		return ""
	}

	return *str
}
