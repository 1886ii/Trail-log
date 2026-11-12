package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class PostPublishDTO {
    private Long postTagId;
    private String contentDelta;
    private String title;
    private String plainText;
    private Integer wordCount;
    private String cover;
    private Integer visibility; // 0 全部可见 1 自己
}
