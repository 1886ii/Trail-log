package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookPO {
    private Long id;
    private String bookName;
    private String cover;
    private String author;
    private Long bookTagId;
    private Integer grade;
    private String unitName;
    private Integer chapterCount;
    private String description;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
