package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserCurrentReadPO {
    private Long id;
    private Long userId;
    private Long chapterId;
    private Long bookId;
    private Integer sortId;
    private LocalDateTime lastReadTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
