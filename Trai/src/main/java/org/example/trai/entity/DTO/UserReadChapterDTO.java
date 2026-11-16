package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class UserReadChapterDTO {
    private Long chapterId;
    private Integer sortId;
    private Long bookId;
}
