package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class ChapterUpdateDTO {
    private Long id;
    private String title;
    private String description;
    private String content;
    private Long chapterProblemId;
}
