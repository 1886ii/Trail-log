package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserChapterReadPO {
    private Long id;
    private Long userId;
    private Long bookId;
    private Long chapterId;
    private Integer sortId;
    private LocalDateTime readFinishTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
