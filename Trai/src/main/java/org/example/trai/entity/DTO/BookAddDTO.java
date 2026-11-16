package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class BookAddDTO {
    private String bookName;
    private String cover;
    private String author;
    private Long bookTagId;
    private Integer grade;
    private String unitName;
    private String description;
}
