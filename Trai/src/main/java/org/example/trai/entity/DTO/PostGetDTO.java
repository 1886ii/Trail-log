package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class PostGetDTO {
    private Long lastPostId;
    private Integer size;
    private Long postTagId;
}
