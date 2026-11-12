package org.example.trai.enmus;


import lombok.Getter;


/**
 * Created with IntelliJ IDEA.
 * Description:
 * User: PG
 * Date: 2024-04-01
 * Time: 20:29
 */
@Getter
public enum Codes {
    SUCCESS_NORMAL(200,"success"),
    FAIL_NORMAL(400, "fail"),
    FAIL_LOGIN(410, "账号密码错误"),
    FAIL_TIME(411, "时间异常"),
    FAIL_EXCEPTION(412, "内部异常");

    private Integer code;
    private String message;

    Codes(Integer code, String message) {
        this.code = code;
        this.message = message;
    }
}
