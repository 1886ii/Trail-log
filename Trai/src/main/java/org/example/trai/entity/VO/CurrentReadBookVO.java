package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CurrentReadBookVO {
    private Long bookId;
    private Long chapterId;
    private Integer sortId;
    private String bookName;
    private String cover;
    private String author;
    private String tagName;
    private Integer grade;
    private String unitName;
    private Integer chapterCount;
    private String description;
    private LocalDateTime lastReadTime;
    private Integer done; // 以及读完的章节数
}
