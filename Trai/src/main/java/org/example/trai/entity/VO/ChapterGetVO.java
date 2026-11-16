package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChapterGetVO {
    private Long id;
    private Integer sortId;
    private String title;
    private String description;
    private Long chapterProblemId;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private boolean readState;
}
