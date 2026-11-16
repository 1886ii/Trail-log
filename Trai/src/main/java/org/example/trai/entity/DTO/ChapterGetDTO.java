package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class ChapterGetDTO {
    private Integer lastSortId;
    private Integer size;
    private Long bookId;
}
