package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PostPO {
    private Long id;
    private Long userId;
    private Long postTagId;
    private String contentDelta;
    private String title;
    private String plainText;
    private Integer wordCount;
    private String cover;
    private Integer visibility; // 0 全部可见 1 自己
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer state;
}
