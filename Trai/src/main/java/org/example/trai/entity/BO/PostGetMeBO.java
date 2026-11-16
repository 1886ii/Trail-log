package org.example.trai.entity.BO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PostGetMeBO {
    private Long id;
    private Long postTagId;
    private String tagName;
    private String contentDelta;
    private String title;
    private String plainText;
    private Integer wordCount;
    private String cover;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Integer visibility;
    // 是否点赞
    private Boolean likeState;
}
