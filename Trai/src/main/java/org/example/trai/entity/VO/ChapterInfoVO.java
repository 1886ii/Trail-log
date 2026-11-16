package org.example.trai.entity.VO;


import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChapterInfoVO {
    private Long id;
    private Integer sortId;
    private Long bookId;
    private String title;
    private String description;
    private String content;
    private Long chapterProblemId;
}
