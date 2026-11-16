package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class ChapterAddDTO {
    private Long bookId;
    private String title;
    private String description;
    private String content;
    private Long chapterProblemId;
}
