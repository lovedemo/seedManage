package service

import "fmt"

// ClientError 表示客户端错误
type ClientError struct {
	Message string
}

func (e ClientError) Error() string { return e.Message }

// MethodNotAllowed 表示 HTTP 方法不被允许
type MethodNotAllowed struct {
	Method string
}

func (m MethodNotAllowed) Error() string {
	return fmt.Sprintf("方法 %s 不被允许", m.Method)
}

// NewMethodNotAllowedError 创建方法不允许错误
func NewMethodNotAllowedError(method string) error {
	return MethodNotAllowed{Method: method}
}

