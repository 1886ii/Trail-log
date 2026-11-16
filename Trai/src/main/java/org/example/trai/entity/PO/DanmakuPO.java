package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DanmakuPO {
    private Long id;
    private Long userId;
    private Long bookId;
    private String content;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
