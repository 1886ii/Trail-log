package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookListVO {
    private Long id;
    private String bookName;
    private String cover;
    private String author;
    private String tagName;
    private Integer grade;
    private String unitName;
    private Integer chapterCount;
    private String description;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
