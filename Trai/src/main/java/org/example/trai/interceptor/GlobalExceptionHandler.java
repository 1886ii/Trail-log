package org.example.trai.interceptor;

import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(Exception.class)
    public Return<?> handle(Exception e) {
        return Return.fail(null, Codes.FAIL_EXCEPTION);
    }
}
