package org.example.trai.common;

import lombok.Data;
import org.example.trai.enmus.Codes;

/**
 * Created with IntelliJ IDEA.
 * Description: 响应数据的统一格式
 * User: PG
 * Date: 2024-04-01
 * Time: 20:29
 */
@Data
public class Return<T> {
    private Integer code;
    private String message;
    private T data;
    private long timestamp;

    private Return(Integer code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }

    public static <T> Return<T> success(T data, Codes codes) {
        return new Return<>(codes.getCode(), codes.getMessage(), data);
    }

    public static <T> Return<T> fail(T data, Codes codes) {
        return new Return<>(codes.getCode(), codes.getMessage(), data);
    }
}
