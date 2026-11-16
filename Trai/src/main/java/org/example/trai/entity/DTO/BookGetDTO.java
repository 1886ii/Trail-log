package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class BookGetDTO {
    private Long lastBookId;
    private Integer size;
    private Long bookTagId;
}
