package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChapterPO {
    private Long id;
    private Integer sortId;
    private Long bookId;
    private String title;
    private String description;
    private String content;
    private Long chapterProblemId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
